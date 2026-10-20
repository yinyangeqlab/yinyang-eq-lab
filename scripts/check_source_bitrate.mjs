import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const panel=readFileSync('components/music-panel.tsx','utf8');
const source=panel.slice(panel.indexOf('type SourceRate'),panel.indexOf('\nconst MusicPanel'));
const {sourceDetails:parse,sourceBitrateLabel:label}=vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';({sourceDetails,sourceBitrateLabel})',{Uint8Array,DataView});
function fixture(tag='Xing',method=3){const b=new Uint8Array(417),v=new DataView(b.buffer);b.set([255,251,144,0]);b.set(new TextEncoder().encode(tag),36);v.setUint32(40,3);v.setUint32(44,1000);v.setUint32(48,500000);b.set(new TextEncoder().encode('LAME3.100'),52);b[61]=method;return b;}
for(const [tag,method,mode] of [['Xing',3,'VBR'],['Xing',2,'ABR'],['Info',1,'CBR']]){const d=parse(fixture(tag,method).buffer,'MP3');assert.equal(d.mode,mode);assert.equal(d.basis,'average');assert.equal(d.bitrate,153125);assert.match(label(d,null,null,0,true),new RegExp('153 kb/s average.*'+mode));}
const one=new Uint8Array(64);one.set([255,251,144,0]);const unknown=parse(one.buffer,'MP3');assert.equal(unknown.mode,undefined);assert.match(label(unknown,null,null,0,false),/128 kb\/s first frame · CBR\/VBR mode unknown/);
assert.match(label(unknown,null,{size:2000000},100,false),/160 kb\/s average \(file size\/duration, includes tags\)/);
assert.match(label({},320000,null,90,true),/320 kb\/s catalog-reported · CBR\/VBR mode unknown/);
assert.equal(label({},null,null,0,false),'source bitrate not read');
const vbri=fixture('none');vbri.set(new TextEncoder().encode('VBRI'),36);const vv=new DataView(vbri.buffer);vv.setUint32(46,500000);vv.setUint32(50,1000);assert.equal(parse(vbri.buffer,'MP3').mode,'VBR');assert.equal(parse(vbri.buffer,'MP3').bitrate,153125);
const wav=new Uint8Array(44),wv=new DataView(wav.buffer);wav.set(new TextEncoder().encode('RIFF'));wav.set(new TextEncoder().encode('WAVE'),8);wav.set(new TextEncoder().encode('fmt '),12);wv.setUint32(16,16,true);wv.setUint32(24,44100,true);wv.setUint32(28,176400,true);assert.equal(label(parse(wav.buffer,'WAV'),null,{size:100},1,false),'1411 kb/s · WAV header byte rate');
for(let n=0;n<417;n++){const b=fixture().slice(0,n);assert.doesNotThrow(()=>parse(b.buffer,'MP3'));}
const id3=new Uint8Array(427);id3.set([73,68,51,4,0,0,0,0,0,0]);id3.set(fixture(),10);assert.equal(parse(id3.buffer,'MP3').mode,'VBR');
assert.equal((panel.match(/sourceBitrateLabel\(bitrateDetails/g)||[]).length,2,'Shared and Personal render identical bitrate descriptions');
console.log('Bitrate descriptions: Xing/Info/LAME CBR/VBR/ABR, VBRI averages, unknown mode, file/container average, WAV byte rate, ID3, all truncated prefixes, both player displays passed.');
