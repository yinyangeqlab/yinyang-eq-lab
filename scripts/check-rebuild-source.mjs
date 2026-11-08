// Clone-safe candidate input verification; never rewrites production evidence.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { sourceFiles, fileRecord } from './verification/source.mjs';

export function checkSource(root) {
  const name = 'docs/rebuild-manifest.json';
  const manifest = JSON.parse(readFileSync(resolve(root, name), 'utf8'));
  if (manifest.schemaVersion !== 1 || manifest.kind !== 'candidate-source' || !/^[a-f0-9]{40}$/.test(manifest.baseRevision)) throw Error('Invalid candidate source manifest');
  if (!Array.isArray(manifest.files) || !manifest.files.length) throw Error('Candidate file inventory is empty');
  const errors = [], names = new Set();
  for (const entry of manifest.files) {
    if (typeof entry.path !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256) || typeof entry.executable !== 'boolean' || names.has(entry.path) || entry.path === name) throw Error('Invalid/duplicate candidate file entry');
    names.add(entry.path);
    const actual = fileRecord(root, entry.path);
    if (actual.missing || actual.sha256 !== entry.sha256 || actual.executable !== entry.executable) errors.push(`${entry.path}: missing or differs`);
  }
  const listed = sourceFiles(root).filter(path => path !== name && !fileRecord(root, path).missing);
  for (const path of listed) if (!names.has(path)) errors.push(`${path}: unlisted source input`);
  for (const path of names) if (!listed.includes(path)) errors.push(`${path}: no longer a Git source input`);
  if (errors.length) throw Error(errors.join('\n'));
  return manifest.files.length;
}

// check-live-source imports this entry point and must preserve a failure exit code.
try {
  const count = checkSource(fileURLToPath(new URL('..', import.meta.url)));
  console.log(`Candidate source inputs verified: ${count} files. This does not establish deployment, build or recovery parity.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
