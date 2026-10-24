import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ownerOnlyMaintenanceResponse, featureMaintenanceResponse, OWNER_ONLY_MAINTENANCE_MESSAGE } from '../lib/maintenance-options.ts';
const source = readFileSync('infra/pulumi/private-gate.mjs', 'utf8');
let appReads = 0, databaseCalls = 0;
const context = vm.createContext({ exports: {}, crypto, Request, Response, Headers, URL, TextEncoder, Uint8Array, btoa, atob, console,
 ownerOnlyMaintenanceResponse, featureMaintenanceResponse,
 readServiceStatus: async () => ({active:false}),
 preDatabaseGuard: async () => null, listenerGuard: async () => null, boundedBody: async r => r,
 isPublicAsset: path => path.startsWith('/share/') || path.startsWith('/_next/') || path.endsWith('.svg'),
 invitesEnabled: async () => false, testerSubject: id => 'invite:'+id, linkedTester: async () => null,
 browserPairing: async () => new Response('fixture'), sharePageFor: () => ({path:'/'}), shareHtml: () => 'CRAWLER CONTENT', isUnfurlCrawler: ua => /Discordbot/.test(ua || ''),
 serveWorkerMedia: async () => {appReads++; return new Response('media');}, withMediaLength: (_,r) => r,
 app: {fetch:async () => {appReads++;return new Response('APPLICATION CONTENT');}}
});
vm.runInContext(source.replace(/^import .*;\n/gm,'').replace('export default worker;','exports.handler = worker;')+'\nexports.makeOwnerSession=makeOwnerSession; dataSession=async()=>null;', context);
const secret = 'synthetic-maintenance-key-'.repeat(3);
const env = {OWNER_ONLY_MAINTENANCE:'true',PRIVATE_ACCESS_PASSWORD:secret,DB:{prepare(){databaseCalls++;throw Error('Unexpected DB access');}},ASSETS:{fetch:async()=>{appReads++;return new Response('ASSET CONTENT');}}};
const cookie = await context.exports.makeOwnerSession(secret);
// Sign old/future cookies with the real HMAC format; neither can bypass the lock.
const signAt = async issued => {
 const nonce=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
 const payload=`${issued}.${nonce}`;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload)));
 return payload+'.'+btoa(String.fromCharCode(...sig)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
};
const actors=[{}, {'Cookie':'__Host-yinyangeq_tester='+'a'.repeat(43)}, {'Cookie':'__Host-yinyangeq_owner=forged'}, {'oai-authenticated-user-id':'owner','Authorization':'Bearer synthetic'}, {'Cookie':'__Host-yinyangeq_owner='+await signAt(Math.floor(Date.now()/1000)-13*3600)}, {'Cookie':'__Host-yinyangeq_owner='+await signAt(Math.floor(Date.now()/1000)+3600)}];
const paths=['/','/home','/shootout','/shootout/personal','/eq-compare','/music-library','/privacy','/my-data','/owner-research','/admin-login/','/access','/sync','/pair','/profile-access','/share-shootout','/s/abcdefghij','/embed/abcdefghij','/s/abcdefghij/card.png','/api/targets','/api/my-data','/api/my-profile/sync','/api/embed-shootouts','/api/embed-shootouts/abcdefghij/votes','/api/listening-audio/fixture','/music/protected.flac','/share/welcome.jpg','/_next/static/fixture.js','/favicon.svg'];
let cases=0;
for(const actor of actors)for(const path of paths)for(const method of ['GET','HEAD','POST','OPTIONS']){
 const response=await context.exports.handler.fetch(new Request('https://fixture.test'+path,{method,headers:{...actor,'User-Agent':'Discordbot'}}),env,{});
 assert.equal(response.status,503,`${method} ${path}`);assert.match(response.headers.get('Cache-Control'),/no-store/);assert.equal(response.headers.get('Set-Cookie'),null);
 const text=await response.text();assert.doesNotMatch(text,/APPLICATION CONTENT|ASSET CONTENT|CRAWLER CONTENT/);
 assert.equal(response.headers.get('X-Frame-Options'),'DENY');if(method==='HEAD')assert.equal(text,'');cases++;
}
assert.equal(databaseCalls,0);assert.equal(appReads,0,'The lock runs before static, crawler, data and media handlers');
const status=await context.exports.handler.fetch(new Request('https://fixture.test/api/maintenance'),env,{});
assert.equal(status.status,200);assert.equal((await status.json()).ownerOnly,true);assert.equal(appReads,0);
for(const path of ['/admin-login','/owner-login']){
 const response=await context.exports.handler.fetch(new Request('https://fixture.test'+path),env,{});
 assert.equal(response.status,200);assert.match(await response.text(),/Admin sign in/);
}
for(const path of ['/','/shootout','/owner-research','/api/targets','/api/listening-audio/fixture','/_next/static/fixture.js']){
 const response=await context.exports.handler.fetch(new Request('https://fixture.test'+path,{headers:{Cookie:'__Host-yinyangeq_owner='+cookie}}),env,{});
 assert.equal(response.status,200,`Admin retains access to ${path}`);
}
const normal=await context.exports.handler.fetch(new Request('https://fixture.test/'),{...env,OWNER_ONLY_MAINTENANCE:'false'},{});assert.equal(await normal.text(),'APPLICATION CONTENT');
for(const config of [{...env,PRIVATE_ACCESS_PASSWORD:''},{...env,PRIVATE_ACCESS_PASSWORD:undefined}])assert.equal((await context.exports.handler.fetch(new Request('https://fixture.test/'),config,{})).status,503);
const escaped=await ownerOnlyMaintenanceResponse(new Request('https://fixture.test/'),'<script>alert(1)</script> & test').text();assert.doesNotMatch(escaped,/<script>/);assert.match(escaped,/&lt;script&gt;/);assert.match(escaped,/min-height:100svh/);assert.match(escaped,/name="viewport"/);assert.doesNotMatch(escaped,/<a |<form|<input/);
const infra=readFileSync('infra/pulumi/index.ts','utf8');assert.match(infra,/ownerOnlyMaintenance \? \["\/\*"\] : \["\/\*", \.\.\.publicAssetBypassPatterns\]/);assert.match(infra,/config.getBoolean\("ownerOnlyMaintenance"\) \?\? false/);
assert.match(readFileSync('components/service-warning.tsx','utf8'),/status.ownerOnly\)\{window.location.reload\(\)/);
assert.match(OWNER_ONLY_MAINTENANCE_MESSAGE,/Thank you for your patience/);
console.log(`PASS owner-only maintenance: ${cases} route/method/identity denials; real HMAC admin access, expired/future/forged rejection, login availability, no DB/app reads before denial, static-first override, escaped full-screen HTML, operational status, and normal-mode restoration. Synthetic fixtures only.`);
