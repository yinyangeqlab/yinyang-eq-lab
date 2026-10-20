import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isPublicDemo, publicDemoResponse} from '../infra/pulumi/public-demos.mjs';
for (const [key, width, height, id] of [['trailer',1280,720,'a2e7a979-1a78-453f-836a-da6df3ad8a12'],['demo',720,1280,'3502a781-9a84-45a2-8352-ff9a57ba0e49']]) {
  const get = publicDemoResponse(new Request(`https://yinyangeq.com/${key}?url=https://invalid.example`));
  assert.equal(get.status,200);assert.match(get.headers.get('content-type'),/^text\/html/);assert.equal(get.headers.has('set-cookie'),false);
  const html=await get.text();
  for(const tag of [`property="og:type" content="video.other"`,`property="og:video" content="https://yinyangeq.com/${key}.mp4"`,`property="og:video:type" content="video/mp4"`,`property="og:video:width" content="${width}"`,`property="og:video:height" content="${height}"`,`property="og:image"`,`<video controls playsinline`])assert.ok(html.includes(tag),tag);
  assert.ok(!html.includes('invalid.example'));
  const head=publicDemoResponse(new Request(`https://yinyangeq.com/${key}`,{method:'HEAD'}));assert.equal(await head.text(),'');assert.equal(Number(head.headers.get('content-length')),Buffer.byteLength(html));
  for(const method of ['GET','HEAD']){
    const media=publicDemoResponse(new Request(`https://yinyangeq.com/${key}.mp4`,{method}));assert.equal(media.status,307);assert.equal(media.headers.get('location'),`https://github.com/user-attachments/assets/${id}`);
  }
  for(const method of ['POST','PUT','DELETE'])assert.equal(publicDemoResponse(new Request(`https://yinyangeq.com/${key}`,{method})).status,405);
}
for(const path of ['/music/private.mp3','/trailer/private','/trailer/','/api/my-profile/sync','/owner-research','/toString','/constructor']){assert.equal(isPublicDemo(path),false);assert.equal(publicDemoResponse(new Request('https://yinyangeq.com'+path)),null);}
const gate=readFileSync('infra/pulumi/private-gate.mjs','utf8');
const start=gate.indexOf('if (isPublicDemo(path))'),end=gate.indexOf('const publicLandingAsset',start);
const branch=new (Object.getPrototypeOf(async function(){}).constructor)('request','env','path','isPublicDemo','publicDemoResponse','preDatabaseGuard',gate.slice(start,end)+'return null;');
const env=new Proxy({}, {get(){throw new Error('Public demo must not access a database or account session');}});
let calls=0;
const response=await branch(new Request('https://yinyangeq.com/trailer'),env,'/trailer',isPublicDemo,publicDemoResponse,async()=>{calls++;return null;});assert.equal(response.status,200);assert.equal(calls,1);
assert.equal((await branch(new Request('https://yinyangeq.com/demo'),env,'/demo',isPublicDemo,publicDemoResponse,async()=>new Response(null,{status:429}))).status,429);
assert.equal(await branch(new Request('https://yinyangeq.com/music/private.mp3'),env,'/music/private.mp3',isPublicDemo,publicDemoResponse,()=>{throw Error('unexpected bypass')}),null);
console.log('PASS public video metadata, canonical short URLs, GET/HEAD, fixed redirects, rejected writes, no account/database access, rate-limit enforcement and protected-route isolation.');
