import { buildSync } from 'esbuild';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function compileCompanionFitter(assets) {
  const site=fileURLToPath(new URL('../../site/',import.meta.url));
  const {outputFiles}=buildSync({entryPoints:[join(site,'lib/companion-fitter.js')],absWorkingDir:site,
    bundle:true,minify:true,write:false,format:'esm',target:'es2020',platform:'browser',
    external:['module','fs','path','url','node:*'],tsconfig:join(site,'tsconfig.json'),
    alias:{'@':site,'production-wasm':resolve(assets,'autoeq-wasm.mjs'),'production-bytes':resolve(assets,'autoeq-wasm.wasm')},
    loader:{'.wasm':'binary'}});
  const worker=outputFiles[0].contents;
  return {worker,manifest:{format:1,sha256:createHash('sha256').update(worker).digest('hex'),bytes:worker.length}};
}

export function packageCompanionFitter(assets,dest) {
  const {worker,manifest}=compileCompanionFitter(assets);
  mkdirSync(dest,{recursive:true});
  writeFileSync(join(dest,'companion-v1.mjs'),worker);
  writeFileSync(join(dest,'companion-v1.json'),JSON.stringify(manifest));
}
