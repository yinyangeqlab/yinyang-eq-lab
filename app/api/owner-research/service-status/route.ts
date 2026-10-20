import {ownerAccessResponse} from '@/lib/owner-access';
import {readJsonObject,requestInputResponse} from '@/lib/request-json';
import {publishServiceStatus,readServiceStatus,DEFAULT_MAINTENANCE_MESSAGE} from '@/lib/service-status';
import {validNoticeMinutes} from '@/lib/notice-duration';
const headers={'Cache-Control':'private, no-store'};
export async function GET(request:Request){const denied=await ownerAccessResponse(request);if(denied)return denied;try{return Response.json(await readServiceStatus(true),{headers});}catch{return Response.json({error:'Could not load the site notice.'},{status:503,headers});}}
export async function POST(request:Request){
 const denied=await ownerAccessResponse(request);if(denied)return denied;
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Invalid origin.'},{status:403,headers});
 try{const body=await readJsonObject(request,4096);
 const durationMinutes=body.durationMinutes===undefined&&typeof body.hours==='number'&&[1,2,8,24].includes(body.hours)?body.hours*60:body.durationMinutes;
 if(typeof body.active!=='boolean'||typeof body.pauseSubmissions!=='boolean'||!validNoticeMinutes(durationMinutes)||typeof body.message!=='string'||body.message.length>500)return Response.json({error:'Choose a notice, duration and maintenance setting.'},{status:400,headers});
 const message=body.message.trim()||DEFAULT_MAINTENANCE_MESSAGE;
 return Response.json(await publishServiceStatus({active:body.active,message,pauseSubmissions:body.pauseSubmissions,durationMinutes}),{headers});
 }catch(error){return requestInputResponse(error)||Response.json({error:'The site notice could not be saved. Try again.'},{status:503,headers});}
}
