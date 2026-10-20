// Read-only remote export. Account/database identifiers and API token are external inputs.
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {mkdirSync,existsSync,writeFileSync,readFileSync,rmSync,chmodSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {sanitizeDatabase,sha,external} from './recovery.mjs';
const root=resolve(import.meta.dirname,'../..');
try{
 const args={};for(let i=2;i<process.argv.length;i+=2)args[process.argv[i].slice(2)]=process.argv[i+1];
 if(!args.config||!args.out||!process.env.CLOUDFLARE_API_TOKEN)throw Error('Provide --config private-wrangler.json --out external-directory and CLOUDFLARE_API_TOKEN through your secret manager.');
 const out=external(args.out);if(existsSync(out))throw Error('Snapshot output must not exist');
 // Check the output is outside a real Git repository before any private export.
 let cursor=out;while(true){if(existsSync(resolve(cursor,'.git/HEAD')))throw Error('Snapshot must be outside Git');const parent=dirname(cursor);if(parent===cursor)break;cursor=parent;}
 process.umask(0o077);mkdirSync(out,{recursive:true,mode:0o700});
 const raw=resolve(out,'raw.sql'),original=resolve(out,'raw.sqlite'),clean=resolve(out,'database.sqlite');
 try{
  execFileSync(process.execPath,[resolve(root,'node_modules/wrangler/bin/wrangler.js'),'d1','export','DB','--remote','--config',resolve(args.config),'--output',raw,'--skip-confirmation'],{cwd:root,env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:resolve(out,'export.log')},stdio:'pipe'});
  chmodSync(raw,0o600);const db=new DatabaseSync(original);try{db.exec(readFileSync(raw,'utf8'))}finally{db.close()}
  sanitizeDatabase(original,clean);
  writeFileSync(resolve(out,'review.json'),JSON.stringify({databaseSha256:sha(clean),reviewedAt:new Date().toISOString(),source:'current-live-export',deletedRecordsExcluded:true,note:'Fresh current export, not historical recovery data. Reconcile any later deletions before future restoration.'},null,2)+'\n',{mode:0o600});
 }finally{for(const n of [raw,original,original+'-wal',original+'-shm'])rmSync(n,{force:true});}
 console.log('Current database snapshot sanitized; old session credentials removed. Private output saved without printing records or account identifiers.');
}catch(e){console.error('Snapshot stopped. Check private output/export.log and source configuration. No application data was written remotely.');process.exitCode=1}
