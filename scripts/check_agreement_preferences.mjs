import{accountSyncFixtureDeps}from'./account-sync-fixture.mjs';
import contributionPolicy from './contribution-policy-fixture.mjs';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as requestJson from '../lib/request-json.ts';
import * as labels from '../lib/target-labels.ts';
import * as nicknames from '../lib/listener-nickname.ts';
import {ACTIVITY_MONITORING_NOTICE_VERSION} from '../lib/activity-monitoring.ts';
import {VOTE_DATA_NOTICE_VERSION} from '../lib/vote-data-notice.ts';
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
let subject='synthetic-agreement-account';sql.prepare('INSERT INTO privacy_accounts(subject_id) VALUES(?)').run(subject);
const account=()=>sql.prepare('SELECT * FROM privacy_accounts WHERE subject_id=?').get(subject);
let failBatch=false;
class Statement{
 constructor(query,args=[]){this.query=query;this.args=args;}
 bind(...args){return new Statement(this.query,args);}
 async all(){return {results:sql.prepare(this.query).all(...this.args),success:true};}
 async first(){return sql.prepare(this.query).get(...this.args)||null;}
 async run(){sql.prepare(this.query).run(...this.args);return{success:true};}
}
const DB={prepare:query=>new Statement(query),batch:async statements=>{sql.exec('BEGIN');try{const out=[];for(const [i,statement] of statements.entries()){out.push(await statement.run());if(failBatch&&i===0)throw Error('Synthetic transaction failure');}sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
const deps={'@/lib/admin-contributions':contributionPolicy,'@/lib/listener-nickname':nicknames,
 'cloudflare:workers':{env:{DB}},'@/lib/activity-monitoring':{ACTIVITY_MONITORING_NOTICE_VERSION},'@/lib/vote-data-notice':{VOTE_DATA_NOTICE_VERSION},'@/lib/target-labels':labels,'@/lib/request-json':requestJson,
 '@/lib/submission-ownership':{dataIdentity:async()=>{const a=account();return{subjectId:subject,submissionsEnabled:a.submissions_enabled===1&&a.agreement_version===VOTE_DATA_NOTICE_VERSION,shareMusic:a.share_music===1,activityMonitoringEnabled:a.activity_monitoring_enabled===1,activityMonitoringVersion:a.activity_monitoring_version,agreementVersion:a.agreement_version,agreedAt:a.agreed_at};}},
 '@/lib/privacy-erasure':{dataTables:{},eraseData:()=>{throw Error('This preference test must never erase source data');}}
};
const communityNotice={COMMUNITY_NOTICE_VERSION:'community-preferences-2026-10-19-v1'};deps['@/lib/community-notice']=communityNotice;const communityExports={};vm.runInNewContext(ts.transpileModule(readFileSync('lib/community-server.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:communityExports,crypto,require:name=>{if(name in deps)return deps[name];throw Error(name);}});deps['@/lib/community-server']=communityExports;
const personalNotice={PERSONAL_RESEARCH_NOTICE_VERSION:'personal-research-2026-10-18-v1'};deps['@/lib/personal-research-notice']=personalNotice;const personalExports={};vm.runInNewContext(ts.transpileModule(readFileSync('lib/personal-research-server.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:personalExports,crypto,require:name=>{if(name in deps)return deps[name];throw Error(name);}});deps['@/lib/personal-research-server']=personalExports;
deps['@/lib/legacy-notice']={RETROSPECTIVE_NOTICE_VERSION:'retrospective-2026-10-18-v1'};const studiesExports={};vm.runInNewContext(ts.transpileModule(readFileSync('lib/consent-studies.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:studiesExports,require:name=>deps[name]});deps['@/lib/consent-studies']=studiesExports;
Object.assign(deps,accountSyncFixtureDeps(deps));
const context=vm.createContext({exports:{},require:name=>{if(!(name in deps))throw Error('Unexpected dependency '+name);return deps[name];},Response,Request,Headers,URL,Date,TextEncoder,TextDecoder,Uint8Array});
vm.runInContext(ts.transpileModule(readFileSync(new URL('../app/api/my-data/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const patch=(body,origin='https://fixture.test')=>context.exports.PATCH(new Request('https://fixture.test/api/my-data',{method:'PATCH',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));
assert.equal((await patch({submissionsEnabled:true,shareMusic:false})).status,400,'Opt-in requires explicit current acknowledgement');
assert.equal((await patch({submissionsEnabled:true,shareMusic:true,acknowledged:true,noticeVersion:VOTE_DATA_NOTICE_VERSION})).status,200);
const receipt=account().agreed_at;
assert.equal((await patch({submissionsEnabled:true,shareMusic:false})).status,200,'Optional sharing can be turned off without agreeing again');
assert.equal(account().submissions_enabled,1);assert.equal(account().share_music,0);assert.equal(account().agreed_at,receipt);
assert.equal((await patch({submissionsEnabled:false,shareMusic:true})).status,200,'Withdrawal is savable even when incoming music flag is true');
assert.equal(account().submissions_enabled,0);assert.equal(account().share_music,0);assert.ok(account().withdrawn_at);
assert.equal((await context.exports.GET()).status,200,'Data management remains available after opting out');
assert.equal((await patch({submissionsEnabled:true,shareMusic:false,acknowledged:true,noticeVersion:'old-notice'})).status,400);
assert.equal((await patch({submissionsEnabled:true,shareMusic:false,acknowledged:true,noticeVersion:VOTE_DATA_NOTICE_VERSION})).status,200,'Explicit current opt-in can reactivate participation');
failBatch=true;assert.equal((await patch({submissionsEnabled:false,shareMusic:false})).status,503);assert.equal(account().submissions_enabled,1,'Failed withdrawal transaction rolls back saved settings');failBatch=false;
assert.equal((await patch({submissionsEnabled:false,shareMusic:false},'https://attacker.test')).status,403);assert.equal(account().submissions_enabled,1);
assert.equal((await patch({submissionsEnabled:false,shareMusic:false})).status,200);
const combined={submissionsEnabled:true,shareMusic:false,nickname:"  Consent Owl  ",activityMonitoringEnabled:true,acknowledged:true,noticeVersion:VOTE_DATA_NOTICE_VERSION,activityMonitoringAcknowledged:true,activityMonitoringNoticeVersion:ACTIVITY_MONITORING_NOTICE_VERSION};
assert.equal((await patch(combined)).status,200);
let saved=await(await context.exports.GET()).json();assert.equal(saved.nickname,"Consent Owl");assert.equal(saved.activityMonitoringEnabled,true);
assert.equal((await patch({...combined,nickname:"email@example.test",activityMonitoringEnabled:false})).status,400);
saved=await(await context.exports.GET()).json();assert.equal(saved.nickname,"Consent Owl");assert.equal(saved.activityMonitoringEnabled,true,"Invalid nickname never changes monitoring consent");
failBatch=true;assert.equal((await patch({...combined,nickname:"Changed Owl",activityMonitoringEnabled:false})).status,503);failBatch=false;
saved=await(await context.exports.GET()).json();assert.equal(saved.nickname,"Consent Owl");assert.equal(saved.activityMonitoringEnabled,true,"Consent and nickname save atomically");
assert.equal((await patch({...combined,nickname:"",activityMonitoringEnabled:false})).status,200);
saved=await(await context.exports.GET()).json();assert.equal(saved.nickname,"");assert.equal(saved.activityMonitoringEnabled,false);
console.log("Combined popup nickname and consent verified: save/read, email rejection without partial writes, transaction rollback, explicit monitoring on/off and nickname removal.");
// The initial all-current-sharing request includes both optional research permissions.
const all={submissionsEnabled:true,shareMusic:true,activityMonitoringEnabled:true,personalResearchEnabled:true,communityEnabled:true,acknowledged:true,noticeVersion:VOTE_DATA_NOTICE_VERSION,activityMonitoringAcknowledged:true,activityMonitoringNoticeVersion:ACTIVITY_MONITORING_NOTICE_VERSION,personalResearchAcknowledged:true,personalResearchNoticeVersion:personalNotice.PERSONAL_RESEARCH_NOTICE_VERSION,communityAcknowledged:true,communityNoticeVersion:communityNotice.COMMUNITY_NOTICE_VERSION};
assert.equal((await patch({...all,communityAcknowledged:false})).status,400,'Community notice needs its own explicit acknowledgement in the combined request');
assert.equal((await patch({...all,personalResearchAcknowledged:false})).status,400,'Personal notice needs its own explicit acknowledgement in the combined request');
assert.equal((await patch(all)).status,200);saved=await(await context.exports.GET()).json();assert.equal(saved.personalResearchEnabled,true);assert.equal(saved.communityEnabled,true);assert.equal(saved.shareMusic,true);assert.equal(saved.activityMonitoringEnabled,true);
failBatch=true;assert.equal((await patch({...all,personalResearchEnabled:false,communityEnabled:false})).status,503);failBatch=false;saved=await(await context.exports.GET()).json();assert.equal(saved.personalResearchEnabled,true);assert.equal(saved.communityEnabled,true,'All five saved choices survive a failed combined transaction');
assert.equal((await patch({submissionsEnabled:false,shareMusic:false,activityMonitoringEnabled:false})).status,200);assert.equal(sql.prepare('SELECT enabled FROM personal_research_permissions WHERE subject_id=?').get(subject).enabled,0);assert.equal(sql.prepare('SELECT enabled FROM community_personal_permissions WHERE subject_id=?').get(subject).enabled,0,'Withdrawing required participation clears stored Community permission too');
assert.equal((await patch({submissionsEnabled:true,shareMusic:false,acknowledged:true,noticeVersion:VOTE_DATA_NOTICE_VERSION})).status,200);saved=await(await context.exports.GET()).json();assert.equal(saved.personalResearchEnabled,false);assert.equal(saved.communityEnabled,false,'Old permission does not silently revive after required-only rejoin');
assert.equal((await patch(all)).status,200);assert.equal((await patch({submissionsEnabled:true,shareMusic:false,activityMonitoringEnabled:false,personalResearchEnabled:false,communityEnabled:false})).status,200);saved=await(await context.exports.GET()).json();assert.equal(saved.submissionsEnabled,true);assert.equal(saved.personalResearchEnabled,false);assert.equal(saved.communityEnabled,false);assert.equal(saved.shareMusic,false);assert.equal(saved.activityMonitoringEnabled,false);
console.log('Unified consent verified: all five saved/read together, separate notice acknowledgements, atomic rollback, required-only, withdrawal and no silent research reactivation.');
console.log('Agreement preference checks passed: current opt-in acknowledgement, optional opt-out without reacknowledgement, participation withdrawal, accessible My data, explicit rejoin, failed-save rollback, and origin protection. Synthetic SQLite only.');

const studyId='00000000-0000-4000-8000-000000000001',notice=deps['@/lib/legacy-notice'].RETROSPECTIVE_NOTICE_VERSION;
sql.prepare("INSERT INTO archive_studies(id,target_a,target_b,mode,headphone_type,start_at,end_at,notice_version,methodology,source_mode,seal_after) VALUES(?,?,?,'blind','ie',1,2,?,'synthetic','retrospective',3)").run(studyId,'a','b',notice);
const historical={...combined,activityMonitoringEnabled:false,retrospectiveChoices:[{studyId,enabled:true}],retrospectiveAcknowledged:true,retrospectiveNoticeVersion:notice};
assert.equal((await patch(historical)).status,400,'Ineligible synthetic account cannot grant historical permission');
const eligible='browser:00000000-0000-4000-8000-000000000002';sql.prepare('INSERT INTO privacy_accounts(subject_id) VALUES(?)').run(eligible);
// Exercise actual helper against SQLite with an eligible participant, independent of identity fixture.
let statements=await studiesExports.consentStudyStatements(DB,eligible,historical.retrospectiveChoices,true,notice,true);await DB.batch(statements);
assert.equal((await studiesExports.consentStudies(DB,eligible))[0].opted_in,1);
await assert.rejects(()=>studiesExports.consentStudyStatements(DB,eligible,historical.retrospectiveChoices,false,notice,true),/Review each/);
await assert.rejects(()=>studiesExports.consentStudyStatements(DB,eligible,[{studyId,enabled:true},{studyId,enabled:false}],true,notice,true),/Choose your listed/);
statements=await studiesExports.consentStudyStatements(DB,eligible,[{studyId,enabled:false}],false,notice,true);await DB.batch(statements);assert.equal((await studiesExports.consentStudies(DB,eligible))[0].opted_in,0);
sql.prepare('INSERT INTO archive_releases(sequence,study_id,payload) VALUES(0,?,?)').run(studyId,'{}');await assert.rejects(()=>studiesExports.consentStudyStatements(DB,eligible,historical.retrospectiveChoices,true,notice,true),/already sealed/);
console.log('Historical permissions verified against actual SQLite: listed studies, eligibility, explicit current receipt, duplicate rejection, withdrawal and sealed-result protection.');

const secondId='00000000-0000-4000-8000-000000000003';sql.prepare("INSERT INTO archive_studies(id,target_a,target_b,mode,headphone_type,start_at,end_at,notice_version,methodology,source_mode,seal_after) VALUES(?,?,?,'blind','ie',3,4,?,'synthetic','retrospective',5)").run(secondId,'a','b',notice);
assert.equal((await studiesExports.consentStudies(DB,eligible)).find(row=>row.id===secondId).opted_in,0,'A future study never inherits all-current-sharing');
sql.prepare("INSERT INTO owner_public_profiles(slug,subject_id,invite_id,policy_at,created_at) VALUES('yinyangeq',?,'synthetic',1,1)").run(eligible);
await assert.rejects(()=>studiesExports.consentStudyStatements(DB,eligible,[{studyId:secondId,enabled:true}],true,notice,true),/protected YinYangEQ/);
await assert.rejects(()=>studiesExports.consentStudyStatements(DB,eligible,[{studyId:'00000000-0000-4000-8000-000000000099',enabled:true}],true,notice,true),/study changed/);
const privateSync={...combined,activityMonitoringEnabled:false,syncEnabled:true};
assert.equal((await patch(privateSync)).status,400,'Sync needs its own explicit current notice');assert.equal((await patch({...privateSync,syncAcknowledged:true,syncNoticeVersion:'old'})).status,400);
assert.equal((await patch({...privateSync,syncAcknowledged:true,syncNoticeVersion:'account-sync-2026-10-19-v1'})).status,200);assert.equal((await(await context.exports.GET()).json()).syncEnabled,true);
failBatch=true;assert.equal((await patch({...privateSync,syncEnabled:false})).status,503);failBatch=false;assert.equal((await(await context.exports.GET()).json()).syncEnabled,true,'A failed shared Save rolls back sync consent too');
assert.equal((await patch({submissionsEnabled:false,shareMusic:false})).status,200);assert.equal((await(await context.exports.GET()).json()).syncEnabled,true,'Research withdrawal alone does not silently disable independent private sync');
assert.equal((await patch({submissionsEnabled:false,shareMusic:false,syncEnabled:false})).status,200);assert.equal((await(await context.exports.GET()).json()).syncEnabled,false);
console.log('Private sync consent verified: default-off, separate explicit/versioned acknowledgement, atomic shared Save, no silent research-to-sync opt-in, independent research withdrawal and explicit sync opt-out.');
// The deployed hidden layout identity can save consent fixtures only.
subject='invite:layout-test-only';sql.prepare('INSERT INTO privacy_accounts(subject_id) VALUES(?)').run(subject);
const testBody={submissionsEnabled:true,shareMusic:true,activityMonitoringEnabled:false,personalResearchEnabled:false,communityEnabled:false,syncEnabled:false,nickname:'Consent fixture',acknowledged:true,noticeVersion:VOTE_DATA_NOTICE_VERSION};
assert.equal((await patch(testBody)).status,200);let testSaved=await(await context.exports.GET()).json();assert.equal(testSaved.testOnly,true);assert.equal(testSaved.consentTestOnly,true);assert.equal(testSaved.submissionsEnabled,true);assert.equal(testSaved.shareMusic,true);
const savedFixture=JSON.stringify(account());
for(const extra of [{syncEnabled:true},{activityMonitoringEnabled:true},{personalResearchEnabled:true},{communityEnabled:true},{retrospectiveChoices:[{studyId,enabled:true}]},{action:'nickname',nickname:'Not consent'}]){
 assert.equal((await patch({...testBody,...extra})).status,403);assert.equal(JSON.stringify(account()),savedFixture,'Rejected fixture expansion must make zero partial consent changes');
}
failBatch=true;assert.equal((await patch({...testBody,shareMusic:false})).status,503);failBatch=false;assert.equal(JSON.stringify(account()),savedFixture);
assert.equal((await patch({...testBody,submissionsEnabled:false})).status,200);testSaved=await(await context.exports.GET()).json();assert.equal(testSaved.submissionsEnabled,false);assert.equal(testSaved.shareMusic,false);assert.equal(testSaved.syncEnabled,false);assert.equal(testSaved.personalResearchEnabled,false);assert.equal(testSaved.communityEnabled,false);assert.equal(sql.prepare('SELECT COUNT(*) n FROM activity_events WHERE subject_id=?').get(subject).n,0);
console.log('PASS isolated live-consent fixture: saved consent/music/nickname, explicit opt-out, no research/monitoring/historical/Sync expansion, zero partial writes and rollback.');
sql.close();
