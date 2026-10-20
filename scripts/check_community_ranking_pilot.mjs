import assert from 'node:assert/strict';import fs from 'node:fs';
import {estimateCommunityPreference as estimate,pairList} from './research/community-ranking-pilot.mjs';
function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const catalog=Array.from({length:6},(_,i)=>'synthetic-'+i),pairs=pairList(6);
const utility=[[1.4,.9,.3,-.1,-.6,-1.2],[-.8,.1,1.1,.7,-.4,-1.0]];
function win(group,a,b){return 1/(1+Math.exp(utility[group][b]-utility[group][a]));}
function distribution(group){const weights=pairs.map(([a,b])=>group===0?(a===0||b===0?9:1):(a===2||b===2?9:1));return weights.map(v=>v/weights.reduce((a,b)=>a+b,0));}
function truth(q=catalog.map(()=>1/6)){return catalog.map((_,a)=>utility.reduce((n,_,group)=>n+catalog.reduce((s,__,b)=>s+(a===b?0:q[b]*win(group,a,b)/(1-q[a])),0)/utility.length,0));}
// Exact expectation under strongly group-dependent exposure; no Monte Carlo tolerance.
for(const q of [catalog.map(()=>1/6),[.1,.1,.2,.2,.2,.2]]){
 const exact=catalog.map(()=>0);
 for(let g=0;g<2;g++)for(let j=0;j<pairs.length;j++){
  const p=distribution(g),[a,b]=pairs[j],w=win(g,a,b);
  for(const [result,prob]of [['a',w],['b',1-w]]){
   const actual=estimate({catalog,referenceWeights:q,accounts:[{id:'exact',fixedRounds:1,trials:[{id:'trial',pairIndex:j,probabilities:p,result}]}]});
   actual.score.forEach((v,i)=>exact[i]+=.5*p[j]*prob*v);
  }
 }
 exact.forEach((v,i)=>assert.ok(Math.abs(v-truth(q)[i])<1e-12));
}
function generate(seed,unequal=false,adaptive=false){const random=rng(seed),accounts=[];
 for(let u=0;u<120;u++){
  const group=u%2,base=distribution(group),strength=catalog.map(()=>0),rounds=unequal?(group===0?160:20):60,trials=[];
  for(let t=0;t<rounds;t++){
   const weights=pairs.map(([a,b])=>1+Math.max(strength[a],strength[b],0)),total=weights.reduce((a,b)=>a+b,0);
   const p=adaptive?weights.map(v=>.2/pairs.length+.8*v/total):base;
   let x=random(),j=0;while(j<p.length-1&&(x-=p[j])>0)j++;const [a,b]=pairs[j];const tie=random()<.1;
   // A tie contributes half by a declared score convention; binary probability remains heterogeneous.
   const result=tie?'tie':random()<win(group,a,b)?'a':'b';trials.push({id:String(t),pairIndex:j,probabilities:p,result});if(result==='a')strength[a]++;else if(result==='b')strength[b]++;}
  accounts.push({id:'person-'+u,fixedRounds:rounds,trials});
 }
 return {catalog,accounts};
}
// Ties at rate .1 shift each underlying score toward .5, preserving the declared target quantity.
const target=truth().map(v=>.9*v+.05),summary=[];
for(const [unequal,adaptive] of [[false,false],[true,false],[false,true]]){
 let weightedError=0,naiveError=0;const mean=catalog.map(()=>0),repetitions=80;
 for(let seed=1;seed<=repetitions;seed++){
  const result=estimate(generate(seed*997,unequal,adaptive));assert.equal(result.publicReady,false);
  for(let i=0;i<catalog.length;i++){weightedError+=(result.score[i]-target[i])**2;naiveError+=(result.naive[i]-target[i])**2;mean[i]+=result.score[i]/repetitions;}
 }
 const weightedRmse=Math.sqrt(weightedError/(repetitions*6)),rawRmse=Math.sqrt(naiveError/(repetitions*6));
 assert.ok(weightedRmse<rawRmse*(adaptive?.9:.5),'Logged sampling correction should beat raw pooled wins in the declared synthetic design');
 assert.ok(Math.max(...mean.map((v,i)=>Math.abs(v-target[i])))<.012);
 summary.push({scenario:adaptive?'history-adaptive randomized exposure':unequal?'unequal account activity + preference-dependent exposure':'preference-dependent exposure',repetitions,weightedRmse,rawRmse,maxMeanError:Math.max(...mean.map((v,i)=>Math.abs(v-target[i])))});
}
const valid=generate(2);for(const mutate of [x=>x.accounts[0].trials.pop(),x=>x.accounts[0].trials[0].probabilities=undefined,x=>x.accounts[0].trials[0].probabilities=[1,...Array(14).fill(0)],x=>x.accounts.push(x.accounts[0]),x=>x.accounts[0].trials[1].id=x.accounts[0].trials[0].id]){const data=structuredClone(valid);mutate(data);assert.throws(()=>estimate(data));}
// Different missing pair probabilities can yield the same observed choices: v1 has no such logs, so no pretend correction.
assert.throws(()=>estimate({catalog,accounts:[{id:'v1',fixedRounds:1,trials:[{id:'legacy',pairIndex:0,result:'a'}]}]}));
assert.equal(.5*1+.25*0+.25*.5,.625,'Outcome-dependent stopping biases a fair-coin sample mean');
const cycle=[[.5,.8,.2],[.2,.5,.8],[.8,.2,.5]];for(let i=0;i<3;i++)assert.equal(cycle[i].filter((p,j)=>i!==j&&p>.5).length,1);
assert.ok(cycle.map((row,i)=>row.reduce((s,p,j)=>s+(i===j?0:p),0)/2).every(v=>Math.abs(v-.5)<1e-12),'Equal Borda scores can coexist with strong preference cycles');
fs.mkdirSync('artifacts/community-ranking-research-20261019',{recursive:true});fs.writeFileSync('artifacts/community-ranking-research-20261019/simulation.json',JSON.stringify({scope:'Synthetic fixed-horizon validation only; no participant data, production changes or public accuracy guarantee.',summary},null,2));
console.table(summary);console.log('PASS exact design expectation, 240 heterogeneous-population simulations, account balance, explicit tie convention, unknown/zero support, missing blocks, duplicate identities/results and cyclic preferences. Offline prototype only.');
