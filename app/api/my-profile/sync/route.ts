import {env} from 'cloudflare:workers';
import {accountSyncIdentity} from '@/lib/account-sync-identity';
import {accountConsent} from '@/lib/account-consent';
import {readAccountSync,syncLocation} from '@/lib/account-sync-state';
import {profileOrigin,profileHash,currentAccountSnapshot} from '@/lib/yinyangeq-account';
import {validateAccountValues} from '@/lib/account-sync.mjs';
import {readJsonObject,RequestInputError} from '@/lib/request-json';
import {profileHeaders,profileFailure} from '@/lib/profile-api';
export async function GET(request:Request){try{
 const account=await accountSyncIdentity(request),consent=await accountConsent(env.DB!,account.subject_id);
 if(!consent.syncEnabled||!account.deviceSyncEnabled)return Response.json({enabled:false,devicePaused:!account.deviceSyncEnabled,consent,protectedAccount:account.protectedAccount},{headers:profileHeaders});
 const row=(await readAccountSync(env.DB!,account,true))!;
 const basic={accountKey:await profileHash("account:"+account.subject_id),enabled:true,epoch:row.epoch,revision:row.revision,initialized:!!row.initialized,values:validateAccountValues(JSON.parse(row.payload)),consent,protectedAccount:account.protectedAccount};
 if(!new URL(request.url).searchParams.has('inspect'))return Response.json(basic,{headers:profileHeaders});
 const url=new URL(request.url),before=Number(url.searchParams.get('before')||Number.MAX_SAFE_INTEGER),beforeId=url.searchParams.get('beforeId')||'~';if(!Number.isSafeInteger(before)||before<0||beforeId.length>100)throw new RequestInputError('Invalid activity cursor.',400);
 const result=await env.DB!.prepare('SELECT id,event_type,route,created_at FROM activity_events WHERE subject_id=? AND (created_at>=? OR ?=1) AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT 201').bind(account.subject_id,Date.now()-30*86400000,account.protectedAccount?1:0,before,before,beforeId).all<{id:string;created_at:number}>(),activity=result.results.slice(0,200),last=activity.at(-1);
 return Response.json({...basic,activity,next:result.results.length>200&&last?{before:last.created_at,beforeId:last.id}:null,retention:account.protectedAccount?'indefinite':'until account data is deleted'},{headers:profileHeaders});
}catch(error){return profileFailure(error);}}
export async function POST(request:Request){try{
 profileOrigin(request);const account=await accountSyncIdentity(request),consent=await accountConsent(env.DB!,account.subject_id);if(!consent.syncEnabled||!account.deviceSyncEnabled)throw new RequestInputError('Account sync is off or paused on this device. Review Sync settings and data consent.',403);
 const body=await readJsonObject(request,530000);if(body.protocol!==2)throw new RequestInputError('Refresh this browser to load the updated sync controls. Its local data is unchanged.',426);if(typeof body.epoch!=='string'||!Number.isSafeInteger(body.revision)||Number(body.revision)<0)throw new RequestInputError('Read current sync state first.',400);
 const current=(await readAccountSync(env.DB!,account,true))!;if(current.epoch!==body.epoch||current.revision!==body.revision)throw new RequestInputError('Account data changed on another device. Retry with the latest version.',409);
 let values;try{values=validateAccountValues(body.values);}catch{throw new RequestInputError('Invalid or oversized account sync data.',400);}
 const filtered=await currentAccountSnapshot(env.DB!,account.subject_id,{version:1,values:{...values,'target-lab-voter':'00000000-0000-4000-8000-000000000000'}});delete (filtered.values as Record<string,string>)['target-lab-voter'];
 if(JSON.stringify(filtered.values)!==JSON.stringify(values))throw new RequestInputError('Some history belongs to another account or was deleted. It remains on this browser; review ownership in My data before syncing it.',422);
 const at=syncLocation(account),result=await env.DB!.prepare(`UPDATE ${at.table} SET payload=?,initialized=1,revision=revision+1,updated_at=? WHERE ${at.column}=? AND epoch=? AND revision=?
 AND EXISTS(SELECT 1 FROM private_tester_devices d JOIN account_device_status ds ON ds.session_hash=d.session_hash JOIN private_tester_invites i ON i.id=d.invite_id JOIN privacy_sessions s ON s.subject_id=? JOIN account_sync_permissions p ON p.subject_id=s.subject_id
 WHERE s.token_hash=? AND d.session_hash=? AND d.invite_id=? AND d.expires_at>? AND i.revoked_at IS NULL AND i.session_expires_at>unixepoch() AND s.expires_at>? AND ds.sync_enabled=1 AND p.enabled=1 AND p.notice_version=?) AND NOT EXISTS(SELECT 1 FROM owner_profile_devices revoked WHERE revoked.id=? AND revoked.revoked_at IS NOT NULL) RETURNING revision`).bind(JSON.stringify(values),Date.now(),at.id,body.epoch,body.revision,account.subject_id,account.syncSession,account.syncAccess,account.invite_id,Math.floor(Date.now()/1000),Date.now(),'account-sync-2026-10-19-v1',account.deviceId).first<{revision:number}>();
 if(!result)throw new RequestInputError('Account data or device permission changed. Reload Sync settings.',409);
 return Response.json({accountKey:await profileHash("account:"+account.subject_id),enabled:true,epoch:body.epoch,revision:result.revision,initialized:true,values,consent:await accountConsent(env.DB!,account.subject_id)},{headers:profileHeaders});
}catch(error){return profileFailure(error);}}
