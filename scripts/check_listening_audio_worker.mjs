import {Miniflare} from 'miniflare';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const source=ts.transpileModule(readFileSync('lib/listening-audio.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const script=source+readFileSync('lib/worker-media-response.mjs','utf8')+`\nconst bytes=new Uint8Array(100).map((_,i)=>i);const asset={bytes:100,sha256:'hash',mime:'audio/wav',parts:[{path:'/part',bytes:100}]};export default {async fetch(request){return withMediaLength(request,await serveListeningAudio(request,asset,{fetch:async()=>new Response(bytes)}))}};`;
const mf=new Miniflare({modules:true,script,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],cf:false});
try{
 for(const[method,range,status,length]of[['HEAD',null,200,100],['GET',null,200,100],['GET','bytes=30-39',206,10],['HEAD','bytes=30-39',206,10]]){
  const response=await mf.dispatchFetch('http://example.test/api/listening-audio/song',{method,headers:range?{Range:range}:{}});
  console.log(JSON.stringify({method,range,status:response.status,length:response.headers.get('content-length')}));
  assert.equal(response.status,status);assert.equal(response.headers.get('content-length'),String(length));
  if(method==='GET')assert.equal((await response.arrayBuffer()).byteLength,length);
 }
 console.log('Native Worker media HEAD and fixed-length range responses passed.');
}finally{await mf.dispose()}
