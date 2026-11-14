import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { recoveryState, verifyOrRefresh } from './release-state.mjs';

const read = (directory, path) => JSON.parse(readFileSync(resolve(directory, path), 'utf8'));
const timestamp = value => typeof value === 'string' ? Date.parse(value) : NaN;

async function readDeployments(accountId, scriptName, token) {
  const path = `accounts/${encodeURIComponent(accountId)}/workers/scripts/${encodeURIComponent(scriptName)}/deployments`;
  const response = await fetch(`https://api.cloudflare.com/client/v4/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
  });
  assert.ok(response.ok, `Cannot verify the active Worker (HTTP ${response.status})`);
  const body = await response.json();
  assert.ok(body.success === true, 'Cannot verify the active Worker');
  return body.result.deployments;
}

export async function verifyProductionBaseline(workspace, target, getDeployments = readDeployments) {
  const state = read(workspace, 'LIVE_RELEASE.json');
  const label = `update${state.update}`;
  verifyOrRefresh(workspace);
  const recovery = recoveryState(state);
  assert.ok(recovery.kind === 'source-only' && !recovery.pending,
    `${label} needs a verified source-only handoff before another release can go live`);

  const receiptLabel = state.deploymentRefresh ? `${label}-${state.deploymentRefresh.slug}` : label;
  const recordPath = `docs/releases/${receiptLabel}-recovery-verification.json`;
  assert.equal(state.recoveryProcess[`${label}SourceOnlyHandover`].evidence, recordPath,
    'The owner release record must reference the matching recovery receipt');
  const record = read(workspace, recordPath);
  assert.ok(record.update === state.update && record.sourceCommit === state.sourceCommit &&
    timestamp(record.verifiedAt) >= timestamp(state.verifiedAt) &&
    record.verifiedAt === state.recoveryProcess.sourceBaselineVerifiedAt,
  'Recovery receipt does not match the live release and its validation timestamp');
  assert.ok(record.sourceOnlyHandoverPassed === true && record.hostedValidationPassed === true &&
    record.hostedValidateOnlyConfirmed === true && record.independentReconstructionPassed === true &&
    record.priorDataSnapshotsExactlyUnchanged === true &&
    record.databaseExportPerformed === false && record.newDataSnapshots === 0,
  'Source-only registration, independent reconstruction, and hosted validation must have passed');

  const privateRoot = resolve(workspace, '../private/backup-v2');
  const { provider } = read(privateRoot, 'cloud-settings.json');
  assert.ok(typeof provider.accountId === 'string' && provider.accountId &&
    typeof provider.scriptName === 'string' && provider.scriptName,
  'Owner recovery settings do not identify the production Worker');
  if (target) {
    assert.ok(target.accountId === provider.accountId && target.scriptName === provider.scriptName,
      'Pulumi target does not match the configured recovery Worker');
  }
  const pointer = provider.releaseBaseline;
  assert.ok(typeof pointer?.id === 'string' && /^metadata-\d{8}T\d{12}Z$/.test(pointer.id),
    'Owner recovery settings do not identify a registered source-only baseline');
  const registration = read(privateRoot, `${pointer.id}/handover-receipt.json`);
  const metadata = read(privateRoot, `${pointer.id}/release-metadata.json`);
  assert.ok(isDeepStrictEqual(registration.releaseBaseline, pointer), 'Private registration differs from the configured baseline');
  assert.ok(registration.liveUpdate === state.update && metadata.liveUpdate === state.update &&
    metadata.implementationCommit === state.sourceCommit && metadata.databaseExportPerformed === false &&
    timestamp(registration.registeredAt) >= timestamp(state.verifiedAt) &&
    timestamp(record.verifiedAt) >= timestamp(registration.registeredAt) &&
    registration.dataRecoveryPointUnchanged === true &&
    registration.databaseExportPerformed === false && registration.newSnapshotCount === 0,
  'Private recovery registration does not match the verified live release');

  assert.ok(typeof state.applicationSnapshot === 'string' && state.applicationSnapshot.length > 0,
    'Run the rollout check against the owner workspace with the immutable release snapshot');
  const artifact = state.deploymentRefresh?.slug ?? label;
  const deployment = read(workspace, `${state.applicationSnapshot}/artifacts/${artifact}/handover-verification.private.json`);
  assert.ok(deployment.deploymentVerified === true && deployment.revision === state.sourceCommit,
    'Private deployment receipt does not match the live release source');
  const expected = deployment.deployment;
  assert.ok(typeof expected?.id === 'string' && expected.id &&
    expected.versions?.length === 1 && expected.versions[0].percentage === 100,
  'Private deployment receipt must identify the fully active Worker version');
  assert.ok(isDeepStrictEqual(provider.expectedDeployment, expected), 'Configured recovery Worker version differs from the deployment receipt');
  assert.ok(isDeepStrictEqual(metadata.expectedDeployment, expected), 'Recovery metadata refers to a different Worker version');

  const token = readFileSync(resolve(privateRoot, 'cloudflare-read-token.txt'), 'utf8').trim();
  assert.ok(token, 'Owner deployment read credential is unavailable');
  const [active] = await getDeployments(provider.accountId, provider.scriptName, token);
  assert.ok(isDeepStrictEqual(active && { id: active.id, versions: active.versions }, expected),
    'The active Worker changed. Verify its handoff and recovery before the next rollout');
  return { update: state.update };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [workspace, accountId, scriptName] = process.argv.slice(2);
    assert.ok(process.argv.length === 3 || process.argv.length === 5,
      'Usage: node scripts/production-release-preflight.mjs OWNER_WORKSPACE [ACCOUNT_ID SCRIPT_NAME]');
    const { update } = await verifyProductionBaseline(resolve(workspace),
      accountId === undefined ? undefined : { accountId, scriptName });
    console.log(`Production preflight passed: update${update} is active with a verified handoff and source-only recovery.`);
  } catch (error) {
    const reason = error.code === 'ENOENT' ? 'Required owner release or recovery evidence is missing' :
      error instanceof assert.AssertionError ? error.message : 'Could not read or verify owner release evidence';
    console.error(`Production rollout blocked: ${reason}`);
    process.exitCode = 1;
  }
}
