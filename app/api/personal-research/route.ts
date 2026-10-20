import { requireParticipantSubject } from "@/lib/admin-contributions";
import { env } from "cloudflare:workers";
import { dataIdentity } from "@/lib/submission-ownership";
import { personalPermission, personalPermissionStatement } from "@/lib/personal-research-server";
import { PERSONAL_RESEARCH_NOTICE_VERSION } from "@/lib/personal-research-notice";
import { readJsonObject, RequestInputError, requestInputResponse } from "@/lib/request-json";
import { publicWriteGate } from "@/lib/public-write-gate";
import { intervalStats, parseIntervals } from "@/lib/listening";
import { listeningPool } from "@/lib/music-catalog";
import { targetHeadphoneType } from "@/lib/target-type";
import { LISTENING_PROTOCOL, FREE_LISTENING_PROTOCOL } from "@/lib/listening-protocol";
const headers={"Cache-Control":"private, no-store","Vary":"Cookie"};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function sameOrigin(request:Request){if(request.headers.get("Origin")!==new URL(request.url).origin)throw new RequestInputError("Invalid origin.",403);}
function failed(error:unknown){const input=requestInputResponse(error);if(input){for(const [key,value] of Object.entries(headers))input.headers.set(key,value);return input;}return Response.json({error:"Personal research sharing is unavailable. Your local progress is safe."},{status:503,headers});}
export async function GET(){try{const identity=await dataIdentity();const permission=await personalPermission(env.DB!,identity.subjectId,identity.submissionsEnabled);const own=identity.subjectId!=="owner"?await env.DB!.prepare("SELECT 1 FROM owner_public_profiles WHERE subject_id=?").bind(identity.subjectId).first():null;return Response.json({...permission,ownerProfile:!!own},{headers});}catch(error){return failed(error);}}
export async function PATCH(request:Request){try{
  sameOrigin(request);const identity=await dataIdentity();const body=await readJsonObject(request,1024);
  if(typeof body.enabled!=="boolean")throw new RequestInputError("Choose whether to contribute personal comparisons.",400);
  if(body.enabled&&(!identity.submissionsEnabled||body.acknowledged!==true||body.noticeVersion!==PERSONAL_RESEARCH_NOTICE_VERSION))throw new RequestInputError("Review and explicitly enable the personal research option while participating.",403);
  await personalPermissionStatement(env.DB!,identity.subjectId,body.enabled).run();
  const permission=await personalPermission(env.DB!,identity.subjectId,identity.submissionsEnabled);const own=identity.subjectId!=="owner"?await env.DB!.prepare("SELECT 1 FROM owner_public_profiles WHERE subject_id=?").bind(identity.subjectId).first():null;return Response.json({...permission,ownerProfile:!!own},{headers});
}catch(error){return failed(error);}}
export async function POST(request:Request){try{
  sameOrigin(request);const identity=await dataIdentity();requireParticipantSubject(identity.subjectId);const limited=await publicWriteGate(request);if(limited)return limited;
  const data=await readJsonObject(request,16384);const permission=await personalPermission(env.DB!,identity.subjectId,identity.submissionsEnabled);
  if(!permission.enabled||data.consentToken!==permission.token||data.noticeVersion!==PERSONAL_RESEARCH_NOTICE_VERSION)throw new RequestInputError("Personal research sharing is off or changed. Review your sharing option.",403);
  const id=String(data.id||""),a=String(data.targetAId||""),b=String(data.targetBId||""),setup=String(data.setupFingerprint||""),recording=String(data.recordingId||"");
  if(![id,a,b].every(x=>uuid.test(x))||a===b||!/^[a-f0-9]{64}$/.test(setup)||!["a","b","tie"].includes(String(data.result))||!["ie","oe"].includes(String(data.headphoneType))||!["explore","confirm"].includes(String(data.phase))||!Number.isInteger(data.roundNumber)||Number(data.roundNumber)<1||Number(data.roundNumber)>500||data.schedulerVersion!=="personal-v1"||!(listeningPool.some(track=>track.url===recording)||data.musicMode==="upload"&&/^own:[a-f0-9-]{36}$/i.test(recording)||data.matchedPassageRequired===false&&recording===""))throw new RequestInputError("Invalid personal comparison.",400);
  if (!["-14","-16","-18","off"].includes(String(data.loudnessTarget))||!["auto","uploaded","off"].includes(String(data.channelMode))) throw new RequestInputError("Invalid personal playback context.",400);
  if(data.matchedPassageRequired!==undefined&&typeof data.matchedPassageRequired!=="boolean")throw new RequestInputError("Invalid listening requirement.",400);
  const intervals=parseIntervals(data.intervals),stats=intervalStats(intervals);
  if(!Array.isArray(data.intervals)||data.intervals.length>200||intervals.length!==data.intervals.length)throw new RequestInputError("Invalid playback intervals.",400);
  if(data.matchedPassageRequired!==false&&(stats.heardA<5||stats.heardB<5||stats.overlapSeconds<5))throw new RequestInputError("Personal research needs five matched seconds on both sides.",400);
  const ids=data.candidateIds,excluded=data.excludedIds;
  if(!Array.isArray(ids)||ids.length<2||ids.length>256||new Set(ids).size!==ids.length||!ids.every(x=>typeof x==="string"&&uuid.test(x))||!ids.includes(a)||!ids.includes(b)||!Array.isArray(excluded)||excluded.length>ids.length||!excluded.every(x=>ids.includes(x))||excluded.includes(a)||excluded.includes(b))throw new RequestInputError("Invalid personal candidate pool.",400);
  const catalog=await env.DB!.prepare("SELECT id,name,measurement,headphone_type AS headphoneType FROM targets WHERE status='approved' AND NOT EXISTS (SELECT 1 FROM submission_owners o WHERE o.record_kind='target' AND o.record_id=targets.id AND o.subject_id IN ('owner','invite:layout-test-only'))").all<{id:string;name:string;measurement:string|null;headphoneType?:"ie"|"oe"}>();
  const byId=new Map(catalog.results.map(t=>[t.id,t]));
  for(const target of ids){const t=byId.get(target);if(!t)throw new RequestInputError("Only current approved targets can be contributed.",403);let measurement=null;try{measurement=t.measurement?JSON.parse(t.measurement):null;}catch{throw new RequestInputError("Target context unavailable.",409);}const kind=targetHeadphoneType({name:t.name,measurement,headphoneType:t.headphoneType});if(kind&&kind!==data.headphoneType)throw new RequestInputError("Target and headphone categories must match.",400);}
  // The permission is checked again by a database trigger in this atomic batch.
  // No vote, listening-run, ranked-trial or permanent archive row is created.
  await env.DB!.batch([
    env.DB!.prepare("INSERT INTO personal_research_choices(id,subject_id,consent_token,notice_version,target_a_id,target_b_id,result,headphone_type,setup_fingerprint,recording_id,playback_json,selection_json,phase,round_number,protocol_version,scheduler_version,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,identity.subjectId,permission.token,PERSONAL_RESEARCH_NOTICE_VERSION,a,b,String(data.result),String(data.headphoneType),setup,recording,JSON.stringify(intervals),JSON.stringify({candidateIds:ids,excludedIds:excluded,matchedPassageRequired:data.matchedPassageRequired!==false,matchedPassage:stats.heardA>=5&&stats.heardB>=5&&stats.overlapSeconds>=5,loudnessTarget:data.loudnessTarget,channelMode:data.channelMode,musicMode:["pool","song","playlist","upload"].includes(String(data.musicMode))?data.musicMode:"pool"}),String(data.phase),Number(data.roundNumber),data.matchedPassageRequired===false?FREE_LISTENING_PROTOCOL:LISTENING_PROTOCOL,"personal-v1",Date.now()),
    env.DB!.prepare("INSERT INTO submission_owners(record_kind,record_id,subject_id,session_hash) VALUES('personal',?,?,?)").bind(id,identity.subjectId,identity.sessionHash)
  ]);
  return Response.json({ok:true},{status:201,headers});
}catch(error){if(/Personal research permission changed/.test(String(error)+String((error as {cause?:unknown})?.cause)))return Response.json({error:"Your research permission changed. This choice was kept locally."},{status:409,headers});return failed(error);}}
