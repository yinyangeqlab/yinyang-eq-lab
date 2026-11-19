import { isCompanionTrailer, serveCompanionTrailer } from "../../../infra/pulumi/public-assets.mjs";
import vm from "node:vm";
import collector, { recordShootoutFailure, shootoutFailureHeader, shootoutSubmissionEndpoint } from "../../../infra/pulumi/shootout-failure-logger.mjs";
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isPublicAudioFactRoute} from '../../../site/lib/share-pages.mjs';
import {searchSitemapPaths} from '../../../site/lib/search-sitemap.ts';
import {preDatabaseGuard,abuseBindings} from '../../../infra/pulumi/abuse-controls.mjs';
const source=readFileSync('infra/pulumi/private-gate.mjs','utf8'),AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const start=source.indexOf('const guidePdfPath ='),end=source.indexOf('const password =',start);assert.ok(start>0&&end>start);
const publicRead=new AsyncFunction('request','env','context','isPublicAsset','app','preDatabaseGuard','isPublicAudioFactRoute','isCompanionTrailer','serveCompanionTrailer',`const url=new URL(request.url),path=url.pathname;${source.slice(start,end)}return null;`);
const readThroughGate=(...args)=>publicRead(...args,isPublicAudioFactRoute,isCompanionTrailer,serveCompanionTrailer);
let forwarded;
const app={fetch:async request=>{forwarded=request;return new Response('fixture');}},env={ASSETS:{fetch:()=>{throw Error('unexpected asset bypass')}}};
for(const path of ['/listeners/yinyangeq','/api/public-profiles/yinyangeq','/api/public-profiles/yinyangeq/files/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/single']){
 const response=await readThroughGate(new Request('https://fixture.invalid'+path,{headers:{'x-yinyang-data-session':'forged','oai-authenticated-user-id':'owner'}}),env,{},()=>false,app,async()=>null);assert.equal(response.status,200);assert.equal(forwarded.headers.get('x-yinyang-data-session'),null);assert.equal(forwarded.headers.get('oai-authenticated-user-id'),null);
 assert.equal(await readThroughGate(new Request('https://fixture.invalid'+path,{method:'POST'}),env,{},()=>false,app,async()=>null),null,'public bypass is read-only');
}
// Public release/help pages must not require or save participation choices.
// Exercise the actual early gate with a DB that fails on any access.
for (const path of [...searchSitemapPaths,'/robots.txt','/sitemap.xml','/glossary/audio-facts/sitemap.xml']) {
 for (const method of ['GET','HEAD']) {
  const deniedDb={prepare(){throw Error('Public information must not access participant DB')}};
  const request=new Request('https://fixture.invalid'+path+'?_rsc=fixture', {method,headers:{Cookie:'__Host-yinyang-tester=opted-out-fixture','oai-authenticated-user-id':'owner','x-yinyang-data-session':'forged'}});
  const response=await readThroughGate(request,{...env,DB:deniedDb},{},()=>false,app,async()=>null);
  assert.equal(response.status,200);assert.equal(response.headers.get('set-cookie'),null);
  assert.equal(forwarded.headers.get('oai-authenticated-user-id'),null);assert.equal(forwarded.headers.get('x-yinyang-data-session'),null);
 }
 assert.equal(await readThroughGate(new Request('https://fixture.invalid'+path,{method:'POST'}),env,{},()=>false,app,async()=>null),null);
}
for (const path of ['/robots.txt/private','/sitemap.xml/private','/version/private','/about/private','/shortcuts/private','/glossary/private','/glossary/audio-facts/not-a-published-article','/glossary/audio-facts/harman-target/private','/api/glossary','/music-library','/preference-tuning','/api/my-profile/sync','/music/private.mp3']) {
 assert.equal(await readThroughGate(new Request('https://fixture.invalid'+path),env,{},()=>false,app,async()=>null),null,'Public information must not bypass private or listening routes');
}
const guideEnv={...env,ASSETS:{fetch:async () => new Response('guide file')}};
const guidePdfPath = '/guides/iem-measurement/yinyang-eq-iem-711-measurement-guide.pdf';
const revisedGuideFilename = 'yinyang-eq-iem-711-measurement-guide-r02.pdf';
const revisedGuidePath = '/guides/iem-measurement/' + revisedGuideFilename;
for(const path of [guidePdfPath,revisedGuidePath,'/guides/iem-measurement/figure-06.png','/guides/iem-measurement/figure-17.jpg']){
 for(const method of ['GET','HEAD']){
  const response=await readThroughGate(new Request('https://fixture.invalid'+path,{method}),guideEnv,{},()=>false,app,async()=>null);
  assert.equal(await response.text(),'guide file');
  assert.equal(response.headers.get('content-disposition'),null);
 }
 assert.equal(await readThroughGate(new Request('https://fixture.invalid'+path,{method:'POST'}),guideEnv,{},()=>false,app,async()=>null),null);
}
const legacyPdfPath = '/guides/iem-measurement/technical-guide.pdf';
const pdfQuery = '?download=1&note=A%2BB';
for (const method of ['GET', 'HEAD']) {
 const revisedRequest = new Request('https://fixture.invalid' + revisedGuidePath + pdfQuery, { method });
 const download = await readThroughGate(revisedRequest, guideEnv, {}, () => false, app, async () => null);
 assert.equal(download.status, 200);
 assert.equal(download.headers.get('content-disposition'), `attachment; filename="${revisedGuideFilename}"`);
 const request = new Request('https://fixture.invalid' + legacyPdfPath + pdfQuery, { method });
 const response = await readThroughGate(request, env, {}, () => false, app, async () => null);
 assert.equal(response.status, 308);
 assert.equal(response.headers.get('location'), 'https://fixture.invalid' + guidePdfPath + pdfQuery);
}
assert.equal(await readThroughGate(new Request('https://fixture.invalid' + legacyPdfPath, { method: 'POST' }), env, {}, () => false, app, async () => null), null);
for(const path of ['/guides/iem-measurement/unlisted.pdf',revisedGuidePath + '.bak','/glossary/iem-measurement/private']){
 assert.equal(await readThroughGate(new Request('https://fixture.invalid'+path),guideEnv,{},()=>false,app,async()=>null),null);
}
assert.equal(await readThroughGate(new Request('https://fixture.invalid/api/public-profiles/yinyangeq/private'),env,{},()=>false,app,async()=>null),null);
assert.equal(await readThroughGate(new Request('https://fixture.invalid/music/private.mp3'),env,{},()=>false,app,async()=>null),null,'profile access cannot expose private media');
const routeStart=source.indexOf('if(path==="/profile-access"'),routeEnd=source.indexOf('let tester =',routeStart);assert.ok(routeStart>0&&routeEnd>routeStart);
const signIn=new AsyncFunction('request','env','context','boundedBody','json','app',`const path=new URL(request.url).pathname;${source.slice(routeStart,routeEnd)}return null;`);
for(const method of ['GET','POST']){const response=await signIn(new Request('https://fixture.invalid/api/profile-access',{method,headers:{Authorization:'Bearer forged','x-yinyang-data-session':'forged','oai-authenticated-user-id':'owner'}}),env,{},request=>request,(body,status)=>Response.json(body,{status}),app);assert.equal(response.status,200);for(const header of ['authorization','x-yinyang-data-session','oai-authenticated-user-id'])assert.equal(forwarded.headers.get(header),null);}
const counters=[];const rateEnv={ABUSE_RATE_SECRET:'fixture-only-secret'.repeat(3)};for(const binding of abuseBindings)rateEnv[binding.name]={limit:async()=>{counters.push(binding.name);return{success:true}}};assert.equal(abuseBindings.length,6);
assert.equal(await preDatabaseGuard(new Request('https://fixture.invalid/api/profile-access',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.1'}}),rateEnv,false),null);assert.ok(counters.includes('SIGNIN_LIMIT'));
assert.equal((await preDatabaseGuard(new Request('https://fixture.invalid/api/profile-access',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.1','Content-Length':'2049'}}),rateEnv,false)).status,413);
console.log('PASS actual gate fragments: read-only public profile, trusted-header stripping, protected media retained, sign-in isolation and existing six abuse bindings/sign-in body limits.');

// Exercise the real final-response wrapper and private collector without a DB.
const wrapper = source.slice(source.indexOf('const worker = {'), source.indexOf('\nfunction rankingResponse'));
let outcome;
const sandbox = { exports: {}, URL, Response, Headers, shootoutSubmissionEndpoint, shootoutFailureHeader,
  recordShootoutFailure, withMediaLength: (_, response) => response,
  privateGate: { async fetch() { if (outcome instanceof Error) throw outcome; return outcome; } },
};
vm.runInNewContext(wrapper + '\nexports.worker = worker;', sandbox);
const received = [];
const logs = [];
const pending = [];
const context = { waitUntil: promise => pending.push(promise) };
const collectorEnv = {
  SHOOTOUT_FAILURE_LOGGER: { async fetch(url, init) {
    const request = new Request(url, init);
    assert.deepEqual([...request.headers.keys()], ['content-type']);
    received.push(await request.clone().json());
    return collector.fetch(request);
  } },
};
const tests = [
  ['/api/listening-runs','POST',409,'targets:target_version_mismatch',true],
  ['/api/votes','POST',403,'edge:test_account',true],
  ['/api/votes','POST',503,null,true],
  ['/api/listening-runs','POST',400,'private-string:private-data',true],
  ['/api/votes','POST',200,null,false],
  ['/api/listening-runs','POST',201,null,false],
  ['/api/votes','POST',307,null,false],
  ['/api/votes','GET',503,'edge:maintenance',false],
  ['/api/other','POST',500,null,false],
];
const warn=console.warn, error=console.error;
console.warn = event => logs.push(['warn',event]);
console.error = event => logs.push(['error',event]);
try {
  for (const [path, method, status, marker, forwarded] of tests) {
    const previous = received.length;
    outcome = new Response('original body', { status, headers: {
      'Retry-After':'60', ...(marker ? {[shootoutFailureHeader]:marker} : {}),
    }});
    const result = await sandbox.exports.worker.fetch(new Request('https://fixture.invalid'+path+'?secret=fixture', {
      method, headers:{ Cookie:'private fixture', Authorization:'Bearer fixture' },
      ...(method==='POST' ? {body:'private input'} : {}),
    }), collectorEnv, context);
    assert.equal(result.status,status);
    assert.equal(result.headers.get('Retry-After'),'60');
    assert.equal(result.headers.has(shootoutFailureHeader),false);
    assert.equal(await result.text(),'original body');
    await Promise.all(pending.splice(0));
    assert.equal(received.length-previous,Number(forwarded));
  }
  outcome = new Error('private stack');
  await assert.rejects(sandbox.exports.worker.fetch(new Request('https://fixture.invalid/api/votes',{method:'POST'}),collectorEnv,context),outcome);
  await Promise.all(pending.splice(0));
  assert.deepEqual(received,[
    {endpoint:'/api/listening-runs',status:409,stage:'targets',reason:'target_version_mismatch'},
    {endpoint:'/api/votes',status:403,stage:'edge',reason:'test_account'},
    {endpoint:'/api/votes',status:503,stage:'response',reason:'unclassified'},
    {endpoint:'/api/listening-runs',status:400,stage:'response',reason:'unclassified'},
    {endpoint:'/api/votes',status:500,stage:'edge',reason:'edge_error'},
  ]);
  assert.deepEqual(logs,received.map(row=>[row.status>=500?'error':'warn',{event:'shootout_submission_failed',...row}]));
  assert.equal((await collector.fetch(new Request('https://public.invalid/',{method:'POST',body:'{}'}))).status,404);
  assert.equal((await collector.fetch(new Request('https://shootout-failure-logger.internal/',{method:'POST',body:'{}'}))).status,400);
  assert.equal(logs.length,5);
  outcome = new Response('original body',{status:429, headers:{[shootoutFailureHeader]:'edge:edge_guard'}});
  const unavailable={SHOOTOUT_FAILURE_LOGGER:{async fetch(){throw Error('private failure');}}};
  const result=await sandbox.exports.worker.fetch(new Request('https://fixture.invalid/api/votes',{method:'POST'}),unavailable,context);
  assert.equal(result.status,429);
  await Promise.all(pending.splice(0));
  assert.deepEqual(logs.at(-1),['warn',{event:'shootout_submission_failed',endpoint:'/api/votes',stage:'edge',reason:'edge_guard',status:429}]);
} finally {
  console.warn=warn;
  console.error=error;
}
assert.match(source,/return blockedSubmission\("test_account", json\(\{error:"Private test account:/);
console.log('PASS only failed submission POSTs go to the collector; response, privacy and test denials are preserved, including fallback on collector failure.');
