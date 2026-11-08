import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { resolve, dirname } from 'node:path';
import { captureAccountValues } from '../lib/account-sync.mjs';
const cache=new Map();
function load(name){name=resolve(name);if(cache.has(name))return cache.get(name);const mod={exports:{}};cache.set(name,mod.exports);vm.runInNewContext(ts.transpileModule(fs.readFileSync(name,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,structuredClone,Date,Math,JSON,Error,require(id){return load(resolve(dirname(name),id)+'.ts');}});return mod.exports;}
const m=load('lib/generated-eq-comparison.ts'),personal=load('lib/personal-shootout.ts');
const variants=Array.from({length:15},(_,i)=>({method:i%3===0?'standard':i%3===1?'precise':'peqdb',bands:[10,15,20,30][i%4],priority:'close',engine:i%3===2?'peqdb':'legacy',engineVersion:'synthetic-v1',filters:[{hz:100+i*20,gain:i/10,q:1}],preamp:-3,rms:i/20}));
const signature=m.generatedSignature({headphones:'Synthetic',target:'Synthetic target'},variants);
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const evidence={heard:[.4,.5],start:2,seconds:15};
let checks=0;function check(label,fn){fn();checks++;console.log('PASS',label);}
function explore(count){let session=m.createGeneratedComparison(signature,Array.from({length:count},(_,i)=>i),variants,rng(893));const random=rng(123);for(let i=0;i<150&&!m.generatedReadiness(session.run).ready;i++){const [a,b]=session.run.pending.map(Number);session=m.recordGeneratedComparison(session,a<b?'a':'b','recording-one',evidence,random);}return session;}
check('Twelve and fifteen-result sets receive repeated exposure before finalist checks',()=>{for(const count of [12,15]){const s=explore(count);assert.ok(m.generatedReadiness(s.run).ready);assert.ok(personal.personalStandings(s.run).every(r=>r.heard>=2));assert.equal(m.generatedLeadingResult(s.run),null);assert.deepEqual([...s.selected],Array.from({length:count},(_,i)=>i));assert.ok(s.run.candidates.every(c=>c.name.startsWith('Generated result ')));}});
check('Insufficient playback and duplicate selections fail without altering the run',()=>{const s=m.createGeneratedComparison(signature,[0,1,2],variants);assert.throws(()=>m.recordGeneratedComparison(s,'a','song',{...evidence,heard:[.4,0]}),/Play both/);assert.equal(s.run.choices.length,0);assert.throws(()=>m.createGeneratedComparison(signature,[0,0],variants));assert.throws(()=>m.createGeneratedComparison(signature,[0,999],variants));});
check('Skipping does not establish exposure or preference',()=>{const s=m.createGeneratedComparison(signature,[0,1],variants);const next=m.recordGeneratedComparison(s,'skip','song',{heard:[0,0],start:0,seconds:0});assert.ok(personal.personalStandings(next.run).every(r=>r.heard===0));assert.equal(m.generatedReadiness(next.run).ready,false);});
check('Both randomized A/B orientations remain reachable',()=>{let draw=0;const a=m.createGeneratedComparison(signature,[0,1],variants,()=>0),b=m.createGeneratedComparison(signature,[0,1],variants,()=>++draw===3?.99:0);assert.notEqual(a.run.pending.join(),b.run.pending.join());});
let finished;
check('Finalist comparisons require different recording identities, then produce only a within-set result',()=>{let s=m.confirmGeneratedComparison(explore(12),rng(9));let attempts=0;while(!personal.confirmationComplete(s.run)&&attempts++<30){const pair=s.run.pending,used=personal.confirmationEvidence(s.run,pair),song=used.has('song-one')?'song-two':'song-one';const [a,b]=pair.map(Number);s=m.recordGeneratedComparison(s,a<b?'a':'b',song,evidence,rng(attempts));}assert.ok(personal.confirmationComplete(s.run));assert.equal(m.generatedLeadingResult(s.run),'0');assert.equal(s.run.pending,null);finished=s;});
check('Repeating one recording cannot complete finalist checks',()=>{let s=m.confirmGeneratedComparison(explore(12));for(let i=0;i<14;i++)s=m.recordGeneratedComparison(s,'tie','only-one-recording',evidence,rng(i));assert.equal(personal.confirmationComplete(s.run),false);assert.equal(m.generatedLeadingResult(s.run),null);});
check('Ties and early reveals never fabricate a winner',()=>{let s=m.createGeneratedComparison(signature,[0,1,2,3,4],variants,rng(1));for(let i=0;i<40;i++)s=m.recordGeneratedComparison(s,'tie','song',evidence,rng(i));assert.equal(m.generatedReadiness(s.run).ready,false);assert.equal(m.generatedLeadingResult(s.run),null);assert.throws(()=>m.recordGeneratedComparison({...s,revealed:true},'a','song',evidence),/ended/);const tied={...finished,run:{...finished.run,choices:finished.run.choices.map(c=>c.phase==='confirm'?{...c,result:'tie'}:c)}};assert.equal(m.generatedLeadingResult(tied.run),null);});
check('Persistence preserves exact pending sides and refuses changed sets or foreign candidates',()=>{const s=explore(15);const restored=m.restoreGeneratedComparison(JSON.stringify(s),signature,variants);assert.equal(JSON.stringify(restored),JSON.stringify(s));assert.equal(m.restoreGeneratedComparison(JSON.stringify(s),signature+'changed',variants),null);const broken=structuredClone(s);broken.run.candidates[0].id='foreign';assert.throws(()=>m.restoreGeneratedComparison(JSON.stringify(broken),signature,variants));assert.throws(()=>m.restoreGeneratedComparison(JSON.stringify({...s,sampleRate:undefined}),signature,variants));});
check('Both playback channels preserve exact generated filters without shared mutable arrays',()=>{const preset=m.generatedPreset(variants[1]);assert.equal(preset.channels[0].filters[0].hz,variants[1].filters[0].hz);assert.equal(preset.channels[0].preampDb,variants[1].preamp);preset.channels[0].filters[0].gain=99;assert.notEqual(preset.channels[1].filters[0].gain,99);assert.notEqual(variants[1].filters[0].gain,99);});
check('Generated-set progress is outside the Account Sync allowlist',()=>{const store={getItem:key=>key===m.GENERATED_EQ_STORAGE+':synthetic'?JSON.stringify(finished):null};assert.equal(Object.keys(captureAccountValues(store)).length,0);});
// Exercise the actual renderer's shared FIR routing, stereo RMS matching and common peak protection.
check('New private comparison UI has no submission or Sync operations',()=>{const source=fs.readFileSync('components/generated-eq-comparison.tsx','utf8');assert.ok(!source.includes('fetch('));assert.ok(source.includes('This compares the selected results from this generation only'));assert.ok(source.includes('Leading result from these'));});
const model=load('lib/blind-eq.ts'),convolvers=[];let balanceCalls=0,renderCount=0;
class Buffer{constructor({numberOfChannels,length,sampleRate}){Object.assign(this,{numberOfChannels,length,sampleRate,duration:length/sampleRate});this.data=Array.from({length:numberOfChannels},()=>new Float32Array(length));}getChannelData(c){return this.data[c];}copyToChannel(a,c){this.data[c].set(a);}}
const node=()=>({gain:{value:1},connect(){},start(){}});
class Offline{constructor(channels,length,rate){Object.assign(this,{channels,length,rate,destination:{}});}createBufferSource(){return node();}createChannelSplitter(){return node();}createChannelMerger(){return node();}createGain(){return node();}createIIRFilter(){return node();}createBuffer(c,n,r){return new Buffer({numberOfChannels:c,length:n,sampleRate:r});}createConvolver(){const n=node();convolvers.push(n);return n;}async startRendering(){const b=this.createBuffer(2,this.length,this.rate),amplitude=++renderCount===1?.2:.5;for(let c=0;c<2;c++)b.data[c].fill(amplitude*(c===1?.5:1));return b;}}
const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/blind-eq-audio.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,Float32Array,Math,Error,AudioBuffer:Buffer,OfflineAudioContext:Offline,require:id=>id==='./blind-eq'?model:{channelBalance(){balanceCalls++;return{impulses:[new Float32Array([1]),new Float32Array([.5])],maxBoostDb:0};}}});
const prepared=await mod.exports.prepareComparison(new Buffer({numberOfChannels:2,length:48000*6,sampleRate:48000}),[m.generatedPreset(variants[0]),m.generatedPreset(variants[1])],.5,5,true,undefined,{});
check('Shared channel correction is identical on both candidates and stereo level matching preserves balance',()=>{assert.equal(balanceCalls,1);assert.equal(convolvers.length,4);assert.ok(convolvers.every(c=>c.normalize===false));assert.deepEqual(convolvers.map(c=>c.buffer.getChannelData(0)[0]),[1,.5,1,.5]);assert.ok(Math.abs(prepared.buffers[0].data[0][0]-prepared.buffers[1].data[0][0])<1e-6);for(const b of prepared.buffers){assert.ok(b.data[0].every(x=>Math.abs(x)<=.98));assert.ok(b.data[1].every((x,i)=>Math.abs(x-.5*b.data[0][i])<1e-6));}});
console.log(`PASS ${checks} generated-set comparison checks. Synthetic scheduling/rendering only; no physical audio or listener preference accuracy claim.`);

check('Known song-family versions share confirmation identity, while unrelated recordings remain distinct',()=>{assert.equal(m.generatedRecordingId({url:'a',songFamily:'same'}),m.generatedRecordingId({url:'b',songFamily:'same'}));assert.equal(m.generatedRecordingId({url:'a',sha256:'abc'}),'file:abc');assert.notEqual(m.generatedRecordingId({url:'a'}),m.generatedRecordingId({url:'b'}));});

const inputs=[];
const gainNode=()=>({gain:{value:1,cancelScheduledValues(){},setTargetAtTime(value){this.value=value;}},connect(){},disconnect(){}});
const context={state:'running',sampleRate:48000,currentTime:0,destination:{},createGain:gainNode,createChannelSplitter:gainNode,createChannelMerger:gainNode,createIIRFilter:gainNode,createBufferSource(){const source={...gainNode(),start(...args){this.args=args;},stop(){this.stopped=true;}};inputs.push(source);return source;}};
const player=new mod.exports.BlindEqPlayer(context),track=new Buffer({numberOfChannels:2,length:48000*60,sampleRate:48000}),presets=[m.generatedPreset(variants[0]),m.generatedPreset(variants[1])];
check('Full-track A/B uses one running source and optional looping preserves the selected bounds',()=>{
 player.playTrack(track,presets,[.8,.9],0);
 assert.equal(Boolean(inputs[0].loop),false);
 context.currentTime=22.02;player.switch(1);
 assert.equal(inputs.length,1);assert.equal(player.time,22);assert.equal(Boolean(inputs[0].stopped),false);
 player.playTrack(track,presets,[.8,.9],1,{start:20,end:30});
 assert.equal(inputs[1].loop,true);assert.equal(inputs[1].args[1],22);
 context.currentTime=32.04;assert.ok(Math.abs(player.time-22)<1e-6);
 player.playTrack(track,presets,[.8,.9],1);
 assert.equal(Boolean(inputs[2].loop),false);assert.ok(Math.abs(inputs[2].args[1]-22)<1e-6);
 inputs[2].onended();assert.equal(player.playing,false);assert.equal(player.time,60);
});
