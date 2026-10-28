import { readFileSync, existsSync, mkdirSync, copyFileSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('..', import.meta.url));
export const peqdbAssets = resolve(root, 'artifacts/peqdb-autoeq/public/vendor/peqdb-autoeq');
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
export function peqdbSourceSnapshot() {
  const roots = new Set(['package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json', 'eslint.config.mjs', '.npmrc', '.node-version', '.openai/hosting.json', 'LICENSE', 'LICENSE_SCOPE.md', 'THIRD_PARTY.md', 'README.md', 'docs/PEQDB_AUTOEQ.md', 'docs/LOCAL_SETUP.md', 'public/dynamic-range-worklet.js']);
  const eligible = name => roots.has(name) || /^(app|components|lib|hooks|build|scripts|drizzle|data|vendor)\//.test(name);
  const listing = flags => execFileSync('git', ['ls-files', ...flags, '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(eligible);
  const tracked = listing(['--cached']), untracked = listing(['--others', '--exclude-standard']);
  const allowlist = new Set(JSON.parse(readFileSync(resolve(root, 'scripts/peqdb-source-allowlist.json'), 'utf8')));
  const unexpected = untracked.filter(name => !allowlist.has(name));
  if (unexpected.length) throw Error('Unreviewed untracked source inputs: ' + unexpected.join(', '));
  return Object.fromEntries([...new Set([...tracked, ...untracked])].sort().map(name => {
    if (!lstatSync(resolve(root, name)).isFile()) throw Error('Source inputs must be regular files: ' + name);
    return [name, digest(resolve(root, name))];
  }));
}
export function verifyPeqdbAssets() {
  const file = resolve(root, 'artifacts/peqdb-autoeq/manifest.json');
  if (!existsSync(file)) throw Error('Prepare the PEQdB engine and its corresponding source with scripts/prepare-peqdb-autoeq.py before packaging.');
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  const current = peqdbSourceSnapshot();
  if (JSON.stringify(Object.keys(current)) !== JSON.stringify(Object.keys(manifest.sourceFiles).sort())) throw Error('PEQdB application source file list changed; rebuild the corresponding source package.');
  for (const name of ['autoeq-wasm.mjs', 'autoeq-wasm.wasm', 'LICENSE', 'COPYING', 'source.tar.gz', 'RUNTIME-NOTICES.txt']) {
    if (!manifest.assets[name] || digest(join(peqdbAssets, name)) !== manifest.assets[name].sha256) throw Error(`Missing or changed PEQdB package asset: ${name}`);
  }
  for (const [name, expected] of Object.entries(manifest.sourceFiles)) {
    if (digest(resolve(root, name)) !== expected) throw Error(`PEQdB application source package is stale: ${name}. Run prepare-peqdb-autoeq.py again.`);
  }
  return manifest;
}
export function verifyPeqdbBuildSource(manifest, destination) {
  const stamp = resolve(destination, '../peqdb-build-source.json');
  if (!existsSync(stamp) || JSON.stringify(JSON.parse(readFileSync(stamp, 'utf8'))) !== JSON.stringify(manifest.sourceFiles)) throw Error('PEQdB built application/source mismatch; rebuild the application before packaging.');
}
export function packagePeqdbAssets(destination) {
  const manifest = verifyPeqdbAssets();
  verifyPeqdbBuildSource(manifest, destination);
  const out = join(destination, 'vendor/peqdb-autoeq'); mkdirSync(out, { recursive: true });
  for (const name of Object.keys(manifest.assets)) copyFileSync(join(peqdbAssets, name), join(out, name));
}
