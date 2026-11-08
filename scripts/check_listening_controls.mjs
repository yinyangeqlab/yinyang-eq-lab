import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {resolve,dirname} from 'node:path';
const modules=new Map();
function load(name){name=resolve(name);if(modules.has(name))return modules.get(name);const mod={exports:{}};modules.set(name,mod.exports);vm.runInNewContext(ts.transpileModule(fs.readFileSync(name,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,Float32Array,Float64Array,JSON,Math,require(id){const path=id.startsWith('@/')?resolve(id.slice(2)):resolve(dirname(name),id);return load(path.endsWith('.ts')?path:path+'.ts');}});return mod.exports;}
const settings=load('lib/fitter-settings.ts'),core=load('lib/autoeq-fit.ts');
const flat=[[20,0],[20000,0]],raw=[[20,4],[1000,0],[20000,-3]],request={raw,targets:[flat,[[20,3],[1000,0],[20000,-2]]],kind:'shootout',sampleRate:48000};
let assertions=0;const check=(value,message)=>{assert.ok(value,message);assertions++;};
for(const method of ['standard','precise'])for(const bands of [10,15,20,30]){
 const fits=core.legacyBatch({...request,method,bands},'');
 check(fits.every(f=>f.method===method&&f.bands===bands&&f.filters.length===bands&&f.preamp<=0&&!f.fallbackReason),'Actual configured fitter returns requested bands and explicit provenance without a false fallback label');
 const provenance=fits.map(f=>({...f,filterCount:f.filters.length}));
 const clean=settings.cleanFitMetadata(provenance);
 check(clean.every(f=>f.method===method&&f.bands===bands),'Both-side provenance survives server allowlisting');
 check(settings.fitterCohort(JSON.stringify({eqFits:clean})).key.startsWith(`${method}:${bands}:legacy:`),'Rankings derive a distinct method/band/engine/version cohort');
}
const base={method:'standard',bands:10,filterCount:10,engine:'legacy',engineVersion:'yinyang-standard-close@listening-fitter-v1',sampleRate:48000,rms:.5,preamp:-4};
check(settings.fitterCohort(JSON.stringify({eqFits:[base,base]})).key===settings.MAIN_FITTER_COHORT,'Main ranking reference has an exact version-bound key');
for(const changes of [{method:'precise'},{bands:30},{engineVersion:'changed'},{sampleRate:44100},{bands:11},{engine:'unrecognized'},{filterCount:11},{rms:NaN},{preamp:1}])assert.throws(()=>settings.cleanFitMetadata([base,{...base,...changes}]));
for(const context of [null,'{bad','{}',JSON.stringify({eqFits:[{bands:10},{bands:10}]})])check(settings.fitterCohort(context).key==='historical','Missing or invalid historical provenance never becomes today’s default');
const wav=load('lib/channel-match-export.ts');check(wav.autoMatchFilename('Bose Comfort').endsWith('YinYang-AutoMatch-48k.wav'),'Automatic files have an explicit portable name');
check(wav.autoMatchFilename('Model',true).includes('uploaded-channel-match'),'Uploaded corrections cannot be mislabeled as generated AutoMatch');
// Execute the real AudioWorklet, retaining its stereo detector, smoothing and ceiling.
const rate=48000,frames=rate*16;let Processor;
vm.runInNewContext(fs.readFileSync('public/dynamic-range-worklet.js','utf8'),{sampleRate:rate,AudioWorkletProcessor:class{port={postMessage(){}}},registerProcessor(_name,value){Processor=value;},Float32Array,Math});
function process(amount){const processor=new Processor();processor.port.onmessage({data:{amount}});const left=new Float32Array(frames),right=new Float32Array(frames),source=new Float32Array(frames);for(let offset=0;offset<frames;offset+=128){const n=Math.min(128,frames-offset),a=new Float32Array(n),b=new Float32Array(n),out=[new Float32Array(n),new Float32Array(n)];for(let i=0;i<n;i++){const index=offset+i,amplitude=Math.floor(index/(rate*4))%2?.55:.055;a[i]=amplitude*Math.sin(2*Math.PI*1000*index/rate);b[i]=a[i]*.5;source[index]=a[i];}processor.process([[a,b]],[out]);left.set(out[0],offset);right.set(out[1],offset);}return{left,right,source};}
const rms=(data,start,end)=>Math.sqrt(data.slice(start*rate,end*rate).reduce((sum,x)=>sum+x*x,0)/((end-start)*rate));
const results=[0,-.75,.75].map(amount=>{const out=process(amount),contrast=20*Math.log10(rms(out.left,14.5,15.5)/rms(out.left,10.5,11.5));check(out.left.every(Number.isFinite),'Worklet produces finite output');check(out.left.every((x,i)=>Math.abs(out.right[i]-x*.5)<1e-7),'Dynamics preserves stereo balance using linked channel gain');if(amount===0)check(out.left.every((x,i)=>x===out.source[i]),'Zero dynamics is sample-exact bypass');else check(out.left.every(x=>Math.abs(x)<=.98001),'Active dynamics retains its ceiling');return{amount,contrast};});
check(results[1].contrast<results[0].contrast-3,'Compression reduces loud/quiet level contrast');check(results[2].contrast>results[0].contrast+3,'Expansion increases loud/quiet level contrast');
console.log('Dynamics steady-state level contrast:',results);
console.log(`PASS ${assertions} fitter/cohort/channel filename/dynamics assertions plus malformed-provenance rejection cases. Physical audio, Apple devices and perceptual improvement are not certified.`);
const {deepBassBoost,recommendCandidates}=load('lib/eq-recommendation.ts');
const candidate=(bands,rms,preamp,q)=>({method:'precise',priority:'close',engine:'legacy',bands,rms,preamp,filters:[{hz:1000,gain:2,q}]});
const fewer=candidate(10,.4,-6,2),closer=candidate(20,.31,-4,3),narrow=candidate(30,.1,-1,9),awards=recommendCandidates([narrow,closer,fewer]);
check(awards.recommended===fewer,'Recommendation prefers fewer bands within the disclosed bounded-Q error tolerance');
check(awards.leastHeadroom===narrow,'Least preamp reduction means closest to zero, not the most negative value');
check(awards.bestError===narrow,'Lowest error is recorded separately from the balanced recommendation');
check(recommendCandidates([])===null,'Empty comparisons have no fabricated recommendation');
const smallBoost = { ...fewer, rms: .52, peakBoost: 4, filters: [{ hz: 45, gain: 3, q: 1 }, { hz: 45, gain: -2, q: 1 }] };
const deepBoost = { ...closer, rms: .30, peakBoost: 8, preamp: -8.5, filters: [{ hz: 45, gain: 4, q: 1 }, { hz: 45, gain: 4, q: 1 }] };
const samePeakAboveBass = { ...deepBoost, filters: [{ hz: 2000, gain: 8, q: 1 }] };
check(Math.abs(deepBassBoost(smallBoost) - 1) < .01, 'Bass boost measures the combined curve after overlapping cuts');
check(Math.abs(deepBassBoost(deepBoost) - 8) < .01, 'Bass boost counts overlapping positive filters together');
const tuningCurves = { raw, target: flat };
const tuning = recommendCandidates([smallBoost, deepBoost], tuningCurves);
check(tuning.recommended === smallBoost && tuning.bestError === deepBoost, 'Tuning can favor smaller boosts while retaining the closest fit for comparison');
check(recommendCandidates([deepBoost, samePeakAboveBass], tuningCurves).recommended === samePeakAboveBass, 'Deep bass receives extra weight at the same overall boost and error');

const constrained = recommendCandidates([deepBoost], tuningCurves);
check(constrained.bestError === deepBoost && constrained.recommended.reducedBoost, 'A boost-heavy set offers a gentler version beside the untouched closer fit');
check(deepBassBoost(constrained.recommended) <= 6 && constrained.recommended.peakBoost <= 8, 'The gentler version stays within the recommended boost limits after recomputing the combined curve');
check(constrained.recommended.preamp > deepBoost.preamp && constrained.recommended.preamp === -Math.ceil((constrained.recommended.peakBoost + .5) * 10) / 10, 'The gentler version recalculates its preamp from the reduced boost');
assert.throws(()=>load('lib/preference-finalize.ts').exportQudelixGuide(narrow),/20 bands/);
console.log('PASS recommendation balance, independent headroom/error awards, empty results and 30-band hardware-export refusal.');

const referencePage=fs.readFileSync("app/community-preferences/page.tsx","utf8"),playerSource=fs.readFileSync("components/music-panel.tsx","utf8");
check(referencePage.includes("<MusicPanel fixedReferenceProtocol"),"Independent community reference study explicitly keeps its original fixed fitter protocol");
check(playerSource.includes("...(fixedReferenceProtocol ? {bands:10 as const} : fitter)"),"Reference requests omit the new method setting, preserving original engine and fallback semantics");
