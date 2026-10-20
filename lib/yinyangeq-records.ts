import { RequestInputError } from "@/lib/request-json";
import { musicCandidates } from "@/lib/music-catalog";
import { musicDisplayTitle } from "@/lib/music-display";
import { parseCurve } from "@/lib/curves";
import { measurementFileHash, type MeasurementFileRecord } from "@/lib/research-measurement-files";
import { profileHash, PROFILE_SLUG, profileAccount, requireProfileAccount, type ProfileAccount } from "@/lib/yinyangeq-account";
export const profileTables={vote:"votes",run:"listening_runs",open:"comparison_choices",feedback:"feedback_submissions",measurement:"research_measurements",export:"preference_exports",target:"targets",suggestion:"suggestions",personal:"personal_research_choices"} as const;
export type ProfileKind=keyof typeof profileTables|"music"|"history";
export type ProfilePayload={kind:ProfileKind;title:string;at:number;details:Record<string,string|number>;files:{key:string;label:string;filename:string}[]};
type Row=Record<string,unknown>;
const text=(value:unknown,max=500)=>typeof value==="string"?value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,"").slice(0,max):"";
const json=(value:unknown,fallback:unknown)=>{try{return typeof value==="string"?JSON.parse(value):fallback;}catch{return fallback;}};
export function profileKind(value:unknown):ProfileKind{if(typeof value!=="string"||!Object.hasOwn(profileTables,value)&&value!=="music"&&value!=="history")throw new RequestInputError("Invalid contribution type.",400);return value as ProfileKind;}
export async function profileSource(db:D1Database,profile:ProfileAccount,kind:ProfileKind,id:string):Promise<Row|null>{
 if(kind==="history"){
  const event=await db.prepare("SELECT id,record_kind,record_id,action,payload,created_at FROM owner_profile_events WHERE id=? AND profile_slug=?").bind(id,profile.slug).first<Row>();if(!event)return null;
  if(event.record_kind==="music"){const saved=json(event.payload,{}) as Row;return {track_url:event.record_id,choice:saved.choice,updated_at:saved.at,__historyKind:"music",__historyAction:event.action};}
  if(event.record_kind==="browser-result")return {...json(event.payload,{}) as Row,created_at:event.created_at,__historyKind:"browser-result"};
  if(typeof event.record_kind!=="string"||!Object.hasOwn(profileTables,event.record_kind))return null;
  const row=await profileSource(db,profile,event.record_kind as ProfileKind,String(event.record_id));return row?{...row,__historyKind:event.record_kind,__historyAction:event.action}:null;
 }
 if(kind==="music")return db.prepare("SELECT * FROM music_votes WHERE user_id=? AND track_url=?").bind(profile.subject_id,id).first<Row>();
 return db.prepare(`SELECT t.* FROM ${profileTables[kind]} t JOIN submission_owners o ON o.record_kind=? AND o.record_id=t.id WHERE o.subject_id=? AND t.id=?`).bind(kind,profile.subject_id,id).first<Row>();
}
export async function projectionContext(db:D1Database,profile:ProfileAccount){
 const targets=await db.prepare("SELECT id,name FROM targets WHERE (status='approved' AND NOT EXISTS(SELECT 1 FROM submission_owners admin WHERE admin.record_kind='target' AND admin.record_id=targets.id AND admin.subject_id='owner')) OR EXISTS(SELECT 1 FROM submission_owners o WHERE o.record_kind='target' AND o.record_id=targets.id AND o.subject_id=?)").bind(profile.subject_id).all<{id:string;name:string}>();
 const removed=await db.prepare("SELECT record_kind,record_id FROM moderation_events m WHERE action='remove' AND NOT EXISTS(SELECT 1 FROM moderation_events newer WHERE newer.record_kind=m.record_kind AND newer.record_id=m.record_id AND newer.sequence>m.sequence)").all<{record_kind:string;record_id:string}>();
 return {names:new Map(targets.results.map(row=>[row.id,text(row.name,160)])),removed:new Set(removed.results.map(row=>`${row.record_kind}:${row.record_id}`))};
}
type Context=Awaited<ReturnType<typeof projectionContext>>;
const sourceRemoved=(context:Context,kind:ProfileKind,id:string,row:Row)=>context.removed.has(`${kind}:${id}`)||!!row.__historyKind&&context.removed.has(`${row.__historyKind}:${row.id}`);
export function profileProjection(kind:ProfileKind,row:Row,context:Context,includeFiles=false):ProfilePayload{
 if(kind==="history"&&row.__historyKind!=="browser-result"){
  const payload=profileProjection(row.__historyKind as ProfileKind,row,context,includeFiles);payload.details["History"]="Historical activity; not an additional community vote";if(row.__historyAction==="rating-withdrawn")payload.details.Rating="Withdrawn";return payload;
 }
 const name=(id:unknown)=>context.names.get(String(id))||"Unavailable target";
 const details:Record<string,string|number>={};let title="";const files:ProfilePayload["files"]=[];
 const add=(label:string,value:unknown,max=500)=>{const clean=text(value,max);if(clean)details[label]=clean;};
 const numeric=(label:string,value:unknown)=>{if(typeof value==="number"&&Number.isFinite(value))details[label]=value;};
 if(kind==="history"){
  title=`${name(row.target_a_id)} / ${name(row.target_b_id)} · ${row.result==="tie"?"No Preference / Tie":row.result==="a"?"Prefer A":"Prefer B"}`;
  details.Basis="Personal Tournament journal · no public-ranking vote";add("Headphones",row.device);add("Measuring rig",row.rig);numeric("A seconds",row.heard_a);numeric("B seconds",row.heard_b);numeric("Matched seconds",row.overlap_seconds);add("Phase",row.phase);
 }else if(kind==="music"){
  const track=musicCandidates.find(track=>track.url===row.track_url);title=track?`${musicDisplayTitle(track.title)} · ${track.artist}`:"Listening Pool recording";
  details.Rating=row.choice==="keep"?"Upvote":"Downvote";add("Version",track?.versionLabel);
 }else if(kind==="vote"){
  title=`${name(row.winner_id)} preferred over ${name(row.loser_id)}`;add("Mode",row.test_mode);add("Headphones",row.headphone_type);add("Song",row.song_title);add("Artist",row.song_artist);add("Description",row.other_reason);numeric("A seconds",row.heard_a);numeric("B seconds",row.heard_b);numeric("Matched seconds",row.overlap_seconds);
 }else if(kind==="run"||kind==="open"||kind==="personal"){
  const a=name(row.target_a_id),b=name(row.target_b_id);title=row.result==="tie"?`${a} / ${b} · No Preference / Tie`:`${row.result==="a"?a:b} preferred over ${row.result==="a"?b:a}`;
  add("Mode",kind==="personal"?"Personal Tournament":row.test_mode);add("Headphones",row.headphone_type);add("Song",row.song_title);add("Artist",row.song_artist);numeric("A seconds",row.heard_a);numeric("B seconds",row.heard_b);numeric("Matched seconds",row.overlap_seconds);const technical=json(row.research_context,{}) as Row;add("Measuring rig",technical.rig);add("Loudness",technical.loudnessTarget);
 }else if(kind==="feedback"){
  title=`Description of ${name(row.side==="a"?row.target_a_id:row.target_b_id)}`;add("Description",row.other_reason);const tags=json(row.reason_tags,[]) as unknown[];add("Tags",Array.isArray(tags)?tags.filter(tag=>typeof tag==="string").join(", "):"");add("Mode",row.test_mode);add("Headphones",row.headphone_type);add("Song",row.song_title);
 }else if(kind==="measurement"){
  title=text(row.name,160);add("Headphones",row.device);add("Type",row.type);add("Measuring rig",row.rig);add("Fit",row.fit);add("Notes",row.notes);add("Driver",row.driver_type);numeric("Nozzle diameter (mm)",row.nozzle_diameter_mm);
  if(includeFiles){const metadata=json(row.files,[]) as MeasurementFileRecord[];for(const file of metadata)if(["single","left","right"].includes(file.kind))files.push({key:file.kind,label:`${file.kind} response · frequency/SPL only`,filename:`yinyangeq-${file.kind}-response.csv`});}
 }else if(kind==="export"){
  title=`${text(row.target_name,160)} · ${text(row.export_kind,40)}`;add("Headphones / measurement",row.measurement_name);add("Format",row.format);numeric("Bands",row.bands);add("Method",row.method);add("Priority",row.priority);numeric("Preamp (dB)",row.preamp);
  if(includeFiles)files.push({key:"export",label:"Tuning curve · frequency/SPL only",filename:"yinyangeq-tuning.csv"});
 }else if(kind==="target"){
  title=text(row.name,160);add("Creator",row.creator);add("Description",row.description);add("Review status",row.status);if(includeFiles)files.push({key:"curve",label:"Target curve · frequency/SPL only",filename:"yinyangeq-target.csv"});
 }else if(kind==="suggestion"){
  title=`${text(row.title,160)} · ${text(row.artist,120)}`;add("Album",row.album);add("Listening notes",row.note);
 }
 return {kind,title,at:Number(row.created_at||row.updated_at)||0,details,files};
}
async function sourceSignature(row:Row,payload:ProfilePayload){return profileHash(JSON.stringify({payload,sourceFiles:payload.files.length?{metadata:row.files,curve:row.curve,points:row.points}:null}));}
export async function ownedProfilePreview(db:D1Database,subject:string,kind:ProfileKind,id:string,includeFiles=false){
 const profile=await requireProfileAccount(db);if(subject!==profile.subject_id)throw new RequestInputError("Use the separate YinYangEQ participant account to review or publish entries.",403);
 const row=await profileSource(db,profile,kind,id);if(!row)throw new RequestInputError("This contribution is missing or belongs to another account.",404);
 const context=await projectionContext(db,profile);if(sourceRemoved(context,kind,id,row))throw new RequestInputError("This contribution is removed from publication.",409);
 const payload=profileProjection(kind,row,context,includeFiles);return {profile,row,payload,hash:await sourceSignature(row,payload)};
}
export async function setProfileEntry(db:D1Database,subject:string,kind:ProfileKind,id:string,state:"draft"|"published"|"hidden",includeFiles=false,expectedHash?:string){
 if(state!=="published"){
  const profile=await requireProfileAccount(db);if(subject!==profile.subject_id)throw new RequestInputError("Use the YinYangEQ participant account to manage publication.",403);
  await db.prepare("UPDATE owner_profile_entries SET state=?,published_at=NULL WHERE profile_slug=? AND record_kind=? AND record_id=?").bind(state,PROFILE_SLUG,kind,id).run();return {ok:true};
 }
 const preview=await ownedProfilePreview(db,subject,kind,id,includeFiles);
 if(state==="published"&&expectedHash!==preview.hash)throw new RequestInputError("This entry changed. Review the refreshed public preview before publishing.",409);
 const entry=crypto.randomUUID(),now=Date.now();
 await db.prepare("INSERT INTO owner_profile_entries(id,profile_slug,record_kind,record_id,state,payload,source_hash,created_at,published_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(profile_slug,record_kind,record_id) DO UPDATE SET state=excluded.state,payload=excluded.payload,source_hash=excluded.source_hash,published_at=excluded.published_at").bind(entry,PROFILE_SLUG,kind,id,state,JSON.stringify(preview.payload),preview.hash,now,state==="published"?now:null).run();
 return {ok:true};
}
export async function publicProfilePage(db:D1Database,page=1){
 const profile=await profileAccount(db);if(!profile)return {name:"YinYangEQ",entries:[],hasMore:false,page};const context=await projectionContext(db,profile);
 const rows=await db.prepare("SELECT id,record_kind,record_id,payload,source_hash FROM owner_profile_entries WHERE profile_slug=? AND state='published' ORDER BY published_at DESC,id LIMIT 26 OFFSET ?").bind(PROFILE_SLUG,(page-1)*25).all<{id:string;record_kind:ProfileKind;record_id:string;payload:string;source_hash:string}>();
 const entries=[];
 for(const entry of rows.results.slice(0,25)){
  if(!Object.hasOwn(profileTables,entry.record_kind)&&entry.record_kind!=="music"&&entry.record_kind!=="history"||context.removed.has(`${entry.record_kind}:${entry.record_id}`))continue;
  const source=await profileSource(db,profile,entry.record_kind,entry.record_id);if(!source||sourceRemoved(context,entry.record_kind,entry.record_id,source))continue;
  const saved=JSON.parse(entry.payload) as ProfilePayload;const payload=profileProjection(entry.record_kind,source,context,saved.files.length>0);
  if(await sourceSignature(source,payload)!==entry.source_hash)continue;
  entries.push({id:entry.id,...payload,files:payload.files.map(file=>({...file,url:`/api/public-profiles/yinyangeq/files/${entry.id}/${file.key}`}))});
 }
 return {name:"YinYangEQ",entries,hasMore:rows.results.length>25,page};
}
export async function publicProfileFile(db:D1Database,entryId:string,key:string){
 const profile=await requireProfileAccount(db),entry=await db.prepare("SELECT record_kind,record_id,payload,source_hash FROM owner_profile_entries WHERE id=? AND profile_slug=? AND state='published'").bind(entryId,PROFILE_SLUG).first<{record_kind:ProfileKind;record_id:string;payload:string;source_hash:string}>();
 if(!entry)throw new RequestInputError("Published file not found.",404);
 const saved=JSON.parse(entry.payload) as ProfilePayload,file=saved.files.find(file=>file.key===key);if(!file)throw new RequestInputError("Published file not found.",404);
 const context=await projectionContext(db,profile),row=await profileSource(db,profile,entry.record_kind,entry.record_id);if(!row||sourceRemoved(context,entry.record_kind,entry.record_id,row))throw new RequestInputError("Published file not found.",404);
 const payload=profileProjection(entry.record_kind,row,context,true);if(await sourceSignature(row,payload)!==entry.source_hash)throw new RequestInputError("This source changed and must be reviewed again before sharing.",404);
 let contents="";const sourceKind=entry.record_kind==="history"?row.__historyKind:entry.record_kind;
 if(sourceKind==="export"&&key==="export"){
  const points=json(row.curve,[]) as unknown[];
  if(!Array.isArray(points)||points.length<2||points.length>2000||!points.every(point=>Array.isArray(point)&&point.length===2&&point.every(value=>typeof value==="number"&&Number.isFinite(value))))throw new RequestInputError("Tuning curve unavailable.",404);
  contents="frequency,spl\n"+points.map(point=>(point as number[]).join(",")).join("\n");
 }
 else if(sourceKind==="target"&&key==="curve"){const points=json(row.points,[]) as [number,number][];contents="frequency,spl\n"+points.map(point=>`${Number(point[0])},${Number(point[1])}`).join("\n");}
 else if(sourceKind==="measurement"){
  const meta=(json(row.files,[]) as MeasurementFileRecord[]).find(file=>file.kind===key);if(!meta||meta.bytes<1||meta.bytes>4_000_000||meta.chunks<1||meta.chunks>8)throw new RequestInputError("File unavailable.",404);
  const chunks=await db.prepare("SELECT chunk_index,base64 FROM research_measurement_chunks WHERE measurement_id=? AND kind=? ORDER BY chunk_index").bind(String(row.id),key).all<{chunk_index:number;base64:string}>();
  if(chunks.results.length!==meta.chunks)throw Error("Incomplete stored response");const bytes=new Uint8Array(meta.bytes);let offset=0;
  for(const [index,chunk]of chunks.results.entries()){if(chunk.chunk_index!==index)throw Error("Invalid response chunks");const binary=atob(chunk.base64);if(offset+binary.length>bytes.length)throw Error("Invalid response length");for(let i=0;i<binary.length;i++)bytes[offset++]=binary.charCodeAt(i);}
  if(offset!==bytes.length||await measurementFileHash(bytes)!==meta.sha256)throw Error("Response integrity check failed");
  const points=parseCurve(new TextDecoder("utf-8",{fatal:true}).decode(bytes),false);contents="frequency,spl\n"+points.map(point=>point.join(",")).join("\n");
 }else throw new RequestInputError("Published file not found.",404);
 return {contents,filename:file.filename};
}
export async function profileInventory(db:D1Database,subject:string,page=1){
 const profile=await requireProfileAccount(db);if(profile.subject_id!==subject)throw new RequestInputError("Use the YinYangEQ participant account for this page.",403);
 const refs=await db.prepare("SELECT record_kind,record_id FROM submission_owners WHERE subject_id=? AND record_kind IN ('vote','run','open','feedback','measurement','export','target','suggestion','personal') UNION ALL SELECT 'music' record_kind,track_url record_id FROM music_votes WHERE user_id=? UNION ALL SELECT 'history' record_kind,id record_id FROM owner_profile_events WHERE profile_slug=? AND record_kind IN ('music','browser-result') ORDER BY record_kind,record_id LIMIT 26 OFFSET ?").bind(subject,subject,PROFILE_SLUG,(page-1)*25).all<{record_kind:ProfileKind;record_id:string}>();
 const hasMore=refs.results.length>25;refs.results=refs.results.slice(0,25);
 const context=await projectionContext(db,profile),entries=[];
 for(const ref of refs.results){const row=await profileSource(db,profile,ref.record_kind,ref.record_id);if(!row)continue;const existing=await db.prepare("SELECT id,state,payload,source_hash FROM owner_profile_entries WHERE profile_slug=? AND record_kind=? AND record_id=?").bind(PROFILE_SLUG,ref.record_kind,ref.record_id).first<{id:string;state:string;payload:string;source_hash:string}>();const saved=existing?JSON.parse(existing.payload) as ProfilePayload:null,payload=profileProjection(ref.record_kind,row,context,!!saved?.files.length),hash=await sourceSignature(row,payload);entries.push({kind:ref.record_kind,sourceId:ref.record_id,entryId:existing?.id||null,state:existing?.state==="published"&&existing.source_hash!==hash?"changed · private":existing?.state||"draft",payload,previewHash:hash,removed:sourceRemoved(context,ref.record_kind,ref.record_id,row)});}
 return {name:"YinYangEQ",entries,hasMore,page};
}

export async function savePersonalProfileEvent(db:D1Database,subject:string,data:Record<string,unknown>){
 const profile=await requireProfileAccount(db);if(subject!==profile.subject_id)throw new RequestInputError("Only the YinYangEQ participant account can save its private journal.",403);
 const a=String(data.targetAId||""),b=String(data.targetBId||""),result=String(data.result||"");if(!/^[a-f0-9-]{36}$/i.test(a)||!/^[a-f0-9-]{36}$/i.test(b)||!["a","b","tie"].includes(result)||data.adminTestOnly===true||typeof data.choiceKey!=="string"||!/^[a-f0-9]{64}$/.test(data.choiceKey))throw new RequestInputError("Invalid personal journal choice.",400);
 const targets=await db.prepare("SELECT id FROM targets WHERE id IN (?,?) AND status='approved' AND NOT EXISTS(SELECT 1 FROM submission_owners o WHERE o.record_kind='target' AND o.record_id=targets.id AND o.subject_id='owner')").bind(a,b).all<{id:string}>();if(!targets.results.some(t=>t.id===a)||!targets.results.some(t=>t.id===b))throw new RequestInputError("Only available targets can be saved to the account journal.",403);
 const safe:Row={target_a_id:a,target_b_id:b,result,device:text(data.device,120),rig:text(data.rig,120),phase:data.phase==="confirm"?"confirm":"explore"};
 for(const key of ["heard_a","heard_b","overlap_seconds"])safe[key]=typeof data[key]==="number"&&Number.isFinite(data[key])?Math.max(0,Math.min(86_400,Number(data[key]))):0;
 const id=(await profileHash(`personal-journal:${data.choiceKey}`)).slice(0,32);await db.prepare("INSERT OR IGNORE INTO owner_profile_events(id,profile_slug,record_kind,record_id,action,payload,created_at) VALUES(?,?,'browser-result',?,'personal-choice',?,?)").bind(id,PROFILE_SLUG,data.choiceKey,JSON.stringify(safe),Date.now()).run();return {ok:true};
}
