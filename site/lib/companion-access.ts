import {ACCOUNT_SYNC_NOTICE_VERSION} from './account-sync-notice.mjs';
import {RequestInputError} from './request-json';

// A zero expiry is reserved for the durable library permission. Older, dated grants
// retain the read-only scope and expiry that their owners originally approved.
const joins=`FROM companion_library_grants g
  JOIN account_device_status ds ON ds.id=g.device_id AND ds.session_hash=g.access_hash
  JOIN private_tester_devices d ON d.session_hash=g.access_hash
  JOIN private_tester_invites i ON i.id=d.invite_id
  JOIN account_sync_permissions consent ON consent.subject_id=g.subject_id
  LEFT JOIN owner_public_profiles o ON o.subject_id=g.subject_id`;
const eligible=`g.challenge=? AND g.session_hash!='' AND ds.sync_enabled=1 AND i.revoked_at IS NULL
  AND consent.enabled=1 AND consent.notice_version=?
  AND (o.slug IS NULL OR EXISTS(SELECT 1 FROM owner_profile_devices p WHERE p.id=ds.id AND p.session_hash=d.session_hash AND p.revoked_at IS NULL))`;
export const editGuard=(challenge:string)=>({sql:`EXISTS(SELECT 1 ${joins} WHERE ${eligible} AND g.expires_at=0)`,args:[challenge,ACCOUNT_SYNC_NOTICE_VERSION]});
export async function companionAccess(db:D1Database,challenge:string){
  const now=Date.now();
  return db.prepare(`SELECT g.subject_id,COALESCE(o.slug,'') AS slug,g.device_id AS deviceId,
    g.expires_at=0 AS writable,g.personal_ranks AS personalRanks,d.invite_id,g.access_hash AS syncAccess,g.session_hash AS syncSession
    ${joins} WHERE ${eligible} AND (g.expires_at=0 OR (g.expires_at>? AND d.expires_at>unixepoch() AND i.session_expires_at>unixepoch()
    AND EXISTS(SELECT 1 FROM privacy_sessions s WHERE s.subject_id=g.subject_id AND s.token_hash=g.session_hash AND s.expires_at>?)))`)
    .bind(challenge,ACCOUNT_SYNC_NOTICE_VERSION,now,now).first<{subject_id:string;slug:string;deviceId:string;writable:number;personalRanks:number;invite_id:string;syncAccess:string;syncSession:string}>();
}
export async function companionKey(request:Request){
  const bearer=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('Authorization')||'');
  if(!bearer)throw new RequestInputError('A linked companion is required.',403);
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(bearer[1]));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
