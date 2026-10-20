// Assemble the same gate/app/media module graph for loopback Wrangler only.
import {existsSync,mkdirSync,readdirSync,copyFileSync,readFileSync,writeFileSync,chmodSync,rmSync} from 'node:fs';
import {resolve,relative,dirname} from 'node:path';
import ts from 'typescript';
import {abuseBindings} from '../../infra/pulumi/abuse-controls.mjs';
import {publicAssetBypassPatterns} from '../../infra/pulumi/public-assets.mjs';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'.recovery-local/worker'),server=resolve(root,'dist/server');
if(!existsSync(resolve(root,'.recovery-local/report.json'))||!existsSync(resolve(server,'index.js'))||existsSync(resolve(root,'dist/.public-only-package')))throw Error('Restore a fresh local database, build, and complete full media packaging first.');
if(existsSync(out))throw Error('Local worker assembly exists; preserve it or remove only this generated folder before reassembling.');
mkdirSync(out,{mode:0o700});
function copyJS(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())copyJS(p);else if(e.isFile()&&e.name.endsWith('.js')){const dest=resolve(out,relative(server,p));mkdirSync(dirname(dest),{recursive:true});copyFileSync(p,dest)}}}
copyJS(server);
for(const [source,target] of [['infra/pulumi/private-gate.mjs','gate.mjs'],['infra/pulumi/abuse-controls.mjs','abuse-controls.mjs'],['infra/pulumi/public-assets.mjs','public-assets.mjs'],['lib/invite-settings.mjs','invite-settings.mjs'],['lib/browser-pairing.mjs','browser-pairing.mjs'],['lib/browser-sync.mjs','browser-sync.mjs'],['lib/worker-media-route.mjs','media-route.mjs'],['lib/worker-media-response.mjs','media-response.mjs']])copyFileSync(resolve(root,source),resolve(out,target));
for(const [source,target] of [['lib/service-status.ts','service-status.mjs'],['lib/listening-audio.ts','media-stream.mjs']])writeFileSync(resolve(out,target),ts.transpileModule(readFileSync(resolve(root,source),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
writeFileSync(resolve(out,'media-manifest.mjs'),'export default '+readFileSync(resolve(root,'data/listening-pool-audio-manifest.json'),'utf8')+';\n');
copyFileSync(resolve(root,'.dev.vars'),resolve(out,'.dev.vars'));chmodSync(resolve(out,'.dev.vars'),0o600);
const binding=JSON.parse(readFileSync(resolve(root,'wrangler.local.json'),'utf8')).d1_databases;
writeFileSync(resolve(out,'wrangler.json'),JSON.stringify({name:'recovery-loopback-only',main:'gate.mjs',no_bundle:true,find_additional_modules:true,base_dir:out,rules:[{type:'ESModule',globs:['**/*.js','**/*.mjs'],fallthrough:true}],compatibility_date:'2026-05-15',compatibility_flags:['nodejs_compat'],workers_dev:false,preview_urls:false,d1_databases:binding,assets:{directory:resolve(root,'dist/client'),binding:'ASSETS',run_worker_first:['/*',...publicAssetBypassPatterns]},ratelimits:abuseBindings.map(b=>({name:b.name,namespace_id:b.namespaceId,simple:b.simple})),vars:{MAINTENANCE_MODE:'false',CANONICAL_ORIGIN:'https://recovery.invalid'}},null,2)+'\n',{mode:0o600});
console.log('Prepared local gate/app/media Worker. Run the documented loopback-only command; no production account configured.');
