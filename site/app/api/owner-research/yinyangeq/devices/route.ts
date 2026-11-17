import {env} from 'cloudflare:workers';
import {ownerAccessResponse} from '@/lib/owner-access';
import {accountDevices} from '@/lib/account-devices';
import {requireProfileAccount} from '@/lib/yinyangeq-account';
import {profileHeaders,profileFailure} from '@/lib/profile-api';
export async function GET(request:Request){const denied=await ownerAccessResponse(request);if(denied)return denied;try{return Response.json(await accountDevices(env.DB!,{...await requireProfileAccount(env.DB!),protectedAccount:true}),{headers:profileHeaders});}catch(error){return profileFailure(error);}}
