import {consentStudyStatements} from '@/lib/consent-studies';
import {env} from "cloudflare:workers";
import {dataIdentity} from "@/lib/submission-ownership";
import {RETROSPECTIVE_NOTICE_VERSION,validId} from "@/lib/legacy-review";
import {readJsonObject,requestInputResponse,RequestInputError} from "@/lib/request-json";
const headers={"Cache-Control":"private, no-store","Vary":"Cookie"};
export async function GET(){try{const user=await dataIdentity();const rows=await env.DB!.prepare(`SELECT s.*,COALESCE(p.enabled,0) opted_in,EXISTS(SELECT 1 FROM archive_releases r WHERE r.study_id=s.id) sealed FROM archive_studies s LEFT JOIN retrospective_permissions p ON p.study_id=s.id AND p.subject_id=? WHERE s.source_mode='retrospective' ORDER BY s.end_at,s.id`).bind(user.subjectId).all();return Response.json({studies:rows.results,noticeVersion:RETROSPECTIVE_NOTICE_VERSION,sharedAdmin:user.subjectId==='owner',participationActive:user.submissionsEnabled},{headers});}catch(e){return requestInputResponse(e)||Response.json({error:"Retrospective settings unavailable."},{status:503,headers});}}
export async function PATCH(request:Request){
 if(request.headers.get("Origin")!==new URL(request.url).origin)return Response.json({error:"Invalid origin."},{status:403,headers});
 try{const user=await dataIdentity(),body=await readJsonObject(request,1024);if(!validId(body.studyId)||typeof body.enabled!=="boolean")throw new RequestInputError("Choose a study and your optional permission.",400);
 const statements=await consentStudyStatements(env.DB!,user.subjectId,[{studyId:body.studyId,enabled:body.enabled}],body.acknowledged,body.noticeVersion,user.submissionsEnabled);
 if(body.enabled&&!user.submissionsEnabled)throw new RequestInputError("Review and enable participation in data choices first.",400);
 await env.DB!.batch(statements);return Response.json({ok:true},{headers});
 }catch(e){return requestInputResponse(e)||Response.json({error:"Retrospective permission could not be saved."},{status:503,headers});}
}
