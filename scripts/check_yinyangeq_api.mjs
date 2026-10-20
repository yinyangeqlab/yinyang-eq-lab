import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {validateSyncPayload} from '../lib/browser-sync.mjs';
import {linkedTester,browserPairing} from '../lib/browser-pairing.mjs';
const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
for(const file of readdirSync('drizzle').filter(file=>/^\d{4}.*\.sql$/.test(file)).sort())sqlite.exec(readFileSync('drizzle/'+file,'utf8'));
const db={prepare(query){const self={args:[],bind(...args){this.args=args;return this;},async first(){return sqlite.prepare(query).get(...this.args)||null;},async all(){return{results:sqlite.prepare(query).all(...this.args)};},async run(){return sqlite.prepare(query).run(...this.args);}};return self;},async batch(items){sqlite.exec('BEGIN');try{const result=[];for(const item of items)result.push(await item.run());sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>{assert.ok(name in deps,name);return deps[name];},crypto,Date,TextEncoder,TextDecoder,btoa,atob,Response,Request,URL,Headers});return exports;}
const input=load('lib/request-json.ts'),account=load('lib/yinyangeq-account.ts',{'@/lib/request-json':input,'@/lib/browser-sync.mjs':{validateSyncPayload}});

const records=load('lib/yinyangeq-records.ts',{'@/lib/request-json':input,'@/lib/yinyangeq-account':account,'@/lib/music-catalog':{musicCandidates:[]},'@/lib/music-display':{musicDisplayTitle:x=>x},'@/lib/curves':{parseCurve:()=>[]},'@/lib/research-measurement-files':{measurementFileHash:async()=>''}});

let subject='owner';
const deps={'cloudflare:workers':{env:{DB:db}},'@/lib/request-json':input,'@/lib/yinyangeq-account':account,'@/lib/yinyangeq-records':records,'@/lib/submission-ownership':{dataIdentity:async()=>({subjectId:subject})},'@/lib/public-write-gate':{publicWriteGate:async()=>null}};
deps['@/lib/admin-contributions']=load('lib/admin-contributions.ts',deps);deps['@/lib/profile-api']=load('lib/profile-api.ts',deps);
const mine=load('app/api/my-profile/route.ts',deps),access=load('app/api/profile-access/route.ts',deps),profile=await account.createProfileAccount(db);
function post(body,cookie='',origin='https://fixture.invalid'){return new Request('https://fixture.invalid/api/profile-access',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});}
assert.equal((await mine.POST(post({state:'published',subjectId:profile.subject_id}))).status,403,'admin may not publish by forging participant identity');subject='invite:someone-else';assert.equal((await mine.GET(new Request('https://fixture.invalid/api/my-profile'))).status,403);subject=profile.subject_id;
assert.equal((await mine.POST(post({},'','https://hostile.invalid'))).status,403);
const grant=await account.createProfileGrant(db,'Brave');assert.equal((await access.POST(post({action:'claim',code:grant.code},'','https://hostile.invalid'))).status,403);
const claimed=await access.POST(post({action:'claim',code:grant.code}));assert.equal(claimed.status,200);assert.ok(!JSON.stringify(await claimed.json()).includes(grant.code));const claimCookie=claimed.headers.getSetCookie()[0].split(';')[0];assert.match(claimed.headers.getSetCookie()[0],/HttpOnly/);
const complete=await access.POST(post({action:'complete'},claimCookie+'; __Host-yinyangeq_owner=fixture-admin-cookie'));assert.equal(complete.status,200);const cookies=complete.headers.getSetCookie();assert.ok(cookies.some(value=>value.startsWith('__Host-yinyangeq_owner=; Max-Age=0')));assert.ok(cookies.some(value=>value.startsWith('__Host-yinyangeq_tester=')&&value.includes('HttpOnly')));assert.ok(cookies.some(value=>value.startsWith('__Host-yinyangeq_data=')));const publicBody=JSON.stringify(await complete.json());assert.ok(!publicBody.includes('access')&&!publicBody.includes('secret'));
assert.equal((await access.POST(post({action:'claim',code:grant.code}))).status,409);
assert.equal((await mine.GET(new Request('https://fixture.invalid/api/my-profile'))).status,200);
console.log('PASS actual account API handlers: cross-origin rejection, strict participant identity, admin publication denial, private one-use cookie claim, HTTPOnly participant sign-in and clearing admin cookie; no credential JSON.');sqlite.close();
