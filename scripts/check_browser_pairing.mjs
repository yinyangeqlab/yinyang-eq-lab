import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { browserPairing, linkedTester, pairingHash } from '../lib/browser-pairing.mjs';
import { VOTE_DATA_NOTICE_VERSION } from '../lib/vote-data-notice.ts';
import { RequestInputError } from '../lib/request-json.ts';
import {abuseBindings} from '../infra/pulumi/abuse-controls.mjs';
import ts from 'typescript';
import vm from 'node:vm';

// Exercise the real handshake against real migrations and transactional SQLite.
// No network calls, production accounts, or real participant data.
const sql = new DatabaseSync(':memory:');
sql.exec('PRAGMA foreign_keys=ON');
for (const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort()) sql.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
class Statement {
  constructor(query,args=[]) {this.query=query;this.args=args;}
  bind(...args) {return new Statement(this.query,args);}
  async first() {return sql.prepare(this.query).get(...this.args)||null;}
  async all() {return {results:sql.prepare(this.query).all(...this.args)};}
  async run() {return {meta:{changes:Number(sql.prepare(this.query).run(...this.args).changes)}};}
}
let beforeBatch;
const DB={prepare:q=>new Statement(q),batch:async statements=>{if(beforeBatch){const hook=beforeBatch;beforeBatch=null;hook();}sql.exec('BEGIN');try {const out=[];for(const s of statements)out.push(await s.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
sql.exec('INSERT INTO site_access_settings(id,invites_enabled) VALUES(1,1)');
const env={DB,PRIVATE_ACCESS_PASSWORD:crypto.randomUUID()+crypto.randomUUID(),ABUSE_RATE_SECRET:crypto.randomUUID()+crypto.randomUUID()};
for(const binding of abuseBindings)env[binding.name]={limit:async()=>({success:true})};
const origin='https://fixture.test', now=Math.floor(Date.now()/1000), original='A'.repeat(43);
const tester={id:'fixture-invite',label:'Synthetic tester'};
sql.prepare('INSERT INTO private_tester_invites(id,label,code_hash,created_at,code_expires_at,redeemed_at,session_hash,session_expires_at) VALUES(?,?,?,?,?,?,?,?)').run(tester.id,tester.label,'fixture-code',now,now+500,now,await pairingHash(original),now+3600);
const request=(path,fields,jar='',extra={})=>new Request(origin+path,{method:fields?'POST':'GET',headers:{Cookie:jar,'CF-Connecting-IP':'192.0.2.50',...(fields?{'Content-Type':'application/x-www-form-urlencoded',Origin:origin}:{}),...extra},...(fields?{body:new URLSearchParams(fields)}:{})});
const source=(path,fields,t=tester)=>browserPairing(request(path,fields,`__Host-yinyangeq_tester=${original}`),env,t);
const cookies=response=>response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
const state=hash=>sql.prepare('SELECT * FROM browser_pairings WHERE code_hash=?').get(hash);
async function create() {
  const response=await source('/devices/create',{});assert.equal(response.status,200);
  const html=await response.text(), code=html.match(/<code>([A-Z2-9]{5})-([A-Z2-9]{5})<\/code>/)?.slice(1).join('');
  assert.ok(code,'Source receives a human-readable code');return {code,hash:await pairingHash(code)};
}
async function claim(pair) {
  const response=await browserPairing(request('/pair',{code:pair.code}),env,null);assert.equal(response.status,303);return cookies(response);
}
assert.equal((await source('/devices',undefined,null)).status,403,'Unauthenticated source denied');
assert.equal((await browserPairing(request('/pair',{code:'BAD'},'',{Origin:'https://attacker.test'}),env,null)).status,403,'CSRF denied');
assert.equal((await source('/devices/create',{})).status,200);
let pair=await create(), jar=await claim(pair);
assert.equal((await browserPairing(request('/pair',{code:pair.code}),env,null)).status,409,'Code cannot be claimed twice');
assert.equal(await linkedTester(request('/shootout',undefined,jar),DB),null,'Claim cookie alone grants no access');
let pending=await browserPairing(request('/pair',undefined,jar),env,null);
assert.equal(pending.status,200);assert.ok((await pending.text()).includes(state(pair.hash).confirmation));
assert.equal((await source('/devices/approve',{pairing:pair.hash,confirmation:'wrong'})).status,409);
assert.equal((await browserPairing(request('/devices/approve',{pairing:pair.hash,confirmation:state(pair.hash).confirmation},'__Host-yinyangeq_tester='+ 'B'.repeat(43)),env,tester)).status,409,'Another source browser cannot approve');
assert.equal((await source('/devices/approve',{pairing:pair.hash,confirmation:state(pair.hash).confirmation})).status,303);
const complete=await browserPairing(request('/pair',undefined,jar),env,null);assert.equal(complete.status,303);
const linkedJar=cookies(complete), identity=await linkedTester(request('/shootout',undefined,linkedJar),DB);
assert.equal(identity.id,tester.id,'Linked browser retains the exact original account identity');
assert.equal(state(pair.hash).state,'consumed');
const device=sql.prepare('SELECT * FROM private_tester_devices').get();assert.equal(device.expires_at,now+3600,'Pairing never extends the invitation expiry');
assert.equal(sql.prepare('SELECT subject_id FROM privacy_sessions WHERE token_hash=?').get(device.data_token_hash).subject_id,'invite:'+tester.id);
// Exercise actual private-gate routing and authentication. Only the application
// renderer/media implementation is stubbed; no gate auth logic is replaced.
const maintenanceSource=ts.transpileModule(readFileSync('lib/maintenance-options.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const maintenanceUrl='data:text/javascript;base64,'+Buffer.from(maintenanceSource).toString('base64');
const gateSource=readFileSync(new URL('../infra/pulumi/private-gate.mjs',import.meta.url),'utf8')
  .replace(/import\s*\{readServiceStatus\}\s*from ["']\.\/service-status\.mjs["'];/,'const readServiceStatus=async()=>({active:false});')
  .replace(/from ["']\.\/maintenance-options\.mjs["']/g,'from '+JSON.stringify(maintenanceUrl))
  .replace('import { invitesEnabled, testerSubject } from "./invite-settings.mjs";',`import {invitesEnabled,testerSubject} from ${JSON.stringify(new URL('../lib/invite-settings.mjs',import.meta.url).href)};`)
  .replace('import { browserPairing, linkedTester } from "./browser-pairing.mjs";',`import {browserPairing,linkedTester} from ${JSON.stringify(new URL('../lib/browser-pairing.mjs',import.meta.url).href)};`)
  .replace('import { isPublicAsset } from "./public-assets.mjs";',`import {isPublicAsset} from ${JSON.stringify(new URL('../infra/pulumi/public-assets.mjs',import.meta.url).href)};`)
  .replace('import { withMediaLength } from "./media-response.mjs";',`import {withMediaLength} from ${JSON.stringify(new URL('../lib/worker-media-response.mjs',import.meta.url).href)};`)
  .replace('import { serveWorkerMedia } from "./media-route.mjs";','const serveWorkerMedia=()=>null;')
  .replace('import app from "./index.js";',`const app={fetch:request=>Response.json({subject:request.headers.get('oai-authenticated-user-id'),session:request.headers.get('x-yinyang-data-session')})};`)
  .replace(/from ["'](\.\/[^"']+)["']/g,(_,relative)=>'from '+JSON.stringify(new URL('../infra/pulumi/'+relative.slice(2),import.meta.url).href));
const gate=(await import('data:text/javascript;base64,'+Buffer.from(gateSource).toString('base64'))).default;
const gated=(path,jar='',extra={})=>gate.fetch(request(path,undefined,jar,extra),env,{});
const customOrigin='https://recovery.invalid';
const canonicalResponse=await gate.fetch(new Request('https://www.recovery.invalid/shootout',{headers:{'CF-Connecting-IP':'192.0.2.50'}}),{...env,CANONICAL_ORIGIN:customOrigin},{});
assert.equal(canonicalResponse.status,307,'Recovered origin redirects its own alias');
assert.equal(canonicalResponse.headers.get('Location'),customOrigin+'/shootout');
assert.equal((await gate.fetch(new Request('https://www.recovery.invalid/shootout',{headers:{'CF-Connecting-IP':'192.0.2.50'}}),{...env,CANONICAL_ORIGIN:'http://invalid.test'},{})).status,503,'Invalid recovered origin fails closed');
const gatedIdentity=await (await gated('/my-data',linkedJar,{'oai-authenticated-user-id':'spoofed-owner'})).json();
assert.equal(gatedIdentity.subject,'invite:'+tester.id,'Real gate overwrites spoofed identity and uses original tester');
assert.equal(gatedIdentity.session,device.data_token_hash);
assert.equal((await gated('/api/trials',linkedJar)).status,403,'Linking never bypasses participation consent');
sql.prepare('UPDATE privacy_accounts SET submissions_enabled=1,agreement_version=? WHERE subject_id=?').run(VOTE_DATA_NOTICE_VERSION,'invite:'+tester.id);
assert.equal((await gated('/api/trials',linkedJar)).status,200,'Shared current account agreement grants listening access');
assert.equal((await gated('/api/owner-research',linkedJar)).status,403,'Linked testers cannot gain admin access');
assert.equal((await gated('/api/trials')).status,401,'Anonymous access remains denied');
assert.equal((await gated('/pair')).status,200,'Pairing page reachable before sign-in');
// Losing only the data-management cookie must not defeat later disconnection.
const replaced=await gated('/my-data',linkedJar.split('; ')[0]);
const replacementSession=(await replaced.json()).session;
assert.notEqual(replacementSession,device.data_token_hash);
assert.equal(sql.prepare('SELECT 1 FROM privacy_sessions WHERE token_hash=?').get(device.data_token_hash),undefined,'Replacing cookie removes its old management credential');
assert.equal(sql.prepare('SELECT data_token_hash FROM private_tester_devices WHERE session_hash=?').get(device.session_hash).data_token_hash,replacementSession);
const retry=await browserPairing(request('/pair',undefined,jar),env,null);assert.equal(retry.status,303,'Lost response can be retried');
assert.equal(sql.prepare('SELECT count(*) n FROM private_tester_devices').get().n,1,'Retry creates no additional device');
assert.equal((await source('/devices/approve',{pairing:pair.hash,confirmation:state(pair.hash).confirmation})).status,409,'Approval is single-use');
assert.equal((await source('/devices/revoke',{device:device.session_hash})).status,303);
assert.equal(await linkedTester(request('/shootout',undefined,linkedJar),DB),null,'Disconnect closes access');
assert.equal(sql.prepare('SELECT count(*) n FROM privacy_sessions').get().n,0,'Disconnect closes data-management access');
assert.equal((await gated('/api/trials',linkedJar)).status,401,'Real private gate denies the disconnected browser');
assert.equal((await browserPairing(request('/pair',undefined,jar),env,null)).status,410,'Old claim cannot resurrect a disconnected browser');

pair=await create();sql.prepare('UPDATE browser_pairings SET expires_at=? WHERE code_hash=?').run(now-1,pair.hash);
assert.equal((await browserPairing(request('/pair',{code:pair.code}),env,null)).status,409,'Expired codes denied');
pair=await create();jar=await claim(pair);
await source('/devices/approve',{pairing:pair.hash,confirmation:state(pair.hash).confirmation});
await source('/devices/cancel',{pairing:pair.hash});
assert.equal((await browserPairing(request('/pair',undefined,jar),env,null)).status,410,'Source may cancel before completion');
// Reset synthetic throttles to independently cover the device cap and invitation revocation.
sql.exec('DELETE FROM public_write_limits');
pair=await create();jar=await claim(pair);
await source('/devices/approve',{pairing:pair.hash,confirmation:state(pair.hash).confirmation});
for(let i=0;i<4;i++)sql.prepare('INSERT INTO private_tester_devices VALUES(?,?,?,?,?)').run('occupied-'+i,tester.id,'data-'+i,now,now+3600);
assert.equal((await browserPairing(request('/pair',undefined,jar),env,null)).status,409,'Atomic write enforces maximum devices');
sql.prepare("DELETE FROM private_tester_devices WHERE session_hash='occupied-0'").run();
const capComplete=await browserPairing(request('/pair',undefined,jar),env,null);
assert.equal(capComplete.status,303,'Retry can finish after a slot is freed');
sql.prepare('UPDATE private_tester_invites SET revoked_at=? WHERE id=?').run(now,tester.id);
assert.equal((await browserPairing(request('/pair',undefined,jar),env,null)).status,410,'Revoked invitations cannot finish pairing');
sql.prepare('UPDATE private_tester_invites SET revoked_at=NULL WHERE id=?').run(tester.id);
// Simulate Disconnect landing after authentication but before cookie renewal.
const raceJar=cookies(capComplete).split('; ')[0], raceHash=await pairingHash(raceJar.split('=')[1]);
beforeBatch=()=>{
  sql.prepare('DELETE FROM privacy_sessions WHERE token_hash IN (SELECT data_token_hash FROM private_tester_devices WHERE session_hash=?)').run(raceHash);
  sql.prepare('DELETE FROM private_tester_devices WHERE session_hash=?').run(raceHash);
  sql.prepare('DELETE FROM browser_pairings WHERE claim_hash=?').run(raceHash);
};
const race=await gated('/my-data',raceJar);
assert.equal((await race.json()).session,null,'Concurrent Disconnect prevents issuing a replacement credential');
assert.equal(sql.prepare('SELECT count(*) n FROM privacy_sessions').get().n,0,'No data credential survives the revocation race');
sql.exec('DELETE FROM public_write_limits');
for(let i=0;i<10;i++)assert.equal((await browserPairing(request('/pair',{code:'ZZZZZ-ZZZZZ'}),env,null)).status,409);
assert.equal((await browserPairing(request('/pair',{code:'ZZZZZ-ZZZZZ'}),env,null)).status,429,'Invalid attempts are throttled');
assert.equal((await browserPairing(new Request(origin+'/pair',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'x'.repeat(2049)}),env,null)).status,413,'Request stream bounded');
sql.prepare('INSERT INTO browser_pairings(code_hash,invite_id,source_hash,created_at,expires_at) VALUES(?,?,?,?,?)').run('erasure-fixture',tester.id,'source',now,now+600);
const deps={'cloudflare:workers':{env},'@/lib/request-json':{RequestInputError}};
const context=vm.createContext({exports:{},require:name=>{if(!(name in deps))throw Error('Unexpected dependency '+name);return deps[name];},Date,Response,Request,Headers});
vm.runInContext(ts.transpileModule(readFileSync(new URL('../lib/privacy-erasure.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
sql.prepare('INSERT OR IGNORE INTO privacy_accounts(subject_id) VALUES(?)').run('invite:'+tester.id);
sql.prepare('INSERT INTO listener_nicknames(subject_id,nickname) VALUES(?,?)').run('invite:'+tester.id,'Erase Owl');
await context.exports.eraseData('invite:'+tester.id);
assert.equal(sql.prepare('SELECT count(*) n FROM listener_nicknames').get().n,0,'Account erasure removes the optional nickname explicitly');
assert.equal(sql.prepare('SELECT count(*) n FROM private_tester_devices').get().n,0,'Account erasure removes every browser link');
assert.equal(sql.prepare('SELECT count(*) n FROM browser_pairings').get().n,0,'Account erasure removes pending handshakes');
assert.equal(sql.prepare('SELECT count(*) n FROM private_tester_invites').get().n,0,'Account erasure removes invitation access');
// Open mode defaults off with no setting row and preserves all consent/owner guards.
sql.exec('DELETE FROM site_access_settings; DELETE FROM public_write_limits');
assert.deepEqual(await (await gated('/api/invite-system')).json(),{enabled:false});
assert.equal((await gated('/__private/admin/invite-system')).status,403);
const ownerLogin=await gate.fetch(request('/admin-login',{password:env.PRIVATE_ACCESS_PASSWORD}),env,{});
assert.equal(ownerLogin.status,303);
const ownerJar=cookies(ownerLogin);
async function mode(enabled,jar=ownerJar,originHeader=origin){return gate.fetch(new Request(origin+'/__private/admin/invite-system',{method:'PATCH',headers:{Cookie:jar,Origin:originHeader,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.50'},body:JSON.stringify({enabled})}),env,{});}
assert.equal((await mode(true,'')).status,403,'Only admin can toggle');
assert.equal((await mode(true,ownerJar,'https://attacker.test')).status,403,'Toggle rejects CSRF');
assert.equal((await mode('yes')).status,400,'Toggle requires a boolean');
assert.equal((await gated('/access')).headers.get('Location'),'/shootout');
assert.equal((await gated('/__private/admin/invites',ownerJar)).status,404,'Invite functions unavailable while off');
const open=await gated('/shootout','',{'oai-authenticated-user-id':'owner'});
assert.equal(open.status,200,'No invite needed to open Shootout');
const openIdentity=await open.json(),openJar=cookies(open);
assert.match(openIdentity.subject,/^browser:/,'Open browsers cannot impersonate verified invitation accounts');
assert.ok(openIdentity.session);
assert.equal((await gated('/api/trials',openJar)).status,403,'Open access still requires consent');
assert.equal((await gated('/api/owner-research',openJar)).status,403,'Open access never grants admin');
assert.equal((await gated('/api/trials')).status,401,'Unauthenticated API cannot mint accounts');
assert.equal((await gated('/music/shantae/test.flac')).status,401,'Media cannot mint accounts');
sql.prepare('UPDATE privacy_accounts SET submissions_enabled=1,agreement_version=? WHERE subject_id=?').run(VOTE_DATA_NOTICE_VERSION,openIdentity.subject);
assert.equal((await gated('/api/trials',openJar)).status,200,'Consenting open browsers can use tools');
assert.equal((await (await gated('/my-data',openJar)).json()).subject,openIdentity.subject,'Returning browser retains ownership');
const openSync=await gated('/sync',openJar);
assert.equal(openSync.status,200);
assert.doesNotMatch(await openSync.text(),/invitation|href="\/access"/i,'No invite references in open sync');
assert.doesNotMatch(await (await gated('/admin-login')).text(),/href="\/access"/,'Admin login hides listener invitation link');
// The existing two-sided sync works for automatic browser identities too.
const openId='open-'+openIdentity.subject.slice(8);
const openTester={id:openId,label:'Listener'};
const openPairing=await browserPairing(request('/devices/create',{},openJar),env,openTester,false,false);
const openCode=(await openPairing.text()).match(/<code>([A-Z2-9]{5})-([A-Z2-9]{5})<\/code>/).slice(1).join('');
const openClaim=await browserPairing(request('/pair',{code:openCode}),env,null,false,false);
const openClaimJar=cookies(openClaim),openPair=state(await pairingHash(openCode));
assert.equal((await browserPairing(request('/devices/approve',{pairing:openPair.code_hash,confirmation:openPair.confirmation},openJar),env,openTester,false,false)).status,303);
const openLinked=await browserPairing(request('/pair',undefined,openClaimJar),env,null,false,false);
assert.equal(openLinked.status,303);
const openLinkedJar=cookies(openLinked);
assert.equal((await (await gated('/my-data',openLinkedJar)).json()).subject,openIdentity.subject,'Open sync retains original browser ownership');
assert.equal((await mode(true)).status,200);
assert.equal((await gated('/api/trials',openJar)).status,401,'Re-enabling rejects open credentials');
assert.equal((await gated('/api/trials',openLinkedJar)).status,401,'Re-enabling also rejects linked open credentials');
assert.equal((await gated('/access')).status,200,'Original redemption form restored');
assert.equal((await gated('/__private/admin/invites',ownerJar)).status,200);
assert.equal((await (await gated('/my-data',openJar)).json()).session,openIdentity.session,'Data management remains reachable after re-enabling');
const createInvite=await gate.fetch(new Request(origin+'/__private/admin/invites',{method:'POST',headers:{Cookie:ownerJar,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({label:'Restored invitation process'})}),env,{});
assert.equal(createInvite.status,201);
const restoredInvite=await createInvite.json();
const redemption=await gate.fetch(request('/access',{code:restoredInvite.code}),env,{});
assert.equal(redemption.status,303,'Existing one-time redemption works when enabled');
assert.equal((await gate.fetch(request('/access',{code:restoredInvite.code}),env,{})).status,403,'Codes remain single use');
const beforeToggle=sql.prepare('SELECT * FROM private_tester_invites WHERE id=?').get(restoredInvite.id);
assert.equal((await mode(false)).status,200);
assert.deepEqual(sql.prepare('SELECT * FROM private_tester_invites WHERE id=?').get(restoredInvite.id),beforeToggle,'Toggling preserves original invitation and expiry');
assert.equal((await gated('/api/trials',openJar)).status,200,'Disabling again restores existing open browser');
await context.exports.eraseData(openIdentity.subject);
assert.equal(sql.prepare("SELECT count(*) n FROM private_tester_invites WHERE id LIKE 'open-%'").get().n,0,'Open account erasure removes access');
assert.equal(sql.prepare('SELECT count(*) n FROM privacy_sessions WHERE subject_id=?').get(openIdentity.subject).n,0);
assert.equal(sql.prepare('SELECT count(*) n FROM private_tester_devices WHERE invite_id=?').get(openId).n,0,'Open account erasure removes linked devices');
assert.equal(sql.prepare('SELECT count(*) n FROM browser_pairings WHERE invite_id=?').get(openId).n,0,'Open account erasure removes handshakes');
sql.close();
console.log('Invite modes and browser pairing passed: admin-only persistent toggle, default open access, restored redemption, open-account consent, ownership, sync and erasure; two-sided confirmation, real private gate, account identity, source binding, single use, expiry, safe retry, atomic device cap, cancellation, revocation and renewal race, data-session removal, account erasure, CSRF, request bounds and throttling. Synthetic SQLite only.');
