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
const subject='synthetic-agreement-account';sql.prepare('INSERT INTO privacy_accounts(subject_id) VALUES(?)').run(subject);
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
const personalNotice={PERSONAL_RESEARCH_NOTICE_VERSION:'personal-research-2026-10-18-v1'};deps['@/lib/personal-research-notice']=personalNotice;const personalExports={};vm.runInNewContext(ts.transpileModule(readFileSync('lib/personal-research-server.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:personalExports,crypto,require:name=>{if(name in deps)return deps[name];throw Error(name);}});deps['@/lib/personal-research-server']=personalExports;
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
sql.close();console.log('Agreement preference checks passed: current opt-in acknowledgement, optional opt-out without reacknowledgement, participation withdrawal, accessible My data, explicit rejoin, failed-save rollback, and origin protection. Synthetic SQLite only.');
