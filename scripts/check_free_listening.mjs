// Execute the shipped routes with synthetic ownership and an in-memory DB.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import vm from 'node:vm';
import ts from 'typescript';
import {webcrypto} from 'node:crypto';
import * as input from '../lib/request-json.ts';
import * as listening from '../lib/listening.ts';
import * as protocol from '../lib/listening-protocol.ts';
import {targetHeadphoneType} from '../lib/target-type.ts';
import {cleanFeedback} from '../lib/feedback.ts';
const schema=Object.fromEntries(['listeningRuns','rankedTrials','targets','comparisonRecords','submissionOwners','feedbackSubmissions'].map(name=>[name,new Proxy({table:name},{get:(obj,key)=>obj[key]??key})]));
const id=n=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000000`;
let subject='participant',consent=true,shareMusic=false,stored=[],owner=[],writes=[],targetRows=[];
const match=(row,c)=>!c||c.every(({key,value})=>row[key]===value);
const db={insert:table=>({values:value=>({table,value})}),batch:async commands=>{writes.push(...commands);for(const c of commands){if(c.table===schema.listeningRuns)stored.push(c.value);if(c.table===schema.submissionOwners)owner.push(c.value);}},select:()=>({from:table=>({where:condition=>{const rows=table===schema.targets?targetRows:table===schema.listeningRuns?stored:table===schema.submissionOwners?owner:[];const result=rows.filter(row=>match(row,condition));const query={then:(yes,no)=>Promise.resolve(result).then(yes,no),limit:async n=>result.slice(0,n),get:async()=>result[0],orderBy:()=>({limit:async n=>result.slice(0,n)})};return query;}})})};
const deps={'@/lib/target-type':{targetHeadphoneType},'@/db':{getDb:()=>db},'@/db/schema':schema,'@/lib/public-targets':{publicTargetPredicate:null},'drizzle-orm':{eq:(key,value)=>[{key,value}],and:(...c)=>c.flat().filter(Boolean),gte:()=>[],desc:x=>x},'@/lib/submission-ownership':{submissionContext:async kind=>{if(!consent||['owner','invite:layout-test-only'].includes(subject))throw new input.RequestInputError('Not permitted',403);return {subjectId:subject,shareMusic,record:recordId=>({table:schema.submissionOwners,value:{recordKind:kind,recordId,subjectId:subject}}),requireTrial:async()=>{throw new input.RequestInputError('Not owned',403);}};}},'@/lib/curve-version':{curveVersion:async()=> 'version'},'@/lib/listening-protocol':protocol,'@/lib/listening':listening,'@/lib/request-json':input,'@/lib/vote-data-notice':{VOTE_DATA_NOTICE_VERSION:'fixture'},'@/lib/public-write-gate':{publicWriteGate:async()=>null},'@/lib/feedback':{cleanFeedback}};
function load(path){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:key=>{assert.ok(key in deps,key);return deps[key];},Response,crypto:webcrypto,Date});return exports;}
const runs=load('app/api/listening-runs/route.ts'),feedback=load('app/api/feedback/route.ts');
const body={id:id(1),voterId:id(2),targetAId:id(3),targetBId:id(4),headphoneType:'ie',result:'a',testMode:'bring',matchedPassageRequired:false,intervals:[],voteDataNoticeVersion:'fixture',shareSong:true,songTitle:'Private song',researchContext:{targetVersions:['version','version'],recordingId:'private',sha256:'a'.repeat(64),rig:'Synthetic',duration:200}};
function reset(){subject='participant';consent=true;shareMusic=false;stored=[];owner=[];writes=[];targetRows=[{id:id(3),status:'approved',measurement:JSON.stringify({type:'ie'}),points:'[]'},{id:id(4),status:'approved',measurement:null,points:'[]'}];}
async function post(route,data){return route.POST(new Request('http://local.test/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)}));}
let checks=0;
for(const mode of ['blind','bring','open'])for(const seconds of [0,6]){reset();const intervals=seconds?[0,1].map(side=>({side,start:2,end:2+seconds,rate:1})):[];assert.equal((await post(runs,{...body,testMode:mode,intervals})).status,201);const row=stored[0],context=JSON.parse(row.researchContext);assert.equal(row.protocolVersion,protocol.FREE_LISTENING_PROTOCOL);assert.equal(row.trialId,null);assert.equal(row.heardA,seconds);assert.equal(row.overlapSeconds,seconds);assert.equal(context.matchedPassageRequired,false);assert.equal(context.matchedPassage,seconds>=5);if(mode!=='blind'){assert.equal(row.songTitle,null);assert.equal(context.sha256,undefined);}assert.equal(writes.length,3);checks++;}
for(const mutate of [()=>consent=false,()=>subject='owner',()=>subject='invite:layout-test-only']){reset();mutate();assert.equal((await post(runs,body)).status,403);assert.equal(writes.length,0);checks++;}
for(const patch of [{matchedPassageRequired:'false'},{intervals:[{side:0,start:0,end:-1,rate:1}]},{intervals:null},{voteDataNoticeVersion:'old'},{researchContext:{targetVersions:['stale','version']}},{headphoneType:'oe'},{targetBId:id(8)}]){reset();assert.ok((await post(runs,{...body,...patch})).status>=400);assert.equal(writes.length,0);checks++;}
reset();targetRows[1].status='private';assert.equal((await post(runs,body)).status,400);assert.equal(writes.length,0);checks++;
reset();shareMusic=true;assert.equal((await post(runs,body)).status,201);assert.equal(stored[0].songTitle,'Private song');assert.equal(JSON.parse(stored[0].researchContext).sha256,'a'.repeat(64));checks++;
const description={participantId:id(2),comparisonId:id(1),targetAId:id(3),targetBId:id(4),testMode:'bring',headphoneType:'ie',reasonSide:'a',otherReason:'Synthetic description',matchedPassageRequired:false};
reset();await post(runs,body);writes=[];assert.equal((await post(feedback,description)).status,201);checks++;
for(const patch of [{participantId:id(9)},{comparisonId:id(9)},{targetAId:id(4)},{testMode:'open'},{headphoneType:'oe'}]){reset();await post(runs,body);writes=[];assert.equal((await post(feedback,{...description,...patch})).status,403);assert.equal(writes.length,0);checks++;}
for(const mutate of [()=>subject='other-participant',()=>consent=false,()=>stored[0].protocolVersion=protocol.LISTENING_PROTOCOL,()=>stored=[]]){reset();await post(runs,body);writes=[];mutate();assert.equal((await post(feedback,description)).status,403);assert.equal(writes.length,0);checks++;}
console.log(`PASS ${checks} free-listening API cases: actual timing, protocol separation, consent changes, private targets, category/input validation, admin/test denials, song privacy and owned feedback context.`);

// The real migration chain must roll back the entire run when consent/session
// changes after the handler's initial ownership read but before its atomic batch.
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
for(const file of readdirSync('drizzle').filter(f=>/^\d{4}.*\.sql$/.test(f)).sort())sql.exec(readFileSync('drizzle/'+file,'utf8'));
sql.prepare("INSERT INTO privacy_accounts(subject_id,submissions_enabled,agreement_version) VALUES('browser:fixture',1,'2026-10-18-v7')").run();
sql.prepare("INSERT INTO privacy_sessions(token_hash,subject_id,expires_at) VALUES('fixture','browser:fixture',?)").run(Date.now()+60000);
function atomicRun(){sql.exec('BEGIN');try{sql.prepare("INSERT INTO listening_runs(id,voter_id,test_mode,headphone_type,target_a_id,target_b_id,target_a_name,target_b_name,result,intervals,heard_a,heard_b,overlap_seconds,created_at,protocol_version) VALUES('fixture-run','voter','bring','ie','a','b','A','B','a','[]',0,0,0,0,'free-listening-v1')").run();sql.prepare("INSERT INTO submission_owners(record_kind,record_id,subject_id,session_hash) VALUES('run','fixture-run','browser:fixture','fixture')").run();sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}}
for(const mutation of ["UPDATE privacy_accounts SET submissions_enabled=0","UPDATE privacy_accounts SET agreement_version='old'","UPDATE privacy_sessions SET expires_at=0"]){sql.exec("UPDATE privacy_accounts SET submissions_enabled=1,agreement_version='2026-10-18-v7'");sql.prepare('UPDATE privacy_sessions SET expires_at=?').run(Date.now()+60000);sql.exec(mutation);assert.throws(atomicRun,/Active participation/);assert.equal(sql.prepare('SELECT COUNT(*) n FROM listening_runs').get().n,0);assert.equal(sql.prepare('SELECT COUNT(*) n FROM submission_owners').get().n,0);}
sql.close();console.log('PASS 3 real SQLite consent/session race cases: complete run rollback, zero orphaned research rows.');
