import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual animation effect against a clock that advances between
// media timeupdate events. No audio, participant data or browser is required.
const path='components/track-waveform.tsx';
const source=readFileSync(path,'utf8');
const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let effect;
function visit(node){
  if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'){
    const callback=node.arguments[0];
    if(callback?.getText(ast).includes('const line=playheadRef.current'))effect=callback.getText(ast);
  }
  ts.forEachChild(node,visit);
}
visit(ast);assert.ok(effect,'Clock-driven playhead effect is present');
const compiled=ts.transpileModule('const animationEffect='+effect+';globalThis.run=animationEffect;',{
  compilerOptions:{target:ts.ScriptTarget.ES2022},
}).outputText;
function fixture({playing=true,start=0,span=200,duration=200}={}){
  let token=0;
  const frames=new Map(),line={style:{}},layer={style:{}};
  const state={playing,start,span,duration,clock:0,playheadRef:{current:line},playedLayerRef:{current:layer},
    canvasRef:{current:{clientWidth:1024,getContext(){throw Error('Frames must not reprocess waveform peaks');}}},
    playbackPositionRef:{current:0},paintPlayheadRef:{current:null},Math,Number,
    requestAnimationFrame:callback=>{frames.set(++token,callback);return token;},
    cancelAnimationFrame:id=>frames.delete(id)};
  state.playbackClockRef={current:()=>state.clock};
  const context=vm.createContext(state);vm.runInContext(compiled,context);
  const cleanup=context.run();
  return {state,line,layer,frames,cleanup,frame(seconds){state.clock=seconds;const [id,callback]=frames.entries().next().value;frames.delete(id);callback();}};
}
for(const zoom of [1,2,8,64,256]){
  const f=fixture({start:zoom===1?0:10,span:200/zoom});
  const positions=[];
  for(const seconds of [10.001,10.009,10.017,10.025]){
    f.frame(seconds);positions.push(f.line.style.transform);
    assert.equal(f.frames.size,1,'One frame remains scheduled');
    assert.equal(f.line.style.visibility,'visible');
  }
  assert.equal(new Set(positions).size,positions.length,`Every frame advances at ${zoom}x despite stale React position`);
  assert.equal(f.state.playbackPositionRef.current,0,'Animation does not need React state updates');
  const held=f.line.style.transform;f.frame(10.025);assert.equal(f.line.style.transform,held,'A stalled clock does not invent playback');
  f.frame(10.002);assert.notEqual(f.line.style.transform,held,'A seek uses the clock immediately');
  f.cleanup();assert.equal(f.frames.size,0,'Unmount or pause cancels the pending frame');
}
const paused=fixture({playing:false});assert.equal(paused.frames.size,0);
paused.state.clock=25;paused.state.paintPlayheadRef.current();
assert.match(paused.line.style.transform,/128px/,'Paused seeking paints immediately');
paused.state.clock=300;paused.state.paintPlayheadRef.current();assert.equal(paused.line.style.visibility,'hidden');
assert.equal(paused.layer.style.clipPath,'inset(0 0% 0 0)');paused.cleanup();
const empty=fixture({playing:false,span:0,duration:0});assert.equal(empty.line.style.visibility,'hidden');
assert.equal(empty.layer.style.clipPath,'inset(0 100% 0 0)');empty.cleanup();
console.log('PASS actual playhead effect: clock-driven sub-update frames at 1–256x, cached geometry, immediate seeks, stalls, pause, bounds and cleanup. Synthetic clocks only.');
