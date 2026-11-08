import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, lstatSync } from 'node:fs';
import { resolve } from 'node:path';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } }).trimEnd();
}
export function sourceFiles(root) {
  return [...new Set(git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean))].sort();
}
export function fileRecord(root, path) {
  const target = resolve(root, path);
  if (!target.startsWith(resolve(root) + '/') || path.includes('\\')) throw Error(`Invalid source path: ${path}`);
  let stat;
  try { stat = lstatSync(target); } catch (error) { if (error.code === 'ENOENT') return { path, missing: true }; throw error; }
  if (!stat.isFile()) throw Error(`Source must be a regular file: ${path}`);
  return { path, sha256: sha256(readFileSync(target)), executable: Boolean(stat.mode & 0o111) };
}
export function sourceIdentity(root) {
  const files = sourceFiles(root).map(path => fileRecord(root, path));
  let head;
  try { head = git(root, ['rev-parse', '--verify', '--quiet', 'HEAD']); }
  catch (error) { if (error.status !== 1) throw error; head = null; }
  return {
    head,
    branch: git(root, ['branch', '--show-current']),
    treeSha256: sha256(JSON.stringify(files)),
    dirtyStatus: git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).split('\0').filter(Boolean),
    files,
    scope: 'Tracked and nonignored untracked regular files, including deletions and executable bits. Ignored dependencies, private inputs and generated output are excluded.'
  };
}
