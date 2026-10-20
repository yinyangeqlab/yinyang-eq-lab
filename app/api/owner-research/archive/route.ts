import { env } from "cloudflare:workers";
import { ARCHIVE_V2_METHOD, ARCHIVE_V2_NOTICE, archiveAccounting, buildArchiveV2, validTargets, type ArchiveStudy, type ArchiveAccount } from "@/lib/archive-v2";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";
import { ownerAccessResponse } from "@/lib/owner-access";
import { summarizeResearch, type ResearchObservation } from "@/lib/research-summary";
const headers = { "Cache-Control":"private, no-store" };
export async function GET(request: Request) {
  const denied=await ownerAccessResponse(request);if(denied)return denied;
  try {
    // Live summaries are intentionally recomputed, never inserted into an archive.
    // Membership/group identifiers stay in server memory and never enter the response.
    const results=await env.DB!.batch([
      env.DB!.prepare("SELECT payload FROM statistics_archive ORDER BY year"),
      env.DB!.prepare(`SELECT v.winner_id,v.loser_id,a.name winner_name,b.name loser_name,v.created_at,v.test_mode,v.headphone_type,
        CASE WHEN o.subject_id IS NOT NULL THEN 'account:'||o.subject_id ELSE 'browser:'||v.voter_id END group_id,
        CASE WHEN o.subject_id LIKE 'invite:%' THEN 'account' WHEN o.subject_id='owner' THEN 'shared-admin' ELSE 'legacy-browser' END group_kind
        FROM votes v JOIN targets a ON a.id=v.winner_id JOIN targets b ON b.id=v.loser_id
        LEFT JOIN submission_owners o ON o.record_kind='vote' AND o.record_id=v.id
        WHERE v.eligible=1 AND v.test_mode IN ('blind','bring') AND v.heard_a>=5 AND v.heard_b>=5
        AND a.status='approved' AND b.status='approved' AND v.winner_id!=v.loser_id
        AND COALESCE((SELECT m.action FROM moderation_events m WHERE m.record_kind='vote' AND m.record_id=v.id ORDER BY m.sequence DESC LIMIT 1),'restore')!='remove'`),
      env.DB!.prepare("SELECT * FROM archive_studies ORDER BY start_at,id"),
      env.DB!.prepare("SELECT sequence,study_id,payload FROM archive_releases ORDER BY sequence")
    ]);
    return Response.json({archives:(results[0].results as {payload:string}[]).map(row=>JSON.parse(row.payload)),generationEnabled:true,studies:results[2].results,releases:results[3].results.map(row=>JSON.parse(String((row as {payload:string}).payload))),accounting:{...archiveAccounting(results[3].results.length),legacyEpsilon:results[0].results.length*Math.log(2)},
      planning:{kind:"private-live-analysis",rows:summarizeResearch(results[1].results as unknown as ResearchObservation[])}},{headers});
  } catch {return Response.json({error:"Research summaries could not be loaded."},{status:503,headers});}
}
export async function POST(request:Request){
 const denied=await ownerAccessResponse(request);if(denied)return denied;
 if(request.headers.get("Origin")!==new URL(request.url).origin)return Response.json({error:"Invalid origin."},{status:403,headers});
 try{
  const db=env.DB!,body=await readJsonObject(request,2048);
  if(body.action==="plan"){
   if(body.confirmation!=="PLAN ARCHIVE STUDY"||typeof body.targetA!=="string"||typeof body.targetB!=="string"||!validTargets(body.targetA,body.targetB)||!["blind","bring"].includes(String(body.mode))||!["ie","oe"].includes(String(body.headphoneType)))return Response.json({error:"Choose two different public catalog targets, a music mode and a headphone category."},{status:400,headers});
   const start=body.startAt,end=body.endAt,day=86400000;
   if(typeof start!=="number"||typeof end!=="number"||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start%day||end%day||start<Date.now()||end<start+day||end>8640000000000000)return Response.json({error:"Plan whole UTC days in advance, with at least one collection day. The end is exclusive."},{status:400,headers});
   const existing=await db.prepare("SELECT id FROM archive_studies WHERE target_a=? AND target_b=? AND mode=? AND headphone_type=? AND start_at=? AND end_at=?").bind(body.targetA,body.targetB,body.mode,body.headphoneType,start,end).first<{id:string}>();
   if(existing)return Response.json({ok:true,studyId:existing.id,existing:true},{headers});
   const id=crypto.randomUUID();
   await db.prepare("INSERT INTO archive_studies VALUES (?,?,?,?,?,?,?,?,?)").bind(id,body.targetA,body.targetB,body.mode,body.headphoneType,start,end,ARCHIVE_V2_NOTICE,ARCHIVE_V2_METHOD).run();
   return Response.json({ok:true,studyId:id},{headers});
  }
  if(body.action!=="seal"||body.confirmation!=="SEAL PROTECTED RESULT"||typeof body.studyId!=="string")return Response.json({error:"Choose a planned study and confirm sealing."},{status:400,headers});
  const study=await db.prepare("SELECT * FROM archive_studies WHERE id=?").bind(body.studyId).first<ArchiveStudy>();
  if(!study)return Response.json({error:"Study not found."},{status:404,headers});
  const prior=await db.prepare("SELECT payload FROM archive_releases WHERE study_id=?").bind(study.id).first<{payload:string}>();
  if(prior)return Response.json({release:JSON.parse(prior.payload),existing:true},{headers});
  if(study.end_at>Date.now()||study.methodology!==ARCHIVE_V2_METHOD||study.notice_version!==ARCHIVE_V2_NOTICE)return Response.json({error:"The collection period must close and the planned notice/method must match this release program."},{status:400,headers});
  const next=await db.prepare("SELECT id FROM archive_studies s WHERE NOT EXISTS (SELECT 1 FROM archive_releases r WHERE r.study_id=s.id) ORDER BY end_at,id LIMIT 1").first<{id:string}>();
  if(next?.id!==study.id)return Response.json({error:"Seal planned studies in collection-end order. A result cannot be skipped based on its private outcomes."},{status:409,headers});
  const snapshot=await db.batch([
   db.prepare("SELECT revision FROM archive_source_revision WHERE id=1"),
   db.prepare("SELECT COALESCE(MAX(sequence)+1,0) next FROM archive_releases"),
   db.prepare(`SELECT o.subject_id,COUNT(*) comparisons,SUM(CASE WHEN v.winner_id=? THEN 1 ELSE 0 END) a_wins
    FROM votes v JOIN submission_owners o ON o.record_kind='vote' AND o.record_id=v.id JOIN privacy_accounts a ON a.subject_id=o.subject_id
    WHERE v.created_at>=? AND v.created_at<? AND v.created_at>=a.agreed_at AND a.agreement_version=? AND a.submissions_enabled=1
    AND o.subject_id LIKE 'invite:%' AND v.eligible=1 AND v.test_mode=? AND v.headphone_type=? AND v.heard_a>=5 AND v.heard_b>=5
    AND ((v.winner_id=? AND v.loser_id=?) OR (v.winner_id=? AND v.loser_id=?))
    AND COALESCE((SELECT m.action FROM moderation_events m WHERE m.record_kind='vote' AND m.record_id=v.id ORDER BY m.sequence DESC LIMIT 1),'restore')!='remove'
    GROUP BY o.subject_id`).bind(study.target_a,study.start_at,study.end_at,study.notice_version,study.mode,study.headphone_type,study.target_a,study.target_b,study.target_b,study.target_a)
  ]);
  const sequence=Number((snapshot[1].results[0] as {next:number}).next),revision=Number((snapshot[0].results[0] as {revision:number}).revision);
  const release=buildArchiveV2(sequence,study.id,snapshot[2].results as unknown as ArchiveAccount[]);
  // No candidate payload is returned until the same transaction commits the slot.
  // Source revision protects deletion/withdrawal races; sequence protects global
  // composition, including parallel seals of DIFFERENT studies. No reroll on retry.
  await db.prepare(`INSERT OR IGNORE INTO archive_releases(sequence,study_id,payload)
   SELECT ?,?,? WHERE (SELECT revision FROM archive_source_revision WHERE id=1)=?
   AND (SELECT COALESCE(MAX(sequence)+1,0) FROM archive_releases)=?
   AND (SELECT id FROM archive_studies s WHERE NOT EXISTS (SELECT 1 FROM archive_releases r WHERE r.study_id=s.id) ORDER BY end_at,id LIMIT 1)=?`).bind(sequence,study.id,JSON.stringify(release),revision,sequence,study.id).run();
  const saved=await db.prepare("SELECT payload FROM archive_releases WHERE study_id=?").bind(study.id).first<{payload:string}>();
  if(!saved)return Response.json({error:"Source data or the release ledger changed. No result was released; retry."},{status:409,headers});
  return Response.json({release:JSON.parse(saved.payload)},{headers});
 }catch(error){return requestInputResponse(error)||Response.json({error:"Archive operation failed. No unsaved candidate was released."},{status:503,headers});}
}
