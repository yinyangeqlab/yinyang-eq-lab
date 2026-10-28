import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { verifyPeqdbAssets, verifyPeqdbBuildSource } from './peqdb-assets.mjs';
const manifest = verifyPeqdbAssets();
assert.ok(manifest.assets['RUNTIME-NOTICES.txt']);
assert.ok(manifest.sourceFiles['lib/autoeq.worker.ts']);
assert.ok(manifest.sourceFiles['public/dynamic-range-worklet.js'], 'Standalone playback worklet must be included in application source');
assert.ok(manifest.sourceFiles['docs/PEQDB_AUTOEQ.md']);
for (const file of [`lib/peqdb-source-check-${crypto.randomUUID()}.ts`, `data/peqdb-private-probe-${crypto.randomUUID()}.json`]) {
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
