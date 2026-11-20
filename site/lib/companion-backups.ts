import {editGuard} from './companion-access';
import {RequestInputError} from './request-json';

const bad=(message:string):never=>{throw new RequestInputError(message,400);};
export function backupName(raw:unknown){
  if(typeof raw!=='string'||!raw.trim()||raw.trim().length>100||/[\u0000-\u001f]/.test(raw))throw new RequestInputError('Choose a preset name of up to 100 characters.',400);
  return raw.trim();
}
function preset(raw:unknown,stereo:boolean,limit:number){
  if(typeof raw!=='string'||!raw||raw.length>14000)throw new RequestInputError('Invalid preset file.',400);
  let ear=stereo?-1:0;
  const levels=new Set<number>(),slots=new Set<string>();
  for(const line of raw.trim().split(/\r?\n/).map(x=>x.trim()).filter(Boolean)){
    if(/^TYPE:\s*PEQ$/i.test(line))continue;
    const ch=/^(?:Channel:\s*([LR])|CH:\s*([01]))$/i.exec(line);
    if(ch){if(!stereo)bad('Main EQ must contain one filter bank.');ear=/R|1/i.test(ch[1]||ch[2])?1:0;continue;}
    const level=/^Preamp:\s*([+-]?[\d.]+)\s*dB$/i.exec(line);
    if(level){if(ear<0||levels.has(ear)||!Number.isFinite(+level[1])||Math.abs(+level[1])>24)bad('Invalid preamp.');levels.add(ear);continue;}
    if(/^(?:Xfeed:\s*1\s+\d+|IMPEDANCE:\s*[\d.]+ ohm|SENSITIVITY:\s*[\d.]+ dBSPL\/mW)$/i.test(line))continue;
    const f=/^Filter (\d+):\s*(?:ON|OFF)\s+(?:PK|PEQ|LSC?|HSC?|LP|HP) Fc ([\d.]+) Hz Gain ([+-]?[\d.]+) dB Q ([\d.]+)$/i.exec(line);
    if(!f||ear<0)throw new RequestInputError('Unrecognized companion filter.',400);
    const slot=ear+':'+Number(f[1]);
    if(slots.has(slot)||+f[1]<1||+f[1]>limit||![+f[2],+f[3],+f[4]].every(Number.isFinite)||+f[2]<1||+f[2]>24000||Math.abs(+f[3])>60||+f[4]<=0||+f[4]>64)bad('Invalid filter values.');
    slots.add(slot);
  }
  if(levels.size!==(stereo?2:1))bad('Missing preset preamp.');
  return raw;
}
export async function saveBackup(db:D1Database,subject:string,challenge:string,data:Record<string,unknown>){
  const {id,model,kind}=data;
  if(typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id)||!['5K','5K Plus'].includes(String(model))||!['main','match','pair'].includes(String(kind)))bad('Invalid backup.');
  const name=backupName(data.name),main=kind==='match'?'':preset(data.main,false,model==='5K'?10:30),match=kind==='main'?'':preset(data.match,true,model==='5K'?10:20);
  const mainName=main?backupName(data.mainName||name):'',matchName=match?backupName(data.matchName||name):'',guard=editGuard(challenge);
  const result=await db.prepare(`INSERT OR IGNORE INTO companion_preset_history(id,subject_id,model,name,kind,main_name,match_name,main_eq,channel_match,saved_at)
    SELECT ?,?,?,?,?,?,?,?,?,? WHERE ${guard.sql}`).bind(id,subject,model,name,kind,mainName,matchName,main,match,Date.now(),...guard.args).run();
  if(!result.meta.changes){
    const same=await db.prepare(`SELECT id FROM companion_preset_history WHERE id=? AND subject_id=? AND model=? AND name=? AND kind=? AND main_name=? AND match_name=? AND main_eq=? AND channel_match=? AND ${guard.sql}`)
      .bind(id,subject,model,name,kind,mainName,matchName,main,match,...guard.args).first();
    if(!same)throw new RequestInputError('Backup changed or access was revoked. Refresh Sync.',409);
  }
}
export async function history(db:D1Database,subject:string,offset:number,part=''){
  const filter=part==='main'?"WHERE kind IN ('main','pair') AND versionRank=1":part==='match'?"WHERE kind IN ('match','pair') AND versionRank=1":"";
  return (await db.prepare(`SELECT * FROM (SELECT id,model,name,kind,main_name AS mainName,match_name AS matchName,
    main_eq AS main,channel_match AS match,saved_at AS savedAt,
    ROW_NUMBER() OVER (PARTITION BY model,name,kind ORDER BY saved_at DESC,id DESC) AS versionRank
    FROM companion_preset_history WHERE subject_id=?) ${filter} ORDER BY savedAt DESC,id DESC LIMIT 16 OFFSET ?`).bind(subject,offset).all()).results;
}
