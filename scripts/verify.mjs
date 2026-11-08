#!/usr/bin/env node
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, mkdtempSync, existsSync, lstatSync, openSync, closeSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceIdentity, sha256 } from './verification/source.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
export const profiles = ['public', 'worker', 'prepared', 'built', 'manual'];
const demand = (condition, message) => { if (!condition) throw Error(message); };
const relativePath = path => typeof path === 'string' && path.length > 0 && !path.includes('\\') && path.split('/').every(part => part && part !== '.' && part !== '..') && !path.startsWith('/');

export function validateRegistry(directory, registry) {
  demand(registry.schemaVersion === 1 && Array.isArray(registry.suites) && registry.suites.length > 0, 'Invalid registry schema');
  const ids = new Set(), paths = new Set(), commands = new Set();
  for (const suite of registry.suites) {
    demand(typeof suite.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(suite.id) && !ids.has(suite.id), `Invalid/duplicate suite ID: ${suite.id}`);
    demand(relativePath(suite.path) && suite.path.startsWith('scripts/'), `Invalid suite path: ${suite.path}`);
    demand(existsSync(join(directory, suite.path)) && lstatSync(join(directory, suite.path)).isFile(), `Missing/nonregular suite: ${suite.path}`);
    demand(profiles.includes(suite.profile), `${suite.id}: unknown profile`);
    demand(['node', 'python3'].includes(suite.runtime), `${suite.id}: unsupported runtime`);
    demand(Array.isArray(suite.args) && suite.args.every(arg => typeof arg === 'string' && !arg.includes('\0')), `${suite.id}: invalid literal arguments`);
    const invocation = JSON.stringify([suite.runtime, suite.path, suite.args]);
    demand(!commands.has(invocation), `${suite.id}: duplicate command`);
    demand(Number.isInteger(suite.timeoutMs) && suite.timeoutMs >= 100 && suite.timeoutMs <= 600000, `${suite.id}: invalid timeout`);
    demand(Array.isArray(suite.requires) && suite.requires.every(relativePath), `${suite.id}: invalid prerequisites`);
    demand(typeof suite.owner === 'string' && suite.owner.length > 0 && typeof suite.scope === 'string' && suite.scope.length > 0, `${suite.id}: owner/scope required`);
    demand(suite.profile !== 'manual' || (typeof suite.reason === 'string' && suite.reason.length > 0), `${suite.id}: manual exclusion needs a reason`);
    ids.add(suite.id); paths.add(suite.path); commands.add(invocation);
  }
  const inventory = readdirSync(join(directory, 'scripts'), { withFileTypes: true }).filter(entry => entry.isFile() && entry.name.startsWith('check')).map(entry => `scripts/${entry.name}`);
  const orphaned = inventory.filter(path => !paths.has(path));
  demand(orphaned.length === 0, `Unregistered check scripts: ${orphaned.join(', ')}`);
  return registry;
}

export function parseOptions(args, registry) {
  const selectedProfiles = [], ids = []; let list = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--list') list = true;
    else if (arg === '--profile' || arg === '--suite') {
      const value = args[++index]; demand(value && !value.startsWith('--'), `${arg} needs a value`);
      (arg === '--profile' ? selectedProfiles : ids).push(value);
    } else throw Error(`Unknown argument: ${arg}. Use --list, --profile NAME or --suite ID.`);
  }
  for (const name of selectedProfiles) demand(profiles.includes(name) && name !== 'manual', `Unknown/nonautomated profile: ${name}`);
  for (const id of ids) demand(registry.suites.some(suite => suite.id === id && suite.profile !== 'manual'), `Unknown/nonautomated suite: ${id}`);
  if (!selectedProfiles.length && !ids.length) selectedProfiles.push('public');
  const selected = registry.suites.filter(suite => selectedProfiles.includes(suite.profile) || ids.includes(suite.id));
  demand(selected.length > 0, 'No suites selected');
  return { list, selected };
}

function commandFor(suite) {
  return [suite.runtime === 'node' ? process.execPath : 'python3', suite.path, ...suite.args];
}

export async function runSuite(directory, suite, logPath, signal) {
  const startedAt = new Date().toISOString(), startTime = performance.now();
  const command = commandFor(suite);
  const missing = suite.requires.filter(path => !existsSync(join(directory, path)));
  const base = { id: suite.id, profile: suite.profile, owner: suite.owner, scope: suite.scope, command, startedAt };
  if (missing.length) return { ...base, status: 'blocked', reason: `Missing prerequisites: ${missing.join(', ')}`, durationMs: 0, exitCode: null };
  if (signal?.aborted) return { ...base, status: 'interrupted', durationMs: 0, exitCode: null };
  const fd = openSync(logPath, 'wx');
  return await new Promise(resolveResult => {
    let child, timer, timedOut = false, interrupted = false, spawnError;
    const kill = () => {
      if (!child?.pid) return;
      try { if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); }
      catch (error) { if (error.code !== 'ESRCH') spawnError = error.message; }
    };
    const abort = () => { interrupted = true; kill(); };
    const finish = (code, terminationSignal) => {
      clearTimeout(timer); signal?.removeEventListener('abort', abort); closeSync(fd);
      resolveResult({ ...base, status: interrupted ? 'interrupted' : timedOut ? 'timeout' : spawnError || code !== 0 ? 'failed' : 'passed',
        exitCode: code, signal: terminationSignal, durationMs: Math.round(performance.now() - startTime), log: logPath,
        ...(spawnError ? { reason: spawnError } : {}) });
    };
    try {
      child = spawn(command[0], command.slice(1), { cwd: directory, shell: false, detached: process.platform !== 'win32', stdio: ['ignore', fd, fd],
        env: { ...process.env, CI: '1', NO_COLOR: '1', GIT_OPTIONAL_LOCKS: '0', WRANGLER_SEND_METRICS: 'false' } });
      child.once('error', error => { spawnError = error.message; });
      child.once('close', finish);
      signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => { timedOut = true; kill(); }, suite.timeoutMs);
    } catch (error) { spawnError = error.message; finish(null, null); }
  });
}

function toolVersions(directory, selected) {
  const version = (command, args) => execFileSync(command, args, { cwd: directory, encoding: 'utf8', timeout: 15000 }).trim();
  const packageInfo = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  const expectedNode = readFileSync(join(directory, '.node-version'), 'utf8').trim();
  const npm = version('npm', ['--version']);
  demand(process.versions.node === expectedNode, `Expected Node ${expectedNode}, found ${process.versions.node}`);
  demand(`npm@${npm}` === packageInfo.packageManager, `Expected ${packageInfo.packageManager}, found npm@${npm}`);
  return { node: process.versions.node, nodeExecutable: process.execPath, npm,
    python: selected.some(suite => suite.runtime === 'python3') ? version('python3', ['--version']) : null,
    platform: process.platform, arch: process.arch };
}

export async function runVerification(directory, registry, selected, { signal, onResult = () => {} } = {}) {
  validateRegistry(directory, registry);
  demand(selected.length > 0 && selected.every(suite => registry.suites.includes(suite) && suite.profile !== 'manual'), 'Invalid suite selection');
  // All output is unique and ignored; callers cannot choose an overwrite target.
  const outputParent = join(directory, 'artifacts/verification');
  for (const name of ['artifacts', 'artifacts/verification']) if (existsSync(join(directory, name))) demand(!lstatSync(join(directory, name)).isSymbolicLink(), 'Verification output may not be a symlink');
  mkdirSync(outputParent, { recursive: true });
  const output = mkdtempSync(join(outputParent, 'run-'));
  const reportPath = join(output, 'report.json');
  const report = { schemaVersion: 1, startedAt: new Date().toISOString(), status: 'running', registrySha256: sha256(JSON.stringify(registry)),
    selected: selected.map(suite => suite.id), suites: [],
    outsideCoverage: registry.suites.filter(suite => !selected.includes(suite)).map(suite => ({ id: suite.id, profile: suite.profile, status: 'not-selected', reason: suite.reason || 'Profile/suite not selected' })) };
  const save = () => writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  save();
  try {
    report.sourceBefore = sourceIdentity(directory);
    report.environment = toolVersions(directory, selected);
    for (const suite of selected) {
      if (signal?.aborted) break;
      const result = await runSuite(directory, suite, join(output, `${suite.id}.log`), signal);
      if (result.log) result.log = `${suite.id}.log`;
      report.suites.push(result); onResult(result); save();
      const current = sourceIdentity(directory);
      if (JSON.stringify(current) !== JSON.stringify(report.sourceBefore)) { report.error = `Source changed during ${suite.id}; verification stopped`; break; }
    }
  } catch (error) { report.error = error.message; }
  finally {
    try {
      report.sourceAfter = sourceIdentity(directory);
      report.sourceUnchanged = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
      if (!report.sourceUnchanged) report.error ||= 'Source identity changed during verification';
    } catch (error) { report.error ||= error.message; report.sourceUnchanged = false; }
    for (const suite of selected) if (!report.suites.some(result => result.id === suite.id)) report.suites.push({ id: suite.id, profile: suite.profile, status: 'not-run', reason: report.error || 'Run interrupted' });
    report.status = !report.error && report.sourceUnchanged && report.suites.every(result => result.status === 'passed') ? 'passed' : 'failed';
    report.finishedAt = new Date().toISOString(); save();
  }
  return { report, reportPath };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  process.on('SIGINT', interrupt); process.on('SIGTERM', interrupt);
  try {
    const registry = validateRegistry(root, JSON.parse(readFileSync(join(root, 'scripts/verification-registry.json'), 'utf8')));
    const options = parseOptions(process.argv.slice(2), registry);
    if (options.list) {
      for (const suite of registry.suites) console.log(`${suite.id} [${suite.profile}] ${suite.owner}: ${suite.scope}\n  ${suite.profile === 'manual' ? suite.reason : commandFor(suite).join(' ')}${suite.requires.length ? `\n  requires: ${suite.requires.join(', ')}` : ''}`);
    } else {
      const { report, reportPath } = await runVerification(root, registry, options.selected, { signal: controller.signal, onResult: result => console.log(`${result.status.toUpperCase()} ${result.id} (${result.durationMs}ms)${result.reason ? `: ${result.reason}` : ''}`) });
      console.log(`${report.status.toUpperCase()}: ${report.suites.filter(suite => suite.status === 'passed').length}/${report.suites.length} selected passed; ${report.outsideCoverage.length} outside coverage. Report: ${reportPath}`);
      if (report.error) console.error(report.error);
      process.exitCode = report.status === 'passed' ? 0 : 1;
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { process.off('SIGINT', interrupt); process.off('SIGTERM', interrupt); }
}
