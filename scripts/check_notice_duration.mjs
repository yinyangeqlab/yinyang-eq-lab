import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {noticeDurationMinutes,validNoticeMinutes,emptyNoticeDuration,MAX_NOTICE_MINUTES} from '../lib/notice-duration.ts';
const parts=overrides=>({...emptyNoticeDuration,...overrides});
assert.equal(noticeDurationMinutes(parts({minutes:1})),1);
assert.equal(noticeDurationMinutes(parts({hours:2,minutes:30})),150);
assert.equal(noticeDurationMinutes(parts({months:1,weeks:1,days:1,hours:2,minutes:3})),54843);
assert.equal(noticeDurationMinutes(parts({days:365})),MAX_NOTICE_MINUTES);
for(const change of [{},{minutes:-1},{minutes:1.5},{minutes:NaN},{hours:Infinity},{days:366},{months:12,days:6}])assert.equal(noticeDurationMinutes(parts(change)),null);
for(const value of [0,-1,1.5,Infinity,NaN,'60',null,MAX_NOTICE_MINUTES+1])assert.equal(validNoticeMinutes(value),false);
const source=readFileSync(new URL('../app/api/owner-research/service-status/route.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
let published=[];
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/export async function/g,'async function');
const route=vm.runInNewContext(js+';({GET,POST})',{
 Response,URL,validNoticeMinutes,ownerAccessResponse:async()=>null,readJsonObject:async r=>r.json(),requestInputResponse:()=>null,
 DEFAULT_MAINTENANCE_MESSAGE:'Default notice',readServiceStatus:async()=>({active:false}),
 publishServiceStatus:async input=>{published.push(input);return {active:input.active,expiresAt:Date.now()+input.durationMinutes*60000};}
});
const body={active:true,pauseSubmissions:false,message:'Layout testing'};
const request=(payload,origin='https://example.test')=>new Request('https://example.test/api/owner-research/service-status',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(payload)});
for(const durationMinutes of [1,150,54843,MAX_NOTICE_MINUTES]){
 assert.equal((await route.POST(request({...body,durationMinutes}))).status,200);
 assert.equal(published.at(-1).durationMinutes,durationMinutes);
}
for(const hours of [1,2,8,24]){
 assert.equal((await route.POST(request({...body,hours}))).status,200,'Existing open admin pages keep working');
 assert.equal(published.at(-1).durationMinutes,hours*60);
}
const count=published.length;
for(const durationMinutes of [0,-1,1.1,'60',null,MAX_NOTICE_MINUTES+1])assert.equal((await route.POST(request({...body,durationMinutes}))).status,400);
assert.equal((await route.POST(request({...body,durationMinutes:150},'https://other.test'))).status,403);
assert.equal(published.length,count,'Invalid durations and cross-origin calls never publish');
assert.equal((await route.POST(request({...body,active:false,durationMinutes:120}))).status,200);
console.log('Notice duration checks passed: combined units, explicit 30-day months, 1-minute/365-day boundaries, invalid input, server validation, existing-hours compatibility, clearing, and origin protection. Synthetic calls only.');
const serviceSource=readFileSync(new URL('../lib/service-status.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const serviceJs=ts.transpileModule(serviceSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/export /g,'');
const fixed=1800000000000;let stored=null;
const service=vm.runInNewContext(serviceJs+';({publishServiceStatus})',{
 Response,Request,crypto,Date:class extends Date{static now(){return fixed;}},
 env:{DB:{prepare(query){return {bind(...args){return {async run(){stored={revision:args[0],message:args[1],pause_submissions:args[2],expires_at:args[3]};}}},async first(){return stored}}}}}
});
assert.equal((await service.publishServiceStatus({...body,durationMinutes:150})).expiresAt,fixed+150*60000);
assert.equal((await service.publishServiceStatus({...body,hours:2})).expiresAt,fixed+2*3600000);
console.log('Stored expiry verified to the minute for custom and legacy durations; no live database used.');
