import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {renderToStaticMarkup} from 'react-dom/server';
import {intervalStats, selectedPassageIntervals, selectedPassageProgress} from '../lib/listening.ts';

// Execute the player's real timing handlers with controlled media time. No wall
// clock or checkbox state is needed to measure selected source coverage.
const source=readFileSync('components/music-panel.tsx','utf8');
const ast=ts.createSourceFile('panel.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),handlers=new Map();
function visit(node){if(ts.isFunctionDeclaration(node)&&node.name)handlers.set(node.name.text,node.getText(ast));ts.forEachChild(node,visit);}visit(ast);
const names=['closeInterval','startInterval','snapshotIntervals','heardNow','resetHeard'];
const code=ts.transpileModule(names.map(name=>handlers.get(name)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function harness(required){
  const state={required,intervalStats,selectedPassageIntervals,selectedPassageProgress,
    audioRef:{current:{paused:false,seeking:false,currentTime:0,playbackRate:1}},
    intervalsRef:{current:[]},activeRef:{current:null},sideRef:{current:0},heardRef:{current:[0,0]},
    lastPlaybackPosition:{current:0},passageRunRef:{current:null},passageRef:{current:{start:10,end:15}},
    onHeardRef:{current:value=>state.display=[...value]},cancelPassage(){},setPassageDone(){}};
  const context=vm.createContext(state);
  vm.runInContext(code,context);
  return {state,audio:state.audioRef.current,run:expression=>{const value=vm.runInContext(expression,context);return value===undefined?undefined:JSON.parse(JSON.stringify(value));}};
}
for(const required of [false,true]){
  const h=harness(required);
  h.run('startInterval()');
  h.audio.currentTime=9;
  assert.deepEqual(h.run('heardNow()'),[0,0],'Audio before selection gets no credit');
  h.audio.currentTime=12;
  assert.deepEqual(h.run('heardNow()'),[2,0],'Only intersection with the green selection counts');
  h.audio.currentTime=30;
  assert.deepEqual(h.run('heardNow()'),[5,0],'Playback beyond selection cannot exceed five seconds');
  h.run('closeInterval()');
  assert.deepEqual(h.run('snapshotIntervals()'),[{side:0,start:10,end:15,rate:1}]);
  assert.deepEqual(h.state.display,[5,0]);
  // The active media position is unchanged while buffering: polling adds nothing.
  h.state.sideRef.current=1;h.audio.currentTime=10;h.run('startInterval()');h.audio.currentTime=11;
  for(let i=0;i<100;i++)assert.deepEqual(h.run('heardNow()'),[5,1]);
  h.run('closeInterval()');
  // Replaying the same one-second fragment does not manufacture five-second coverage.
  for(let i=0;i<8;i++){h.audio.currentTime=10;h.run('startInterval()');h.audio.currentTime=11;h.run('closeInterval()');}
  assert.deepEqual(h.run('heardNow()'),[5,1]);
  // A seek must not earn the skipped audio, including a poll before onSeeking closes it.
  h.audio.currentTime=11;h.run('startInterval()');h.audio.seeking=true;h.audio.currentTime=40;
  assert.deepEqual(h.run('heardNow()'),[5,1]);
  h.run('closeInterval(lastPlaybackPosition.current)');h.audio.seeking=false;h.run('startInterval()');h.audio.currentTime=45;
  assert.deepEqual(h.run('heardNow()'),[5,1]);h.run('closeInterval()');
  // Finish the unheard part, then keep playing past it on B.
  h.audio.currentTime=11;h.run('startInterval()');h.audio.currentTime=25;h.run('closeInterval()');
  assert.deepEqual(h.run('heardNow()'),[5,5]);
  assert.equal(h.run('intervalStats(snapshotIntervals()).overlapSeconds'),5);
  // Moving the green region recalculates coverage; the old region never qualifies it.
  h.state.passageRef.current={start:50,end:55};
  assert.deepEqual(h.run('heardNow()'),[0,0]);
  assert.equal(h.run('intervalStats(snapshotIntervals()).overlapSeconds'),0);
  h.state.passageRef.current={start:13,end:18};
  assert.deepEqual(h.run('heardNow()'),[5,5],'Already heard portions of the new selection remain valid');
  h.state.passageRef.current=null;
  assert.deepEqual(h.run('heardNow()'),[0,0]);
  h.run('resetHeard()');assert.deepEqual(h.run('intervalsRef.current'),[]);assert.deepEqual(h.state.display,[0,0]);
}
// Longer Personal selections still have a five-second meter, but matched source
// overlap is evaluated within that selection, never elsewhere in the song.
const long=[{side:0,start:10,end:15,rate:1},{side:1,start:15,end:20,rate:1}];
assert.deepEqual(selectedPassageProgress(selectedPassageIntervals(long,{start:10,end:20})),[5,5]);
assert.equal(intervalStats(selectedPassageIntervals(long,{start:10,end:20})).overlapSeconds,0);
assert.deepEqual(selectedPassageIntervals(long,{start:NaN,end:20}),[]);
console.log('PASS real player handlers: selected-only timing, five-second cap, both requirement states, stalls, repeats, seeks, selection changes, resets, and matched overlap');

const require=createRequire(import.meta.url),fixtureModule={exports:{}};
const meterSource=ts.transpileModule(readFileSync('components/matched-passage-control.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
vm.runInNewContext(meterSource,{module:fixtureModule,exports:fixtureModule.exports,require:name=>name.endsWith('.css')?{}:require(name)});
for(const required of [false,true])for(const [seconds,shown] of [[-1,'0.0'],[0,'0.0'],[2.35,'2.3'],[4.999,'4.9'],[5,'5.0'],[12,'5.0'],[NaN,'0.0']]){
 const markup=renderToStaticMarkup(fixtureModule.exports.MatchedPassageMeter({side:'A',seconds,required,qualified:false}));
 assert.ok(markup.includes(`${shown} / 5 sec`),markup);
 assert.match(markup,/A listening time in selected passage/);
}
console.log('PASS rendered counters in both states: bounded values and no premature rounding to 5.0 seconds');
