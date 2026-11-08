import assert from 'node:assert/strict';
import {scanMp3Source,sourceBitrateAt} from '../lib/source-encoding.ts';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const panel=readFileSync('components/music-panel.tsx','utf8');
const source=panel.slice(panel.indexOf('type SourceRate'),panel.indexOf('\nconst MusicPanel'));
const {sourceDetails:parse,sourceBitrateLabel:label}=vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';({sourceDetails,sourceBitrateLabel})',{Uint8Array,DataView,sourceBitrateAt});
function fixture(tag='Xing',method=3){const b=new Uint8Array(417),v=new DataView(b.buffer);b.set([255,251,144,0]);b.set(new TextEncoder().encode(tag),36);v.setUint32(40,3);v.setUint32(44,1000);v.setUint32(48,500000);b.set(new TextEncoder().encode('LAME3.100'),52);b[61]=method;return b;}
for(const [tag,method,mode] of [['Xing',3,'VBR'],['Xing',2,'ABR'],['Info',1,'CBR']]){const d=parse(fixture(tag,method).buffer,'MP3');assert.equal(d.mode,mode);assert.equal(d.basis,'average');assert.equal(d.bitrate,153125);assert.match(label(d,null,null,0,true),new RegExp('153 kb/s average.*'+mode));}
const one=new Uint8Array(64);one.set([255,251,144,0]);const unknown=parse(one.buffer,'MP3');assert.equal(unknown.mode,undefined);assert.equal(label(unknown,null,null,0,false),'MP3 audio','A single frame is not mislabeled as the whole recording bitrate');
assert.match(label(unknown,null,{size:2000000},100,false),/160 kb\/s average/);
assert.match(label({},320000,null,90,true),/320 kb\/s · Library audio/);
assert.equal(label({},null,null,0,false),'Audio details');
const vbri=fixture('none');vbri.set(new TextEncoder().encode('VBRI'),36);const vv=new DataView(vbri.buffer);vv.setUint32(46,500000);vv.setUint32(50,1000);assert.equal(parse(vbri.buffer,'MP3').mode,'VBR');assert.equal(parse(vbri.buffer,'MP3').bitrate,153125);
const wav=new Uint8Array(44),wv=new DataView(wav.buffer);wav.set(new TextEncoder().encode('RIFF'));wav.set(new TextEncoder().encode('WAVE'),8);wav.set(new TextEncoder().encode('fmt '),12);wv.setUint32(16,16,true);wv.setUint16(20,1,true);wv.setUint32(24,44100,true);wv.setUint32(28,176400,true);assert.equal(label(parse(wav.buffer,'WAV'),null,{size:100},1,false),'1411 kb/s · Uncompressed audio');
for(let n=0;n<417;n++){const b=fixture().slice(0,n);assert.doesNotThrow(()=>parse(b.buffer,'MP3'));}
const id3=new Uint8Array(427);id3.set([73,68,51,4,0,0,0,0,0,0]);id3.set(fixture(),10);assert.equal(parse(id3.buffer,'MP3').mode,'VBR');
assert.equal((panel.match(/sourceBitrateLabel\(bitrateDetails/g)||[]).length,3,'Shared deck, Personal details and shared details use the same bitrate description helper');
console.log('Bitrate descriptions: Xing/Info/LAME CBR/VBR/ABR, VBRI averages, unknown mode, file/container average, WAV byte rate, ID3, all truncated prefixes, both player displays passed.');

function frame(index){const rate=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320][index],bytes=new Uint8Array(Math.floor(144*rate*1000/44100));bytes.set([255,251,index<<4,0]);return bytes;}
function recording(codes){const frames=codes.map(frame),bytes=new Uint8Array(frames.reduce((n,b)=>n+b.length,0));let position=0;for(const f of frames){bytes.set(f,position);position+=f.length;}return bytes;}
async function scan(bytes,cancelled){return scanMp3Source({size:bytes.length,read:async(offset,length)=>bytes.slice(offset,offset+length)},cancelled);}
const fixed=await scan(recording([9,9,9]));assert.equal(fixed.mode,'CBR');assert.equal(fixed.verified,true);assert.equal(fixed.frameCount,3);assert.equal(sourceBitrateAt(fixed,0),null);
const variable=await scan(recording([9,14,11]));assert.equal(variable.mode,'VBR');assert.equal(sourceBitrateAt(variable,0),128000);assert.equal(sourceBitrateAt(variable,1152/44100*1.1),320000);assert.equal(sourceBitrateAt(variable,999),192000);assert.equal(sourceBitrateAt(variable,NaN),null);assert.match(label(variable,null,null,1,true,1152/44100*1.1),/320 kb\/s now.*VBR/);
assert.equal(await scan(recording([9,14,11]).slice(0,-3)),null);assert.equal(await scan(recording([9,14,11]),()=>true),null);
const catalog=JSON.parse(readFileSync('data/listening-source-details.json','utf8')).recordings,manifest=JSON.parse(readFileSync('data/listening-pool-audio-manifest.json','utf8'));assert.equal(Object.keys(catalog).length,224);let full=0;for(const [id,source]of Object.entries(catalog)){assert.equal(source.sourceSha256,manifest[id].sha256);assert.ok(source.sampleRate>0);if(source.format==='MP3'){assert.equal(source.verified,true);assert.ok(source.frameCount>1);assert.ok(['CBR','VBR','ABR'].includes(source.mode));full++;}}assert.equal(full,160);
console.log('PASS complete CBR/VBR frame scans, live frame bitrate, cancellation, truncation and all224 hash-bound library entries (160 complete MP3 scans).');
