#!/usr/bin/env node
// Compare the main workspace with the last recorded, verified live deployment.
import {readFileSync,readdirSync,existsSync,lstatSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
if(process.argv.includes('--source-only')){await import('./check-rebuild-source.mjs');process.exit(0);}
const state=JSON.parse(readFileSync(join(root,'LIVE_RELEASE.json'),'utf8'));
const groups=['applicationFiles','infrastructureFiles','documentationFiles','buildFiles','localConfigurationFiles'];
if(process.argv.includes('--assets'))groups.push('assetFiles');
const snapshot=process.argv.includes('--snapshot');
const sourceRoot=snapshot?resolve(root,state.applicationSnapshot):root;
const failures=[];
let checked=0;
for(const group of groups)for(const file of state[group]){
 const mapped=snapshot&&group==='applicationFiles'?join(state.applicationSnapshot,file.path):snapshot&&group==='infrastructureFiles'?join(state.infrastructureSnapshot,file.path.replace(/^infra\/pulumi\//,'')):snapshot&&group==='assetFiles'?join(state.applicationSnapshot,file.path):file.path;
 const path=resolve(root,mapped);
 if(!path.startsWith(root+'/'))throw Error('Invalid manifest path');
 if(!existsSync(path)||!lstatSync(path).isFile()){failures.push(`Missing file: ${file.path}`);continue;}
 const digest=createHash('sha256').update(readFileSync(path)).digest('hex');
 if(digest!==file.sha256)failures.push(`Changed since live update ${state.update}: ${file.path}`);
 checked++;
}
const expected=new Set(state.applicationFiles.map(f=>f.path));
function inspect(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){
 const path=join(dir,entry.name);
 if(entry.isDirectory())inspect(path);
 else if(entry.isFile()&&!expected.has(relative(sourceRoot,path)))failures.push(`Extra runtime file: ${relative(sourceRoot,path)}`);
}}
for(const directory of state.runtimeDirectories)inspect(join(sourceRoot,directory));
if(failures.length){console.error(failures.join('\n'));console.error('Local files differ from the recorded live snapshot. Review intentional edits or reconcile the source; do not assume an older checkout is current.');process.exitCode=1;}
else console.log(`${snapshot?'Live snapshot':'Local project'} matches recorded live update ${state.update}: ${checked} files verified${groups.includes('assetFiles')?', including all public assets':''}. Source snapshot: ${state.applicationSnapshot}.`);
