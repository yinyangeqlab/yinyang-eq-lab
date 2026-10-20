import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const exports={};vm.runInNewContext(ts.transpileModule(readFileSync('lib/comparison-passage.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports});
const {shuffleComparisonPassage:shuffle,rememberComparisonPassage:remember}=exports;
const overlap=(p,rows)=>rows.reduce((n,r)=>n+Math.max(0,Math.min(p.end,r.end)-Math.max(p.start,r.start)),0);
const amount=rows=>rows.reduce((n,r)=>n+r.end-r.start,0);
let state=821771;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/2**32);
let cases=0;
for(const duration of [5,5.05,5.1,6,9,10,11.4,20,61,180,603])for(const length of [5,8,12,30])for(const rng of [()=>0,()=>.5,()=>1,random]){
 let history=[],previous;const limit=duration>=5.1?duration-.1:duration,expected=Math.min(limit,length);
 let restarted=false;
 for(let step=0;step<Math.ceil(duration/5)*4+20;step++){
  const next=shuffle(duration,undefined,history,length,rng,previous);assert.ok(next);assert.ok(next.passage.start>=-1e-7);assert.ok(next.passage.end<=limit+1e-7);assert.ok(Math.abs(next.passage.end-next.passage.start-expected)<1e-6,'Preserve requested duration rather than clamping long passages at the right edge');
  if(next.restarted){assert.ok(amount(history)>=limit-1e-6,'Never restart a cycle while uncovered audio remains');restarted=true;break;}
  const novel=expected-overlap(next.passage,history);assert.ok(novel>1e-7,'Every non-restart must explore new audio');
  if(!next.partialOverlap)assert.ok(overlap(next.passage,history)<1e-6,'No overlap when a full new passage fits');
  else {let cursor=0;for(const r of history){assert.ok(r.start-cursor<expected+1e-6);cursor=r.end;}assert.ok(limit-cursor<expected+1e-6,'Overlap only after exhausting full unselected windows');}
  assert.ok(amount(next.history)>amount(history)+1e-7);history=next.history;previous=next.passage;
 }
 assert.ok(restarted,'Coverage must finish in bounded shuffles even with a constant RNG');cases++;
}
for(const value of [0,4.99,NaN,Infinity])assert.equal(shuffle(value,undefined),null);
assert.equal(shuffle(30,undefined,[],NaN),null);
const full=[{start:0,end:29.9}],fresh=shuffle(30,undefined,full,5,()=>0,{start:0,end:5});assert.equal(fresh.restarted,true);assert.ok(fresh.passage.start>=1);
const malformed=[{start:NaN,end:9},{start:-10,end:2},{start:8,end:20},{start:10,end:30}];assert.equal(amount(remember(malformed,{start:2,end:8},30)),30);
const wave={minL:[],maxL:[],minR:[],maxR:[]};for(let i=0;i<1000;i++){const a=i<500?0:1;wave.minL.push(-a);wave.maxL.push(a);wave.minR.push(-a);wave.maxR.push(a);}
let favored=0,quiet=0;for(let i=0;i<2000;i++){const p=shuffle(100,wave,[],5,()=>(i+.5)/2000).passage;if(p.start>=45)favored++;else quiet++;}assert.ok(favored>1700);assert.ok(quiet>0);
// Once the active half is covered, quiet regions must still be explored before a repeat.
assert.ok(shuffle(100,wave,[{start:45,end:99.9}],5,()=>.9).passage.end<=45+1e-6);
// Exercise the shipped button handler with real per-track history and duration.
const source=readFileSync('components/music-panel.tsx','utf8'),ast=ts.createSourceFile('panel.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let handler;
function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='shufflePassage')handler=n.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert.ok(handler);
const book=new Map(),fixture={passage:{start:20,end:32},passageTrackKey:'song-one',passageBook:book,duration:100,curatedPreview:null,analysis:null,personalOnly:true,rememberComparisonPassage:remember,shuffleComparisonPassage:shuffle,setPassageDone(){},setPassageOverride:p=>fixture.passage=p,setShuffleStatus:s=>fixture.status=s,setWaveformFocus:seconds=>fixture.focus=seconds};
const ctx=vm.createContext(fixture);vm.runInContext(ts.transpileModule(handler,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);vm.runInContext('shufflePassage()',ctx);assert.equal(fixture.passage.end-fixture.passage.start,12);assert.equal(overlap(fixture.passage,[{start:20,end:32}]),0);assert.equal(fixture.focus,(fixture.passage.start+fixture.passage.end)/2);assert.ok(book.has('song-one'));assert.equal(book.has('song-two'),false);
const firstHistory=book.get('song-one');fixture.passageTrackKey='song-two';vm.runInContext('shufflePassage()',ctx);assert.equal(book.get('song-one'),firstHistory,'Another song must not erase or change this song’s history');
console.log(`PASS ${cases} full-coverage cycles, active/quiet weighting, minimal-overlap tails, extended segments, bad input and actual per-song button integration.`);
