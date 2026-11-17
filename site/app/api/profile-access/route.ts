import { env } from "cloudflare:workers";
import { claimProfileGrant,completeProfileGrant,profileGrantPreview,profileOrigin,profileCookie,profileSetCookie,PROFILE_CLAIM_COOKIE } from "@/lib/yinyangeq-account";
import { readJsonObject,RequestInputError } from "@/lib/request-json";
import { profileHeaders,profileFailure } from "@/lib/profile-api";
export async function GET(request:Request){try{return Response.json(await profileGrantPreview(env.DB!,profileCookie(request,PROFILE_CLAIM_COOKIE)),{headers:profileHeaders});}catch(error){return profileFailure(error);}}
export async function POST(request:Request){try{
 profileOrigin(request);const body=await readJsonObject(request,2048);
 if(body.action==="claim"){
  const result=await claimProfileGrant(env.DB!,body.code),response=Response.json({label:result.label},{headers:profileHeaders});response.headers.append("Set-Cookie",profileSetCookie(PROFILE_CLAIM_COOKIE,result.secret,600));return response;
 }
 if(body.action!=="complete")throw new RequestInputError("Invalid sign-in action.",400);
 const result=await completeProfileGrant(env.DB!,profileCookie(request,PROFILE_CLAIM_COOKIE),body.replacementApplied===true,typeof body.snapshotDigest==="string"?body.snapshotDigest:undefined);
 const response=Response.json({ok:true,redirect:"/account-sync?setup=1"},{headers:profileHeaders});
 response.headers.append("Set-Cookie",profileSetCookie("__Host-yinyangeq_tester",result.access,result.seconds));
 response.headers.append("Set-Cookie",profileSetCookie("__Host-yinyangeq_data",result.data,result.seconds));
 response.headers.append("Set-Cookie",profileSetCookie("__Host-yinyangeq_owner","",0));
 return response;
}catch(error){return profileFailure(error);}}
