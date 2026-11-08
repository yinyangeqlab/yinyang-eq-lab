import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import ts from 'typescript';
const directory=mkdtempSync(join(tmpdir(),'waveform-binding-')),hash='a'.repeat(64),level=new Uint8Array(32).map((_,i)=>i+1),asset=new Uint8Array(1072);
asset.set(new TextEncoder().encode(JSON.stringify({version:1,sourceSha256:hash,levels:[{offset:1024,count:1,bytes:16},{offset:1040,count:2,bytes:32}]}).padEnd(1024,' ')));asset.set(level,1040);
mkdirSync(join(directory,'__waveform-peaks'));writeFileSync(join(directory,'__waveform-peaks',hash+'.bin'),asset);
const source=ts.transpileModule(readFileSync('lib/serve-waveform-peaks.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:source+`\nexport default {fetch(request,env){return serveWaveformPeaks(request,'${hash}',env.ASSETS)}}`,compatibilityDate:'2026-10-19',cf:false,assets:{directory,binding:'ASSETS',run_worker_first:true,routerConfig:{has_user_worker:true}}}));
try{
 for(const method of ['GET','HEAD']){
  const response=await mf.dispatchFetch('https://fixture.invalid/api/listening-waveform/a?bins=2',{method});
  assert.equal(response.status,200);assert.equal(response.headers.get('X-Waveform-Bins'),'2');
  const bytes=new Uint8Array(await response.arrayBuffer());assert.deepEqual(bytes,method==='HEAD'?new Uint8Array():level);
 }
 console.log('PASS native Cloudflare asset binding serves exact synthetic waveform level and HEAD without relying on Range support.');
}finally{await mf.dispose();rmSync(directory,{recursive:true,force:true});}
