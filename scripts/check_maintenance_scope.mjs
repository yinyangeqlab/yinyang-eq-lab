import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
import vm from'node:vm';
import ts from'typescript';
import * as options from'../lib/maintenance-options.ts';
import{validNoticeMinutes}from'../lib/notice-duration.ts';
const ids=options.MAINTENANCE_FEATURES.map(f=>f.id),routes=[
 ['/shootout','GET','shootouts'],['/shootout/','HEAD','shootouts'],['/shootout/personal','GET','shootouts'],['/api/trials','POST','shootouts'],['/api/votes','POST','shootouts'],['/api/listening-runs','POST','shootouts'],['/api/comparison-choices','POST','shootouts'],['/api/feedback','POST','shootouts'],
 ['/music-library','GET','listeningPool'],['/api/music-votes','POST','listeningPool'],['/preference-tuning','GET','preferenceTuning'],['/personal-tuning','GET','preferenceTuning'],['/api/preference-exports','POST','preferenceTuning'],['/api/targets','POST','contributions'],['/api/research-measurements','POST','contributions'],['/api/suggestions','POST','contributions'],
 ['/api/listening-audio/file','GET',null],['/music/source.flac','GET',null],['/api/targets','GET',null],['/api/research','GET',null],['/my-data','GET',null],['/api/my-data','PATCH',null],['/api/my-data','DELETE',null],['/owner-research','GET',null],['/api/owner-research/service-status','POST',null],['/privacy','GET',null],['/sync','GET',null]
];
let checks=0;
for(let bits=0;bits<16;bits++){
 const locks=ids.filter((_,i)=>bits&(1<<i));const status={active:true,pauseSubmissions:!!locks.length,lockedFeatures:locks,message:'Major updates <safe> & pending.',expiresAt:Date.now()+3600000};
 const encoded=options.encodeMaintenanceNotice(status.message,locks);assert.deepEqual(options.decodeMaintenanceNotice(encoded,status.pauseSubmissions),{message:status.message,lockedFeatures:locks});
 for(const[path,method,feature]of routes){const response=options.featureMaintenanceResponse(new Request('https://example.test'+path,{method}),status);const locked=locks.includes(feature);assert.equal(!!response,locked,`${bits} ${method} ${path}`);if(response){assert.equal(response.status,503);assert.equal(response.headers.get('X-YinYang-Maintenance-Feature'),feature);if(method==='GET'){const text=await response.text();assert.ok(text.includes('&lt;safe&gt; &amp;'));assert.ok(text.includes('href="/my-data"'));for(const[id,url]of [['shootouts','/shootout'],['listeningPool','/music-library'],['preferenceTuning','/preference-tuning']])assert.equal(text.includes('href="'+url+'"'),!locks.includes(id));}}checks++;}
}
assert.deepEqual(options.decodeMaintenanceNotice('Old plain notice',true),{message:'Old plain notice',lockedFeatures:['shootouts']});
assert.deepEqual(options.decodeMaintenanceNotice('Old plain notice',false),{message:'Old plain notice',lockedFeatures:[]});
assert.deepEqual(options.maintenanceLocks(true),['shootouts']);
for(const invalid of ['shootouts',{},['unknown'],['shootouts','shootouts']])assert.equal(options.validMaintenanceLocks(invalid),false);
// Exercise the real API validation and storage parser without touching live state.
let clock=1800000000000,stored={revision:'legacy',message:'Current one-hour notice',pause_submissions:1,expires_at:clock+3600000},writes=0,owner=true;
const env={DB:{prepare(sql){return{bind(...args){return{async run(){writes++;stored={revision:args[0],message:args[1],pause_submissions:args[2],expires_at:args[3]};}}},async run(){writes++;stored=null;},async first(){return stored}}}}};
function load(path,deps){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>{assert.ok(name in deps,name);return deps[name];},Response,Request,URL,crypto,Date:class extends Date{static now(){return clock;}}});return exports;}
const service=load('lib/service-status.ts',{'cloudflare:workers':{env},'@/lib/maintenance-options':options});
const read=await service.readServiceStatus(true);assert.equal(read.expiresAt,clock+3600000);assert.deepEqual([...read.lockedFeatures],['shootouts']);assert.equal(writes,0,'Reading a legacy active pause must not restart its timer or rewrite it');
const route=load('app/api/owner-research/service-status/route.ts',{'@/lib/owner-access':{ownerAccessResponse:async()=>owner?null:new Response(null,{status:403})},'@/lib/request-json':{readJsonObject:r=>r.json(),requestInputResponse:()=>null},'@/lib/service-status':service,'@/lib/notice-duration':{validNoticeMinutes},'@/lib/maintenance-options':options});
const request=(body,origin='https://example.test')=>new Request('https://example.test/api/owner-research/service-status',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
for(let bits=0;bits<16;bits++){const locks=ids.filter((_,i)=>bits&(1<<i));const response=await route.POST(request({active:true,message:'Selective scope',pauseSubmissions:!!locks.length,lockedFeatures:locks,durationMinutes:60}));assert.equal(response.status,200);const body=await response.json();assert.deepEqual(body.lockedFeatures,locks);assert.equal(body.expiresAt,clock+3600000);assert.ok(stored.message.startsWith('yinyang-maintenance-v2:'));assert.equal(body.message,'Selective scope');}
const count=writes;
for(const change of [{lockedFeatures:['unknown']},{lockedFeatures:['shootouts','shootouts']},{lockedFeatures:[]},{pauseSubmissions:false,lockedFeatures:['shootouts']},{durationMinutes:0}])assert.equal((await route.POST(request({active:true,message:'Do not save',pauseSubmissions:true,lockedFeatures:['shootouts'],durationMinutes:60,...change}))).status,400);
assert.equal((await route.POST(request({active:true,message:'Do not save',pauseSubmissions:false,durationMinutes:60},'https://other.test'))).status,403);owner=false;assert.equal((await route.POST(request({active:true,message:'Do not save',pauseSubmissions:false,durationMinutes:60}))).status,403);owner=true;assert.equal(writes,count);
const legacy=await route.POST(request({active:true,message:'Old admin client',pauseSubmissions:true,hours:1}));assert.equal(legacy.status,200);assert.deepEqual((await legacy.json()).lockedFeatures,['shootouts']);clock+=3600001;const expired=await service.readServiceStatus(true);assert.equal(expired.active,false);assert.deepEqual([...expired.lockedFeatures],[]);assert.equal(options.featureMaintenanceResponse(new Request('https://example.test/shootout'),expired),null);
await route.POST(request({active:false,message:'Clear',pauseSubmissions:false,lockedFeatures:[],durationMinutes:60}));assert.equal((await service.readServiceStatus(true)).active,false);
console.log(`Per-feature maintenance: ${checks} route/method cases across all16 lock combinations passed; API round trips, legacy timer preservation, invalid/auth/origin rejection, automatic expiry and clearing verified. Synthetic calls only.`);
