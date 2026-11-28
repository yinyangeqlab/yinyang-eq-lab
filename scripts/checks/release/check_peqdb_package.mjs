import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
import { verifyPeqdbAssets, verifyPeqdbBuildSource } from '../../peqdb-assets.mjs';
const manifest = verifyPeqdbAssets();
assert.ok(manifest.assets['RUNTIME-NOTICES.txt']);
assert.ok(manifest.sourceFiles['site/lib/autoeq.worker.ts']);
assert.ok(manifest.sourceFiles['public/dynamic-range-worklet.js'], 'Standalone playback worklet must be included in application source');
assert.ok(manifest.sourceFiles['docs/PEQDB_AUTOEQ.md']);
assert.ok(manifest.sourceFiles['docs/legal/NOTICE']);
assert.ok(manifest.sourceFiles['.nvmrc']);
for (const file of [`site/lib/peqdb-source-check-${crypto.randomUUID()}.ts`, `site/data/peqdb-private-probe-${crypto.randomUUID()}.json`]) {
  try {
    writeFileSync(file, 'Synthetic unreviewed source input\n', { flag: 'wx' });
    assert.throws(verifyPeqdbAssets, /Unreviewed untracked/, 'Unreviewed files must never enter the source archive');
    assert.throws(() => execFileSync('python3', ['-c', "import runpy; runpy.run_path('scripts/prepare-peqdb-autoeq.py')['source_files']()"], { stdio: 'pipe' }), /Unreviewed untracked/, 'Preparation must refuse the same unreviewed file');
  } finally { unlinkSync(file); }
}
const notices = 'artifacts/peqdb-autoeq/public/vendor/peqdb-autoeq/RUNTIME-NOTICES.txt';
const original = readFileSync(notices);
try {
  writeFileSync(notices, 'Synthetic mismatched asset');
  assert.throws(verifyPeqdbAssets, /Missing or changed/, 'Altered binaries/notices must invalidate the package');
} finally { writeFileSync(notices, original); }
verifyPeqdbAssets();
verifyPeqdbBuildSource(manifest, 'dist/client');
const stamp = 'dist/peqdb-build-source.json', originalStamp = readFileSync(stamp);
try {
  writeFileSync(stamp, '{}');
  assert.throws(() => verifyPeqdbBuildSource(manifest, 'dist/client'), /built application\/source mismatch/, 'A different source snapshot cannot be packaged with this build');
} finally { writeFileSync(stamp, originalStamp); }
assert.ok(manifest.buildCommand.every(part => !part.startsWith('/') && !part.includes('/home/')), 'Published build recipes contain no absolute local paths');
console.log('PASS: matching build/source/binary/notices hashes; unreviewed code/data and mismatched assets/builds are rejected.');

const prefix = 'dist/client/vendor/peqdb-autoeq/companion-v1';
const companion = JSON.parse(readFileSync(prefix + '.json', 'utf8'));
const code = readFileSync(prefix + '.mjs');
assert.deepEqual(companion, { format: 1, allBand: true, sha256: createHash('sha256').update(code).digest('hex'), bytes: code.length });
assert.ok(companion.bytes <= 1024 * 1024, 'Companion app update size limit');
const worker = new Worker(`
  import { parentPort, workerData } from 'node:worker_threads';
  globalThis.self = globalThis;
  globalThis.process = undefined;
  globalThis.WorkerGlobalScope = class {};
  globalThis.fetch = () => { throw Error('Network disabled'); };
  const { search } = await import(workerData);
  const raw = Array.from({length:96},(_,i)=>[20*1000**(i/95),5*Math.sin(i/12)+1.3*Math.cos(i/6)]);
  const target = [[20,4],[80,2],[1000,0],[4500,3],[20000,-3]];
  const request = { raw, target, plus: true, type: 'oe' };
  for (const allBand of [undefined, true]) {
    const { options } = await search({ ...request, allBand });
    parentPort.postMessage([...new Set(options.map(fit => fit.method + ':' + fit.bands))]);
  }
`, { eval: true, workerData: pathToFileURL(prefix + '.mjs').href });
const [legacy, current] = await new Promise((resolve, reject) => {
  const fits = [];
  worker.on('message', result => fits.push(result));
  worker.once('error', reject);
  worker.once('exit', code => code === 0 ? resolve(fits) : reject(Error('Companion fitter check failed')));
});
assert.equal(legacy.length, 16);
assert.deepEqual(current.filter(fit => !fit.startsWith('joint:')), legacy);
assert.deepEqual(current.filter(fit => fit.startsWith('joint:')).sort(), ['joint:10', 'joint:15', 'joint:20', 'joint:30']);
console.log('PASS: packaged Companion updates preserve the original requests and add four All-Band fits to compatible clients.');
