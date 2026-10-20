import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const stream=ts.transpileModule(readFileSync('lib/listening-audio.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const route=readFileSync('lib/worker-media-route.mjs','utf8').replace("import { serveListeningAudio } from './media-stream.mjs';",'').replace("import manifest from './media-manifest.mjs';",'');
const helper=readFileSync('lib/worker-media-response.mjs','utf8');
const script=stream+route+helper+`
const manifest={song:{bytes:100,sha256:'hash',mime:'audio/flac',parts:[{path:'/0',bytes:40},{path:'/1',bytes:30},{path:'/2',bytes:30}]}};
const bytes=new Uint8Array(100).map((_,i)=>i);
const env={ASSETS:{async fetch(request){const [start,end]=request.headers.get('Range').slice(6).split('-').map(Number);const index=Number(new URL(request.url).pathname.slice(1)),offset=[0,40,70][index],size=[40,30,30][index];return new Response(bytes.slice(offset+start,offset+end+1),{status:206,headers:{'Content-Range':\`bytes \${start}-\${end}/\${size}\`}})}}};
export default{async fetch(request){return withMediaLength(request,await serveWorkerMedia(request,env))}};`;
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script,compatibilityDate:'2026-05-15',cf:false}));
try{
 for(const[method,range,status,length]of[['HEAD',null,200,100],['GET',null,200,100],['GET','bytes=30-39',206,10],['HEAD','bytes=30-39',206,10]]){
  console.log('Checking',method,range);
  const r=await mf.dispatchFetch('http://example.test/api/listening-audio/song',{method,headers:range?{Range:range}:{}});
  assert.equal(r.status,status);assert.equal(r.headers.get('content-length'),String(length));assert.equal(r.headers.get('x-listening-content-length'),null);assert.equal(r.headers.get('cache-control'),'private, no-store');
  if(method==='GET')assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],Array.from({length},(_,i)=>i+(range?30:0)));
 }
 for(const id of ['missing','__proto__','song/extra'])assert.equal((await mf.dispatchFetch('http://example.test/api/listening-audio/'+id)).status,404);
 assert.equal((await mf.dispatchFetch('http://example.test/api/listening-audio/song',{method:'POST'})).status,405);
 console.log('Native Worker audio route passed: trusted manifest only; GET/HEAD, original bytes, exact range lengths and private headers; unknown/path/prototype/method rejection.');
}finally{await mf.dispose()}
