import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {preDatabaseGuard,abuseBindings} from '../infra/pulumi/abuse-controls.mjs';
const source=readFileSync('infra/pulumi/private-gate.mjs','utf8'),AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const start=source.indexOf('const publicLandingAsset ='),end=source.indexOf('const password =',start);assert.ok(start>0&&end>start);
const publicRead=new AsyncFunction('request','env','context','isPublicAsset','app','preDatabaseGuard',`const url=new URL(request.url),path=url.pathname;${source.slice(start,end)}return null;`);
let forwarded;
const app={fetch:async request=>{forwarded=request;return new Response('fixture');}},env={ASSETS:{fetch:()=>{throw Error('unexpected asset bypass')}}};
for(const path of ['/listeners/yinyangeq','/api/public-profiles/yinyangeq','/api/public-profiles/yinyangeq/files/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/single']){
 const response=await publicRead(new Request('https://fixture.invalid'+path,{headers:{'x-yinyang-data-session':'forged','oai-authenticated-user-id':'owner'}}),env,{},()=>false,app,async()=>null);assert.equal(response.status,200);assert.equal(forwarded.headers.get('x-yinyang-data-session'),null);assert.equal(forwarded.headers.get('oai-authenticated-user-id'),null);
 assert.equal(await publicRead(new Request('https://fixture.invalid'+path,{method:'POST'}),env,{},()=>false,app,async()=>null),null,'public bypass is read-only');
}
assert.equal(await publicRead(new Request('https://fixture.invalid/api/public-profiles/yinyangeq/private'),env,{},()=>false,app,async()=>null),null);
assert.equal(await publicRead(new Request('https://fixture.invalid/music/private.mp3'),env,{},()=>false,app,async()=>null),null,'profile access cannot expose private media');
const routeStart=source.indexOf('if(path==="/profile-access"'),routeEnd=source.indexOf('let tester =',routeStart);assert.ok(routeStart>0&&routeEnd>routeStart);
const signIn=new AsyncFunction('request','env','context','boundedBody','json','app',`const path=new URL(request.url).pathname;${source.slice(routeStart,routeEnd)}return null;`);
for(const method of ['GET','POST']){const response=await signIn(new Request('https://fixture.invalid/api/profile-access',{method,headers:{Authorization:'Bearer forged','x-yinyang-data-session':'forged','oai-authenticated-user-id':'owner'}}),env,{},request=>request,(body,status)=>Response.json(body,{status}),app);assert.equal(response.status,200);for(const header of ['authorization','x-yinyang-data-session','oai-authenticated-user-id'])assert.equal(forwarded.headers.get(header),null);}
const counters=[];const rateEnv={ABUSE_RATE_SECRET:'fixture-only-secret'.repeat(3)};for(const binding of abuseBindings)rateEnv[binding.name]={limit:async()=>{counters.push(binding.name);return{success:true}}};assert.equal(abuseBindings.length,6);
assert.equal(await preDatabaseGuard(new Request('https://fixture.invalid/api/profile-access',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.1'}}),rateEnv,false),null);assert.ok(counters.includes('SIGNIN_LIMIT'));
assert.equal((await preDatabaseGuard(new Request('https://fixture.invalid/api/profile-access',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.1','Content-Length':'2049'}}),rateEnv,false)).status,413);
console.log('PASS actual gate fragments: read-only public profile, trusted-header stripping, protected media retained, sign-in isolation and existing six abuse bindings/sign-in body limits.');
