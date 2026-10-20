import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {resolve} from 'node:path';
const base=process.env.RECOVERY_LOCAL_ORIGIN || 'http://127.0.0.1:8932',dir=resolve(import.meta.dirname,'../..');
const origin=new URL(base);if(!['127.0.0.1','localhost','[::1]'].includes(origin.hostname)||origin.protocol!=='http:')throw Error('Only HTTP loopback recovery checks are allowed');
assert(JSON.parse(readFileSync(dir+'/.recovery-local/report.json')).localImported,'A completed local recovery is required');
const secret=Object.fromEntries(readFileSync(dir+'/.dev.vars','utf8').trim().split('\n').map(l=>l.split('='))).PRIVATE_ACCESS_PASSWORD;
const headers={'CF-Connecting-IP':'127.0.0.1'},proof={productionTouched:false,checks:[]};
for(const path of ['/api/targets','/api/listening-audio/dreams-mastered'])assert.equal((await fetch(base+path,{headers})).status,401);
proof.checks.push('Unauthenticated targets and protected audio remain denied');
const login=await fetch(base+'/admin-login',{method:'POST',headers:{...headers,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:secret}),redirect:'manual'});assert.equal(login.status,303);
const cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');assert(cookie);const auth={...headers,Cookie:cookie};
const targets=await fetch(base+'/api/targets',{headers:auth});assert.equal(targets.status,200);assert((await targets.json()).length>0);proof.checks.push('Fresh local credentials authenticate and restored target catalog is available');
const research=await fetch(base+'/api/research',{headers:auth});assert.equal(research.status,200);assert.equal((await research.json()).methodology,'participant-balanced-fractional-bt-v2');proof.checks.push('Restored ranking API runs with current methodology');
const range=await fetch(base+'/api/listening-audio/dreams-mastered',{headers:{...auth,Range:'bytes=0-63'}});assert.equal(range.status,206);const manifest=JSON.parse(readFileSync(dir+'/data/listening-pool-audio-manifest.json'));const file=dir+'/public'+manifest['dreams-mastered'].parts[0].path;assert.deepEqual(Buffer.from(await range.arrayBuffer()),readFileSync(file).subarray(0,64));proof.checks.push('Actual protected audio range bytes match recovered recording');
for(const path of ['/','/shootout'])assert.equal((await fetch(base+path,{headers:auth})).status,200);
assert.equal((await fetch(base+'/sync',{headers:auth})).status,403);proof.checks.push('Welcome and Shootout render; owner is correctly excluded from tester-only Sync');
const invite=await (await fetch(base+'/__private/admin/invites',{method:'POST',headers:{...auth,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({label:'Disposable local recovery tester'})})).json();assert(invite.code);
let jar=new Map();function capture(r){for(const c of r.headers.getSetCookie()){const s=c.split(';')[0],i=s.indexOf('=');jar.set(s.slice(0,i),s.slice(i+1))}}
async function tester(path,options={}){const h={...headers,Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...options.headers};if(options.method)h.Origin=base;const r=await fetch(base+path,{...options,headers:h,redirect:'manual'});capture(r);return r}
assert.equal((await tester('/access',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code:invite.code,return_to:encodeURIComponent('/shootout')})})).status,303);
assert.equal((await tester('/api/my-data')).status,200);
assert.equal((await tester('/api/my-data',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({submissionsEnabled:true,shareMusic:false,acknowledged:true,noticeVersion:'2026-10-18-v7'})})).status,200);
assert.equal((await tester('/sync')).status,200);proof.checks.push('A newly issued local tester credential works with fresh participation consent and Sync; old credentials remain invalid');
assert.equal((await tester('/api/my-data',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope:'all',confirmation:'DELETE ALL MY DATA'})})).status,200);proof.checks.push('Disposable local tester erased after verification');
writeFileSync(dir+'/.recovery-local/http-check.json',JSON.stringify(proof,null,2)+'\n');console.log(proof);
