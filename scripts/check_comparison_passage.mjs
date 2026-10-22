import assert from 'node:assert/strict';
import {intervalStats,selectedPassageIntervals,selectedPassageProgress} from '../lib/listening.ts';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const module={exports:{}};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/comparison-passage.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports});
const {chooseComparisonPassage,comparisonOrder}=module.exports;
for(const duration of [NaN,Infinity,0,3,4.99])assert.equal(chooseComparisonPassage(duration),null);
for(const duration of [5,5.05,6,8,20,120,7200])for(const random of [0,.3,.5,.9999,1]){const p=chooseComparisonPassage(duration,undefined,()=>random);assert.ok(p.start>=0);assert.ok(p.end<=duration);assert.ok(p.end-p.start>=4.999);assert.ok(p.end-p.start<=5.001);}
const original=chooseComparisonPassage(120,undefined,()=>.5);const replacement=chooseComparisonPassage(120,undefined,()=>.5,original);assert.notEqual(replacement.start,original.start,'New passage should change the selection');
assert.deepEqual([...comparisonOrder(()=>0)],[0,1]);assert.deepEqual([...comparisonOrder(()=>.9)],[1,0]);
const wave={minL:[],maxL:[],minR:[],maxR:[]};for(let i=0;i<1000;i++){const a=i>500?.5:0;wave.minL.push(-a);wave.maxL.push(a);wave.minR.push(-a);wave.maxR.push(a);}let active=0,quiet=0;for(let i=0;i<1000;i++){const p=chooseComparisonPassage(100,wave,()=>(i+.5)/1000);if(p.start>40)active++;else quiet++;}assert.ok(active>800,'Active sections should be favored');assert.ok(quiet>0,'Quiet sections must remain eligible rather than be permanently excluded');
console.log('PASS passage boundaries, short/nonfinite tracks, both random orders, and active-audio weighting without excluding quiet sections');
const source=readFileSync('components/music-panel.tsx','utf8'),ast=ts.createSourceFile('panel.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),handlers=new Map();
function visit(n){if(ts.isFunctionDeclaration(n)&&n.name)handlers.set(n.name.text,n.getText(ast));ts.forEachChild(n,visit);}visit(ast);
const names=['cancelPassage','playPassage','playPassageSide','completePassageSide','checkPassageEnd'];
const code=ts.transpileModule(names.map(n=>handlers.get(n)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function harness(){let selected=0,active=null;const intervals=[],starts=[];const audio={paused:true,seeking:false,currentTime:0,pause(){this.paused=true;},async play(){this.paused=false;active={side:selected,start:this.currentTime,rate:1};starts.push({...active});}};const state={beforePlayback:undefined,intervalStats,heardNow:()=>selectedPassageProgress(selectedPassageIntervals(intervals,{start:15,end:20})),intervalsRef:{current:intervals},heardRef:{current:[0,0]},onHeardRef:{current:()=>{}},file:{name:'qa.wav'},pair:['a','b'],measurement:{},comparisonComplete:false,passage:{start:15,end:20},passageRunRef:{current:null},audioRef:{current:audio},engine:{current:{context:{resume:async()=>{}}}},comparisonOrder:()=>[1,0],setPassageRun:v=>state.run=v,setPassageDone:v=>state.done=v,setPassageOverride:v=>state.override=v,setPosition:v=>state.position=v,setSourceError:v=>state.error=v,setupEngine(){},applyFit(){},closeInterval(endOverride){const end=endOverride??audio.currentTime;if(active&&end>active.start)intervals.push({...active,end});active=null;},selectSide:v=>selected=v};const context=vm.createContext(state);vm.runInContext(code,context);return {state,audio,intervals,starts,run:code=>vm.runInContext(code,context)};}
const h=harness();assert.equal(await h.run('playPassage()'),true);assert.equal(h.starts[0].side,1);assert.equal(h.audio.currentTime,15);assert.equal(h.state.run.step,0);
// A stalled stream cannot finish a side simply because time passed.
h.audio.currentTime=18;await h.run('checkPassageEnd()');assert.equal(h.state.passageRunRef.current.step,0);h.audio.seeking=true;h.audio.currentTime=20;await h.run('checkPassageEnd()');assert.equal(h.state.passageRunRef.current.step,0);h.audio.seeking=false;h.audio.paused=true;await h.run('checkPassageEnd()');assert.equal(h.state.passageRunRef.current.step,0);h.audio.paused=false;
await h.run('completePassageSide()');assert.equal(h.state.run.step,1);assert.equal(h.audio.currentTime,15);assert.equal(h.starts[1].side,0);h.audio.currentTime=20;await h.run('completePassageSide()');assert.equal(h.state.passageRunRef.current,null);assert.equal(h.state.run,null);assert.equal(h.state.done,true);assert.equal(h.audio.paused,true);assert.deepEqual(h.intervals,[{side:1,start:15,end:20,rate:1},{side:0,start:15,end:20,rate:1}]);
console.log('PASS same bounds on both targets, visible order, stop after two sides, no progress while stalled/paused/seeking');
const cancel=harness();await cancel.run('playPassage()');cancel.run('cancelPassage()');cancel.audio.currentTime=24;await cancel.run('completePassageSide()');assert.equal(cancel.starts.length,1);assert.equal(cancel.state.passageRunRef.current,null);
const interrupted=harness();let resume;interrupted.state.engine.current.context.resume=()=>new Promise(resolve=>resume=resolve);const starting=interrupted.run('playPassage()');interrupted.run('cancelPassage()');resume();await starting;assert.equal(interrupted.starts.length,0,'A cancelled pending play must not restart audio');
const failure=harness();failure.audio.play=async()=>{throw Error('Blocked');};assert.equal(await failure.run('playPassage()'),false);assert.equal(failure.state.passageRunRef.current,null);assert.equal(failure.audio.paused,true);assert.match(failure.state.error,/try again/);
for(const field of ['file','pair','measurement','passage']){const missing=harness();missing.state[field]=null;assert.equal(await missing.run('playPassage()'),false);assert.equal(missing.starts.length,0);}
console.log('PASS cancellation, track/pair prerequisites, interrupted pending play, and playback failure recovery');

assert.deepEqual([...h.state.heardRef.current],[5,5],'A full five-second range must report exact elapsed credit');
