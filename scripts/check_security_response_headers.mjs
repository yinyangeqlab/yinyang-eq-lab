import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
import vm from'node:vm';
const src=readFileSync('infra/pulumi/private-gate.mjs','utf8');
const wrapper=src.slice(src.indexOf('export default {'),src.indexOf('\nfunction rankingResponse')).replace('export default','exports.handler =');
let response;
const context={exports:{},privateGate:{fetch:async()=>response},Headers,Response,withMediaLength:(_,r)=>r};vm.runInNewContext(wrapper,context);
for(const type of ['text/html; charset=utf-8','application/json','audio/mpeg']){
 response=new Response('fixture',{headers:{'Content-Type':type,'Referrer-Policy':'no-referrer'}});
 const out=await context.exports.handler.fetch(new Request('https://fixture.test'),{},{});
 assert.equal(out.headers.get('X-Frame-Options'),'DENY');assert.equal(out.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(out.headers.get('Referrer-Policy'),'no-referrer');assert.match(out.headers.get('Permissions-Policy'),/microphone=\(\)/);
 if(type.startsWith('text/html'))assert.match(out.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);else assert.equal(out.headers.get('Content-Security-Policy'),null);
 assert.equal(await out.text(),'fixture');
}
assert.ok(src.includes('Browser Sync is unavailable for this hidden test account.'));
console.log('PASS actual response wrapper: anti-framing, nosniff, minimized permissions, preserved private referrer policy and untouched non-HTML bodies; test Sync UI restricted.');
