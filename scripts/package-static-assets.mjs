import { packagePeqdbAssets } from "./peqdb-assets.mjs";
import {readdirSync,mkdirSync,lstatSync,statSync,linkSync,copyFileSync,unlinkSync,readFileSync,existsSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),source=join(root,'public'),destination=join(root,'dist/client');
const digest=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const publicOnly=process.argv.includes('--public-only'),marker=join(root,'dist/.public-only-package');
if(publicOnly){mkdirSync(join(root,'dist'),{recursive:true});writeFileSync(marker,'Public clone package; restore all protected media and run full packaging before deployment.\n');}
let files=0;
function visit(folder,relative=''){
 for(const name of readdirSync(folder)){
  const input=join(folder,name),path=join(relative,name),output=join(destination,path),info=lstatSync(input);
  if(info.isSymbolicLink())throw new Error('Public asset symlinks must be resolved before packaging.');
  if(info.isDirectory()){mkdirSync(output,{recursive:true});visit(input,path);continue}
  if(!info.isFile())continue;
  mkdirSync(resolve(output,'..'),{recursive:true});
  let existing;try{existing=statSync(output)}catch{}
  if(existing&&existing.dev===info.dev&&existing.ino===info.ino){files++;continue}
  if(existing&&existing.size===info.size&&digest(input)===digest(output)){files++;continue}
  if(existing)unlinkSync(output);
  try{linkSync(input,output)}catch(error){if(error.code!=='EXDEV')throw error;copyFileSync(input,output)}
  files++;
 }
}
visit(source);
packagePeqdbAssets(destination);
const manifest=JSON.parse(readFileSync(join(root,'data/listening-pool-audio-manifest.json'),'utf8'));
if(!publicOnly)for(const asset of Object.values(manifest))for(const part of asset.parts){const file=resolve(destination,'.'+part.path);if(!file.startsWith(destination+'/')||!existsSync(file)||statSync(file).size!==part.bytes)throw new Error('Incomplete protected media package. Restore the authorized media for a live rebuild; use --public-only solely for a public clone preview.');}
if(publicOnly)console.log(`Packaged ${files} public-clone assets. Protected recordings not verified; NOT a deployable live package.`);
else {if(existsSync(marker))unlinkSync(marker);console.log(`Packaged ${files} static assets; ${Object.keys(manifest).length} protected recordings complete. Do not edit public assets while this release is being deployed.`);}
execFileSync(process.execPath,[resolve(root,'scripts/check-client-assets.mjs'),'--repair-preloads'],{stdio:'inherit'});
