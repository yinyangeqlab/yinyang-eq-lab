// Synthetic behavior checks against the actual modules. No database or production inputs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const nativeRequire=createRequire(import.meta.url), cache=new Map();
function load(path, globals={}) {
 if(cache.has(path))return cache.get(path);
 const mod={exports:{}};cache.set(path,mod.exports);
 const require=id=>{if(globals.__imports?.[id])return globals.__imports[id];if(id.startsWith('@/'))return load(id.slice(2)+'.ts',globals);if(id.startsWith('./'))return load('lib/'+id.slice(2)+'.ts',globals);return nativeRequire(id);};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:mod.exports,module:mod,require,structuredClone,crypto,console,Request,Response,URL,...globals});return mod.exports;
}
let checks=0;const check=(name,fn)=>{const result=fn();const done=()=>{checks++;console.log('PASS '+name);};if(result?.then)return result.then(done);done();};
const search=load('lib/search.ts'),personal=load('lib/personal-shootout.ts'),start=load('lib/personal-start-status.ts'),upload=load('lib/measurement-upload.ts');
check('Compact models, accented names and Unicode scripts match without erasing provenance',()=>{
 const rows=[{name:'HD 600',source:'Sennheiser'},{name:'Björk',source:'Iceland'},{name:'耳机 2',source:'测试'}];
 for(const [query,name] of [['hd600','HD 600'],['sennheiser hd600','HD 600'],['bjork','Björk'],['耳机2','耳机 2']])assert.equal(search.searchRows(rows,query,r=>[r.name,r.source])[0]?.name,name);
 assert.equal(search.searchRows(rows,'nonsense',r=>[r.name]).length,0);
});
check('Natural ordering, exact-model priority and duplicate provenance are stable',()=>{
 const rows=[{name:'Target 10',source:'B'},{name:'Target 2',source:'C'},{name:'Target 2',source:'A'}];
 assert.deepEqual(Array.from(search.searchRows(rows,'target',r=>[r.name,r.source]),r=>r.name+' '+r.source),['Target 2 A','Target 2 C','Target 10 B']);
 assert.equal(search.searchRows([{name:'HD 600 Special'},{name:'HD600'}],'hd600',r=>[r.name])[0].name,'HD600');
});
check('200 candidates save; 201 are rejected before run creation without touching old runs',()=>{
 const candidates=n=>Array.from({length:n},(_,i)=>({id:'synthetic-'+i,name:'Synthetic '+i,family:'f'+i}));
 const run=personal.createPersonalRun('synthetic','Synthetic',candidates(200));assert.equal(personal.parsePersonalRuns(JSON.stringify([run])).length,1);
 assert.throws(()=>personal.createPersonalRun('synthetic','Synthetic',candidates(201)),/Choose 2–200/);
 assert.equal(run.candidates.length,200);
 const block=start.personalStartBlock({poolSize:201,maxPool:personal.MAX_PERSONAL_CANDIDATES,minPool:2,hasHeadphones:true,playbackReady:true,musicChosen:true,setupReady:true});assert.match(block.message,/Choose up to 200/);
});
const left=[[20,1],[1000,1],[20000,1]],right=[[20,3],[1000,3],[20000,3]];
check('Single response and paired ears are explicit and incompatible inputs are rejected',()=>{
 assert.equal(upload.measurementResponses('shared',left).points,left);
 assert.throws(()=>upload.measurementResponses('paired',undefined,left),/both files/);
 assert.throws(()=>upload.measurementResponses('shared',left,right),/only the single/);
 assert.throws(()=>upload.measurementResponses('paired',left,left,right),/only Left and Right/);
 const averaged=upload.measurementResponses('paired',undefined,left,right).points;assert.ok(averaged.length>=3);assert.ok(averaged.every(point=>Math.abs(point[1]-2)<1e-9));
});
check('Legacy single-ear/mixed records survive metadata edits; attachment edits require explicit intent',()=>{
 assert.equal(upload.measurementResponses('keep',undefined,left).points,left);
 const mixed=upload.measurementResponses('keep',left,left,right);assert.equal(mixed.singlePoints,left);assert.equal(mixed.leftPoints,left);
 assert.throws(()=>upload.measurementResponses('keep',left,left,right,true),/saved measurement is unchanged/);
});
const eq=load('lib/blind-eq.ts');
check('Sample-rate validation covers both presets/channels and the exact Nyquist boundary',()=>{
 const preset=hz=>({name:'Synthetic',channels:[{preampDb:0,filters:[]},{preampDb:0,filters:[{type:'PK',hz,gain:1,q:1}]}]});
 assert.throws(()=>eq.validateEqSampleRate([preset(1000),preset(23000)],44100),/Preset 2, Right filter 1/);
 assert.throws(()=>eq.validateEqSampleRate([preset(24000)],48000),/below/);
 assert.doesNotThrow(()=>eq.validateEqSampleRate([preset(23000)],48000));
 assert.throws(()=>eq.eqCoefficients(preset(23000).channels[1].filters[0],44100),e=>!e.message.includes('23000')&&/Return to setup/.test(e.message));
});
await check('Per-round cleanup disconnects nodes but never closes the shared validated context',async()=>{
 let closed=0,disconnected=0;const context={state:'suspended',destination:{},createGain:()=>({gain:{value:0},connect(){},disconnect(){disconnected++;}}),async close(){closed++;this.state='closed';}};
 const dsp=load('lib/blind-eq-audio.ts');const player=new dsp.BlindEqPlayer(context);await player.close();assert.equal(closed,0);assert.equal(disconnected,1);
});


await check('Availability reports owner-only closure even to the owner, without touching the database',async()=>{
 let reads=0;const env={OWNER_ONLY_MAINTENANCE:'true'};
 const api=load('app/api/maintenance/route.ts',{__imports:{'cloudflare:workers':{env},'@/lib/service-status':{async readServiceStatus(){reads++;return {active:false};}}}});
 const closed=await api.GET();const value=await closed.json();assert.equal(value.ownerOnly,true);assert.equal(value.viewerHasAccess,true);assert.equal(reads,0);assert.match(closed.headers.get('Cache-Control'),/no-store/);
 env.OWNER_ONLY_MAINTENANCE='false';const open=await api.GET();assert.equal((await open.json()).active,false);assert.equal(reads,1);
});

check('Shortcut Off applies in memory when browser storage cannot persist preferences',()=>{
 const preferences=load('lib/display-preferences.ts',{localStorage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},document:{documentElement:{dataset:{}}},window:{dispatchEvent(){}},Event:class {}});
 preferences.writeDisplayPreferences({shortcutScope:'off'});assert.equal(preferences.readDisplayPreferences().shortcutScope,'off');
});
console.log(`${checks} design correction groups passed.`);
