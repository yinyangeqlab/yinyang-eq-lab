import {env} from 'cloudflare:workers';
import {accountSyncIdentity} from '@/lib/account-sync-identity';
import {accountDevices} from '@/lib/account-devices';
import {profileOrigin} from '@/lib/yinyangeq-account';
import {readJsonObject,RequestInputError} from '@/lib/request-json';
import {profileHeaders,profileFailure} from '@/lib/profile-api';
const hash=(value:unknown)=>value===null||typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export async function GET(request:Request){try{const account=await accountSyncIdentity(request);return Response.json(await accountDevices(env.DB!,account,account.deviceId),{headers:profileHeaders});}catch(error){return profileFailure(error);}}
export async function POST(request:Request){try{
 profileOrigin(request);const account=await accountSyncIdentity(request),body=await readJsonObject(request,3000);
 const guard='EXISTS(SELECT 1 FROM private_tester_devices caller JOIN private_tester_invites i ON i.id=caller.invite_id JOIN privacy_sessions cs ON cs.subject_id=? WHERE caller.session_hash=? AND caller.expires_at>? AND i.revoked_at IS NULL AND i.session_expires_at>unixepoch() AND cs.token_hash=? AND cs.expires_at>?) AND NOT EXISTS(SELECT 1 FROM owner_profile_devices revoked WHERE revoked.id=? AND revoked.revoked_at IS NOT NULL)';
 const args=()=>[account.subject_id,account.syncAccess,Math.floor(Date.now()/1000),account.syncSession,Date.now(),account.deviceId] as const;
 if(['describe','pause','resume','disconnect'].includes(String(body.action))){
  if(typeof body.deviceId!=='string')throw new RequestInputError('Choose an approved device.',400);
  const target=await env.DB!.prepare('SELECT s.id,s.session_hash,d.data_token_hash FROM account_device_status s JOIN private_tester_devices d ON d.session_hash=s.session_hash WHERE s.id=? AND d.invite_id=?').bind(body.deviceId,account.invite_id).first<{id:string;session_hash:string;data_token_hash:string}>();if(!target)throw new RequestInputError('Device not found.',404);
  if(body.action==='describe'){
   if(typeof body.label!=='string'||!body.label.trim()||body.label.trim().length>60||typeof body.notes!=='string'||body.notes.length>300||typeof body.browserName!=='string'||body.browserName.length>60||/[\x00-\x1f\x7f]/.test(body.label+body.notes+body.browserName))throw new RequestInputError('Use a device name of 1–60 characters, optional browser name up to 60, and a single-line note up to 300.',400);
   await env.DB!.prepare(`UPDATE account_device_status SET label=?,browser_name=?,notes=? WHERE id=? AND ${guard}`).bind(body.label.trim(),body.browserName.trim(),body.notes.trim(),target.id,...args()).run();
  }else if(body.action==='pause'||body.action==='resume'){
   await env.DB!.prepare(`UPDATE account_device_status SET sync_enabled=?,state='paused',checked_at=NULL WHERE id=? AND ${guard}`).bind(body.action==='resume'?1:0,target.id,...args()).run();
  }else{
   await env.DB!.batch([
    env.DB!.prepare(`DELETE FROM browser_pairings WHERE (claim_hash=? OR source_hash=?) AND invite_id=? AND ${guard}`).bind(target.session_hash,target.session_hash,account.invite_id,...args()),
        env.DB!.prepare(`UPDATE private_tester_invites SET session_hash=lower(hex(randomblob(32))) WHERE id=? AND session_hash=? AND ${guard}`).bind(account.invite_id,target.session_hash,...args()),
    env.DB!.prepare(`UPDATE owner_profile_devices SET revoked_at=?,session_hash=NULL WHERE session_hash=? AND ${guard}`).bind(Date.now(),target.session_hash,...args()),
    env.DB!.prepare(`DELETE FROM private_tester_devices WHERE session_hash=? AND invite_id=? AND ${guard}`).bind(target.session_hash,account.invite_id,...args()),
   ]);
   const remaining=await env.DB!.prepare('SELECT 1 FROM private_tester_devices WHERE session_hash=?').bind(target.session_hash).first();if(!remaining)await env.DB!.prepare('DELETE FROM privacy_sessions WHERE token_hash=? AND subject_id=?').bind(target.data_token_hash,account.subject_id).run();
  }
 }else if(body.action==='report'){
  if(!['synced','pending','conflict','paused'].includes(String(body.state))||typeof body.epoch!=='string'||body.epoch.length>100||!Number.isSafeInteger(body.revision)||Number(body.revision)<0||!hash(body.dataDigest)||!hash(body.consentStamp))throw new RequestInputError('Invalid device confirmation.',400);
  const result=await env.DB!.prepare(`UPDATE account_device_status SET epoch=?,revision=?,data_digest=?,consent_stamp=?,state=CASE WHEN sync_enabled=0 THEN 'paused' ELSE ? END,checked_at=? WHERE id=? AND ${guard} RETURNING id`).bind(body.epoch,body.revision,body.dataDigest,body.consentStamp,body.state,Date.now(),account.deviceId,...args()).first();if(!result)throw new RequestInputError('This device is no longer approved.',403);
 }else throw new RequestInputError('Choose a device action.',400);
 return Response.json({ok:true},{headers:profileHeaders});
}catch(error){return profileFailure(error);}}
