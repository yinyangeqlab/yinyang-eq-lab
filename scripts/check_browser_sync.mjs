import{ACCOUNT_SYNC_NOTICE_VERSION}from'../lib/account-sync-notice.mjs';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {browserPairing,pairingHash,linkedTester} from '../lib/browser-pairing.mjs';
import vm from 'node:vm';
import {browserSyncScript,captureSyncPayload,replaceSyncStorage,validateSyncPayload} from '../lib/browser-sync.mjs';
const sql=new DatabaseSync(':memory:');
for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
class Statement{constructor(query,args=[]){this.query=query;this.args=args;}bind(...args){return new Statement(this.query,args);}async first(){return sql.prepare(this.query).get(...this.args)||null;}async all(){return{results:sql.prepare(this.query).all(...this.args)};}async run(){return{meta:{changes:Number(sql.prepare(this.query).run(...this.args).changes)}};}}
const DB={prepare:q=>new Statement(q),batch:async statements=>{sql.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
const env={DB,PRIVATE_ACCESS_PASSWORD:crypto.randomUUID()+crypto.randomUUID()},origin='https://fixture.test',tester={id:'fixture-sync',label:'Sync fixture'},original='S'.repeat(43),now=Math.floor(Date.now()/1000);
sql.prepare('INSERT INTO private_tester_invites(id,label,code_hash,created_at,code_expires_at,redeemed_at,session_hash,session_expires_at) VALUES(?,?,?,?,?,?,?,?)').run(tester.id,tester.label,'fixture-code',now,now+600,now,await pairingHash(original),now+3600);
sql.prepare('INSERT INTO privacy_accounts(subject_id) VALUES(?)').run('invite:'+tester.id);
sql.prepare('INSERT INTO listener_nicknames(subject_id,nickname) VALUES(?,?)').run('invite:'+tester.id,'Synced Owl');
class Storage{
 constructor(values={}){this.values=new Map(Object.entries(values));this.failKey=null;}
 get length(){return this.values.size;}key(index){return [...this.values.keys()][index]||null;}getItem(key){return this.values.get(key)??null;}removeItem(key){this.values.delete(key);}setItem(key,value){if(key===this.failKey){this.failKey=null;throw Error('Synthetic quota failure');}this.values.set(key,String(value));}
}
const sourceStorage=new Storage({'target-lab-voter':'11111111-1111-4111-8111-111111111111','target-lab-trials':'[{"id":"source-result"}]','target-lab-measurements':'[{"id":"source-headphone","name":"Fixture headphones"}]','target-lab-page-state':'{"trialId":"unfinished"}','target-lab-research-sharing':'true','yinyang-activity-monitoring':'true','unrelated-key':'keep'});
const payload=captureSyncPayload(sourceStorage);
assert.equal(payload.values['target-lab-page-state'],undefined,'Active tests are excluded');
assert.equal(payload.values['target-lab-research-sharing'],undefined,'Consent caches never transfer');
assert.equal(payload.values['yinyang-activity-monitoring'],undefined);
assert.equal(payload.values['unrelated-key'],undefined);
assert.throws(()=>validateSyncPayload({version:1,values:{...payload.values,password:'secret'}}));
assert.throws(()=>validateSyncPayload({version:1,values:{...payload.values,'target-lab-trials':JSON.stringify(['x'.repeat(524288)])}}));
const targetStorage=new Storage({'target-lab-voter':'22222222-2222-4222-8222-222222222222','target-lab-trials':'[{"id":"old-result"}]','target-lab-private-targets':'[]','target-lab-page-state':'{"trialId":"old"}','yinyang-activity-monitoring':'true','unrelated-key':'preserve'});
const backup=Object.fromEntries(targetStorage.values);targetStorage.failKey='target-lab-measurements';
assert.throws(()=>replaceSyncStorage(targetStorage,payload));assert.deepEqual(Object.fromEntries(targetStorage.values),backup,'Write failure restores previous site data');
replaceSyncStorage(targetStorage,payload);
assert.equal(targetStorage.getItem('target-lab-voter'),sourceStorage.getItem('target-lab-voter'),'Browser voter identity is replaced exactly');
assert.equal(targetStorage.getItem('target-lab-trials'),sourceStorage.getItem('target-lab-trials'));
assert.equal(targetStorage.getItem('target-lab-private-targets'),null,'Old destination-only site data is removed');
assert.equal(targetStorage.getItem('target-lab-page-state'),null,'Old active tests are cleared');
assert.equal(targetStorage.getItem('yinyang-activity-monitoring'),null,'Old consent cache is cleared');
assert.equal(targetStorage.getItem('unrelated-key'),'preserve');
const request=(body,jar='',path='/sync')=>new Request(origin+path,{method:body?'POST':'GET',headers:{Cookie:jar,...(body?{Origin:origin,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const source=(body,path='/sync')=>browserPairing(request(body,'__Host-yinyangeq_tester='+original,path),env,tester);
const target=(body,jar='',path='/sync')=>browserPairing(request(body,jar,path),env,null);
const cookie=response=>response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');

const entry=await (await target()).text();assert.ok(entry.includes('Existing')||entry.includes('existing'));assert.ok(entry.includes('name="replace" value="yes" required'));assert.ok(entry.includes('name="deviceName"'));assert.ok(entry.includes('name="browserName"'));
assert.equal((await source({action:'create'})).status,403,'Account sync consent is required before creating an automatic link');
sql.prepare("INSERT INTO account_sync_permissions(subject_id,enabled,notice_version,consent_source,updated_at) VALUES(?,1,?,'synthetic',0)").run('invite:'+tester.id,ACCOUNT_SYNC_NOTICE_VERSION);
const created=await source({action:'create',payload:JSON.stringify(payload)});assert.equal(created.status,200);
const code=(await created.text()).match(/<code>([A-Z2-9]{5})-([A-Z2-9]{5})<\/code>/).slice(1).join('');const hash=await pairingHash(code),row=()=>sql.prepare('SELECT * FROM browser_pairings WHERE code_hash=?').get(hash);
assert.equal(row().sync_mode,'automatic');assert.equal(row().transfer_payload,null,'No source data is copied through the access handshake');
assert.equal((await target({action:'claim',code})).status,403,'Receiver explicitly approves account access');assert.equal(row().state,'waiting');
assert.equal((await target({action:'claim',code,replace:'yes',syncNoticeVersion:'old'})).status,403);
const claimed=await target({action:'claim',code,replace:'yes',syncNoticeVersion:ACCOUNT_SYNC_NOTICE_VERSION,deviceName:'My phone',browserName:'Brave'});assert.equal(claimed.status,303);const jar=cookie(claimed);assert.equal(await linkedTester(request(null,jar),DB),null,'Claim alone gives no account access');
assert.equal((await target({action:'complete'},jar)).status,403,'Source approval is required');
assert.equal((await source({action:'approve',pairing:hash,confirmation:'wrong'})).status,409);
await source({action:'approve',pairing:hash,confirmation:row().confirmation});
const ready=await target(null,jar);assert.equal(ready.headers.getSetCookie().length,0);assert.ok((await ready.text()).includes('Connect and open Sync settings'));assert.equal((await target({action:'download'},jar)).status,400,'Automatic linking never replaces browser data from a downloaded snapshot');
sql.prepare('UPDATE account_sync_permissions SET enabled=0 WHERE subject_id=?').run('invite:'+tester.id);assert.equal((await target({action:'complete'},jar)).status,403,'Consent withdrawal also stops a pending link');sql.prepare('UPDATE account_sync_permissions SET enabled=1 WHERE subject_id=?').run('invite:'+tester.id);
const finished=await target({action:'complete'},jar);assert.equal(finished.status,200);const linked=await linkedTester(request(null,cookie(finished)),DB);assert.equal(linked.id,tester.id);assert.equal((await finished.json()).redirect,'/account-sync?setup=1');
assert.equal(sql.prepare('SELECT nickname FROM listener_nicknames WHERE subject_id=?').get('invite:'+linked.id).nickname,'Synced Owl');assert.equal(row().transfer_payload,null);assert.equal((await target({action:'complete'},jar)).status,200,'Completion retries do not create extra devices');assert.equal(sql.prepare('SELECT count(*) n FROM private_tester_devices').get().n,1);assert.equal(sql.prepare('SELECT label FROM account_device_status').get().label,'My phone');assert.equal(sql.prepare('SELECT browser_name FROM account_device_status').get().browser_name,'Brave');
assert.equal((await browserPairing(request(null),env,null,true)).status,403,'Admin credentials cannot sync');
console.log('PASS automatic device linking: explicit current account sync consent, named receiving browser, two-sided approval, no preapproval access, no replacement/downloaded payload, withdrawal race, retry and shared account/nickname. Synthetic SQLite only.');sql.close();
// Local admin provenance must never become participant history through Sync.
const adminStorage=new Storage({'target-lab-voter':'11111111-1111-4111-8111-111111111111','target-lab-trials':JSON.stringify([{id:'real'},{id:'test',adminTestOnly:true}]),'target-lab-personal-shootouts-v1':JSON.stringify([{context:'real'},{context:'admin',adminTestOnly:true}]),'yinyang-admin-tests-v1':'private test history','yinyang-admin-music-tests-v1':'private test ratings'});
const participantPayload=captureSyncPayload(adminStorage);
assert.deepEqual(JSON.parse(participantPayload.values['target-lab-trials']),[{id:'real'}]);
assert.deepEqual(JSON.parse(participantPayload.values['target-lab-personal-shootouts-v1']),[{context:'real'}]);
assert.equal(participantPayload.values['yinyang-admin-tests-v1'],undefined);
assert.throws(()=>validateSyncPayload({version:1,values:{...participantPayload.values,'target-lab-trials':JSON.stringify([{adminTestOnly:true}])}}),/Admin test data/);
replaceSyncStorage(adminStorage,participantPayload);
assert.equal(adminStorage.getItem('yinyang-admin-tests-v1'),'private test history');
assert.equal(adminStorage.getItem('yinyang-admin-music-tests-v1'),'private test ratings');
console.log('PASS participant Sync excludes tagged admin trials/runs and private admin storage; forged flagged imports fail closed and local admin history survives replacement.');

// Execute the actual serialized gate client, including preference validation and automatic completion.
{let click,redirect;const requests=[],error={hidden:true,textContent:''},finish={disabled:false,addEventListener:(_event,fn)=>click=fn};const context=vm.createContext({document:{getElementById:id=>id==='sync-error'?error:id==='finish-auto-sync'?finish:null,querySelectorAll:()=>[]},window:{location:{replace:value=>redirect=value}},localStorage:{setItem(){throw Error('Automatic linking must not replace local data');}},fetch:async(url,options)=>{requests.push(JSON.parse(options.body));return Response.json({redirect:'/account-sync?setup=1'});},Response,TextEncoder,crypto});vm.runInContext(browserSyncScript(),context);vm.runInContext('validateSyncPayload('+JSON.stringify({version:1,values:{'target-lab-voter':'11111111-1111-4111-8111-111111111111','target-lab-synced-preferences-v1':JSON.stringify({podiumTheme:'grove'})}})+')',context);await click();assert.deepEqual(requests,[{action:'complete'}]);assert.equal(redirect,'/account-sync?setup=1');assert.equal(error.hidden,true);}
console.log('PASS serialized automatic-link client: full validation dependencies, explicit completion and no local replacement.');
