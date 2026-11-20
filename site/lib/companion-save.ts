import {parseMeasurement} from './measurement';
import {safeLibraryEq} from './music-library-eq';
import {safeChannelMatch} from './channel-match-export';
import {validateAccountValues} from './account-sync.mjs';
import {readAccountSync,syncLocation} from './account-sync-state';
import {segmentedSyncWrite,syncSections} from './account-sync-segments';
import {valueParts} from './account-sync-transfer.mjs';
import {digest} from './device-sync.mjs';
import {editGuard} from './companion-access';
import {backupName,saveBackup} from './companion-backups';
import {RequestInputError} from './request-json';

type Account=Parameters<typeof segmentedSyncWrite>[1];
export async function saveLibraryEntry(db:D1Database,account:Account,challenge:string,body:Record<string,unknown>){
  if(body.action==='backup')return saveBackup(db,account.subject_id,challenge,body);
  const measurement=body.action==='measurement';
  if(!measurement && body.action!=='eq')throw new RequestInputError('Choose an EQ, measurement or preset backup.',400);
  const key=measurement?'target-lab-measurements':'target-lab-library-eqs-v1',name=backupName(body.name);
  let item;
  try{
    const id=crypto.randomUUID(),source='Android companion';
    if(measurement){
      const match=body.match?safeChannelMatch(body.match as Parameters<typeof safeChannelMatch>[0]):{};
      item=parseMeasurement({id,name,source,companionOrigin:true,device:body.device||name,rig:body.rig||'Unspecified',type:body.type,points:body.points,
        ...match,origin:'upload'});
    }else{
      item=safeLibraryEq({id,name,source,companionOrigin:true,createdAt:Date.now(),filters:body.filters as Parameters<typeof safeLibraryEq>[0]['filters'],preamp:body.preamp as number,
        channelMatch:body.match as Parameters<typeof safeLibraryEq>[0]['channelMatch']});
    }
    validateAccountValues({[key]:JSON.stringify([item])});
  }catch(e){throw new RequestInputError(e instanceof Error?e.message:'Incompatible library data.',400);}
  const row=await readAccountSync(db,account,true),guard=editGuard(challenge);
  if(!row||row.epoch!==body.epoch||row.revision!==body.revision)throw new RequestInputError('Your library changed. Refresh before saving.',409);
  const current=await syncSections(db,account,row);
  if(!current){
    const values=JSON.parse(row.payload||'{}'),list=JSON.parse(values[key]||'[]');
    if(!measurement && list.length>=30)throw new RequestInputError('Organize your 30 saved EQs in My Collection before adding another.',409);
    list.push(item);values[key]=JSON.stringify(list);
    const at=syncLocation(account);
    const saved=await db.prepare(`UPDATE ${at.table} SET payload=?,initialized=1,revision=revision+1,updated_at=? WHERE ${at.column}=? AND epoch=? AND revision=? AND ${guard.sql}`)
      .bind(JSON.stringify(values),Date.now(),at.id,row.epoch,row.revision,...guard.args).run();
    if(!saved.meta.changes)throw new RequestInputError('Your library or link changed. Refresh before saving.',409);
    return;
  }
  // Reuse untouched sections; copy the existing entries of the edited section in D1.
  const id=crypto.randomUUID(),old=current.sections[key],index=old?.count??0;
  if(!measurement && index>=30)throw new RequestInputError('Organize your saved EQs in My Collection first.',409);
  const hashes=old?(await db.prepare('SELECT content_hash FROM account_sync_entries WHERE version_id=? AND storage_key=? ORDER BY entry_index').bind(old.version,key).all<{content_hash:string}>()).results.map(x=>x.content_hash):[];
  if(hashes.length!==index)throw new RequestInputError('Library changed. Refresh before saving.',409);
  const section={kind:'array' as const,count:index+1,digest:await digest({kind:'array',entries:[...hashes,await digest(item)]})};
  const manifest={...Object.fromEntries(Object.entries(current.sections).map(([k,v])=>[k,{...v,reuse:true}])),[key]:section};
  const write=(data:Record<string,unknown>)=>segmentedSyncWrite(db,account,{id,...data},guard);
  await write({action:'begin',epoch:row.epoch,revision:row.revision,manifest});
  if(old){
    const tables=[['account_sync_entries','entry_index,part_count,content_hash,source_ids,owner_kind,owner_id'],['account_sync_parts','entry_index,part_index,payload']];
    await db.batch(tables.map(([table,cols])=>db.prepare(`INSERT INTO ${table}(version_id,storage_key,${cols}) SELECT ?,storage_key,${cols} FROM ${table} WHERE version_id=? AND storage_key=? AND ${guard.sql}`).bind(id,old.version,key,...guard.args)));
  }
  const parts=Array.from(valueParts({[key]:JSON.stringify([item])},{[key]:section}),part=>({...part,entry:index}));
  await write({action:'parts',parts});await write({action:'commit'});
}
