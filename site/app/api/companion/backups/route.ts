import {env} from 'cloudflare:workers';
import {history} from '@/lib/companion-backups';
import {accountSyncIdentity} from '@/lib/account-sync-identity';
import {profileFailure,profileHeaders} from '@/lib/profile-api';
import {profileOrigin} from '@/lib/yinyangeq-account';
import {RequestInputError,readJsonObject} from '@/lib/request-json';

async function browser(request:Request){
  if(request.headers.has('Authorization'))throw new RequestInputError('Open My Collection in your signed-in browser.',403);
  return accountSyncIdentity(request);
}
export async function GET(request:Request){try{
  const account=await browser(request),params=new URL(request.url).searchParams,offset=Number(params.get('offset')||0);
  if(!Number.isSafeInteger(offset)||offset<0)throw new RequestInputError('Invalid page.',400);
  const rows=await history(env.DB!,account.subject_id,offset,params.get('part')||'');
  return Response.json({rows:rows.slice(0,15),next:rows.length>15?offset+15:null},{headers:profileHeaders});
}catch(e){return profileFailure(e);}}
export async function DELETE(request:Request){try{
  profileOrigin(request);const account=await browser(request),body=await readJsonObject(request,256);
  if(typeof body.id!=='string')throw new RequestInputError('Choose a backup version.',400);
  const r=await env.DB!.prepare('DELETE FROM companion_preset_history WHERE subject_id=? AND id=?').bind(account.subject_id,body.id).run();
  if(!r.meta.changes)throw new RequestInputError('Version is no longer in your collection.',404);
  return Response.json({ok:true},{headers:profileHeaders});
}catch(e){return profileFailure(e);}}
