import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { guideAssets, verifyGuideAssets } from '../../guide-assets.mjs';

const directory = mkdtempSync(join(tmpdir(), 'iem-guide-assets-'));
try {
  assert.throws(() => verifyGuideAssets(directory), /Missing or changed IEM guide asset/);
  verifyGuideAssets(directory, { allowMissing: true });

  const file = join(directory, guideAssets[0].path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, 'Synthetic altered guide asset');
  for (const allowMissing of [false, true]) {
    assert.throws(() => verifyGuideAssets(directory, { allowMissing }), /Missing or changed IEM guide asset/);
  }

  unlinkSync(file);
  symlinkSync(import.meta.filename, file);
  assert.throws(() => verifyGuideAssets(directory, { allowMissing: true }), /Missing or changed IEM guide asset/);
  console.log('PASS full packages require the published guide assets, previews allow absent files, and altered files and symlinks are rejected.');
} finally {
  rmSync(directory, { recursive: true, force: true });
}
