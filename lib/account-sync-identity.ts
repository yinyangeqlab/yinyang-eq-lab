import {env} from 'cloudflare:workers';
import {dataIdentity} from '@/lib/submission-ownership';
import {requireParticipantSubject} from '@/lib/admin-contributions';
import {profileCookie,profileHash} from '@/lib/yinyangeq-account';
import {RequestInputError} from '@/lib/request-json';
export async function accountSyncIdentity(request:Request){
 const user=await dataIdentity();requireParticipantSubject(user.subjectId);
 const access=profileCookie(request,'__Host-yinyangeq_tester');if(!/^[A-Za-z0-9_-]{43}$/.test(access))throw new RequestInputError('Sign in on an approved device to manage account sync.',403);const accessHash=await profileHash(access);
 let device=await env.DB!.prepare('SELECT d.invite_id,p.id AS reserved_id,p.revoked_at FROM private_tester_devices d JOIN private_tester_invites i ON i.id=d.invite_id LEFT JOIN owner_profile_devices p ON p.session_hash=d.session_hash WHERE d.session_hash=? AND d.expires_at>? AND i.revoked_at IS NULL AND i.session_expires_at>?').bind(accessHash,Math.floor(Date.now()/1000),Math.floor(Date.now()/1000)).first<{invite_id:string;reserved_id:string|null;revoked_at:number|null}>();
 if(!device){const root=await env.DB!.prepare('SELECT id,session_expires_at FROM private_tester_invites WHERE session_hash=? AND revoked_at IS NULL AND session_expires_at>?').bind(accessHash,Math.floor(Date.now()/1000)).first<{id:string;session_expires_at:number}>();if(root){const subject=root.id.startsWith('open-')?'browser:'+root.id.slice(5):'invite:'+root.id;if(subject===user.subjectId){await env.DB!.prepare('INSERT OR IGNORE INTO private_tester_devices(session_hash,invite_id,data_token_hash,created_at,expires_at) VALUES(?,?,?,?,?)').bind(accessHash,root.id,user.sessionHash,Math.floor(Date.now()/1000),root.session_expires_at).run();device={invite_id:root.id,reserved_id:null,revoked_at:null};}}}
 if(!device||device.revoked_at!==null&&device.reserved_id)throw new RequestInputError('This device needs fresh approval.',403);
 const expected=device.invite_id.startsWith('open-')?'browser:'+device.invite_id.slice(5):'invite:'+device.invite_id;
 if(user.subjectId!==expected)throw new RequestInputError('Use this device’s participant account, not an admin or another data session.',403);
 const reserved=await env.DB!.prepare('SELECT slug FROM owner_public_profiles WHERE subject_id=?').bind(user.subjectId).first<{slug:string}>();
 if(reserved&&!device.reserved_id)throw new RequestInputError('YinYangEQ requires an admin-approved device.',403);
 await env.DB!.prepare("INSERT OR IGNORE INTO account_device_status(id,session_hash,label) SELECT ?,?,COALESCE((SELECT label FROM owner_profile_devices WHERE session_hash=?),'Unnamed device') WHERE EXISTS(SELECT 1 FROM private_tester_devices WHERE session_hash=? AND expires_at>?)").bind(device.reserved_id||crypto.randomUUID(),accessHash,accessHash,accessHash,Math.floor(Date.now()/1000)).run();
 const status=await env.DB!.prepare('SELECT id,sync_enabled FROM account_device_status WHERE session_hash=?').bind(accessHash).first<{id:string;sync_enabled:number}>();if(!status)throw new RequestInputError('This device was disconnected.',403);
 return {subject_id:user.subjectId,invite_id:device.invite_id,slug:reserved?.slug||'',protectedAccount:!!reserved,syncSession:user.sessionHash,syncAccess:accessHash,deviceId:status.id,deviceSyncEnabled:status.sync_enabled===1};
}
