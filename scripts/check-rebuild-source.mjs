// Clone-safe input verification. No network, private state or generated build required.
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(readFileSync(resolve(root,'docs/rebuild-manifest.json'),'utf8'));
const errors=[];
for(const entry of manifest.files){
 const p=resolve(root,entry.path);
 if(!p.startsWith(root)||!existsSync(p)){errors.push(entry.path+': missing/invalid');continue;}
 if(createHash('sha256').update(readFileSync(p)).digest('hex')!==entry.sha256)errors.push(entry.path+': differs');
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`Public rebuild inputs verified: ${manifest.files.length} files, live update${manifest.liveUpdate}. Private media, credentials, database contents and immutable build output are intentionally outside this check.`);
