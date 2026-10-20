const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const m={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/listening-audio.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,Request,Response,Headers,ReadableStream,URL});
const {serveListeningAudio}=m.exports;
const bytes=Buffer.from(Array.from({length:103},(_,i)=>i)),sizes=[30,40,33];let offset=0;
const parts=new Map(sizes.map((size,i)=>{const data=bytes.subarray(offset,offset+size);offset+=size;return ['/part'+i,data]}));
const asset={bytes:103,sha256:'verified-source-hash',mime:'audio/wav',parts:sizes.map((bytes,i)=>({path:'/part'+i,bytes}))};let fetches=0;
const binding={fetch:async request=>{fetches++;return new Response(parts.get(new URL(request.url).pathname))}};
const request=(headers={},method='GET')=>new Request('https://example.test/api/listening-audio/song',{headers,method});
(async()=>{
 let r=await serveListeningAudio(request({},'HEAD'),asset,binding);assert.equal(r.status,200);assert.equal(r.headers.get('content-length'),'103');assert.equal(fetches,0);assert.equal(r.headers.get('cache-control'),'private, no-store');
 r=await serveListeningAudio(request(),asset,binding);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);
 for(const [range,start,end] of [['bytes=0-9',0,9],['bytes=28-33',28,33],['bytes=29-71',29,71],['bytes=-6',97,102],['bytes=100-',100,102],['bytes=0-999',0,102]]){
  const before=fetches;r=await serveListeningAudio(request({Range:range}),asset,binding);assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),`bytes ${start}-${end}/103`);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes.subarray(start,end+1));if(range==='bytes=0-9')assert.equal(fetches-before,1);
 }
 // Exercise asset stores that honor Range, as well as the 200 fallback above.
 const ranged={fetch:async request=>{const data=parts.get(new URL(request.url).pathname),[a,b]=request.headers.get('Range').slice(6).split('-').map(Number);return new Response(data.subarray(a,b+1),{status:206,headers:{'Content-Range':`bytes ${a}-${b}/${data.length}`}})}};
 r=await serveListeningAudio(request({Range:'bytes=29-71'}),asset,ranged);assert.equal(r.status,206);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes.subarray(29,72));
 for(const range of ['bytes=103-','bytes=50-10','bytes=0-1,4-5','bytes=-0','bytes=','bytes=9999999999999999999999-'])assert.equal((await serveListeningAudio(request({Range:range}),asset,binding)).status,416);
 for(const [tag,status] of [['"other"',200],['"verified-source-hash"',206]]){r=await serveListeningAudio(request({Range:'bytes=0-1','If-Range':tag}),asset,binding);assert.equal(r.status,status);assert.deepEqual(Buffer.from(await r.arrayBuffer()),status===200?bytes:bytes.subarray(0,2));}
 console.log('Private audio passed: unchanged bytes, streaming, HEAD, single/suffix/cross-part ranges, ETag and invalid ranges.');
})().catch(error=>{console.error(error);process.exitCode=1});
