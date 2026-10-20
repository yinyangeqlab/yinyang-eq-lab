import { RequestInputError } from "@/lib/request-json";
import { validateSyncPayload } from "@/lib/browser-sync.mjs";
import { LEGACY_CUTOFF } from "@/lib/legacy-notice";
import { VOTE_DATA_NOTICE_VERSION } from "@/lib/vote-data-notice";
import { profileHash,profileSecret,PROFILE_SLUG,requireProfileAccount,type ProfileAccount } from "@/lib/yinyangeq-account";
import { profileTables,profileProjection,projectionContext,type ProfileKind } from "@/lib/yinyangeq-records";
type Kind=Exclude<ProfileKind,"history">|"trial";
type Ref={kind:Kind;id:string};
type Claim={id:string;source_subject:string;source_session:string;evidence:string;expires_at:number;completed_at:number|null};
type Evidence={capturedAt:number;browserVoterId:string;refs:Ref[];snapshot:ReturnType<typeof validateSyncPayload>};
const tableFor={...profileTables,trial:"ranked_trials"};
const uuid=/^[a-f0-9-]{36}$/i;
const refKey=(ref:Ref)=>`${ref.kind}:${ref.id}`;
function validRef(value:unknown):value is Ref{if(!value||typeof value!=="object")return false;const ref=value as Ref;return (ref.kind==="music"&&typeof ref.id==="string"&&ref.id.length<1200)||(Object.hasOwn(tableFor,ref.kind)&&uuid.test(ref.id));}
const time=(kind:Kind,row:Record<string,unknown>)=>Number(kind==="trial"?row.issued_at:kind==="music"?row.updated_at:row.created_at)||0;
async function source(db:D1Database,subject:string,ref:Ref){return ref.kind==="music"?db.prepare("SELECT * FROM music_votes WHERE user_id=? AND track_url=?").bind(subject,ref.id).first<Record<string,unknown>>():db.prepare(`SELECT * FROM ${tableFor[ref.kind]} WHERE id=?`).bind(ref.id).first<Record<string,unknown>>();}
async function owner(db:D1Database,ref:Ref){return db.prepare("SELECT subject_id,session_hash FROM submission_owners WHERE record_kind=? AND record_id=?").bind(ref.kind,ref.id).first<{subject_id:string;session_hash:string}>();}
export async function createHistoryCapture(db:D1Database){await requireProfileAccount(db);const code=profileSecret(),id=crypto.randomUUID(),now=Date.now();await db.prepare("INSERT INTO owner_history_claims(id,profile_slug,code_hash,source_subject,source_session,evidence,created_at,expires_at) VALUES(?,?,?,'pending','',?,?,?)").bind(id,PROFILE_SLUG,await profileHash(code),"{}",now,now+15*60_000).run();return {id,code,expiresAt:now+15*60_000};}
export async function captureBraveHistory(db:D1Database,subject:string,session:string,code:unknown,rawSnapshot:unknown){
 const profile=await requireProfileAccount(db);if(subject===profile.subject_id)throw new RequestInputError("This browser already uses YinYangEQ. Use the original historical Brave session to capture its source history.",409);
 if(typeof code!=="string"||!/^[A-Za-z0-9_-]{43}$/.test(code))throw new RequestInputError("Enter the one-use history-capture code from the admin console.",400);
 let snapshot:ReturnType<typeof validateSyncPayload>;try{snapshot=validateSyncPayload(rawSnapshot);}catch{throw new RequestInputError("The saved browser data is invalid or exceeds 512 KB.",400);}
 const values=snapshot.values as Record<string,string>,refs:Ref[]=[];
 const append=(kind:Kind,id:unknown)=>{const ref={kind,id};if(validRef(ref)&&!refs.some(r=>r.kind===kind&&r.id===id))refs.push(ref);};
 for(const trial of JSON.parse(values["target-lab-trials"]||"[]")){if(trial.adminTestOnly)continue;append("run",trial.id);append("open",trial.id);append("vote",trial.serverTrialId||trial.id);append("trial",trial.serverTrialId);}
 for(const measurement of JSON.parse(values["target-lab-measurements"]||"[]"))if(!measurement.adminTestOnly)append("measurement",measurement.researchContributionId);
 for(const target of JSON.parse(values["target-lab-private-targets"]||"[]"))if(!target.adminTestOnly)append("target",target.submissionId);
 for(const recording of Object.keys(JSON.parse(values["target-lab-music-shortlist-v1"]||"{}")))append("music",recording);
 const evidence:Evidence={capturedAt:Date.now(),browserVoterId:values["target-lab-voter"],refs:refs.slice(0,2000),snapshot};
 const captured=await db.prepare("UPDATE owner_history_claims SET source_subject=?,source_session=?,evidence=?,expires_at=? WHERE code_hash=? AND profile_slug=? AND source_subject='pending' AND expires_at>? RETURNING id").bind(subject,session,JSON.stringify(evidence),Date.now()+60*60_000,await profileHash(code),PROFILE_SLUG,Date.now()).first<{id:string}>();
 if(!captured)throw new RequestInputError("This history code expired or was already used. Request a new code.",409);
 return {ok:true,refCount:evidence.refs.length};
}
async function getClaim(db:D1Database,id:string){const claim=await db.prepare("SELECT id,source_subject,source_session,evidence,expires_at,completed_at FROM owner_history_claims WHERE id=? AND profile_slug=?").bind(id,PROFILE_SLUG).first<Claim>();if(!claim||claim.source_subject==="pending")throw new RequestInputError("Capture the history from the original Brave session first.",409);if(claim.expires_at<=Date.now())throw new RequestInputError("The history approval expired. Capture a fresh code from Brave.",409);return claim;}
export async function historyPreview(db:D1Database,claimId:string){
 const profile=await requireProfileAccount(db),claim=await getClaim(db,claimId),evidence=JSON.parse(claim.evidence) as Evidence;
 const known=new Set(evidence.refs.map(refKey));const cutoff=claim.source_subject==="owner"?profile.policy_at:evidence.capturedAt;
 // D1's compound-SELECT bound is lower than the local SQLite default.
 // Keep each owned source query independent and retain the same global bound.
 const ordered=(rows:Ref[])=>rows.sort((a,b)=>a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));
 const owned=await Promise.all(Object.entries(tableFor).map(async([kind,table])=>(await db.prepare(`SELECT '${kind}' kind,t.id AS id FROM ${table} t JOIN submission_owners o ON o.record_kind='${kind}' AND o.record_id=t.id WHERE o.subject_id=? AND t.${kind==="trial"?"issued_at":"created_at"}<=? ORDER BY t.id LIMIT 100`).bind(claim.source_subject,cutoff).all<Ref>()).results));
 const refs=ordered(owned.flat()).slice(0,100);
 const music=(await db.prepare("SELECT track_url id FROM music_votes WHERE user_id=? AND updated_at<=? LIMIT 25").bind(claim.source_subject,cutoff).all<{id:string}>()).results;refs.push(...music.map(row=>({kind:"music" as const,id:row.id})));
 // Anonymous-era rows are candidates for specific independent legacy review, never automatic claims.
 const legacy=await Promise.all(([['vote','votes','voter_id'],['open','comparison_choices','participant_id'],['run','listening_runs','voter_id']] as const).map(async([kind,table,voter])=>(await db.prepare(`SELECT '${kind}' kind,id FROM ${table} WHERE ${voter}=? AND created_at<? AND NOT EXISTS(SELECT 1 FROM submission_owners o WHERE o.record_kind='${kind}' AND o.record_id=${table}.id) ORDER BY id LIMIT 100`).bind(evidence.browserVoterId,LEGACY_CUTOFF).all<Ref>()).results));
 refs.push(...ordered(legacy.flat()).slice(0,100));const unique=[...new Map(refs.map(ref=>[refKey(ref),ref])).values()];
 const context=await projectionContext(db,{...profile,subject_id:claim.source_subject}),rows=[];
 for(const ref of unique){
  const row=await source(db,claim.source_subject,ref);if(!row)continue;const at=time(ref.kind,row);if(at>(claim.source_subject==="owner"?profile.policy_at:evidence.capturedAt))continue;
  const ownership=ref.kind==="music"?null:await owner(db,ref);if(ownership&&ownership.subject_id!==claim.source_subject)continue;
  const originalBrowser=String(row.voter_id??row.participant_id??row.contributor_id??"");
  const legacyUnowned=ref.kind!=="music"&&!ownership;
  const verified=!legacyUnowned&&(claim.source_subject!=="owner"||known.has(refKey(ref))&&(!originalBrowser||originalBrowser===evidence.browserVoterId))&&!(claim.source_subject==="owner"&&ref.kind==="music");
  const title=ref.kind==="trial"?"Associated blind pairing":profileProjection(ref.kind as ProfileKind,row,context).title;
  rows.push({...ref,title,at,verified,needsIndependentReview:!verified,legacyUnowned,sourceHash:await profileHash(JSON.stringify(row))});
 }
 const digest=await profileHash(JSON.stringify(rows.map(row=>[row.kind,row.id,row.sourceHash])));
 return {claimId,sourceLabel:claim.source_subject==="owner"?"Historical admin browser":"Historical participant browser",capturedAt:evidence.capturedAt,rows,digest};
}
async function comparisonGraph(db:D1Database,root:Ref,row:Record<string,unknown>):Promise<Ref[]>{
 if(!["vote","run","open","trial","feedback"].includes(root.kind))return [root];
 const linked=await db.prepare("SELECT comparison_id FROM comparison_records WHERE record_kind=? AND record_id=?").bind(root.kind,root.id).first<{comparison_id:string}>();
 const comparison=linked?.comparison_id||String(root.kind==="run"?row.trial_id||root.id:root.kind==="feedback"?row.comparison_id:root.id);
 const refs=(await db.prepare("SELECT record_kind kind,record_id id FROM comparison_records WHERE comparison_id=?").bind(comparison).all<Ref>()).results;
 const voter=String(row.voter_id??row.participant_id??"");
 const queries:[string,(string|number)[]][]=[
  ["SELECT 'vote' kind,id FROM votes WHERE id=? AND voter_id=?",[comparison,voter]],
  ["SELECT 'trial' kind,id FROM ranked_trials WHERE id=? AND voter_id=?",[comparison,voter]],
  ["SELECT 'open' kind,id FROM comparison_choices WHERE id=? AND participant_id=?",[comparison,voter]],
  ["SELECT 'run' kind,id FROM listening_runs WHERE (trial_id=? OR id=?) AND voter_id=?",[comparison,comparison,voter]],
  ["SELECT 'feedback' kind,id FROM feedback_submissions WHERE comparison_id=? AND participant_id=?",[comparison,voter]],
 ];
 const legacy=(await Promise.all(queries.map(async([sql,args])=>(await db.prepare(sql).bind(...args).all<Ref>()).results))).flat();
 return [...new Map([root,...refs,...legacy].map(ref=>[refKey(ref),ref])).values()];
}
export async function migrateHistoryBatch(db:D1Database,claimId:string,selected:unknown,expectedDigest:unknown,verified:boolean,reason:unknown,confirmation:unknown,saveSnapshot=false){
 if(confirmation!=="MOVE VERIFIED HISTORICAL RECORDS"||!Array.isArray(selected)||!selected.length||selected.length>10||!selected.every(validRef))throw new RequestInputError("Review and select 1–10 records per atomic batch, then confirm the historical move.",400);
 const profile=await requireProfileAccount(db),claim=await getClaim(db,claimId),evidence=JSON.parse(claim.evidence) as Evidence,preview=await historyPreview(db,claimId);
 if(expectedDigest!==preview.digest)throw new RequestInputError("The historical record list changed. Refresh and review before moving anything.",409);
 const available=new Map(preview.rows.map(row=>[refKey(row),row]));
 const chosen=selected as Ref[];for(const ref of chosen)if(!available.has(refKey(ref)))throw new RequestInputError("A selected source is missing, changed or no longer belongs to the captured account.",409);
 if(chosen.some(ref=>available.get(refKey(ref))!.needsIndependentReview)&&(!verified||typeof reason!=="string"||reason.trim().length<10||reason.length>500))throw new RequestInputError("Independently verify the specific historical records and record a 10–500 character reason. A browser ID alone is insufficient.",400);
 const participation=await db.prepare("SELECT submissions_enabled,agreement_version FROM privacy_accounts WHERE subject_id=?").bind(profile.subject_id).first<{submissions_enabled:number;agreement_version:string}>();
 const session=await db.prepare("SELECT token_hash FROM privacy_sessions WHERE subject_id=? AND expires_at>? ORDER BY expires_at DESC LIMIT 1").bind(profile.subject_id,Date.now()).first<{token_hash:string}>();
 if(participation?.submissions_enabled!==1||participation.agreement_version!==VOTE_DATA_NOTICE_VERSION||!session)throw new RequestInputError("Sign into YinYangEQ and review its participation agreement before transferring history.",409);
 const expanded:Ref[]=[],comparisons=new Map<string,string>();for(const ref of chosen){const row=await source(db,claim.source_subject,ref);if(!row)throw new RequestInputError("A selected historical record was erased.",409);const graph=await comparisonGraph(db,ref,row);expanded.push(...graph);if(["vote","run","open","trial","feedback"].includes(ref.kind)){const link=await db.prepare("SELECT comparison_id FROM comparison_records WHERE record_kind=? AND record_id=?").bind(ref.kind,ref.id).first<{comparison_id:string}>();const comparison=link?.comparison_id||String(ref.kind==="run"?row.trial_id||ref.id:ref.kind==="feedback"?row.comparison_id:ref.id);for(const related of graph){const key=refKey(related);if(comparisons.has(key)&&comparisons.get(key)!==comparison)throw new RequestInputError("Comparison linkage conflicts. Nothing was moved.",409);comparisons.set(key,comparison);}}}
 const records=[...new Map(expanded.map(ref=>[refKey(ref),ref])).values()];if(records.length>80)throw new RequestInputError("This graph exceeds the safe atomic batch. Select fewer complete comparisons.",400);
 const now=Date.now(),statements:D1PreparedStatement[]=[db.prepare("UPDATE owner_history_claims SET completed_at=NULL WHERE id=? AND expires_at>?").bind(claimId,now)];let newLegacy=0;
 for(const ref of records){
  if(!validRef(ref))throw new RequestInputError("Unsupported related record.",409);
  const row=await source(db,claim.source_subject,ref);if(!row)throw new RequestInputError("A related historical source was erased. Nothing was moved.",409);
  const at=time(ref.kind,row);if(at>(claim.source_subject==="owner"?profile.policy_at:evidence.capturedAt))throw new RequestInputError("This related record is newer than the reviewed historical window.",409);
  const oldId=ref.kind==="music"?JSON.stringify([claim.source_subject,ref.id]):ref.id,newId=ref.kind==="music"?JSON.stringify([profile.subject_id,ref.id]):ref.id;
  const ownership=await owner(db,{...ref,id:oldId});
  if(ownership?.subject_id===profile.subject_id)continue;
  if(ownership&&ownership.subject_id!==claim.source_subject)throw new RequestInputError("A linked comparison belongs to another account. Nothing was moved.",409);
  if(ref.kind==="music"){
   if(await db.prepare("SELECT 1 FROM music_votes WHERE user_id=? AND track_url=?").bind(profile.subject_id,ref.id).first())throw new RequestInputError("YinYangEQ already has a rating for one selected recording. Resolve that conflict before moving the historical rating.",409);

  }else if(!ownership){
   if(!verified||typeof reason!=="string"||reason.trim().length<10||at>=LEGACY_CUTOFF||!['vote','run','open','trial','feedback'].includes(ref.kind)||String(row.voter_id??row.participant_id)!==evidence.browserVoterId)throw new RequestInputError("An unowned legacy source requires specific independent verification.",409);
   const requestId=crypto.randomUUID(),root=chosen.find(candidate=>['vote','run','open'].includes(candidate.kind));if(!root)throw new RequestInputError("Choose the original legacy comparison for verification.",409);
   statements.push(db.prepare("INSERT INTO legacy_review_requests(id,subject_id,record_kind,record_id,message,status,admin_reason,created_at,reviewed_at) VALUES(?,?,?,?,?,'approved',?,?,?)").bind(requestId,profile.subject_id,root.kind,root.id,`YinYangEQ Brave capture ${claimId}`,String(reason).trim(),now,now));
   statements.push(db.prepare("INSERT INTO legacy_record_verifications(record_kind,record_id,subject_id,request_id) VALUES(?,?,?,?)").bind(ref.kind,ref.id,profile.subject_id,requestId));
   statements.push(db.prepare("INSERT INTO owner_history_transfer_scope(batch_id,record_kind,record_id,new_record_id,from_subject,to_subject) VALUES(?,?,?,?,?,?)").bind(claimId,ref.kind,oldId,newId,claim.source_subject,profile.subject_id));
   statements.push(db.prepare("INSERT INTO submission_owners(record_kind,record_id,subject_id,session_hash) VALUES(?,?,?,?)").bind(ref.kind,ref.id,profile.subject_id,session.token_hash));newLegacy++;
   continue;
  }
  statements.push(db.prepare("INSERT INTO owner_history_transfer_scope(batch_id,record_kind,record_id,new_record_id,from_subject,to_subject) VALUES(?,?,?,?,?,?)").bind(claimId,ref.kind,oldId,newId,claim.source_subject,profile.subject_id));
  if(ref.kind==="music")statements.push(db.prepare("UPDATE music_votes SET user_id=?,user_name='YinYangEQ',user_email='' WHERE user_id=? AND track_url=? AND updated_at=? AND choice=?").bind(profile.subject_id,claim.source_subject,ref.id,row.updated_at,row.choice));
  if(!ownership)statements.push(db.prepare("INSERT INTO submission_owners(record_kind,record_id,subject_id,session_hash) VALUES(?,?,?,?)").bind(ref.kind,newId,profile.subject_id,session.token_hash));
  else statements.push(db.prepare("UPDATE submission_owners SET subject_id=?,record_id=?,session_hash=? WHERE record_kind=? AND record_id=? AND subject_id=?").bind(profile.subject_id,newId,session.token_hash,ref.kind,oldId,claim.source_subject));
  const legacy=await db.prepare("SELECT r.record_kind,r.record_id,r.message,r.admin_reason FROM legacy_record_verifications v JOIN legacy_review_requests r ON r.id=v.request_id WHERE v.record_kind=? AND v.record_id=? AND v.subject_id=?").bind(ref.kind,ref.id,claim.source_subject).first<{record_kind:string;record_id:string;message:string;admin_reason:string}>();
  if(legacy){const receipt=crypto.randomUUID();statements.push(db.prepare("INSERT INTO legacy_review_requests(id,subject_id,record_kind,record_id,message,status,admin_reason,created_at,reviewed_at) VALUES(?,?,?,?,?,'approved',?,?,?)").bind(receipt,profile.subject_id,legacy.record_kind,legacy.record_id,legacy.message,legacy.admin_reason,now,now),db.prepare("UPDATE legacy_record_verifications SET subject_id=?,request_id=? WHERE record_kind=? AND record_id=? AND subject_id=?").bind(profile.subject_id,receipt,ref.kind,ref.id,claim.source_subject));}
 }
 for(const ref of records)if(comparisons.has(refKey(ref)))statements.push(db.prepare("INSERT OR IGNORE INTO comparison_records(record_kind,record_id,comparison_id) VALUES(?,?,?)").bind(ref.kind,ref.id,comparisons.get(refKey(ref))!));
 if(saveSnapshot){const total=await db.prepare("SELECT COUNT(*) n FROM owner_profile_snapshots WHERE profile_slug=?").bind(PROFILE_SLUG).first<{n:number}>();if((total?.n||0)>=20)throw new RequestInputError("Delete a recovery snapshot before saving another.",409);const id=crypto.randomUUID();statements.push(db.prepare("INSERT INTO owner_profile_snapshots(id,profile_slug,label,payload,created_at) VALUES(?,?,?,?,?)").bind(id,PROFILE_SLUG,"Brave before historical migration",JSON.stringify(evidence.snapshot),now));}
 statements.push(db.prepare("UPDATE owner_history_claims SET completed_at=? WHERE id=?").bind(now,claimId),db.prepare("DELETE FROM owner_history_transfer_scope WHERE batch_id=?").bind(claimId));
 await db.batch(statements);
 return {ok:true,moved:records.length,legacyVerified:newLegacy};
}
