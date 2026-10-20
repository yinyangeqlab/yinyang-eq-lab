import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const gate=readFileSync(new URL('../infra/pulumi/private-gate.mjs',import.meta.url),'utf8');const start=gate.indexOf('const agreementException ='),end=gate.indexOf('if (!owner && (["/shootout"',start);assert.ok(start>0&&end>start);
const check=new Function('request','data','owner','tester','dataRoute','json','finish',`const url=new URL(request.url),path=url.pathname;${gate.slice(start,end)} return null;`);
for(const canParticipate of[true,false])for(const path of['/participation','/shootout','/music-library','/preference-tuning','/api/votes','/api/my-data']){const method=path.startsWith('/api/')?'POST':'GET',dataRoute=path==='/api/my-data';const r=check(new Request('https://example.test'+path,{method}),{canParticipate},false,{},dataRoute,(body,status)=>Response.json(body,{status}),r=>r);if(canParticipate||dataRoute||['/participation','/shootout'].includes(path))assert.equal(r,null);else if(method==='GET'){assert.equal(r.status,303);assert.equal(r.headers.get('Location'),'/participation?return_to='+encodeURIComponent(path));}else assert.equal(r.status,403);}
// The page now delegates to the shared editor; execute that editor's request and
// navigation harness instead of checking removed inline implementation strings.
await import('./check_unified_consent_flow.mjs');
console.log('PASS actual participation gate fragment: consent/data reads remain available, tool entry redirects without agreement, research writes stay blocked.');
