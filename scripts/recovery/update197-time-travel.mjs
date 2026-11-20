import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { verifyGuideAssets } from '../guide-assets.mjs';

export const update197Source = '99435a51079ac28b0983ccd8c85341b25e04f7bf';
const update196Source = 'edab759cfdea525ff2c9bf51ed87fb3046c30e66';
const migration = '0046_companion_library.sql';
const schemaQuery = "SELECT type,name,tbl_name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY type,name";
const day = 86_400_000;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const time = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|\+00:00)$/.test(value)
  ? Date.parse(value) : NaN;
const bookmarkFormat = /^[a-f\d]{8}-[a-f\d]{8}-[a-f\d]{8}-[a-f\d]{32}$/;
const reviewFiles = new Set([
  'site/lib/release-history.ts', 'site/lib/release-info.ts',
  'scripts/deploy-reviewed.sh', 'scripts/production-release-preflight.mjs',
  'scripts/release-state.mjs', 'scripts/recovery/update197-time-travel.mjs',
  'scripts/check_production_release_preflight.mjs', 'scripts/check_foundation.mjs',
]);

function ownerFile(path) {
  assert.ok(isAbsolute(path) && realpathSync(path) === path, 'Use an absolute, unlinked owner evidence path');
  const file = lstatSync(path);
  assert.ok(file.isFile() && file.uid === process.getuid() && (file.mode & 0o077) === 0,
    'Time Travel approval and plan must be owner-only files');
  return readFileSync(path);
}

function readCandidate(root) {
  const commit = git(root, 'rev-parse', 'HEAD');
  git(root, 'merge-base', '--is-ancestor', update197Source, commit);
  return {
    commit,
    status: git(root, 'status', '--porcelain', '--untracked-files=normal'),
    changes: git(root, 'diff', '--name-only', '--no-renames', update197Source, commit).split('\n'),
  };
}

export async function verifyUpdate197TimeTravel({
  workspace, privateRoot, state, artifactRoot, deployment, provider, target, token, previousVerifiedAt, planPath,
  build, candidateRoot, buildRoot, fetchCloudflare = fetch, now = Date.now, getCandidate = readCandidate,
  checkGuideAssets = verifyGuideAssets,
}) {
  assert.ok(state.update === 197 && state.sourceCommit === update197Source && state.baselineCommit === update196Source &&
    state.recoveryProcess.schemaRecoveryDeferred === true && build.update === 198 && build.basedOn === 197 &&
    build.preview === 0 && target && provider.databaseId, 'Time Travel approval is limited to the update197 Version links rollout');
  assert.ok(planPath, 'Provide the reviewed rollout plan for the Time Travel check');
  assert.ok(buildRoot && realpathSync(buildRoot) === candidateRoot, 'Use the reviewed candidate as the deployment build root');

  const approval = JSON.parse(ownerFile(resolve(privateRoot, 'update197-time-travel-approval.json')));
  const planBytes = ownerFile(planPath);
  const candidate = getCandidate(candidateRoot);
  assert.ok(approval.kind === 'update197-d1-time-travel-v1' && approval.sourceCommit === update197Source &&
    approval.candidateCommit === candidate.commit && approval.planSha256 === sha256(planBytes) &&
    approval.accountId === provider.accountId && approval.databaseId === provider.databaseId &&
    approval.scriptName === provider.scriptName && approval.deploymentId === deployment.id,
    'Time Travel approval does not match the candidate, plan, or production deployment');

  assert.ok(candidate.status === '', 'The reviewed candidate must have a clean source tree');
  assert.ok(candidate.changes.includes('site/lib/release-history.ts') &&
    candidate.changes.every(path => path.startsWith('docs/') || reviewFiles.has(path)),
    'The Time Travel rollout allows only the reviewed Version links and release tooling changes');

  const client = resolve(candidateRoot, 'dist/client');
  const plan = JSON.parse(planBytes);
  const changedResources = Object.entries(plan.resourcePlans).filter(([, resource]) =>
    !isDeepStrictEqual(resource.steps, ['same']));
  assert.equal(changedResources.length, 1, 'The Time Travel plan must update only the application Worker');
  const [urn, worker] = changedResources[0];
  const updates = worker.goal?.inputDiff?.updates;
  assert.ok(urn.endsWith('::target-shootout-worker') && isDeepStrictEqual(worker.steps, ['update']) &&
    worker.goal?.type === 'cloudflare:index/workersScript:WorkersScript' &&
    worker.state?.accountId === provider.accountId && worker.state?.scriptName === provider.scriptName &&
    isDeepStrictEqual(Object.keys(worker.goal.inputDiff).sort(), ['updates']) &&
    isDeepStrictEqual(Object.keys(updates ?? {}).sort(), ['assets', 'files']) &&
    updates.assets?.directory === client &&
    isDeepStrictEqual(Object.keys(updates.assets).sort(), ['config', 'directory']) &&
    isDeepStrictEqual(Object.keys(updates.assets.config ?? {}), ['runWorkerFirst']) &&
    Array.isArray(worker.state.assets?.config?.runWorkerFirst) &&
    isDeepStrictEqual(updates.assets.config.runWorkerFirst, worker.state.assets.config.runWorkerFirst),
    'The reviewed plan must change only the application Worker code and assets');
  checkGuideAssets(client);

  const schemaBytes = readFileSync(resolve(artifactRoot, 'migrated-schema.private.json'));
  const schema = JSON.parse(schemaBytes);
  assert.ok(approval.schemaReceiptSha256 === sha256(schemaBytes) &&
    schema.migration === migration && schema.existingPreMigrationRecoveryVerified === true &&
    schema.newDataExport === false && Array.isArray(schema.definitions) &&
    schema.migrationSha256 === sha256(readFileSync(resolve(workspace, state.applicationSnapshot, 'site/drizzle', migration))),
    'The approved migration receipt must match the verified update197 schema');

  const bookmarked = time(approval.bookmarkAt), approved = time(approval.approvedAt);
  const expires = time(approval.expiresAt);
  assert.ok(typeof approval.bookmark === 'string' && bookmarkFormat.test(approval.bookmark) &&
    time(previousVerifiedAt) < time(schema.appliedAt) && time(schema.appliedAt) <= time(state.verifiedAt) &&
    time(state.verifiedAt) <= bookmarked && bookmarked <= approved && approved <= now() &&
    now() < expires && expires <= bookmarked + day,
    'Time Travel approval or bookmark is expired or outside the verified migration window');

  const account = 'accounts/' + encodeURIComponent(provider.accountId);
  const database = account + '/d1/database/' + encodeURIComponent(provider.databaseId);
  const settings = account + '/workers/scripts/' + encodeURIComponent(provider.scriptName) + '/settings';
  async function request(path, label, options = {}) {
    const response = await fetchCloudflare('https://api.cloudflare.com/client/v4/' + path, {
      ...options, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      redirect: 'error', signal: AbortSignal.timeout(30_000),
    });
    assert.ok(response.ok, label + ' could not be verified with Cloudflare');
    const body = await response.json();
    assert.ok(body.success === true, label + ' could not be verified with Cloudflare');
    return body.result;
  }
  const bookmarkAt = timestamp => request(database + '/time_travel/bookmark?' + new URLSearchParams({ timestamp }),
    'Time Travel bookmark');
  const [bindings, result, prior, migrated, current] = await Promise.all([
    request(settings, 'Production Worker database binding'),
    request(database + '/query', 'Production D1 schema', {
      method: 'POST', body: JSON.stringify({ sql: schemaQuery, params: [] }),
    }),
    bookmarkAt(previousVerifiedAt),
    bookmarkAt(state.verifiedAt),
    bookmarkAt(approval.bookmarkAt),
  ]);
  const bound = bindings?.bindings?.filter(binding => binding.name === 'DB');
  assert.ok(bound?.length === 1 && bound[0].type === 'd1' &&
    (bound[0].database_id ?? bound[0].id) === provider.databaseId, 'The live Worker database binding changed');
  const query = result?.[0];
  assert.ok(result?.length === 1 && query.success === true && query.meta?.changed_db !== true &&
    (query.meta?.rows_written ?? 0) === 0 && isDeepStrictEqual(query.results, schema.definitions),
    'The live D1 schema differs from the approved migration receipt');
  assert.ok(typeof prior?.bookmark === 'string' && bookmarkFormat.test(prior.bookmark) &&
    typeof migrated?.bookmark === 'string' && bookmarkFormat.test(migrated.bookmark) &&
    prior.bookmark < migrated.bookmark && migrated.bookmark <= approval.bookmark &&
    current?.bookmark === approval.bookmark, 'Cloudflare did not confirm the approved post-migration bookmark');
}
