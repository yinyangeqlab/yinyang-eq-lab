import {env} from 'cloudflare:workers';
import {ownerAccessResponse} from '@/lib/owner-access';
import {inspectAccountSync} from '@/lib/account-sync-server';
import {profileHeaders,profileFailure} from '@/lib/profile-api';
export async function GET(request:Request){const denied=await ownerAccessResponse(request);if(denied)return denied;try{return Response.json(await inspectAccountSync(env.DB!,'yinyangeq',request),{headers:profileHeaders});}catch(error){return profileFailure(error);}}
