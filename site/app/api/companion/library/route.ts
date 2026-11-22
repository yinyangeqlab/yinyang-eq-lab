import {env} from 'cloudflare:workers';
import {companionAccess,companionKey} from '@/lib/companion-access';
import {history} from '@/lib/companion-backups';
import {saveLibraryEntry} from '@/lib/companion-save';
import {readJsonObject} from '@/lib/request-json';
import {readAccountSync} from '@/lib/account-sync-state';
import {segmentedHead} from '@/lib/account-sync-segments';
import {digest} from '@/lib/device-sync.mjs';
import {profileFailure,profileHeaders} from '@/lib/profile-api';
import {RequestInputError} from '@/lib/request-json';
import {PERSONAL_KEY} from '@/lib/personal-shootout';
import {companionPersonalRankings} from '@/lib/companion-personal-ranks';

import type {PeqFilter} from '@/lib/autoeq';
import type {LibraryEq} from '@/lib/music-library-eq';
import type {ChannelMatch} from '@/lib/channel-balance';
import type {HeadphoneMeasurement} from '@/lib/measurement';

const keys=['target-lab-library-eqs-v1','target-lab-measurements'] as const;
const denied=()=>new RequestInputError('Link your companion from an approved browser with Sync enabled.',403);
function reply(data:unknown){return Response.json(data,{headers:{...profileHeaders,Vary:'Authorization'}});}
export async function DELETE(request:Request){try{
  await env.DB!.prepare("DELETE FROM companion_library_grants WHERE challenge=? AND session_hash!=''").bind(await companionKey(request)).run();
  return reply({ok:true});
}catch(e){return profileFailure(e);}}
export async function GET(request:Request){try{
  const db=env.DB!,challenge=await companionKey(request);
  const account=await companionAccess(db,challenge);
  if(!account){
    // A refusal reserves the challenge until its link expires, without a usable session.
    const cancelled=await db.prepare("SELECT 1 AS cancelled FROM companion_library_grants WHERE challenge=? AND session_hash='' AND expires_at>?")
      .bind(challenge,Date.now()).first<{cancelled:number}>();
    if(cancelled)return Response.json({decision:'cancel'},{status:410,headers:{...profileHeaders,Vary:'Authorization'}});
    throw denied();
  }
  const writable=!!account.writable;
  const url=new URL(request.url);
  const personal=url.searchParams.get('view')==='personal-ranks';
  if(personal && !account.personalRanks)return reply({personalRankings:[],requiresApproval:true});
  if(url.searchParams.has('history')){
    if(!writable)throw denied();
    const offset=Number(url.searchParams.get('history'));if(!Number.isSafeInteger(offset)||offset<0)throw new RequestInputError('Invalid history offset.',400);
    const rows=await history(db,account.subject_id,offset);return reply({history:rows.slice(0,15),next:rows.length>15?offset+15:null});
  }
  const row=await readAccountSync(db,{...account,protectedAccount:!!account.slug},writable);
  if(personal && !row?.initialized)return reply({personalRankings:[]});
  if(!row?.initialized)return reply({eqs:[],measurements:[],writable,epoch:row?.epoch,revision:row?.revision});
  const params=url.searchParams,offset=personal?0:Number(params.get('offset')||0),limit=personal?8:2;
  if(!Number.isSafeInteger(offset)||offset<0)throw new RequestInputError('Invalid page.',400);
  if(offset && (params.get('epoch')!==row.epoch || params.get('revision')!==String(row.revision)))
    throw new RequestInputError('Your collection changed. Refresh again.',409);
  const head=segmentedHead(row.payload);
  let more=false;
  const version=head?await db.prepare('SELECT manifest FROM account_sync_versions WHERE id=? AND subject_id=? AND committed_at IS NOT NULL')
      .bind(head.version,account.subject_id).first<{manifest:string}>():null;
  if(head && !version)throw new Error('Unavailable collection');
  const manifest=version?JSON.parse(version.manifest):null, legacy=!head?JSON.parse(row.payload):null;
  async function selected(key:typeof keys[number] | typeof PERSONAL_KEY){
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
  async function verifyFresh(){
    const fresh=await readAccountSync(db,{...account!,protectedAccount:!!account!.slug});
    if(fresh?.epoch!==row!.epoch || fresh.revision!==row!.revision || fresh.payload!==row!.payload)
      throw new RequestInputError('Your account changed during refresh. Try again.',409);
    if(personal && !(await companionAccess(db,challenge))?.personalRanks)throw denied();
  }
  if(personal){
    const personalRankings=companionPersonalRankings(await selected(PERSONAL_KEY));
    await verifyFresh();
    return reply({personalRankings});
  }
  // Expose audio data only. Keep notes, research IDs, votes and listening history outside this response.
  const filters=(rows:PeqFilter[])=>rows.map(({type,hz,gain,q})=>({type,hz,gain,q}));
  const match=(m:ChannelMatch | undefined)=>m && ({leftPoints:m.leftPoints,rightPoints:m.rightPoints,leftLevelDb:m.leftLevelDb,rightLevelDb:m.rightLevelDb,
    channelMatchMode:m.channelMatchMode,channelMatchPreset:m.channelMatchPreset && {channels:m.channelMatchPreset.channels.map(c=>({preampDb:c.preampDb,filters:filters(c.filters)}))}});
  const eqs=(await selected(keys[0])).map((e:LibraryEq)=>({id:e.id,name:e.name,filters:filters(e.filters),preamp:e.preamp,measurementId:e.measurementId,
    target:e.target && {name:e.target.name,points:e.target.points},channelMatch:match(e.channelMatch)}));
  const measurements=(await selected(keys[1])).map((m:HeadphoneMeasurement)=>({id:m.id,name:m.name,device:m.device,type:m.type,points:m.points,...match(m)}));
  await verifyFresh();
  return reply({eqs,measurements,writable,epoch:row.epoch,revision:row.revision,next:more?offset+limit:null});
}catch(e){return profileFailure(e);}}

export async function POST(request:Request){try{
  const db=env.DB!,challenge=await companionKey(request),account=await companionAccess(db,challenge);
  if(!account?.writable)throw new RequestInputError('Link again to approve library edits.',403);
  const body=await readJsonObject(request,450000);
  await saveLibraryEntry(db,{...account,deviceSyncEnabled:true,protectedAccount:!!account.slug},challenge,body);
  return reply({ok:true});
}catch(e){return profileFailure(e);}}
