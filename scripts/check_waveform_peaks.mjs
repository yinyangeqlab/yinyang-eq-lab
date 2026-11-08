import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,Response,Request,ReadableStream,URL,ArrayBuffer,DataView,Float32Array,Number,Math});return exports;}
const {peakColumns,decodePeakLevel,waveformRecordingId}=load('lib/waveform-peaks.ts');
const count=10000,minL=new Float32Array(count),maxL=new Float32Array(count),minR=new Float32Array(count),maxR=new Float32Array(count);
maxL[4999]=.9876543;minR[5000]=-.9987654;
const wave={minL,maxL,minR,maxR};
for(const columns of [1,7,128,1000]){const pixels=peakColumns(wave,0,1,columns);assert.equal(Math.max(...Array.from(pixels).filter((_,i)=>i%4===1)),maxL[4999]);assert.equal(Math.min(...Array.from(pixels).filter((_,i)=>i%4===2)),minR[5000]);}
const zoom=peakColumns(wave,.49,.51,100);assert.ok(Math.max(...zoom)>.98&&Math.min(...zoom)<-.99,'Zoom preserves both brief channel peaks');
const bytes=new ArrayBuffer(32),view=new DataView(bytes);[0,.8,-.7,0,-.2,.3,-.4,.5].forEach((n,i)=>view.setFloat32(i*4,n,true));const decoded=decodePeakLevel(bytes);assert.equal(decoded.waveform.minR[0],Math.fround(-.7));assert.equal(decoded.waveform.maxL[1],Math.fround(.3));assert.throws(()=>decodePeakLevel(new ArrayBuffer(17)));view.setFloat32(0,NaN,true);assert.throws(()=>decodePeakLevel(bytes));
assert.equal(waveformRecordingId('/api/listening-audio/library-001'),'library-001');assert.equal(waveformRecordingId('/__local-listening-pool/library-001'),'library-001');assert.equal(waveformRecordingId('/music/shantae/example.flac'),'shantae-example');assert.equal(waveformRecordingId('https://untrusted.invalid/song.wav'),null);
const {serveWaveformPeaks}=load('lib/serve-waveform-peaks.ts');const hash='a'.repeat(64),fine=new Uint8Array(32),coarse=new Uint8Array(16);const header=new TextEncoder().encode(JSON.stringify({version:1,sourceSha256:hash,levels:[{offset:1024,count:1,bytes:16},{offset:1040,count:2,bytes:32}]}).padEnd(1024,' '));const asset=new Uint8Array(1072);asset.set(header);asset.set(coarse,1024);asset.set(fine,1040);let reads=[];
const assets={async fetch(request){const range=request.headers.get('Range'),m=/bytes=(\d+)-(\d+)/.exec(range);reads.push(range);return new Response(asset.slice(+m[1],+m[2]+1),{status:206,headers:{'Content-Range':`bytes ${m[1]}-${m[2]}/${asset.length}`}});}};
let response=await serveWaveformPeaks(new Request('https://fixture.invalid/api/listening-waveform/a?bins=2'),hash,assets);assert.equal(response.status,200);assert.equal((await response.arrayBuffer()).byteLength,32);assert.deepEqual(reads,['bytes=0-1023','bytes=1040-1071']);assert.equal(response.headers.get('Cache-Control'),'private, no-store');
reads=[];response=await serveWaveformPeaks(new Request('https://fixture.invalid/api/listening-waveform/a?bins=999999999'),hash,assets);assert.equal(response.status,400);assert.equal(reads.length,0,'Unbounded requests cannot fetch assets');
response=await serveWaveformPeaks(new Request('https://fixture.invalid/api/listening-waveform/a?bins=1',{method:'HEAD'}),hash,assets);assert.equal(response.body,null);assert.equal(response.headers.get('Content-Length'),'16');
response=await serveWaveformPeaks(new Request('https://fixture.invalid/api/listening-waveform/a'),hash,{fetch:async()=>new Response(new Uint8Array(10))});assert.equal(response.status,503,'Truncated asset metadata fails closed');
reads=[];response=await serveWaveformPeaks(new Request('https://fixture.invalid/api/listening-waveform/a?bins=2'),hash,{fetch:async()=>new Response(asset)});assert.equal(response.status,200);assert.equal((await response.arrayBuffer()).byteLength,32,'Range-ignoring bindings return the exact selected level');
console.log('PASS waveform peaks: per-pixel extrema and zoom preserve brief independent-channel peaks, lossless decoding, bounded range serving with streaming compatibility, HEAD and unavailable-detail handling. Synthetic data only.');
