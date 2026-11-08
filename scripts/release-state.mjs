#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
export const handoffs = ['README.md', 'HANDOFF.md', 'HOSTING_HANDOFF.md', 'docs/HANDOFF.md', 'docs/REBUILD.md', 'docs/RECOVERY.md'];
const start = '<!-- release-state:start -->', end = '<!-- release-state:end -->';
const check = (condition, message) => assert.ok(condition, `Release state: ${message}`);
const boolean = (value, name) => check(typeof value === 'boolean', `${name} must be boolean`);
const hash = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);

// Interpret explicit public recovery records without rewriting historical shapes
// or inferring completion from an older release's successful flags.
export function recoveryState(state) {
  const recovery = state.recoveryProcess;
  check(recovery && typeof recovery === 'object', 'recoveryProcess is required');
  const handover = recovery[`update${state.update}SourceOnlyHandover`];
  const exported = recovery.releaseMetadataHandover;
  if (exported?.update === state.update && exported.dataExportPerformed === true) {
    check(!handover, 'conflicting current source-only and data-export recovery records');
    check(exported.matchingPreparedSourceCommit === state.sourceCommit, 'data-export recovery source differs');
    check(Number.isSafeInteger(exported.newDataSnapshots) && exported.newDataSnapshots > 0, 'data-export recovery needs a recorded snapshot count');
    boolean(exported.registered, 'data-export recovery registered');
    boolean(exported.hostedValidationPassed, 'data-export hostedValidationPassed');
    if (exported.registered) {
      check(recovery.sourceOnlyHandoverPending !== true, 'completed data-export recovery conflicts with pending source-only recovery');
      check(exported.hostedValidationPassed === true && exported.independentDownloadDecryptionVerified === true && exported.fullReconstructionVerified === true, 'completed data-export recovery lacks verification');
    }
    return { kind: 'data-export', pending: !exported.registered };
  }
  boolean(recovery.sourceOnlyHandoverPending, 'sourceOnlyHandoverPending');
  check(handover && typeof handover === 'object', 'current source-only recovery record is missing');
  // Observed records use databaseExport (130/131), dataExport (129), or
  // newDataExport (127). Every supplied alias must agree; none may imply export.
  const exports = ['databaseExport', 'dataExport', 'newDataExport'].filter(key => key in handover);
  check(exports.length > 0 && exports.every(key => handover[key] === false), 'source-only handover has missing/conflicting export evidence');
  if ('metadataOnly' in handover) check(handover.metadataOnly === true, 'source-only handover must be metadata only');
  if ('newDataSnapshots' in handover) check(handover.newDataSnapshots === 0, 'source-only handover must not create data snapshots');
  if ('registrationPending' in handover) {
    boolean(handover.registrationPending, 'registrationPending');
    check(handover.registrationPending === recovery.sourceOnlyHandoverPending, 'current recovery handover disagrees with pending flag');
    check(handover.metadataOnly === true, 'explicit handover requires metadataOnly');
  } else {
    // The completed update127 shape does not include registrationPending.
    check(recovery.sourceOnlyHandoverPending === false && handover.verified === true && handover.independentReconstructionPassed === true && handover.hostedValidationPassed === true && handover.dataSnapshotsAndTimestampsUnchanged === true && handover.newDataExport === false && handover.newDataSnapshots === 0, 'unrecognized legacy recovery record');
  }
  if (!recovery.sourceOnlyHandoverPending) {
    check(recovery.sourceBaselineUpdate === state.update, 'completed recovery baseline differs from this update');
    check(recovery.metadataOnlyHandoverVerified === true && recovery.metadataValidationPassed === true && recovery.hostedValidationPending === false && recovery.hostedValidationPassed === true, 'completed recovery lacks metadata/hosted verification');
  }
  return { kind: 'source-only', pending: recovery.sourceOnlyHandoverPending };
}

// Validate the selected current contract. Historical nested records remain intact.
export function validateRelease(state, receipt) {
  check(Number.isSafeInteger(state.update) && state.update > 0, 'update must be a positive integer');
  check(hash(state.sourceCommit), 'sourceCommit must be a full Git SHA');
  check(state.evidence === `docs/releases/update${state.update}-verification.json`, 'evidence path must identify this update');
  check(typeof state.verifiedAt === 'string' && Number.isFinite(Date.parse(state.verifiedAt)), 'verifiedAt must be a date');
  check(state.gitSource?.implementationCommit === state.sourceCommit, 'gitSource revision differs');
  check(state.gitSource?.branch === state.sourceBranch, 'gitSource branch differs');
  check(state.gitSource?.githubLogin === 'yinyangeqlab' && state.gitSource?.authorAndCommitterVerified === true, 'lab identity evidence is missing');
  for (const field of ['pushed', 'publicationAuthorized']) boolean(state.gitSource[field], `gitSource.${field}`);
  check(!state.gitSource.pushed || state.gitSource.publicationAuthorized, 'published source lacks publication authorization');
  const deployment = receipt.deploymentVerification;
  check(receipt.update === state.update && deployment?.update === state.update, 'receipt update differs');
  check(receipt.sourceCommit === state.sourceCommit && deployment?.revision === state.sourceCommit, 'receipt source differs');
  check(receipt.candidateVerification?.sourceRevision === state.sourceCommit, 'candidate source differs');
  for (const field of ['regressionSuitesPassed', 'regressionSuitesFailed']) check(Number.isSafeInteger(receipt.candidateVerification[field]) && receipt.candidateVerification[field] >= 0, `candidate ${field} must be a non-negative integer`);
  for (const field of ['physicalAudioQualityVerified', 'expandedNativeMenuPixelsCertified']) if (receipt.browserVerification && field in receipt.browserVerification) boolean(receipt.browserVerification[field], `browserVerification.${field}`);
  check(deployment?.deploymentVerified === true, 'deployment is not verified');
  check(deployment.at === state.verifiedAt, 'verification timestamp differs');
  check(state.cpuLimitMs === 5000 && deployment.cpuMs === 5000 && deployment.abuseBindings === 6 && deployment.publicWorkerUrls === false, 'required deployment protections differ');
  boolean(state.maintenanceFreeze?.active, 'maintenanceFreeze.active');
  boolean(state.ownerOnlyMaintenance?.enabled, 'ownerOnlyMaintenance.enabled');
  boolean(deployment.maintenanceDisabled, 'receipt maintenanceDisabled');
  boolean(deployment.ownerOnlyMaintenance, 'receipt ownerOnlyMaintenance');
  check(state.maintenanceFreeze.active === !deployment.maintenanceDisabled && state.ownerOnlyMaintenance.enabled === deployment.ownerOnlyMaintenance, 'maintenance state differs from receipt');
  recoveryState(state);
  // Never rewrite a receipt to reconcile it with a later recovery closeout.
  // Current recovery state comes from the matching public recovery record.
  boolean(receipt.sourceOnlyRecoveryRegistrationPending ?? receipt.recoveryRegistrationPending, 'receipt recovery pending');
  return state;
}

export function renderState(state, receipt) {
  const recovery = recoveryState(state), pending = recovery.pending;
  const recoveryText = recovery.kind === 'data-export'
    ? (pending ? 'Data export recorded; matching recovery registration pending' : 'Matching recovery registration recorded as verified, including a separately recorded data export')
    : (pending ? 'Matching source-only handover pending; do not claim this release has a registered recovery baseline' : 'Matching source-only metadata handover recorded as verified');
  const browser = receipt.browserVerification;
  return `<!-- Generated by scripts/release-state.mjs; edit authoritative records, then refresh. -->
# Recorded live state

This view describes the recorded production release. It does not assert that this checkout, public main or a new build matches production.

| Field | Recorded value |
| --- | --- |
| Release | update${state.update} |
| Source | \`${state.sourceCommit}\` |
| Verified at | ${state.verifiedAt} |
| Deployment | Verified by the [deployment receipt](${state.evidence}) |
| Maintenance | Feature freeze ${state.maintenanceFreeze.active ? 'active' : 'off'}; owner-only maintenance ${state.ownerOnlyMaintenance.enabled ? 'on' : 'off'} |
| Publication | ${state.gitSource.pushed ? 'Source recorded as pushed' : 'Source not pushed'}; publication ${state.gitSource.publicationAuthorized ? 'authorized in this record' : 'not authorized in this record'} |
| Recovery | ${recoveryText} |

Source/build metadata registration is separate from a fresh data export. ${recovery.kind === 'data-export' ? 'The recorded export has its own capture time and coverage; registration does not make it a new live-data capture.' : 'Existing encrypted off-device backup data retains its original coverage and timestamp.'} Generating this view performs no recovery operation.

The immutable source/build and infrastructure paths remain in [LIVE_RELEASE.json](LIVE_RELEASE.json). Owner snapshot checks use that record in the owner root. Private inputs are intentionally absent from public clones. Candidate source hashes live separately in [docs/rebuild-manifest.json](docs/rebuild-manifest.json).

The deployment receipt records ${receipt.candidateVerification.regressionSuitesPassed} regression suites passed and ${receipt.candidateVerification.regressionSuitesFailed} failed for its source; these are historical deployment results, not results for this working tree. Physical audio is ${browser?.physicalAudioQualityVerified === true ? 'recorded as verified' : 'not certified'}; native expanded-menu pixels are ${browser?.expandedNativeMenuPixelsCertified === true ? 'recorded as certified' : 'not certified'}. Read the receipt and review record for browser/device limits.

Start new work at [docs/HANDOFF.md](docs/HANDOFF.md) and [docs/ENGINEERING.md](docs/ENGINEERING.md). Older handoffs are [preserved history](docs/history/foundation-20261031/README.md), not deployment instructions.
`;
}

export function replaceBlock(text, state, path) {
  check(text.split(start).length === 2 && text.split(end).length === 2, `${path}: exactly one generated block required`);
  const first = text.indexOf(start), last = text.indexOf(end);
  check(first < last, `${path}: reversed block markers`);
  const prefix = path.startsWith('docs/') ? '../' : '';
  const block = `${start}\nRecorded deployment: **update${state.update}**, source \`${state.sourceCommit}\`.\nCurrent maintenance, publication and recovery status: [LIVE_STATE.md](${prefix}LIVE_STATE.md).\n${end}`;
  return text.slice(0, first) + block + text.slice(last + end.length);
}

export function verifyOrRefresh(directory, write = false) {
  const state = JSON.parse(readFileSync(resolve(directory, 'LIVE_RELEASE.json'), 'utf8'));
  check(state.evidence === `docs/releases/update${state.update}-verification.json`, 'invalid evidence path');
  const receipt = JSON.parse(readFileSync(resolve(directory, state.evidence), 'utf8'));
  validateRelease(state, receipt);
  // Prepare every result before writing, so malformed handoff markers cause no partial refresh.
  const outputs = new Map([['LIVE_STATE.md', renderState(state, receipt)], ...handoffs.map(path => [path, replaceBlock(readFileSync(resolve(directory, path), 'utf8'), state, path)])]);
  const stale = [...outputs].filter(([path, text]) => readFileSync(resolve(directory, path), 'utf8') !== text);
  if (write) for (const [path, text] of stale) writeFileSync(resolve(directory, path), text);
  else check(stale.length === 0, `generated views differ: ${stale.map(([path]) => path).join(', ')}; review records, then run npm run release:refresh`);
  return { update: state.update, changed: stale.map(([path]) => path) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    check(process.argv.slice(2).every(arg => arg === '--write') && process.argv.length <= 3, 'usage: node scripts/release-state.mjs [--write]');
    const result = verifyOrRefresh(root, process.argv.includes('--write'));
    console.log(`Release state update${result.update}: ${process.argv.includes('--write') ? `refreshed ${result.changed.length} views` : `receipt and all ${handoffs.length + 1} views agree`}. No deployment/recovery operation.`);
    if (process.argv.includes('--write')) console.log('Next: review the generated diff, run npm run source:refresh (explicitly approve any new source paths), then npm run verify.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
