#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { sourceFiles, fileRecord, git } from './verification/source.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifestPath = 'docs/rebuild-manifest.json';
export function refreshSource(directory, includeUntracked = []) {
const prior = existsSync(resolve(directory, manifestPath)) ? JSON.parse(readFileSync(resolve(directory, manifestPath), 'utf8')) : {};
const untracked = git(directory, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(path => path && path !== manifestPath).sort();
if (!Array.isArray(includeUntracked) || !includeUntracked.every(path => typeof path === 'string' && untracked.includes(path))) throw Error('Untracked approvals must name existing nonignored untracked files');
const previous = prior.reviewedUntrackedFiles ?? [];
if (!Array.isArray(previous) || !previous.every(path => typeof path === 'string')) throw Error('Invalid reviewedUntrackedFiles in prior manifest');
const approved = new Set([...previous, ...includeUntracked]);
const missing = untracked.filter(path => !approved.has(path));
if (missing.length) throw Error(`Unreviewed untracked source inputs (manifest unchanged):\n${missing.join('\n')}\nReview each file, then pass --include-untracked PATH or --include-untracked-from LIST.json. Do not approve private inputs.`);
const added = untracked.filter(path => !previous.includes(path));
const files = sourceFiles(directory).filter(path => path !== manifestPath).map(path => fileRecord(directory, path)).filter(file => !file.missing);
const manifest = {
  schemaVersion: 1,
  kind: 'candidate-source',
  baseRevision: git(directory, ['rev-parse', 'HEAD']),
  recordedLiveUpdate: JSON.parse(readFileSync(resolve(directory, 'LIVE_RELEASE.json'), 'utf8')).update,
  scope: 'Tracked and nonignored untracked regular source files, except this manifest. Hash refresh is not test, build, deployment, or recovery verification.',
  environment: { node: readFileSync(resolve(directory, '.node-version'), 'utf8').trim(), npm: JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8')).packageManager },
  reviewedUntrackedFiles: untracked,
  files
};
writeFileSync(resolve(directory, manifestPath), JSON.stringify(manifest, null, 2) + '\n');
return { count: files.length, added };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const approved = [], args = process.argv.slice(2);
    for (let i = 0; i < args.length; i++) {
      const option = args[i], value = args[++i];
      if (!value || value.startsWith('--')) throw Error(`${option} needs a value`);
      if (option === '--include-untracked') approved.push(value);
      else if (option === '--include-untracked-from') {
        const list = JSON.parse(readFileSync(resolve(value), 'utf8'));
        if (!Array.isArray(list)) throw Error('Untracked approval list must be a JSON array of exact paths');
        approved.push(...list);
      } else throw Error(`Unknown argument: ${option}`);
    }
    const result = refreshSource(root, approved);
    if (result.added.length) console.log(`Explicitly reviewed untracked paths added:\n${result.added.join('\n')}`);
    console.log(`Recorded ${result.count} candidate source inputs. Review the diff and run verification; production evidence was not changed.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
