import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { parseIntervals, intervalStats } from '../lib/listening.ts';
const code=ts.transpileModule(readFileSync(new URL('../app/api/listening-runs/route.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const ids=Array.from({length:5},(_,i)=>`${i+1}1111111-1111-4111-8111-111111111111`);
async function run({age=11000,heard=6,mismatch=false,mode='blind'}={}) {
 let saved;
 const db={select:()=>({from:()=>({where:()=>({get:async()=>({voterId:ids[1],testMode:'blind',sideA:mismatch?ids[3]:ids[2],sideB:ids[3],issuedAt:Date.now()-age})})})}),insert:()=>({values:value=>({value})}),batch:async commands=>{saved=commands[0].value;}};
 const deps={
  "@/lib/submission-ownership":{submissionContext:async()=>({shareMusic:true,requireTrial:async()=>{},record:()=>({ownership:true})})},
  'drizzle-orm':{eq:(...args)=>args},'@/db':{getDb:()=>db},'@/db/schema':{listeningRuns:{},rankedTrials:{}},
  '@/lib/listening':{parseIntervals,intervalStats},'@/lib/request-json':{readJsonObject:r=>r.json(),requestInputResponse:()=>null},
  '@/lib/vote-data-notice':{VOTE_DATA_NOTICE_VERSION:'test'},'@/lib/public-write-gate':{publicWriteGate:async()=>null},
 };
 const context=vm.createContext({exports:{},require:name=>deps[name],Response,Date});vm.runInContext(code,context);
 const response=await context.exports.POST(new Request('https://example.test/api/listening-runs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:ids[0],voterId:ids[1],targetAId:ids[2],targetBId:ids[3],trialId:ids[4],testMode:mode,headphoneType:'ie',result:'tie',voteDataNoticeVersion:'test',intervals:[{side:0,start:0,end:heard,rate:1},{side:1,start:0,end:heard,rate:1}]})}));
 return {status:response.status,saved};
}
const good=await run(); assert.equal(good.status,201); assert.equal(good.saved.trialId,ids[4]); assert.equal(good.saved.heardA,6);
for(const [options,status] of [[{age:9000},400],[{heard:4},400],[{mismatch:true},409],[{age:7200001},410]]) {
 const result=await run(options);assert.equal(result.status,status);assert.equal(result.saved,undefined);
}
const open=await run({mode:'open',heard:1});assert.equal(open.status,201);assert.equal(open.saved.trialId,null);
console.log('Listening runs: valid blind checks are linked to assigned trials; premature, short, mismatched, and expired runs are rejected; Open mode remains unlinked.');
