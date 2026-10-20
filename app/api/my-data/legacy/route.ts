import {env} from "cloudflare:workers";
import {dataIdentity} from "@/lib/submission-ownership";
import {legacyKind,validId} from "@/lib/legacy-review";
import {readJsonObject,requestInputResponse} from "@/lib/request-json";
const headers={"Cache-Control":"private, no-store","Vary":"Cookie"};
export async function GET(){try{const user=await dataIdentity();const rows=await env.DB!.prepare("SELECT id,record_kind,record_id,message,status,admin_reason,created_at,reviewed_at FROM legacy_review_requests WHERE subject_id=? ORDER BY created_at DESC LIMIT 100").bind(user.subjectId).all();return Response.json({requests:rows.results},{headers});}catch(e){return requestInputResponse(e)||Response.json({error:"Legacy requests could not be loaded."},{status:503,headers});}}
export async function POST(request:Request){
 if(request.headers.get("Origin")!==new URL(request.url).origin)return Response.json({error:"Invalid origin."},{status:403,headers});
 try{const user=await dataIdentity(),body=await readJsonObject(request,2048);
 if(!legacyKind(body.kind)||!validId(body.id)||typeof body.message!=="string"||body.message.trim().length<10||body.message.length>500)return Response.json({error:"Choose a comparison ID and describe how the admin can independently verify your ownership (10–500 characters). Do not send passwords or sensitive documents."},{status:400,headers});
 // No lookup/preview/existence response: an ID alone never reveals another tester's data.
 const prior=await env.DB!.prepare("SELECT id FROM legacy_review_requests WHERE subject_id=? AND record_kind=? AND record_id=? AND status IN ('pending','approved') LIMIT 1").bind(user.subjectId,body.kind,body.id).first<{id:string}>();if(prior)return Response.json({ok:true,id:prior.id},{headers});
 const id=crypto.randomUUID();const r=await env.DB!.prepare("INSERT INTO legacy_review_requests(id,subject_id,record_kind,record_id,message,created_at) SELECT ?,?,?,?,?,? WHERE (SELECT count(*) FROM legacy_review_requests WHERE subject_id=? AND created_at>?)<20").bind(id,user.subjectId,body.kind,body.id,body.message.trim(),Date.now(),user.subjectId,Date.now()-86400000).run();
 if(!r.meta.changes)return Response.json({error:"Daily review-request limit reached."},{status:429,headers});return Response.json({ok:true,id},{status:201,headers});
 }catch(e){return requestInputResponse(e)||Response.json({error:"Review request could not be saved."},{status:503,headers});}
}
export async function DELETE(request:Request){
 if(request.headers.get("Origin")!==new URL(request.url).origin)return Response.json({error:"Invalid origin."},{status:403,headers});
 try{const user=await dataIdentity(),body=await readJsonObject(request,1024);if(!validId(body.id))return Response.json({error:"Choose a request."},{status:400,headers});
 // Approved evidence is removed by source erasure, not by revoking somebody's ownership.
 await env.DB!.prepare("DELETE FROM legacy_review_requests WHERE id=? AND subject_id=? AND status!='approved'").bind(body.id,user.subjectId).run();return Response.json({ok:true},{headers});
 }catch(e){return requestInputResponse(e)||Response.json({error:"Request could not be withdrawn."},{status:503,headers});}
}
