import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {DatabaseSync} from 'node:sqlite';
import {VOTE_DATA_NOTICE_VERSION} from '../lib/vote-data-notice.ts';
import {ACTIVITY_MONITORING_NOTICE_VERSION} from '../lib/activity-monitoring.ts';
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
for(const file of readdirSync('drizzle').filter(file=>/^\d{4}.*\.sql$/.test(file)).sort())sql.exec(readFileSync('drizzle/'+file,'utf8'));
let writes=0;
const db={prepare(query){const result={args:[],bind(...args){this.args=args;return this;},async first(){return sql.prepare(query).get(...this.args)||null;},async all(){return {results:sql.prepare(query).all(...this.args)};},async run(){writes++;return sql.prepare(query).run(...this.args);}};return result;},async batch(){writes++;throw Error('An admin contribution reached a database batch');}};
const fail=()=>{throw Error('An admin contribution reached an application database operation');};
const unexpected=new Proxy(fail,{get:()=>unexpected});
let identity='owner';const session='a'.repeat(64);
for(const subject of ['owner','invite:layout-test-only','browser:participant'])sql.prepare('INSERT INTO privacy_accounts(subject_id,submissions_enabled,agreement_version,agreed_at) VALUES(?,1,?,0)').run(subject,VOTE_DATA_NOTICE_VERSION);
sql.prepare('INSERT INTO privacy_sessions(token_hash,subject_id,expires_at) VALUES(?,?,?)').run(session,identity,Date.now()+60000);
const deps={'cloudflare:workers':{env:{DB:db}},'next/headers':{headers:async()=>new Headers({'x-yinyang-data-session':session})},'@/db':{getDb:fail},'@/db/schema':unexpected,'drizzle-orm':unexpected,'@/lib/vote-data-notice':{VOTE_DATA_NOTICE_VERSION},'@/lib/activity-monitoring':{ACTIVITY_MONITORING_NOTICE_VERSION},'@/app/chatgpt-auth':{getChatGPTUser:async()=>({userId:identity,displayName:'Test admin',email:''})},'@/lib/music-catalog':{musicCandidates:[],listeningPool:[]}};
function load(file){const exports={};const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;vm.runInNewContext(code,{exports,require:name=>deps[name]||unexpected,Response,Request,Headers,URL,Date,crypto,TextEncoder,TextDecoder,Buffer,console});return exports;}
deps['@/lib/request-json']=load('lib/request-json.ts');
deps['@/lib/profile-api']=load('lib/profile-api.ts');
deps['@/lib/admin-contributions']=load('lib/admin-contributions.ts');
deps['@/lib/yinyangeq-account']=load('lib/yinyangeq-account.ts');
deps['@/lib/submission-ownership']=load('lib/submission-ownership.ts');
deps['@/lib/personal-research-server']=load('lib/personal-research-server.ts');
const routes=['trials','listening-runs','votes','comparison-choices','feedback','research-measurements','preference-exports','targets','suggestions','music-votes','personal-research','my-profile'];
for(const subject of ['owner','invite:layout-test-only']){sql.prepare('UPDATE privacy_sessions SET subject_id=? WHERE token_hash=?').run(subject,session);identity=subject;
for(const name of routes){const route=load(`app/api/${name}/route.ts`);for(const body of [{},{testOnly:false,admin:false,subjectId:'browser:forged',voterId:crypto.randomUUID(),result:'a'}]){const before=writes;const response=await route.POST(new Request(`https://fixture.invalid/api/${name}`,{method:'POST',headers:{Origin:'https://fixture.invalid','Content-Type':'application/json'},body:JSON.stringify(body)}));assert.equal(response.status,403,`${name} must reject admin before payload handling`);assert.equal(writes,before,`${name} wrote data`);const result=await response.json();assert.match(result.error,/Admin test only|Private test only|dedicated YinYangEQ/);}}
}
assert.deepEqual(JSON.parse(JSON.stringify(await deps['@/lib/personal-research-server'].personalPermission(db,'owner',true))),{enabled:false,token:null,testOnly:true});
assert.throws(()=>deps['@/lib/personal-research-server'].personalPermissionStatement(db,'owner',true),/Admin test only/);
// A real participant retains access through the exact same ownership guard.
sql.prepare('UPDATE privacy_sessions SET subject_id=? WHERE token_hash=?').run('browser:participant',session);
const participant=await deps['@/lib/submission-ownership'].submissionContext('vote');assert.equal(participant.subjectId,'browser:participant');
assert.equal(writes,0);
console.log(`PASS ${routes.length*4} actual admin/private-test POST denial cases: every official contribution route, forged flags/identity, zero writes; optional Personal sharing denied; ordinary participant context preserved.`);
sql.close();
// The edge gate rejects every mutation for the private review identity, including
// otherwise non-research features such as Sync or profile publication.
const gateSource=readFileSync('infra/pulumi/private-gate.mjs','utf8');
const gateStart=gateSource.indexOf('      if(tester?.id==="layout-test-only" &&');
const gateEnd=gateSource.indexOf('      // Open access still uses',gateStart);
const gate=new Function('tester','request','json','htmlResponse','const path=new URL(request.url).pathname;'+gateSource.slice(gateStart,gateEnd)+';return null;');
for(const method of ['POST','PATCH','PUT','DELETE'])for(const path of ['/api/music-votes','/api/targets','/api/listening-runs','/api/personal-research','/pair','/api/my-profile']){
 const response=gate({id:'layout-test-only'},new Request('https://fixture.invalid'+path,{method}), (value,status)=>Response.json(value,{status}));assert.equal(response.status,403);
 assert.equal(gate({id:'participant'},new Request('https://fixture.invalid'+path,{method}),()=>assert.fail('Ordinary participant blocked')),null);
}
for(const method of ['GET','HEAD','OPTIONS'])assert.equal(gate({id:'layout-test-only'},new Request('https://fixture.invalid/shootout',{method}),()=>assert.fail('Read blocked')),null);
console.log('PASS private test gate: 24 mutation cases denied, participant requests unchanged and read access retained.');

for(const path of ['/sync','/pair','/devices']){const response=gate({id:'layout-test-only'},new Request('https://fixture.invalid'+path),()=>assert.fail('Unexpected JSON'),(body,status)=>new Response(body,{status}));assert.equal(response.status,403);assert.ok(!(await response.text()).includes('<form'));}
console.log('PASS hidden-test Sync reads show a clear restriction and expose no enrollment form.');
