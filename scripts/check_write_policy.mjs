import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import * as penalties from '../lib/rate-penalty.ts';
const code=ts.transpileModule(readFileSync(new URL('../lib/public-write-gate.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
let now=120000, calls=[], stored=new Map();
const db={prepare(sql){return {bind(...args){return {
 async first(){
  calls.push({sql,args});
  if(sql===penalties.READ_PENALTY_SQL) return null;
  if(sql===penalties.START_PENALTY_SQL) return {level:1,hits:0,blocked_until:args[1],last_escalated_at:args[2],expires_at:args[3]};
  assert.ok(sql.includes('INSERT INTO public_write_limits'),'Unexpected database operation');
  const [key,bucket]=args;
  assert.ok(key.startsWith('minute:'),'Daily quotas must never be read or incremented');
  const old=stored.get(key), count=old?.bucket===bucket?old.count+1:1;
  stored.set(key,{bucket,count});return {count};
 },async run(){}
};}};}};
const deps={'cloudflare:workers':{env:{DB:db,ABUSE_RATE_SECRET:'test-secret-for-hmac-with-at-least-32-characters'}},'@/lib/maintenance':{maintenanceResponse:()=>null},'@/lib/rate-penalty':penalties};
const crypto={subtle:webcrypto.subtle,getRandomValues:array=>{array.fill(1);return array;}};
const context=vm.createContext({exports:{},require:name=>deps[name],Date:{now:()=>now},crypto,TextEncoder,Response});vm.runInContext(code,context);
const request=new Request('https://example.test/api/votes',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.1'}});
// More than the former daily allowance, all at a reasonable within-minute pace.
for(let i=0;i<600;i++){now=120000+i*2500;assert.equal(await context.exports.publicWriteGate(request),null,`Normal submission ${i+1} was blocked`);}
assert.equal(calls.filter(call=>call.sql===penalties.START_PENALTY_SQL).length,0);
stored=new Map();calls=[];now=2400000;
for(let i=0;i<30;i++)assert.equal(await context.exports.publicWriteGate(request),null);
const limited=await context.exports.publicWriteGate(request);assert.equal(limited.status,429);assert.equal(limited.headers.get('Retry-After'),'60');
assert.equal(calls.filter(call=>call.sql===penalties.START_PENALTY_SQL).length,1);
console.log('Write policy: 600 properly paced submissions accepted without any daily counter; the 31st request in one minute still starts the normal 60-second cooldown.');
