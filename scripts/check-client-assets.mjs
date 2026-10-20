import {readFileSync,readdirSync,existsSync,writeFileSync} from 'node:fs';
import {resolve,dirname,basename} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),client=resolve(root,'dist/client'),server=resolve(root,'dist/server');
const repair=process.argv.includes('--repair-preloads');
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(resolve(dir,e.name)):[resolve(dir,e.name)]);
let imports=0,removed=0;
// Actual client module imports must always exist; never alias a missing module.
for(const file of files(client).filter(p=>p.endsWith('.js'))){
 const text=readFileSync(file,'utf8');
 for(const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["'](\.{1,2}\/[^"']+|\/_next\/[^"']+)["']/g)){
  const path=match[1].split(/[?#]/)[0];
  assert(existsSync(path.startsWith('/')?resolve(client,'.'+path):resolve(dirname(file),path)),`Missing actual client dependency: ${basename(file)} -> ${path}`);imports++;
 }
}
for(const file of files(server).filter(p=>basename(p)==='__vite_rsc_assets_manifest.js')){
 const source=readFileSync(file,'utf8');assert(source.startsWith('export default '));
 const manifest=JSON.parse(source.slice('export default '.length).trim().replace(/;$/,''));
 for(const dependency of Object.values(manifest.clientReferenceDeps))for(const type of ['js','css']){
  dependency[type]=(dependency[type]||[]).filter(path=>{
   if(existsSync(resolve(client,'.'+path)))return true;
   assert(repair,`Missing preload: ${path}`);
   // Known multi-stage build issue: an analysis-stage hash survives beside
   // the current hashed chunk. Remove only redundant preload references.
   const stem=basename(path).replace(/[-.][A-Za-z0-9_-]{8}\.(js|css)$/,'.');
   assert(files(client).some(other=>basename(other).replace(/[-.][A-Za-z0-9_-]{8}\.(js|css)$/,'.')===stem),`Missing preload has no current emitted equivalent: ${path}`);
   removed++;return false;
  });
 }
 if(repair)writeFileSync(file,'export default '+JSON.stringify(manifest,null,2)+'\n');
}
console.log(`Client dependency checks passed: ${imports} imports; ${removed} redundant stale preload entries removed.`);
