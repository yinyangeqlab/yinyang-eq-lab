// Synthetic fixtures only: graph detail, actual playback coefficients and FIR response.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const mod = {exports:{}}; cache.set(file,mod.exports);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,Float32Array,Float64Array,setTimeout,require(id){const path=id.startsWith('@/')?id.slice(2):file.slice(0,file.lastIndexOf('/')+1)+id.replace(/^\.\//,'');return load(path+'.ts');}});
  return mod.exports;
}
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const {eqResponse,tuningResponsePlot,measurementResponsePoints}=load('lib/eq-response.ts');
const {at,channelBalance}=load('lib/channel-balance.ts');
const {response,autoEqReferenceOffset}=load('lib/autoeq.ts');
const {replaceEqStage}=load('lib/eq-playback.ts');
const raw=[[20,0],[1000,0],[7333,-1],[7334,-18],[7335,-1],[20000,-3]];
const target=[[20,0],[1000,0],[3100,1],[3101,7],[3102,1],[20000,0]];
const base=[{type:'PK',hz:17777,gain:9,q:20},{type:'LSC',hz:160,gain:3,q:Math.SQRT1_2},{type:'HSC',hz:7000,gain:-4,q:1.8}];
const added=[{type:'PK',hz:320,gain:2,q:.8}];
const rows=eqResponse(raw,target,base,added,44100);
check(raw.every(([hz,db])=>rows.some(row=>row.hz===hz&&Math.abs(row.raw-db)<1e-10)),'Every measured knot survives, including the 1 Hz-wide notch');
check(target.every(([hz])=>rows.some(row=>row.hz===hz)),'Every target knot survives');
check(rows.some(row=>row.hz===17777),'Exact high-Q filter center is sampled');
check(rows[0].hz===20&&rows.at(-1).hz===20000&&rows.every((row,i)=>!i||row.hz>rows[i-1].hz),'Display frequencies remain sorted, unique and bounded');
const right=[[20,0],[1000,0],[7333,0],[7334,-12],[7335,0],[12500,8],[20000,0]];
const detailed=measurementResponsePoints({points:[[20,0],[20000,0]],leftPoints:raw,rightPoints:right});
check(detailed.some(([hz,db])=>hz===7334&&db===-15),'Paired raw graph recovers original channel detail lost in the stored coarse average');
check(detailed.some(([hz])=>hz===12500),'Asymmetric left/right frequency grids retain both sets of knots');
const coarse=[[20,1],[1000,0],[20000,-2]];
const pairPlot=tuningResponsePlot(detailed,target,base,added,44100,'shootout',true,75,{referenceRaw:coarse});
const targetReference=at(target,1000), offset=autoEqReferenceOffset(coarse,target);
check(pairPlot.raw.every(([hz,db])=>Math.abs(db-(at(detailed,hz)+offset-targetReference+75))<1e-9),'Detailed measurements keep the exact reference used by the playback fitter');
check(Math.abs(at(pairPlot.target,1000)-75)<1e-9,'Target reference is exactly 75 dB without a second independent curve normalization');
const plot=tuningResponsePlot(raw,target,base,added,44100);
check(plot.after.every(([hz,db],i)=>Math.abs(db-plot.raw[i][1]-[...base,...added].reduce((sum,f)=>sum+response(hz,f,44100),0))<1e-10),'Every displayed prediction equals the real digital-filter sum plus raw response');
for(const rate of [44100,48000,96000]) {
  const nodes=[];
  const node=()=>({connect(){},disconnect(){}});
  const context={sampleRate:rate,createGain:()=>({...node(),gain:{value:0}}),createIIRFilter(b,a){nodes.push({b,a});return node();}};
  replaceEqStage(context,node(),node(),base);
  // Independent time-domain recurrence from the coefficients actually handed to
  // playback; compare its DFT with the graph rather than another response formula.
  const impulses=nodes.map(({b,a})=>{
    const impulse=new Float64Array(32768);
    for(let i=0;i<impulse.length;i++) impulse[i]=((b[i]??0)-(a[1]*(impulse[i-1]??0))-(a[2]*(impulse[i-2]??0)))/a[0];
    return impulse;
  });
  const frequencies=[20,160,1000,17777,19321];
  const sampleRaw=frequencies.map(hz=>[hz,0]);
  const actual=eqResponse(sampleRaw,undefined,base,[],rate);
  for(const hz of frequencies) {
    const db=impulses.reduce((sum,impulse)=>sum+directMagnitude(impulse,hz,rate),0);
    const predicted=actual.find(row=>row.hz===hz).after;
    assert.ok(Math.abs(predicted-db)<1e-6,`IIR at ${rate}/${hz}: ${predicted} vs ${db}`);
  }
  checks++;
  const prediction=actual.map(row=>[row.hz,row.after]);
  let maxError=0;
  for(let i=0;i<=10000;i++) {
    const hz=20*1000**(i/10000), exact=base.reduce((sum,f)=>sum+response(hz,f,rate),0);
    maxError=Math.max(maxError,Math.abs(at(prediction,hz)-exact));
  }
  check(maxError<.025,`Dense display interpolation preserves high-Q digital filter details at ${rate} Hz (max ${maxError.toFixed(5)} dB)`);
}
function directMagnitude(impulse,hz,rate) {
  let real=0,imag=0;
  for(let i=0;i<impulse.length;i++) {const phase=2*Math.PI*hz*i/rate;real+=impulse[i]*Math.cos(phase);imag-=impulse[i]*Math.sin(phase);}
  return 20*Math.log10(Math.max(1e-12,Math.hypot(real,imag)));
}
const custom={leftPoints:raw,rightPoints:right,channelMatchMode:'custom',channelMatchPreset:{channels:[{preampDb:-1,filters:[{type:'PK',hz:89,gain:8,q:3}]},{preampDb:2,filters:[{type:'PK',hz:7334,gain:-7,q:12}]}]}};
const automatic={leftPoints:raw,rightPoints:right,leftLevelDb:81,rightLevelDb:79,channelMatchMode:'auto'};
const matchFrequencies=[20,20.3,31.125,89,110.8,480,1000,3101,7334,13579,19999,20000];
for(const match of [automatic,custom]) for(const rate of [44100,48000,96000]) {
  const impulses=channelBalance(match,rate).impulses;
  const curve=eqResponse(matchFrequencies.map(hz=>[hz,0]),undefined,base,added,rate,'shootout',false,{channelMatch:match});
  let maxError=0;
  for(const hz of matchFrequencies) {
    const expected=impulses.reduce((sum,impulse)=>sum+directMagnitude(impulse,hz,rate)/2,0);
    maxError=Math.max(maxError,Math.abs(curve.find(row=>row.hz===hz).after-expected));
  }
  check(maxError<.01,`Actual channel-match FIR average is accurate with EQ bypassed (${match.channelMatchMode}, ${rate}, max ${maxError.toFixed(5)} dB)`);
}
const bypass=eqResponse(raw,target,base,added,48000,'shootout',false);
check(bypass.every(row=>row.after===row.raw),'Turning both EQ and channel correction off returns exactly to raw');
check(eqResponse([],target,base,added)===null&&!tuningResponsePlot(undefined,target,base,added).after,'No headphone prediction is invented without a measurement');
console.log(`PASS ${checks} EQ response fidelity checks`);
