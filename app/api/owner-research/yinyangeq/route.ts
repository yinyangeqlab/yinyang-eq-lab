import { env } from "cloudflare:workers";
import { ownerAccessResponse } from "@/lib/owner-access";
import { profileAccount,createProfileAccount,createProfileGrant,claimProfileGrant,profileCookie,profileHash,profileSetCookie,PROFILE_CLAIM_COOKIE,revokeProfileDevice,profileOrigin,PROFILE_SLUG } from "@/lib/yinyangeq-account";
import { createHistoryCapture,historyPreview,migrateHistoryBatch } from "@/lib/yinyangeq-history";
import { readJsonObject,RequestInputError } from "@/lib/request-json";
import { profileHeaders,profileFailure } from "@/lib/profile-api";
export async function GET(request:Request){const denied=await ownerAccessResponse(request);if(denied)return denied;try{
 const profile=await profileAccount(env.DB!);if(!profile)return Response.json({created:false,devices:[],grants:[],snapshots:[],captures:[]},{headers:profileHeaders});
 const [devices,grants,snapshots,captures]=await Promise.all([
  env.DB!.prepare("SELECT id,label,created_at,revoked_at FROM owner_profile_devices WHERE profile_slug=? ORDER BY created_at DESC LIMIT 100").bind(PROFILE_SLUG).all(),
  env.DB!.prepare("SELECT id,label,created_at,expires_at,used_at,completed_at,cancelled_at FROM owner_profile_grants WHERE profile_slug=? ORDER BY created_at DESC LIMIT 30").bind(PROFILE_SLUG).all(),
  env.DB!.prepare("SELECT id,label,created_at FROM owner_profile_snapshots WHERE profile_slug=? ORDER BY created_at DESC LIMIT 20").bind(PROFILE_SLUG).all(),
  env.DB!.prepare("SELECT id,created_at,expires_at,completed_at,source_subject!='pending' AS captured FROM owner_history_claims WHERE profile_slug=? ORDER BY created_at DESC LIMIT 20").bind(PROFILE_SLUG).all(),
 ]);return Response.json({created:true,devices:devices.results,grants:grants.results,snapshots:snapshots.results,captures:captures.results},{headers:profileHeaders});
}catch(error){return profileFailure(error);}}
export async function POST(request:Request){const denied=await ownerAccessResponse(request);if(denied)return denied;try{
 profileOrigin(request);const body=await readJsonObject(request,16384);let result:unknown;
 switch(body.action){
 case "listen-here":{
  const tester=profileCookie(request,"__Host-yinyangeq_tester");
  if(/^[A-Za-z0-9_-]{43}$/.test(tester)){
   const approved=await env.DB!.prepare("SELECT 1 FROM private_tester_devices d JOIN private_tester_invites i ON i.id=d.invite_id JOIN owner_public_profiles p ON p.invite_id=d.invite_id JOIN owner_profile_devices v ON v.session_hash=d.session_hash WHERE p.slug=? AND d.session_hash=? AND d.expires_at>? AND i.revoked_at IS NULL AND i.session_expires_at>? AND v.revoked_at IS NULL").bind(PROFILE_SLUG,await profileHash(tester),Math.floor(Date.now()/1000),Math.floor(Date.now()/1000)).first();
   if(approved){const response=Response.json({redirect:"/account-sync?setup=1"},{headers:profileHeaders});for(const name of ["__Host-yinyangeq_owner","__Host-yinyangeq_data",PROFILE_CLAIM_COOKIE])response.headers.append("Set-Cookie",profileSetCookie(name,"",0));return response;}
  }
  const grant=await createProfileGrant(env.DB!,"My listening browser"),claim=await claimProfileGrant(env.DB!,grant.code);
  const response=Response.json({redirect:"/profile-access?approved=1"},{headers:profileHeaders});response.headers.append("Set-Cookie",profileSetCookie(PROFILE_CLAIM_COOKIE,claim.secret,600));return response;
 }
 case "create":await createProfileAccount(env.DB!);result={ok:true};break;
 case "grant":result=await createProfileGrant(env.DB!,body.label,typeof body.snapshotId==="string"&&body.snapshotId?body.snapshotId:undefined);break;
 case "revoke":await revokeProfileDevice(env.DB!,String(body.id));result={ok:true};break;
 case "cancel":await env.DB!.prepare("UPDATE owner_profile_grants SET cancelled_at=? WHERE id=? AND profile_slug=? AND completed_at IS NULL").bind(Date.now(),String(body.id),PROFILE_SLUG).run();result={ok:true};break;
 case "delete-snapshot":await env.DB!.prepare("DELETE FROM owner_profile_snapshots WHERE id=? AND profile_slug=?").bind(String(body.id),PROFILE_SLUG).run();result={ok:true};break;
 case "capture":result=await createHistoryCapture(env.DB!);break;
 case "preview-history":result=await historyPreview(env.DB!,String(body.id));break;
 case "move-history":result=await migrateHistoryBatch(env.DB!,String(body.id),body.selected,body.digest,body.independentlyVerified===true,body.reason,body.confirmation,body.saveSnapshot===true);break;
 default:throw new RequestInputError("Choose an account action.",400);
 }return Response.json(result,{headers:profileHeaders});
}catch(error){return profileFailure(error);}}
