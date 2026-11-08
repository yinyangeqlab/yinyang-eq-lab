// Reproducible technical metadata from the already-authorized original recordings.
import fs from 'node:fs';import fsp from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
import {scanMp3Source} from '../lib/source-encoding.ts';
const index=process.argv.indexOf('--public');if(index<0)throw Error('Pass --public with the authorized original asset directory');
const publicRoot=path.resolve(process.argv[index+1]),manifest=JSON.parse(fs.readFileSync('data/listening-pool-audio-manifest.json','utf8')),directory=await fsp.mkdtemp(path.join(os.tmpdir(),'source-details-'));
const recordings={};let mp3=0,verified=0;const incomplete=[];
try{
 for(const [id,asset] of Object.entries(manifest)){
  const file=path.join(directory,'recording.bin'),output=await fsp.open(file,'w'),hash=crypto.createHash('sha256');let bytes=0;
  try{for(const part of asset.parts){const input=path.resolve(publicRoot,'.'+part.path);if(!input.startsWith(publicRoot+path.sep))throw Error('Invalid media path');for await(const chunk of fs.createReadStream(input)){hash.update(chunk);await output.write(chunk);bytes+=chunk.length;}}}finally{await output.close();}
  if(bytes!==asset.bytes||hash.digest('hex')!==asset.sha256)throw Error('Original source bytes differ: '+id);
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','a:0','-show_entries','stream=codec_name,sample_rate,bit_rate:format=duration,bit_rate','-of','json',file],{encoding:'utf8',timeout:60000})),stream=probe.streams?.[0];if(!stream)throw Error('No audio stream: '+id);
  const codec=stream.codec_name,lossless=['flac','alac'].includes(codec)||codec.startsWith('pcm_'),format=codec==='mp3'?'MP3':codec==='aac'?'AAC':codec==='flac'?'FLAC':codec.startsWith('pcm_')?'WAV':codec.toUpperCase();
  let details={format,codec,lossless,sampleRate:Number(stream.sample_rate),bitrate:Number(stream.bit_rate||probe.format?.bit_rate)||undefined,basis:codec.startsWith('pcm_')?'byte-rate':'average',sourceSha256:asset.sha256};
  if(codec==='mp3'){
   mp3++;const handle=await fsp.open(file,'r');
   try{const scan=await scanMp3Source({size:bytes,async read(offset,length){const b=new Uint8Array(length);const result=await handle.read(b,0,length,offset);return b.subarray(0,result.bytesRead);}});if(scan){details={...details,...scan};verified++;}else incomplete.push(id);}finally{await handle.close();}
  }
  recordings[id]=details;await fsp.unlink(file);
 }
 await fsp.writeFile('data/listening-source-details.json',JSON.stringify({version:1,recordings},null,2)+'\n');
 console.log(JSON.stringify({originalRecordingsVerified:Object.keys(recordings).length,mp3Recordings:mp3,completeMp3FrameScans:verified,incompleteMp3Scans:incomplete,outputBytes:fs.statSync('data/listening-source-details.json').size}));
}finally{await fsp.rm(directory,{recursive:true,force:true});}
