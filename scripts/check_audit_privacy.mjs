import {targetHeadphoneType} from '../lib/target-type.ts';
import assert from 'node:assert/strict';import{readFileSync,readdirSync}from'node:fs';import vm from'node:vm';import ts from'typescript';import{DatabaseSync}from'node:sqlite';import{parseIntervals,intervalStats}from'../lib/listening.ts';import{VOTE_DATA_NOTICE_VERSION}from'../lib/vote-data-notice.ts';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';let writes=0;const targetRows=[{id:a,status:'approved',points:[[20,0],[20000,0]]},{id:b,status:'private',points:[[20,0],[20000,0]]}];
const source=readFileSync('app/api/listening-runs/route.ts','utf8').replace(/^import .*;\n/gm,'');const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/export async function/g,'async function');
const route=vm.runInNewContext(js+';({POST})',{Response,Date,JSON,targetHeadphoneType,parseIntervals,intervalStats,VOTE_DATA_NOTICE_VERSION,LISTENING_PROTOCOL:'test',readJsonObject:r=>r.json(),requestInputResponse:()=>null,publicWriteGate:async()=>null,submissionContext:async()=>({shareMusic:false,record:()=>({}),requireTrial:async()=>{}}),curveVersion:async()=> 'test-version',publicTargetPredicate:{},getDb:()=>({select:()=>({from:()=>({where:async()=>targetRows})}),insert:()=>({values:()=>({})}),batch:async()=>{writes++;}}),targets:{},listeningRuns:{},comparisonRecords:{}});
const request=()=>new Request('https://test.invalid/api/listening-runs',{method:'POST',body:JSON.stringify({id:crypto.randomUUID(),voterId:crypto.randomUUID(),targetAId:a,targetBId:b,testMode:'open',headphoneType:'ie',result:'a',researchContext:{targetVersions:['test-version','test-version']},intervals:[],voteDataNoticeVersion:VOTE_DATA_NOTICE_VERSION})});
assert.equal((await route.POST(request())).status,400);assert.equal(writes,0,'Private targets cannot enter the run endpoint');targetRows[1].status='approved';assert.equal((await route.POST(request())).status,201);assert.equal(writes,1,'Approved Open comparisons remain available');
const db=new DatabaseSync(':memory:');for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+f,'utf8'));
const archive=readFileSync('app/api/owner-research/archive/route.ts','utf8'),query=archive.match(/db\.prepare\(`(SELECT o\.subject_id,COUNT\([\s\S]*?GROUP BY o\.subject_id)`\)/)?.[1];assert.ok(query);
for(const id of [a,b])db.prepare("INSERT INTO targets(id,name,creator,points,created_at,status) VALUES(?,?,?,'[]',0,'approved')").run(id,id,'Fixture');
const subjects=['browser:fixture','invite:fixture','owner','legacy-fixture'];for(const [i,subject]of subjects.entries()){
 db.prepare('INSERT INTO privacy_accounts(subject_id,submissions_enabled,agreement_version,agreed_at) VALUES(?,1,?,0)').run(subject,VOTE_DATA_NOTICE_VERSION);
 db.prepare('INSERT INTO privacy_sessions(token_hash,subject_id,expires_at) VALUES(?,?,?)').run('synthetic-'+i,subject,Date.now()+60000);
 const id=crypto.randomUUID();db.prepare("INSERT INTO votes(id,winner_id,loser_id,voter_id,created_at,test_mode,headphone_type,eligible,heard_a,heard_b) VALUES(?,?,?,?,10,'blind','ie',1,6,6)").run(id,a,b,'voter-'+i);
 db.prepare("INSERT INTO submission_owners(record_kind,record_id,subject_id,session_hash) VALUES('vote',?,?,?)").run(id,subject,'synthetic-'+i);
}
const run=()=>db.prepare(query).all(a,0,20,0,VOTE_DATA_NOTICE_VERSION,0,'study','notice','blind','ie',a,b,b,a);
assert.deepEqual(run().map(r=>r.subject_id).sort(),['browser:fixture','invite:fixture']);
db.prepare("UPDATE privacy_accounts SET submissions_enabled=0 WHERE subject_id='browser:fixture'").run();assert.deepEqual(run().map(r=>r.subject_id),['invite:fixture'],'Withdrawal excludes public accounts too');db.close();
console.log('Audit privacy checks passed: private Open runs rejected without writes, approved Open runs retained, protected studies include authenticated public/invite accounts, shared-admin/legacy excluded and withdrawal respected. Synthetic SQLite only.');
const panel=readFileSync('components/music-panel.tsx','utf8');const metadataSource=panel.slice(panel.indexOf('function sourceDetails'),panel.indexOf('\nconst MusicPanel'));
const details=vm.runInNewContext(ts.transpileModule(metadataSource,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';sourceDetails',{Uint8Array,DataView});
const header=Uint8Array.from([255,251,144,0,...Array(60).fill(0)]);const mp3=details(header.buffer,'MP3');assert.equal(mp3.sampleRate,44100);assert.equal(mp3.bitrate,128000);
assert.deepEqual(JSON.parse(JSON.stringify(details(new ArrayBuffer(10),'UNKNOWN'))),{});
console.log('Bounded source metadata parsing verified for MPEG sample rate/bitrate and unknown-header fallback.');
