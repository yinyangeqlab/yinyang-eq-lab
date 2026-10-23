import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const tracks=JSON.parse(readFileSync('data/permission-music.json','utf8'));
const manifest=JSON.parse(readFileSync('data/listening-pool-audio-manifest.json','utf8'));
const waveforms=JSON.parse(readFileSync('data/music-waveforms.json','utf8'));
assert.equal(tracks.length,24);
assert.ok(tracks.every(t=>t.filename.endsWith('.m4a')));
const sourceArg=process.argv.indexOf('--source-dir');
const sourceFiles=new Map();
function visit(folder){for(const entry of readdirSync(folder,{withFileTypes:true})){const path=join(folder,entry.name);if(entry.isDirectory())visit(path);else if(entry.isFile()&&entry.name.endsWith('.m4a')){assert.ok(!sourceFiles.has(entry.name));sourceFiles.set(entry.name,path);}}}
if(sourceArg>=0){assert.ok(process.argv[sourceArg+1]);visit(process.argv[sourceArg+1]);assert.equal(sourceFiles.size,24);}
assert.equal(new Set(tracks.map(t=>t.url)).size,tracks.length);
for(const track of tracks){
 assert.equal(track.artist,'Jason J. Chevallier');
 assert.equal(track.permissionOnly,true);
 assert.equal(track.license,'All rights reserved — used with permission');
 assert.ok(track.url.startsWith('https://jasonjchevallier.bandcamp.com/track/'));
 assert.ok(Number.isFinite(track.integrated_lufs)&&Number.isFinite(track.true_peak_dbtp)&&track.duration>0);
 const key=track.fileUrl.replace('/api/listening-audio/','');
 const asset=manifest[key];assert.ok(asset);assert.equal(asset.sha256,track.sha256);assert.equal(asset.mime,'audio/mp4');
 if(sourceArg>=0){assert.ok(sourceFiles.has(track.filename));assert.equal(createHash('sha256').update(readFileSync(sourceFiles.get(track.filename))).digest('hex'),asset.sha256);}
 assert.equal(Buffer.from(waveforms[track.fileUrl],'base64').length,512*4);
 if(process.argv.includes('--assets')){
  const hash=createHash('sha256');let bytes=0;
  for(const part of asset.parts){assert.ok(part.path.startsWith('/music/listening-pool-chunks/'+key+'/'));const data=readFileSync('public'+part.path);assert.equal(data.length,part.bytes);bytes+=data.length;hash.update(data);}
  assert.equal(bytes,asset.bytes);assert.equal(hash.digest('hex'),asset.sha256);
 }
}
assert.equal(tracks.reduce((sum,t)=>sum+manifest[t.fileUrl.split('/').pop()].bytes,0),98252313);
const page=readFileSync('app/music-library/page.tsx','utf8');
assert.ok(page.includes('track.permissionOnly ? <span>Used with permission'));
assert.ok(page.includes('This permission does not grant visitors a license to reuse or redistribute the music'));
assert.ok(!page.includes('OPENLY LICENSED MUSIC'));
console.log('PASS: 24 permission-only recordings, unique source links, measured loudness, complete waveforms'+(process.argv.includes('--assets')?', exact protected audio hashes.':'.'));
