import {env} from 'cloudflare:workers';
import {accountSyncPermission} from '@/lib/account-sync-permission';
import {readAccountSync} from '@/lib/account-sync-state';
import {segmentedHead} from '@/lib/account-sync-segments';
import {digest} from '@/lib/device-sync.mjs';
import {profileFailure,profileHeaders} from '@/lib/profile-api';
import {RequestInputError} from '@/lib/request-json';

const keys=['target-lab-library-eqs-v1','target-lab-measurements'] as const;
const denied=()=>new RequestInputError('Link your companion from an approved browser with Sync enabled.',403);
async function credential(request:Request){
  const m=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('Authorization')||'');
  if(!m)throw denied();
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(m[1]));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
function reply(data:unknown){return Response.json(data,{headers:{...profileHeaders,Vary:'Authorization'}});}
export async function DELETE(request:Request){try{
  await env.DB!.prepare('DELETE FROM companion_library_grants WHERE challenge=?').bind(await credential(request)).run();
  return reply({ok:true});
}catch(e){return profileFailure(e);}}
export async function GET(request:Request){try{
  const db=env.DB!,challenge=await credential(request);
  const account=await db.prepare(`SELECT g.subject_id,COALESCE(o.slug,'') AS slug
    FROM companion_library_grants g JOIN private_tester_devices d ON d.session_hash=g.access_hash
    JOIN account_device_status ds ON ds.session_hash=d.session_hash AND ds.id=g.device_id
    JOIN private_tester_invites i ON i.id=d.invite_id
    JOIN privacy_sessions s ON s.subject_id=g.subject_id AND s.token_hash=g.session_hash
    LEFT JOIN owner_public_profiles o ON o.subject_id=g.subject_id
    WHERE g.challenge=? AND g.expires_at>? AND ds.sync_enabled=1 AND d.expires_at>unixepoch()
      AND i.revoked_at IS NULL AND i.session_expires_at>unixepoch() AND s.expires_at>?
      AND (o.slug IS NULL OR EXISTS(SELECT 1 FROM owner_profile_devices p WHERE p.id=ds.id AND p.session_hash=d.session_hash AND p.revoked_at IS NULL))`)
    .bind(challenge,Date.now(),Date.now()).first<{subject_id:string;slug:string}>();
  if(!account || !(await accountSyncPermission(db,account.subject_id)).enabled)throw denied();
  const row=await readAccountSync(db,{...account,protectedAccount:!!account.slug});
  if(!row?.initialized)return reply({eqs:[],measurements:[]});
  const params=new URL(request.url).searchParams,offset=Number(params.get('offset')||0),limit=2;
  if(!Number.isSafeInteger(offset)||offset<0)throw new RequestInputError('Invalid page.',400);
  if(offset && (params.get('epoch')!==row.epoch || params.get('revision')!==String(row.revision)))
    throw new RequestInputError('Your collection changed. Refresh again.',409);
  const head=segmentedHead(row.payload);
  let more=false;
  const version=head?await db.prepare('SELECT manifest FROM account_sync_versions WHERE id=? AND subject_id=? AND committed_at IS NOT NULL')
      .bind(head.version,account.subject_id).first<{manifest:string}>():null;
  if(head && !version)throw new Error('Unavailable collection');
  const manifest=version?JSON.parse(version.manifest):null, legacy=!head?JSON.parse(row.payload):null;
  async function selected(key:typeof keys[number]){
    if(!head){
      const entries=JSON.parse(legacy[key]||'[]');more ||= entries.length>offset+limit;
      return entries.slice(offset,offset+limit);
    }
    const section=manifest[key];if(!section)return [];
    const entries=(await db.prepare(`SELECT e.entry_index,e.part_count,e.content_hash FROM account_sync_entries e
      JOIN account_sync_versions v ON v.id=e.version_id AND v.subject_id=? AND v.committed_at IS NOT NULL
      WHERE e.version_id=? AND e.storage_key=? ORDER BY e.entry_index LIMIT ? OFFSET ?`)
      .bind(account!.subject_id,section.version,key,limit+1,offset).all<{entry_index:number;part_count:number;content_hash:string}>()).results;
    more ||= entries.length>limit;
    const items=[];
    for(const e of entries.slice(0,limit)){
      const parts=(await db.prepare(`SELECT p.part_index,p.payload FROM account_sync_parts p WHERE p.version_id=? AND p.storage_key=? AND p.entry_index=? ORDER BY p.part_index`)
        .bind(section.version,key,e.entry_index).all<{part_index:number;payload:string}>()).results;
      if(parts.length!==e.part_count||parts.some((p,i)=>p.part_index!==i))throw new Error('Incomplete collection entry');
      const item=JSON.parse(parts.map(p=>p.payload).join(''));
      if(await digest(item)!==e.content_hash)throw new Error('Invalid collection entry');
      items.push(item);
    }
    return items;
  }
  // Expose audio data only. Keep notes, research IDs, votes and listening history outside this response.
  type Filter = {type:string;hz:number;gain:number;q:number};
  type Stereo = {leftPoints?:number[][];rightPoints?:number[][];leftLevelDb?:number;rightLevelDb?:number;channelMatchMode?:string;
    channelMatchPreset?:{channels:{preampDb:number;filters:Filter[]}[]}};
  type SavedEq = {id:string;name:string;preamp:number;measurementId?:string;filters:Filter[];target?:{name:string;points:number[][]};channelMatch?:Stereo};
  type Measurement = Stereo & {id:string;name:string;device?:string;type:string;points:number[][]};
  const filters=(rows:Filter[])=>rows.map(({type,hz,gain,q})=>({type,hz,gain,q}));
  const match=(m?:Stereo)=>m && ({leftPoints:m.leftPoints,rightPoints:m.rightPoints,leftLevelDb:m.leftLevelDb,rightLevelDb:m.rightLevelDb,
    channelMatchMode:m.channelMatchMode,channelMatchPreset:m.channelMatchPreset && {channels:m.channelMatchPreset.channels.map(c=>({preampDb:c.preampDb,filters:filters(c.filters)}))}});
  const eqs=(await selected(keys[0])).map((e:SavedEq)=>({id:e.id,name:e.name,filters:filters(e.filters),preamp:e.preamp,measurementId:e.measurementId,
    target:e.target && {name:e.target.name,points:e.target.points},channelMatch:match(e.channelMatch)}));
  const measurements=(await selected(keys[1])).map((m:Measurement)=>({id:m.id,name:m.name,device:m.device,type:m.type,points:m.points,...match(m)}));
  const fresh=await readAccountSync(db,{...account,protectedAccount:!!account.slug});
  if(fresh?.epoch!==row.epoch || fresh.revision!==row.revision || fresh.payload!==row.payload)
    throw new RequestInputError('Your account changed during refresh. Try again.',409);
  return reply({eqs,measurements,epoch:row.epoch,revision:row.revision,next:more?offset+limit:null});
}catch(e){return profileFailure(e);}}
