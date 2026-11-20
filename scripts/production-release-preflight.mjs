import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { recoveryState, verifyOrRefresh } from './release-state.mjs';
import { releaseRecordRelativePath } from './project-paths.mjs';
import { releaseHistory } from '../site/lib/release-history.ts';
import { releaseInfo } from '../site/lib/release-info.ts';
import { update197Source, verifyUpdate197TimeTravel } from './recovery/update197-time-travel.mjs';

const candidateRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

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

function verifySourceOnlyRecovery(state, label, recordPath, workspace, privateRoot, provider) {
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

  assert.ok(isDeepStrictEqual(metadata.expectedDeployment, provider.expectedDeployment), 'Recovery metadata refers to a different Worker version');
}

function verifyPreparedCaptureSource(state, record, registration, workspace, capturedAt, deployedAt) {
  const capturedSource = registration.capturedSourceCommit;
  if (record.capturedSourceCommit !== capturedSource) return false;
  if (capturedSource === state.baselineCommit) return true;

  const refresh = registration.interveningSourceRefresh;
  if (!refresh) return false;
  const chain = refresh.chain ?? [refresh];
  if (!Array.isArray(chain) || chain.length === 0) return false;
  const previousUpdate = state.update - 1;
  const prefix = `docs/releases/update${previousUpdate}`;
  const original = read(workspace, `${prefix}-verification.json`).deploymentVerification;
  if (original.deploymentVerified !== true || original.update !== previousUpdate || original.revision !== capturedSource ||
      !(timestamp(original.at) <= capturedAt)) return false;
  let previousSource = capturedSource;
  let previousTime = capturedAt;
  let refreshPath;
  for (const step of chain) {
    if (typeof step?.slug !== 'string' || !/^[a-z]+(?:-[a-z]+)*$/.test(step.slug)) return false;
    refreshPath = `${prefix}-${step.slug}-verification.json`;
    const intervening = read(workspace, refreshPath).deploymentVerification;
    const activatedAt = timestamp(step.activatedAt);
    const verifiedAt = timestamp(intervening.at);
    const matchingFingerprint = key => /^[a-f0-9]{64}$/.test(refresh.captured?.[key]) &&
      refresh.captured[key] === step.current?.[key];
    if (intervening.deploymentVerified !== true || intervening.update !== previousUpdate || !/^[a-f0-9]{40}$/.test(intervening.revision) ||
        intervening.verifiedPreviousSourceCommit !== previousSource || !isDeepStrictEqual(intervening.migrations, []) ||
        intervening.existingBindingsUnchanged !== true || intervening.nonAppResourcesUnchanged !== true ||
        !['databaseSchema', 'migrations', 'media', 'recoveryModule'].every(matchingFingerprint) ||
        !(previousTime < activatedAt && activatedAt <= verifiedAt && verifiedAt <= deployedAt)) return false;
    previousSource = intervening.revision;
    previousTime = verifiedAt;
  }
  return previousSource === state.baselineCommit && record.interveningDeploymentEvidence === refreshPath;
}

function verifyDataExportRecovery(state, recordPath, workspace, privateRoot, provider, artifacts) {
  const recovery = state.recoveryProcess;
  assert.equal(recovery.releaseMetadataHandover.evidence, recordPath,
    'The owner release record must reference the matching data-export recovery receipt');
  const record = read(workspace, recordPath);
  const prepared = record.preparedBeforeDeployment === true;
  assert.ok(record.update === state.update && record.sourceCommit === state.sourceCommit &&
    record.verifiedAt === recovery.sourceBaselineVerifiedAt &&
    recovery.sourceBaselineUpdate === state.update && recovery.matchingCurrentReleaseBaseline === true &&
    recovery.hostedValidationPending === false && recovery.hostedValidationPassed === true,
  'Data-export recovery receipt does not match the live release and its validation timestamp');
  assert.ok(record.databaseExportPerformed === true &&
    record.newDataSnapshots === recovery.releaseMetadataHandover.newDataSnapshots &&
    record.independentDownloadDecryptionVerified === true && record.fullReconstructionVerified === true &&
    record.hostedValidationPassed === true && record.hostedValidateOnlyConfirmed === true &&
    (prepared ? record.priorRecoveryPointsPreserved === true : record.preMigrationSnapshotPreserved === true),
  'Data export, independent reconstruction, and hosted validation must have passed');

  const registrationFile = prepared ? 'prepared-recovery.private.json' : 'post-migration-recovery.private.json';
  const registration = read(workspace, `${artifacts}/${registrationFile}`);
  const { snapshot } = registration;
  const pointer = provider.baseline;
  const capturedAt = timestamp(snapshot?.createdAt);
  const deployedAt = timestamp(state.verifiedAt);
  const verifiedCapture = prepared
    ? registration.preparedBeforeDeployment === true && registration.schemaUnchanged === true &&
      registration.priorRecoveryPointsPreserved === true && record.preparedSnapshotAt === snapshot?.createdAt &&
      verifyPreparedCaptureSource(state, record, registration, workspace, capturedAt, deployedAt) &&
      capturedAt <= deployedAt && deployedAt <= timestamp(registration.registeredAt)
    : registration.preMigrationBackupPreserved === true && snapshot?.createdAt === record.postMigrationSnapshotAt &&
      capturedAt >= deployedAt;
  assert.ok(!provider.releaseBaseline && typeof snapshot?.id === 'string' &&
    /^[A-Za-z0-9-]+$/.test(snapshot.id) &&
    typeof snapshot.snapshotObject === 'string' && snapshot.snapshotObject &&
    pointer?.snapshotId === snapshot.id && pointer.snapshotObject === snapshot.snapshotObject &&
    pointer.implementationCommit === state.sourceCommit &&
    registration.update === state.update && registration.sourceCommit === state.sourceCommit &&
    registration.databaseExportPerformed === true && registration.newDataSnapshots === record.newDataSnapshots &&
    registration.sourceBuildVerified === true && registration.fullReconstructionVerified === true &&
    verifiedCapture && snapshot.verified === true && snapshot.liveUpdate === state.update &&
    timestamp(record.verifiedAt) >= timestamp(registration.registeredAt) &&
    timestamp(registration.registeredAt) >= capturedAt,
  'Private data-export recovery registration does not match the verified live release');
  const index = read(privateRoot, 'index.json');
  assert.ok(!index.releaseBaseline && isDeepStrictEqual(index.cloudBaseline, snapshot) &&
    Array.isArray(index.snapshots) && index.snapshots.some(entry => isDeepStrictEqual(entry, snapshot)),
  'Registered data-export recovery snapshot differs from the recovery index');
}

export function verifyPriorPublishedRelease(state, candidateUpdate, history) {
  const releaseTag = `update${state.update}`;
  const { publicationTag, publishedSourceCommit } = state.gitSource;
  if (candidateUpdate <= state.update || publicationTag !== releaseTag || !publishedSourceCommit) return;

  const entry = history.find(({ update }) => update === state.update);
  assert.equal(entry?.github?.releaseTag, releaseTag, `Version history must link to the published ${releaseTag} release`);
  assert.equal(entry.github.commit, publishedSourceCommit, `Version history must link to the verified ${releaseTag} source commit`);
}

export async function verifyProductionBaseline(workspace, target, getDeployments = readDeployments, options = {}) {
  const state = read(workspace, releaseRecordRelativePath(workspace));
  const label = `update${state.update}`;
  verifyOrRefresh(workspace);
  verifyPriorPublishedRelease(state, releaseInfo.build.update, releaseHistory);
  const recovery = recoveryState(state);
  const timeTravel = recovery.kind === 'schema-deferred' && state.update === 197 && state.sourceCommit === update197Source &&
    Boolean(options.planPath ?? process.env.DEPLOY_REVIEWED_PLAN);
  assert.ok(!recovery.pending || timeTravel, `${label} needs a verified ${recovery.kind} handoff before another release can go live`);
  assert.ok(typeof state.applicationSnapshot === 'string' && state.applicationSnapshot.length > 0,
    'Run the rollout check against the owner workspace with the immutable release snapshot');
  const artifact = state.deploymentRefresh?.slug ?? label;
  const artifacts = `${state.applicationSnapshot}/artifacts/${artifact}`;
  const receiptLabel = state.deploymentRefresh ? `${label}-${artifact}` : label;
  const recordPath = `docs/releases/${receiptLabel}-recovery-verification.json`;

  const privateRoot = resolve(workspace, '../private/backup-v2');
  const { provider } = read(privateRoot, 'cloud-settings.json');
  assert.ok(typeof provider.accountId === 'string' && provider.accountId &&
    typeof provider.scriptName === 'string' && provider.scriptName,
  'Owner recovery settings do not identify the production Worker');
  if (target) {
    assert.ok(target.accountId === provider.accountId && target.scriptName === provider.scriptName,
      'Pulumi target does not match the configured recovery Worker');
  }
  if (recovery.kind === 'source-only') {
    verifySourceOnlyRecovery(state, label, recordPath, workspace, privateRoot, provider);
  } else if (!timeTravel) {
    verifyDataExportRecovery(state, recordPath, workspace, privateRoot, provider, artifacts);
  }

  const deployment = read(workspace, `${artifacts}/handover-verification.private.json`);
  assert.ok(deployment.deploymentVerified === true && deployment.revision === state.sourceCommit,
    'Private deployment receipt does not match the live release source');
  const expected = deployment.deployment;
  assert.ok(typeof expected?.id === 'string' && expected.id &&
    expected.versions?.length === 1 && expected.versions[0].percentage === 100,
  'Private deployment receipt must identify the fully active Worker version');
  const token = readFileSync(resolve(privateRoot, 'cloudflare-read-token.txt'), 'utf8').trim();
  assert.ok(token, 'Owner deployment read credential is unavailable');
  if (timeTravel) {
    const previousPath = 'docs/releases/update196-recovery-verification.json';
    const previous = read(workspace, previousPath);
    const before = read(workspace, 'docs/releases/update196-verification.json').deploymentVerification;
    assert.ok(before.update === 196 && before.deploymentVerified === true && before.revision === state.baselineCommit &&
      isDeepStrictEqual(deployment.migrations, ['0046_companion_library.sql']),
      'Time Travel requires the verified update196 recovery and update197 migration receipts');
    verifySourceOnlyRecovery({
      update: 196, sourceCommit: state.baselineCommit, verifiedAt: before.at,
      recoveryProcess: {
        sourceBaselineVerifiedAt: previous.verifiedAt,
        update196SourceOnlyHandover: { evidence: previousPath },
      },
    }, 'update196', previousPath, workspace, privateRoot, provider);
    await verifyUpdate197TimeTravel({
      workspace, privateRoot, state, artifactRoot: resolve(workspace, artifacts), deployment: expected,
      provider, target, token, previousVerifiedAt: before.at, build: options.build ?? releaseInfo.build,
      candidateRoot: options.candidateRoot ?? candidateRoot,
      planPath: options.planPath ?? process.env.DEPLOY_REVIEWED_PLAN,
      buildRoot: options.buildRoot ?? process.env.DEPLOY_BUILD_ROOT,
      fetchCloudflare: options.fetchCloudflare, now: options.now, getCandidate: options.getCandidate,
      checkGuideAssets: options.checkGuideAssets,
    });
  } else {
    assert.ok(isDeepStrictEqual(provider.expectedDeployment, expected), 'Configured recovery Worker version differs from the deployment receipt');
  }
  const [active] = await getDeployments(provider.accountId, provider.scriptName, token);
  assert.ok(isDeepStrictEqual(active && { id: active.id, versions: active.versions }, expected),
    'The active Worker changed. Verify its handoff and recovery before the next rollout');
  return timeTravel ? { update: state.update, timeTravel: true } : { update: state.update };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [workspace, accountId, scriptName] = process.argv.slice(2);
    assert.ok(process.argv.length === 3 || process.argv.length === 5,
      'Usage: node scripts/production-release-preflight.mjs OWNER_WORKSPACE [ACCOUNT_ID SCRIPT_NAME]');
    const { update, timeTravel } = await verifyProductionBaseline(resolve(workspace),
      accountId === undefined ? undefined : { accountId, scriptName });
    const recovery = recoveryState(read(resolve(workspace), releaseRecordRelativePath(resolve(workspace))));
    if (timeTravel) {
      console.log(`Production preflight passed: update${update} has an approved D1 Time Travel bookmark for this plan. Off-device schema recovery is still pending.`);
    } else {
      console.log(`Production preflight passed: update${update} is active with a verified handoff and ${recovery.kind} recovery.`);
    }
  } catch (error) {
    const reason = error.code === 'ENOENT' ? 'Required owner release or recovery evidence is missing' :
      error instanceof assert.AssertionError ? error.message : 'Could not read or verify owner release evidence';
    console.error(`Production rollout blocked: ${reason}`);
    process.exitCode = 1;
  }
}
