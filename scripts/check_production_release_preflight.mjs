import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handoffs, verifyOrRefresh } from './release-state.mjs';
import { verifyProductionBaseline } from './production-release-preflight.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = mkdtempSync(join(tmpdir(), 'release-preflight-'));
const workspace = join(directory, 'workspace');
const privateRoot = join(directory, 'private/backup-v2');
const lock = join(privateRoot, 'run.lock');
const state = JSON.parse(readFileSync(join(root, 'LIVE_RELEASE.json')));
const label = `update${state.update}`;
const snapshot = 'work/fixture';
const recoveryPath = `docs/releases/${label}-recovery-verification.json`;
const verifiedAt = new Date(Date.parse(state.verifiedAt) + 60_000).toISOString();
const recoveryRecord = {
  update: state.update, sourceCommit: state.sourceCommit, verifiedAt, sourceOnlyHandoverPassed: true,
  hostedValidationPassed: true, hostedValidateOnlyConfirmed: true, independentReconstructionPassed: true,
  priorDataSnapshotsExactlyUnchanged: true, databaseExportPerformed: false, newDataSnapshots: 0,
};
const pointer = { id: 'metadata-20261114T070425123456Z', metadataObject: 'synthetic-object' };
const target = { accountId: 'synthetic-account', scriptName: 'synthetic-worker' };
const deployment = { id: 'deployment-1', versions: [{ version_id: 'worker-1', percentage: 100 }] };
const settings = { provider: { ...target, releaseBaseline: pointer, expectedDeployment: deployment } };
const registration = {
  liveUpdate: state.update, releaseBaseline: pointer, registeredAt: recoveryRecord.verifiedAt,
  dataRecoveryPointUnchanged: true, databaseExportPerformed: false, newSnapshotCount: 0,
};
const metadata = {
  liveUpdate: state.update, implementationCommit: state.sourceCommit, expectedDeployment: deployment, databaseExportPerformed: false,
};
const settingsPath = 'cloud-settings.json';
const metadataPath = `${pointer.id}/release-metadata.json`;
const registrationPath = `${pointer.id}/handover-receipt.json`;

function write(base, path, value) {
  const file = join(base, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
}

const verify = (active = deployment, worker = target) =>
  verifyProductionBaseline(workspace, worker, async (account, name, token) => {
    assert.deepEqual({ accountId: account, scriptName: name }, target);
    assert.equal(token, 'synthetic-read-only');
    return [active];
  });

try {
  state.applicationSnapshot = snapshot;
  state.recoveryProcess = {
    sourceOnlyHandoverPending: false, hostedValidationPending: false, hostedValidationPassed: true,
    sourceBaselineUpdate: state.update, sourceBaselineVerifiedAt: verifiedAt,
    metadataOnlyHandoverVerified: true, metadataValidationPassed: true,
    [`${label}SourceOnlyHandover`]: {
      registrationPending: false, metadataOnly: true, databaseExport: false, newDataSnapshots: 0, evidence: recoveryPath,
    },
  };
  write(workspace, 'LIVE_RELEASE.json', state);
  write(workspace, state.evidence, readFileSync(join(root, state.evidence), 'utf8'));
  write(workspace, recoveryPath, recoveryRecord);
  write(workspace, 'LIVE_STATE.md', 'stale\n');
  for (const path of handoffs) write(workspace, path, '<!-- release-state:start -->\nstale\n<!-- release-state:end -->\n');
  verifyOrRefresh(workspace, true);
  write(workspace, `${snapshot}/artifacts/${label}/handover-verification.private.json`, {
    deployment, deploymentVerified: true, revision: state.sourceCommit,
  });
  write(privateRoot, settingsPath, settings);
  write(privateRoot, metadataPath, metadata);
  write(privateRoot, registrationPath, registration);
  write(privateRoot, 'cloudflare-read-token.txt', 'synthetic-read-only');
  write(privateRoot, 'run.lock', '');
  assert.deepEqual(await verify(), { update: state.update });

  const pending = structuredClone(state);
  const recovery = pending.recoveryProcess;
  Object.assign(recovery, { sourceOnlyHandoverPending: true, hostedValidationPending: true, hostedValidationPassed: false });
  recovery[`${label}SourceOnlyHandover`].registrationPending = true;
  write(workspace, 'LIVE_RELEASE.json', pending);
  verifyOrRefresh(workspace, true);
  await assert.rejects(verify(), /needs a verified source-only handoff/);
  write(workspace, 'LIVE_RELEASE.json', state);
  await assert.rejects(verify(), /generated views differ/);
  verifyOrRefresh(workspace, true);

  write(workspace, recoveryPath, { ...recoveryRecord, sourceCommit: 'a'.repeat(40) });
  await assert.rejects(verify(), /does not match the live release/);
  write(workspace, recoveryPath, { ...recoveryRecord, hostedValidateOnlyConfirmed: false });
  await assert.rejects(verify(), /hosted validation must have passed/);
  rmSync(join(workspace, recoveryPath));
  await assert.rejects(verify(), { code: 'ENOENT' });
  write(workspace, recoveryPath, recoveryRecord);
  write(privateRoot, registrationPath, { ...registration, liveUpdate: state.update - 1 });
  await assert.rejects(verify(), /Private recovery registration does not match/);
  write(privateRoot, registrationPath, registration);
  write(privateRoot, metadataPath, { ...metadata, expectedDeployment: { ...deployment, id: 'old' } });
  await assert.rejects(verify(), /different Worker version/);
  write(privateRoot, metadataPath, metadata);
  await assert.rejects(verify({ ...deployment, id: 'new' }), /active Worker changed/);
  await assert.rejects(verify(deployment, { ...target, scriptName: 'different-worker' }), /Pulumi target does not match/);

  const refreshed = structuredClone(state);
  const slug = 'version-link-refresh';
  const refreshedRecovery = `docs/releases/${label}-${slug}-recovery-verification.json`;
  const revision = 'f'.repeat(40);
  refreshed.baselineCommit = state.sourceCommit;
  refreshed.sourceCommit = revision;
  refreshed.gitSource = { ...refreshed.gitSource, implementationCommit: revision, pushed: false };
  delete refreshed.gitSource.publishedSourceCommit;
  refreshed.deploymentRefresh = { slug, previousEvidence: state.evidence };
  refreshed.evidence = `docs/releases/${label}-${slug}-verification.json`;
  const deploymentRecord = JSON.parse(readFileSync(join(workspace, state.evidence)));
  deploymentRecord.sourceCommit = deploymentRecord.deploymentVerification.revision =
    deploymentRecord.candidateVerification.sourceRevision = revision;
  write(workspace, refreshed.evidence, deploymentRecord);
  write(workspace, 'LIVE_RELEASE.json', refreshed);
  verifyOrRefresh(workspace, true);
  await assert.rejects(verify(), /must reference the matching recovery receipt/);
  refreshed.recoveryProcess[`${label}SourceOnlyHandover`].evidence = refreshedRecovery;
  write(workspace, 'LIVE_RELEASE.json', refreshed);
  write(workspace, refreshedRecovery, { ...recoveryRecord, sourceCommit: revision });
  write(workspace, `${snapshot}/artifacts/${slug}/handover-verification.private.json`, {
    deployment, deploymentVerified: true, revision,
  });
  write(privateRoot, metadataPath, { ...metadata, implementationCommit: revision });
  assert.deepEqual(await verify(), { update: state.update });

  const bin = join(directory, 'bin');
  const output = join(directory, 'apply.log');
  const plan = join(directory, 'reviewed-plan');
  write(directory, 'reviewed-plan', 'synthetic plan');
  write(bin, 'node', `#!/usr/bin/env bash
if [[ "$1" == "-e" ]]; then exec "${process.execPath}" "$@"; fi
[[ "$1" == */production-release-preflight.mjs && "$2" == "$FIXTURE_WORKSPACE" &&
   "$3" == "synthetic-account" && "$4" == "synthetic-worker" ]] || exit 11
flock -n -x "$FIXTURE_LOCK" true && exit 12
exit "$FIXTURE_PREFLIGHT_EXIT"
`);
  write(bin, 'pulumi', `#!/usr/bin/env bash
case "$1 $2" in
  'config get') echo synthetic-account ;;
  'config --stack') echo '{"project:scriptName":{"value":"synthetic-worker"}}' ;;
  'up --stack')
    [[ "$DEPLOY_OWNER_WORKSPACE" == "$FIXTURE_WORKSPACE" && "$*" == *"$FIXTURE_PLAN"* ]] || exit 13
    flock -n -x "$FIXTURE_LOCK" true && exit 14
    printf 'applied\n' >> "$FIXTURE_OUTPUT" ;;
  *) exit 15 ;;
esac
`);
  for (const name of ['node', 'pulumi']) chmodSync(join(bin, name), 0o755);
  const wrapper = join(root, 'scripts/deploy-reviewed.sh');
  const env = {
    ...process.env, PATH: `${bin}:${process.env.PATH}`, FIXTURE_LOCK: lock, FIXTURE_WORKSPACE: workspace,
    FIXTURE_PLAN: plan, FIXTURE_OUTPUT: output,
  };
  const run = (command, args, code) =>
    spawnSync(command, args, { env: { ...env, FIXTURE_PREFLIGHT_EXIT: String(code) }, encoding: 'utf8' });
  assert.equal(run('bash', [wrapper, workspace, plan], 1).status, 1);
  assert.throws(() => readFileSync(output), { code: 'ENOENT' });
  const busy = run('flock', ['-x', lock, 'bash', wrapper, workspace, plan], 0);
  assert.equal(busy.status, 1);
  assert.match(busy.stderr, /operation holds the lock/);
  assert.throws(() => readFileSync(output), { code: 'ENOENT' });
  const failedCheck = run('bash', [wrapper, '--check', workspace], 1);
  assert.equal(failedCheck.status, 1, failedCheck.stderr);
  const passedCheck = run('bash', [wrapper, '--check', workspace], 0);
  assert.equal(passedCheck.status, 0, passedCheck.stderr);
  assert.throws(() => readFileSync(output), { code: 'ENOENT' });
  const ready = run('bash', [wrapper, workspace, plan], 0);
  assert.equal(ready.status, 0, ready.stderr);
  assert.equal(readFileSync(output, 'utf8'), 'applied\n');
  console.log('Verified matching release evidence, missing or stale proof rejection, and locked rollout ordering.');
} finally {
  rmSync(directory, { recursive: true, force: true });
}
