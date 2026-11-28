import {env} from 'cloudflare:workers';
import {accountSyncIdentity} from '@/lib/account-sync-identity';
import {accountSyncPermission} from '@/lib/account-sync-permission';
import {profileOrigin} from '@/lib/yinyangeq-account';
import {profileFailure,profileHeaders} from '@/lib/profile-api';
import {readJsonObject,RequestInputError} from '@/lib/request-json';
import {readSyncId} from '@/lib/sync-recovery-store';

// Only an approved browser can issue a grant. The secret never leaves the phone during approval.
export async function POST(request:Request) {
  try {
    profileOrigin(request);
    const account=await accountSyncIdentity(request), body=await readJsonObject(request,1024);
    if(body.action==='disconnect'){
      await env.DB!.prepare("DELETE FROM companion_library_grants WHERE subject_id=? AND device_id=? AND session_hash!=''")
        .bind(account.subject_id,account.deviceId).run();
    } else {
      const challenge=String(body.challenge||''), issued=Number(body.issued);
      const rejected = body.action==='wrong-code' || body.action==='cancel';
      if((body.action!=='approve' && !rejected) || !/^[a-f0-9]{64}$/.test(challenge) || !Number.isSafeInteger(issued) || issued>Date.now()+60000 || Date.now()-issued>600000)
        throw new RequestInputError('Open a fresh link from your companion.',400);
      if(!rejected && (!account.deviceSyncEnabled || !(await accountSyncPermission(env.DB!,account.subject_id)).enabled))
        throw new RequestInputError('Enable account and browser sync before linking.',403);
      if(!rejected && body.syncId !== undefined){
        const matches=await env.DB!.prepare('SELECT 1 FROM sync_recovery_accounts WHERE sync_id=? AND subject_id=? AND invite_id=?')
          .bind(readSyncId(body.syncId),account.subject_id,account.invite_id).first();
        if(!matches)throw new RequestInputError('This browser is signed into a different Sync account. Check the Sync ID before approving.',403);
      }
      await env.DB!.prepare('DELETE FROM companion_library_grants WHERE subject_id=? AND expires_at>0 AND expires_at<=?').bind(account.subject_id,Date.now()).run();
      const personalRanks=!rejected && body.access==='edit-library-ranks-v2';
      const durable=personalRanks || body.access==='edit-library-v1';
      const inserted=await env.DB!.prepare(`INSERT OR IGNORE INTO companion_library_grants(challenge,subject_id,access_hash,session_hash,device_id,expires_at,personal_ranks)
        VALUES(?,?,?,?,?,?,?)`).bind(challenge,account.subject_id,rejected ? 'cancel' : account.syncAccess,rejected ? '' : account.syncSession,account.deviceId,
        rejected ? issued+600000 : durable ? 0 : Date.now()+30*86400000,Number(personalRanks)).run();
      if(!inserted.meta.changes)throw new RequestInputError('This link has already been used. Start again on your phone.',409);
    }
    return Response.json({ok:true},{headers:profileHeaders});
  } catch(e){return profileFailure(e);}
}
