import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync('lib/welcome-landscape.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture({available=true,compile=true,buffer=true}={}){
 const jobs=new Map(),calls=[],ready=[],uniforms={};let id=0;
 const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,ARRAY_BUFFER:5,STATIC_DRAW:6,FLOAT:7,TEXTURE_2D:8,TEXTURE_WRAP_S:9,TEXTURE_WRAP_T:10,CLAMP_TO_EDGE:11,TEXTURE_MIN_FILTER:12,TEXTURE_MAG_FILTER:13,LINEAR:14,RGB:15,UNSIGNED_BYTE:16,TRIANGLES:17,
  createShader:()=>({}),shaderSource(){},compileShader(){},getShaderParameter:()=>compile,createProgram:()=>({}),attachShader(){},linkProgram(){},getProgramParameter:()=>true,useProgram(){},createBuffer:()=>buffer?{}:null,bindBuffer(){},bufferData(){},getAttribLocation:()=>0,enableVertexAttribArray(){},vertexAttribPointer(){},createTexture:()=>({}),bindTexture(){},texParameteri(){},getUniformLocation:(_,n)=>n,uniform2f:(n,...v)=>uniforms[n]=v,uniform1f:(n,v)=>uniforms[n]=v,viewport(){},texImage2D:()=>calls.push('texture'),drawArrays:()=>calls.push('draw'),isContextLost:()=>false,deleteBuffer:()=>calls.push('free-buffer'),deleteTexture:()=>calls.push('free-texture'),deleteProgram:()=>calls.push('free-program'),deleteShader:()=>calls.push('free-shader')};
 const canvas={width:0,height:0,getContext:()=>available?gl:null,getBoundingClientRect:()=>({width:2000,height:1200})},image={complete:true,naturalWidth:1400,naturalHeight:758};
 const fixtureModule={exports:{}},document={hidden:false};
 vm.runInNewContext(source,{module:fixtureModule,exports:fixtureModule.exports,Float32Array,window:{devicePixelRatio:3,matchMedia:()=>({matches:false})},document,requestAnimationFrame:fn=>{jobs.set(++id,fn);return id},cancelAnimationFrame:i=>jobs.delete(i)});
 const engine=fixtureModule.exports.createLandscapeRenderer(canvas,image,value=>ready.push(value));
 const step=now=>{const pending=[...jobs.values()];jobs.clear();for(const fn of pending)fn(now)};
 return {engine,canvas,image,document,jobs,calls,ready,uniforms,step};
}
assert.equal(fixture({available:false}).engine,null,'unavailable WebGL retains original picture');
let f=fixture({compile:false});assert.equal(f.engine,null);assert.ok(f.calls.includes('free-program'));assert.ok(f.calls.includes('free-shader'));
f=fixture({buffer:false});assert.equal(f.engine,null,'allocation failure falls back');
f=fixture();f.engine.setRunning(true);assert.equal(f.jobs.size,0,'no animation before image is loaded');f.image.complete=false;f.engine.load();assert.equal(f.ready.length,0);f.image.complete=true;f.engine.load();assert.equal(f.ready.at(-1),true);assert.equal(f.jobs.size,1);assert.ok(f.canvas.width<=1280&&f.canvas.height<=800,'bounded decorative drawing buffer');
f.step(100);const initial=f.calls.filter(x=>x==='draw').length;f.step(120);assert.equal(f.calls.filter(x=>x==='draw').length,initial,'render is capped rather than drawing each display frame');f.step(160);assert.ok(f.uniforms.time>0);const time=f.uniforms.time;
f.engine.setRunning(false);assert.equal(f.jobs.size,0,'Pause cancels pending work');f.step(10000);assert.equal(f.uniforms.time,time,'paused image remains still');
f.engine.setRunning(true);f.step(20000);f.step(20050);assert.ok(f.uniforms.time-time<.2,'resume does not jump by elapsed wall time');
f.document.hidden=true;f.step(21000);assert.equal(f.jobs.size,0,'hidden document stops scheduling');f.document.hidden=false;f.engine.setRunning(true);assert.equal(f.jobs.size,1);
f.image.naturalWidth=1254;f.image.naturalHeight=1254;f.engine.load();assert.equal(f.uniforms.portrait,1,'responsive square artwork uses the matching moon/water coordinates');
f.engine.dispose();assert.equal(f.jobs.size,0);assert.equal(f.ready.at(-1),false);assert.ok(f.calls.includes('free-texture')&&f.calls.includes('free-buffer')&&f.calls.includes('free-program'));const count=f.calls.length;f.engine.load();f.engine.setRunning(true);f.engine.resize();f.step(22000);assert.equal(f.calls.length,count,'disposed renderer cannot restart');
console.log('PASS decorative renderer fallback, resource cleanup, image readiness, bounded resolution, frame cap, pause/resume, hidden-tab stop, responsive texture and disposal.');
