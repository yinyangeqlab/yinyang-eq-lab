import {env} from "cloudflare:workers";
import {dataIdentity} from "@/lib/submission-ownership";
import {RETROSPECTIVE_NOTICE_VERSION,validId} from "@/lib/legacy-review";
import {readJsonObject,requestInputResponse,RequestInputError} from "@/lib/request-json";
const headers={"Cache-Control":"private, no-store","Vary":"Cookie"};
export async function GET(){try{const user=await dataIdentity();const rows=await env.DB!.prepare(`SELECT s.*,COALESCE(p.enabled,0) opted_in,EXISTS(SELECT 1 FROM archive_releases r WHERE r.study_id=s.id) sealed FROM archive_studies s LEFT JOIN retrospective_permissions p ON p.study_id=s.id AND p.subject_id=? WHERE s.source_mode='retrospective' ORDER BY s.end_at,s.id`).bind(user.subjectId).all();return Response.json({studies:rows.results,noticeVersion:RETROSPECTIVE_NOTICE_VERSION,sharedAdmin:user.subjectId==='owner',participationActive:user.submissionsEnabled},{headers});}catch(e){return requestInputResponse(e)||Response.json({error:"Retrospective settings unavailable."},{status:503,headers});}}
export async function PATCH(request:Request){
 if(request.headers.get("Origin")!==new URL(request.url).origin)return Response.json({error:"Invalid origin."},{status:403,headers});
 try{const user=await dataIdentity(),body=await readJsonObject(request,1024);if(!validId(body.studyId)||typeof body.enabled!=="boolean")throw new RequestInputError("Choose a study and your optional permission.",400);
 const study=await env.DB!.prepare("SELECT id FROM archive_studies WHERE id=? AND source_mode='retrospective'").bind(body.studyId).first();if(!study)throw new RequestInputError("Study unavailable.",404);
 if(body.enabled&&(!user.subjectId.startsWith('invite:')||!user.submissionsEnabled||body.acknowledged!==true||body.noticeVersion!==RETROSPECTIVE_NOTICE_VERSION))throw new RequestInputError("Eligible accounts with active participation must explicitly acknowledge the retrospective notice. Shared admin submissions are not eligible.",400);
 if(body.enabled&&await env.DB!.prepare("SELECT 1 AS sealed FROM archive_releases WHERE study_id=?").bind(body.studyId).first())throw new RequestInputError("This result is already sealed. New permission cannot change it; withdrawal and original-data deletion remain available.",409);
 // Selection and permission never spend budget. Sealed payloads are unaffected.
 await env.DB!.prepare(`INSERT INTO retrospective_permissions(study_id,subject_id,enabled,notice_version,agreed_at,withdrawn_at) VALUES (?,?,?,?,?,?) ON CONFLICT(study_id,subject_id) DO UPDATE SET enabled=excluded.enabled,notice_version=excluded.notice_version,agreed_at=CASE WHEN excluded.enabled=1 THEN excluded.agreed_at ELSE retrospective_permissions.agreed_at END,withdrawn_at=excluded.withdrawn_at`).bind(body.studyId,user.subjectId,body.enabled?1:0,RETROSPECTIVE_NOTICE_VERSION,Date.now(),body.enabled?null:Date.now()).run();return Response.json({ok:true},{headers});
 }catch(e){return requestInputResponse(e)||Response.json({error:"Retrospective permission could not be saved."},{status:503,headers});}
}
