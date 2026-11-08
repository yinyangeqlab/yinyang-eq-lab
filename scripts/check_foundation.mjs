import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync, existsSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRegistry, parseOptions, runSuite, runVerification } from './verify.mjs';
import { validateRelease, verifyOrRefresh, handoffs, recoveryState, renderState } from './release-state.mjs';
import { candidateChanges, releaseHistory } from '../lib/release-history.ts';
import { buildLabel, bugReportUrl, releaseInfo } from '../lib/release-info.ts';
import { refreshSource } from './refresh-rebuild-manifest.mjs';
import { fileRecord, sha256, sourceFiles, sourceIdentity } from './verification/source.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const live = JSON.parse(readFileSync(join(root, 'LIVE_RELEASE.json'), 'utf8'));
const build = releaseInfo.build;
assert.ok(build.update === live.update || build.update === live.update + 1);
if (build.preview) {
  assert.equal(build.basedOn, live.update);
  assert.equal(build.update, live.update + 1);
  assert.equal(buildLabel, `update${build.update}-preview.${build.preview}`);
} else {
  assert.equal(build.basedOn, build.update - 1);
  assert.equal(buildLabel, `update${build.update}`);
}
assert.ok(candidateChanges.length && new URL(bugReportUrl).searchParams.get('body').includes(buildLabel));
assert.equal(releaseHistory[0].update, build.preview ? live.update : build.update);
assert.ok(releaseHistory.every((entry, i) =>
  entry.changes.length && (i === 0 || entry.update < releaseHistory[i - 1].update) &&
  (!entry.github || (/^[a-f0-9]{40}$/.test(entry.github.commit) &&
    (!entry.github.releaseTag || entry.github.releaseTag === `update${entry.update}`)))));
if (live.gitSource.publishedSourceCommit) {
  assert.equal(releaseHistory.find(entry => entry.update === live.update)?.github?.commit, live.gitSource.publishedSourceCommit);
}
for (let update = 103; update <= live.update; update++) {
  assert.ok(releaseHistory.some(entry => entry.update === update), `Missing version notes for update${update}`);
}

const temp = mkdtempSync(join(tmpdir(), 'yinyang-foundation-'));
let checks = 0;
function test(name, action) { action(); checks++; console.log(`PASS ${name}`); }
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const write = (path, value) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, value); };
const writeJson = (path, value) => write(path, JSON.stringify(value, null, 2) + '\n');
const clone = value => structuredClone(value);
const completedRecovery = {
  sourceOnlyHandoverPending: false, metadataOnlyHandoverVerified: true,
  metadataValidationPassed: true, hostedValidationPending: false, hostedValidationPassed: true,
};
const dataExportRecord = state => ({
  update: state.update, matchingPreparedSourceCommit: state.sourceCommit, dataExportPerformed: true,
  newDataSnapshots: 1, registered: true, hostedValidationPassed: true,
  independentDownloadDecryptionVerified: true, fullReconstructionVerified: true,
});
try {
  const state = json(join(root, 'LIVE_RELEASE.json')), receipt = json(join(root, state.evidence));
  test('current release contract', () => validateRelease(state, receipt));
  for (const [name, mutate] of [
    ['receipt revision mismatch', value => { value.sourceCommit = 'f'.repeat(40); }],
    ['unverified deployment', value => { value.deploymentVerification.deploymentVerified = false; }],
    ['maintenance contradiction', value => { value.deploymentVerification.ownerOnlyMaintenance = !state.ownerOnlyMaintenance.enabled; }],
    ['missing protection', value => { value.deploymentVerification.abuseBindings = 5; }]
  ]) test(name, () => { const value = clone(receipt); mutate(value); assert.throws(() => validateRelease(state, value), /Release state:/); });
  test('pending handover cannot be silently promoted using old baseline evidence', () => {
    const value = clone(state); value.recoveryProcess.sourceOnlyHandoverPending = false;
    value.recoveryProcess[`update${state.update}SourceOnlyHandover`].registrationPending = false;
    Object.assign(value.recoveryProcess, { metadataOnlyHandoverVerified: true, metadataValidationPassed: true, hostedValidationPending: false, hostedValidationPassed: true });
    value.recoveryProcess.sourceBaselineUpdate = state.update - 1;
    assert.throws(() => validateRelease(value, receipt), /baseline differs/);
  });
  test('explicit completed source-only record passes without rewriting deployment receipt', () => {
    const value = clone(state);
    Object.assign(value.recoveryProcess, { sourceOnlyHandoverPending: false, sourceBaselineUpdate: state.update, metadataOnlyHandoverVerified: true, metadataValidationPassed: true, hostedValidationPending: false, hostedValidationPassed: true });
    value.recoveryProcess[`update${state.update}SourceOnlyHandover`].registrationPending = false;
    validateRelease(value, receipt); assert.deepEqual(recoveryState(value), { kind: 'source-only', pending: false });
    value.recoveryProcess[`update${state.update}SourceOnlyHandover`].dataExport = false;
    delete value.recoveryProcess[`update${state.update}SourceOnlyHandover`].databaseExport;
    validateRelease(value, receipt);
    value.recoveryProcess[`update${state.update}SourceOnlyHandover`].databaseExport = true;
    assert.throws(() => validateRelease(value, receipt), /conflicting export/);
  });
  test('completed update127 recovery shape is recognized', () => {
    const historical = { update: 127, recoveryProcess: {
      ...completedRecovery, sourceBaselineUpdate: 127,
      update127SourceOnlyHandover: {
        newDataExport: false, newDataSnapshots: 0, verified: true, independentReconstructionPassed: true,
        hostedValidationPassed: true, dataSnapshotsAndTimestampsUnchanged: true,
      },
    } };
    assert.deepEqual(recoveryState(historical), { kind: 'source-only', pending: false });
    delete historical.recoveryProcess.update127SourceOnlyHandover.verified;
    assert.throws(() => recoveryState(historical), /unrecognized legacy/);
  });
  test('data-export shape binds revision and verification, without claiming data was unchanged', () => {
    const value = clone(state), record = dataExportRecord(state);
    delete value.recoveryProcess[`update${state.update}SourceOnlyHandover`];
    value.recoveryProcess.releaseMetadataHandover = record;
    value.recoveryProcess.sourceOnlyHandoverPending = false;
    assert.deepEqual(recoveryState(value), { kind: 'data-export', pending: false });
    assert.match(renderState(value, receipt), /export has its own capture time/);
    record.matchingPreparedSourceCommit = 'f'.repeat(40);
    assert.throws(() => recoveryState(value), /recovery source differs/);
    record.matchingPreparedSourceCommit = value.sourceCommit; record.fullReconstructionVerified = false;
    assert.throws(() => recoveryState(value), /lacks verification/);
  });
  test('current release contract supports separately evidenced data-export completion', () => {
    const value = clone(state), proof = clone(receipt);
    delete value.recoveryProcess[`update${state.update}SourceOnlyHandover`];
    value.recoveryProcess.releaseMetadataHandover = dataExportRecord(state);
    value.recoveryProcess.sourceOnlyHandoverPending = false;
    delete proof.sourceOnlyRecoveryRegistrationPending; proof.recoveryRegistrationPending = false;
    validateRelease(value, proof);
    value.recoveryProcess.sourceOnlyHandoverPending = true;
    assert.throws(() => validateRelease(value, proof), /conflicts with pending/);
  });
  for (const value of [undefined, -1, 1.5, '111']) test(`invalid rendered suite count (${value}) is rejected`, () => {
    const changed = clone(receipt); changed.candidateVerification.regressionSuitesPassed = value;
    assert.throws(() => validateRelease(state, changed), /non-negative integer/);
  });
  test('missing failed-suite count and malformed browser evidence fail closed', () => {
    const changed = clone(receipt); delete changed.candidateVerification.regressionSuitesFailed;
    assert.throws(() => validateRelease(state, changed), /non-negative integer/);
    const browser = clone(receipt); browser.browserVerification.physicalAudioQualityVerified = 'true';
    assert.throws(() => validateRelease(state, browser), /must be boolean/);
  });
  test('lab publication contradiction rejected', () => {
    const value = clone(state); value.gitSource.pushed = true; value.gitSource.publicationAuthorized = false;
    assert.throws(() => validateRelease(value, receipt), /publication authorization/);
  });
  const docs = join(temp, 'docs-fixture');
  writeJson(join(docs, 'LIVE_RELEASE.json'), state); writeJson(join(docs, state.evidence), receipt);
  write(join(docs, 'LIVE_STATE.md'), 'stale\n');
  for (const path of handoffs) write(join(docs, path), '# Fixture\n<!-- release-state:start -->\nstale\n<!-- release-state:end -->\nKeep this text.\n');
  const receiptBefore = readFileSync(join(docs, state.evidence), 'utf8');
  test('drift fails without mutation and refresh reconciles all views', () => {
    assert.throws(() => verifyOrRefresh(docs), /generated views differ/);
    assert.equal(readFileSync(join(docs, 'LIVE_STATE.md'), 'utf8'), 'stale\n');
    assert.equal(verifyOrRefresh(docs, true).changed.length, handoffs.length + 1);
    verifyOrRefresh(docs); assert.equal(verifyOrRefresh(docs, true).changed.length, 0);
    for (const path of handoffs) assert.match(readFileSync(join(docs, path), 'utf8'), /Keep this text/);
    assert.equal(readFileSync(join(docs, state.evidence), 'utf8'), receiptBefore);
  });
  test('malformed handoff prevents partial refresh', () => {
    write(join(docs, 'LIVE_STATE.md'), 'stale\n'); write(join(docs, handoffs[1]), 'missing markers');
    assert.throws(() => verifyOrRefresh(docs, true), /exactly one/);
    assert.equal(readFileSync(join(docs, 'LIVE_STATE.md'), 'utf8'), 'stale\n');
  });
  test('historical documents match preservation index', () => {
    const archive = join(root, 'docs/history/foundation-20261031');
    const index = json(join(archive, 'index.json'));
    assert.match(index.baseRevision, /^[a-f0-9]{40}$/);
    const available = spawnSync('git', ['cat-file', '-e', `${index.baseRevision}^{commit}`], { cwd: root });
    if (available.error) throw available.error;
    for (const file of index.files) {
      assert.equal(fileRecord(archive, file.archivedPath || file.originalPath).sha256, file.sha256, file.originalPath);
      if (available.status === 0) assert.equal(sha256(execFileSync('git', ['show', `${index.baseRevision}:${file.originalPath}`], { cwd: root, maxBuffer: 16 * 1024 * 1024 })), file.sha256, `Git-base provenance: ${file.originalPath}`);
    }
    if (available.status !== 0) console.log(`SKIP Git-base provenance comparison: ${index.baseRevision} is unavailable (e.g. shallow clone); archive byte hashes still checked.`);
    for (const file of state.documentationFiles.filter(entry => entry.path.startsWith('docs/releases/'))) assert.ok(existsSync(join(root, file.path)), `Referenced public receipt: ${file.path}`);
  });

  const fixture = join(temp, 'runner'); mkdirSync(fixture);
  const git = (...args) => execFileSync('git', args, { cwd: fixture, stdio: 'pipe' });
  git('init', '--quiet');
  git('config', 'user.name', 'Yin Yang EQ Lab');
  git('config', 'user.email', '343846436+yinyangeqlab@users.noreply.github.com');
  write(join(fixture, '.gitignore'), 'artifacts/\n');
  copyFileSync(join(root, '.node-version'), join(fixture, '.node-version'));
  writeJson(join(fixture, 'package.json'), { type: 'module', packageManager: json(join(root, 'package.json')).packageManager });
  write(join(fixture, 'scripts/pass.mjs'), 'console.log("fixture passed");\n');
  write(join(fixture, 'scripts/fail.mjs'), 'process.exitCode = 7;\n');
  write(join(fixture, 'scripts/timeout.mjs'), 'setInterval(() => {}, 1000);\n');
  write(join(fixture, 'scripts/literal.mjs'), 'import assert from "node:assert/strict"; assert.equal(process.argv[2], "; touch should-not-exist");\n');
  write(join(fixture, 'scripts/mutate.mjs'), 'import {writeFileSync} from "node:fs"; writeFileSync("changed.txt", "changed");\n');
  const suite = (id, extra = {}) => ({ id, path: `scripts/${id}.mjs`, runtime: 'node', args: [], profile: 'public', timeoutMs: 10000, requires: [], owner: 'tooling', scope: 'Disposable orchestration fixture', ...extra });
  const entries = [suite('pass'), suite('fail'), suite('timeout', { timeoutMs: 150 }), suite('literal', { args: ['; touch should-not-exist'] }), suite('mutate')];
  const registry = { schemaVersion: 1, suites: entries };
  test('explicit inventory and option validation', () => {
    validateRegistry(fixture, registry);
    assert.equal(parseOptions(['--suite', 'pass'], registry).selected.length, 1);
    assert.throws(() => parseOptions(['--suite', 'unknown'], registry), /Unknown/);
    assert.throws(() => parseOptions(['--profile', 'manual'], registry), /nonautomated/);
    assert.throws(() => validateRegistry(fixture, { ...registry, suites: [...entries, entries[0]] }), /duplicate/);
    const wrong = clone(registry); wrong.suites[0].path = '../outside.mjs';
    assert.throws(() => validateRegistry(fixture, wrong), /Invalid/);
    for (const name of ['check_orphan.mjs', 'check_orphan.js', 'check_orphan.ts', 'check_orphan.sh', 'checkOrphan.py']) {
      write(join(fixture, 'scripts', name), '');
      assert.throws(() => validateRegistry(fixture, registry), /Unregistered/);
      rmSync(join(fixture, 'scripts', name));
    }
  });
  const logs = join(temp, 'logs'); mkdirSync(logs);
  for (const [entry, expected] of [[entries[0], 'passed'], [entries[1], 'failed'], [entries[2], 'timeout'], [entries[3], 'passed'], [suite('pass', { requires: ['missing-input'] }), 'blocked']]) {
    const result = await runSuite(fixture, entry, join(logs, `${checks}.log`));
    assert.equal(result.status, expected); checks++; console.log(`PASS runner ${entry.id}: ${expected}`);
    if (entry.id === 'fail') assert.equal(result.exitCode, 7);
  }
  assert.equal(existsSync(join(fixture, 'should-not-exist')), false);
  const controller = new AbortController();
  const interrupted = runSuite(fixture, entries[2], join(logs, 'interrupted.log'), controller.signal);
  controller.abort(); assert.equal((await interrupted).status, 'interrupted'); checks++;
  const originalIdentity = sourceIdentity(fixture);
  const failed = await runVerification(fixture, registry, [entries[0], entries[1]]);
  assert.equal(failed.report.status, 'failed'); assert.equal(failed.report.sourceUnchanged, true);
  assert.equal(failed.report.outsideCoverage.length, 3);
  assert.equal(json(failed.reportPath).suites[1].exitCode, 7); checks++;
  const passed = await runVerification(fixture, registry, [entries[0]]);
  assert.equal(passed.report.status, 'passed'); assert.deepEqual(passed.report.sourceBefore, originalIdentity); checks++;
  const blockedRegistry = clone(registry); blockedRegistry.suites[0].requires = ['missing-input'];
  const blocked = await runVerification(fixture, blockedRegistry, [blockedRegistry.suites[0]]);
  assert.equal(blocked.report.status, 'failed'); assert.equal(blocked.report.suites[0].status, 'blocked'); checks++;
  write(join(fixture, '.node-version'), '0.0.0\n');
  const wrongEnvironment = await runVerification(fixture, registry, [entries[0]]);
  assert.equal(wrongEnvironment.report.status, 'failed'); assert.match(wrongEnvironment.report.error, /Expected Node/);
  assert.equal(wrongEnvironment.report.suites[0].status, 'not-run'); checks++;
  copyFileSync(join(root, '.node-version'), join(fixture, '.node-version'));
  const mutated = await runVerification(fixture, registry, [entries[4], entries[0]]);
  assert.equal(mutated.report.status, 'failed'); assert.equal(mutated.report.sourceUnchanged, false);
  assert.equal(mutated.report.suites[1].status, 'not-run'); assert.match(mutated.report.error, /Source changed/); checks++;
  rmSync(join(fixture, 'changed.txt'));

  // Exercise the actual CLI alias; failure propagation used to be lost here.
  for (const name of ['scripts/check-live-source.mjs', 'scripts/check-rebuild-source.mjs', 'scripts/verification/source.mjs']) {
    mkdirSync(dirname(join(fixture, name)), { recursive: true }); copyFileSync(join(root, name), join(fixture, name));
  }
  const sourceManifest = 'docs/rebuild-manifest.json';
  const entriesBefore = sourceFiles(fixture).filter(path => path !== sourceManifest).map(path => fileRecord(fixture, path));
  writeJson(join(fixture, sourceManifest), { schemaVersion: 1, kind: 'candidate-source', baseRevision: 'a'.repeat(40), files: entriesBefore });
  const sourceCheck = () => spawnSync(process.execPath, ['scripts/check-live-source.mjs', '--source-only'], { cwd: fixture, encoding: 'utf8' });
  test('actual source-only CLI succeeds for matching candidate', () => assert.equal(sourceCheck().status, 0));
  test('actual source-only CLI fails on tampering', () => {
    write(join(fixture, 'scripts/pass.mjs'), 'tampered');
    const result = sourceCheck(); assert.equal(result.status, 1); assert.match(result.stderr, /differs/);
    write(join(fixture, 'scripts/pass.mjs'), 'console.log("fixture passed");\n');
  });
  test('unlisted input fails', () => {
    write(join(fixture, 'new.txt'), 'new'); assert.match(sourceCheck().stderr, /unlisted/); rmSync(join(fixture, 'new.txt'));
  });
  test('deleted input and executable-bit drift fail', () => {
    const path = join(fixture, 'scripts/fail.mjs'), original = readFileSync(path);
    rmSync(path); assert.equal(sourceCheck().status, 1); writeFileSync(path, original);
    chmodSync(path, 0o755); assert.equal(sourceCheck().status, 1); chmodSync(path, 0o644);
    assert.equal(sourceCheck().status, 0);
  });
  test('snapshot CLI separates documentation-only drift and still fails on runtime drift', () => {
    const directory = join(temp, 'snapshot');
    write(join(directory, 'scripts/check-live-source.mjs'), readFileSync(join(root, 'scripts/check-live-source.mjs')));
    write(join(directory, 'work/release/app/a.txt'), 'application'); write(join(directory, 'HANDOFF.md'), 'original');
    const release = { update: 131, applicationSnapshot: 'work/release', infrastructureSnapshot: 'work/infra', runtimeDirectories: ['app'], applicationFiles: [{ path: 'app/a.txt', sha256: sha256('application') }], infrastructureFiles: [], documentationFiles: [{ path: 'HANDOFF.md', sha256: sha256('original') }], buildFiles: [], localConfigurationFiles: [] };
    writeJson(join(directory, 'LIVE_RELEASE.json'), release);
    const run = () => spawnSync(process.execPath, ['scripts/check-live-source.mjs', '--snapshot'], { cwd: directory, encoding: 'utf8' });
    assert.equal(run().status, 0);
    write(join(directory, 'HANDOFF.md'), 'intentional candidate docs');
    const drift = run(); assert.equal(drift.status, 2); assert.match(drift.stderr, /not a full snapshot pass/);
    write(join(directory, 'work/release/app/a.txt'), 'changed runtime'); assert.equal(run().status, 1);
    write(join(directory, 'HANDOFF.md'), 'original'); assert.equal(run().status, 1);
    assert.deepEqual(json(join(directory, 'LIVE_RELEASE.json')), release);
  });
  test('source refresh requires explicit new-file approval and never adopts a stray file silently', () => {
    const directory = join(temp, 'manifest');
    execFileSync('git', ['clone', '--quiet', '--shared', '--no-checkout', root, directory], { stdio: 'pipe' });
    const git = (...args) => execFileSync('git', args, { cwd: directory, stdio: 'pipe' });
    git('config', 'user.name', 'Yin Yang EQ Lab'); git('config', 'user.email', '343846436+yinyangeqlab@users.noreply.github.com');
    write(join(directory, '.node-version'), process.versions.node + '\n');
    writeJson(join(directory, 'package.json'), { packageManager: json(join(root, 'package.json')).packageManager });
    writeJson(join(directory, 'LIVE_RELEASE.json'), { update: 131 });
    write(join(directory, 'scripts/new.mjs'), 'new source');
    mkdirSync(join(directory, 'docs'));
    assert.throws(() => refreshSource(directory), /Unreviewed untracked/);
    assert.equal(existsSync(join(directory, sourceManifest)), false);
    const approved = ['.node-version', 'package.json', 'LIVE_RELEASE.json', 'scripts/new.mjs'];
    assert.deepEqual(refreshSource(directory, approved).added.sort(), approved.sort());
    const before = readFileSync(join(directory, sourceManifest), 'utf8');
    assert.equal(refreshSource(directory).added.length, 0);
    write(join(directory, 'scratch.txt'), 'not approved');
    assert.throws(() => refreshSource(directory), /scratch.txt/);
    assert.equal(readFileSync(join(directory, sourceManifest), 'utf8'), before);
    rmSync(join(directory, 'scratch.txt')); assert.equal(refreshSource(directory).added.length, 0);
  });
  console.log(`PASS ${checks} foundation scenarios. Temporary fixtures removed; no commits, publication or production access.`);
} finally { rmSync(temp, { recursive: true, force: true }); }
