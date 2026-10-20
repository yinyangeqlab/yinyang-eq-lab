Current live release is update94.0033/0034 applied; a fresh database uses all35 migrations. Matching encrypted off-device backup, full reconstruction and the refreshed hosted baseline are verified; the daily backup schedule is enabled. See LIVE_RELEASE.json for the latest verified status. Historical update93/81 instructions below require their matching source/schema.

# Recovery and workspace guide

Current live release is update93 with invites off; see HANDOFF.md. The approved nickname feature and migration0032 are live; a fresh database uses all33 migrations. Recovery rehearsals and the existing private update81 bundle below are historical and require their matching source/migration revision. No new recovery bundle or production restoration was made for update82. Keep any recovery environment closed until its ownership/deletion review is complete.

## One development checkout

The owner container has one active development checkout: `workspace/`. Fetch, edit, test, commit and push there. Its tracked files match GitHub after publication. Dependencies and local state stay ignored. Do not run a blind pull over local changes; inspect status and divergence first.

The parent folder retains a verified update81 source mirror and `work/` release snapshots for provenance. Existing Git worktree paths stay in place to preserve Git metadata. `archive/legacy-workspaces-20261018` holds inactive old previews, independent checkouts and generated output. `private/` contains external recovery inputs. These areas are outside the canonical Git checkout and must never be committed. The parent README and AGENTS.md direct new sessions here.

## Current recovery snapshot

The verified encrypted snapshot is update81, bound to Git revision `33f80d6bb04d9fa1b66de47368d733c5f41c5eac` and its migration/source fingerprints. A separate session released update82 while this backup was uploading. This is not an update82 database backup. Restore/verify this bundle using the recorded matching revision; do not rewrite its manifest to bypass compatibility checks. Future current-release snapshots require a fresh current export and matching source.

## What recovery reproduces

Git provides the application, schema/migrations, public assets, dependency locks, gate/deployment code, safety policies and restore tooling. The external bundle supplies the exact authorized media and a sanitized current application database. Together they reproduce content, target relationships, saved server-side records and ranking inputs in a fresh local database. Generated source/build hashes are checked; byte-identical compiled output across operating systems is not promised.

Fresh secrets are generated. Active invitations, browser pairing payloads, devices, data sessions and throttling state are invalidated/removed; old credentials cannot sign in. Stable record IDs are retained only to preserve data relationships, not Cloudflare account/database IDs. Reissue/relink access to existing ownership only after verifying the relevant user; never automatically assign historical private records to a new invite. Keep a recovered production system closed until access and erasure management are reviewed. Browser-only measurements/preferences/music files require a separate owner-provided browser export or the existing authorized Sync browsers flow; server backups cannot capture them.

This process does not deploy or mutate production. Domain routes, account/database/resource identifiers, backend state and credential values are not copied from Git. Existing live recovery and new-account provisioning are distinct operations. Recreating external Cloudflare routes, edge/WAF and the independent guard requires authorized provider setup; app Pulumi alone does not create those external protections. The checked-in configuration examples use placeholders and the gate/guard accept explicit domain bindings.

## Reproducible toolchain

Use the exact Node version in `.node-version` / `.nvmrc` (26.12.0) and npm12.2.1. Then:

```sh
npm run recovery:environment
npm ci
node scripts/check-live-source.mjs --source-only
npm run test:recovery
```

Dependencies are locked for app and infra separately. The environment check deliberately refuses mismatches. A build under this pinned toolchain was tested on Linux. This pins language/tool dependencies, not the entire operating-system image; preserve a verified immutable build if byte-for-byte rollback is required.

## 1. Take an external current data snapshot

Use only an authorized **current live export**, never a historical recovery DB. Supply a private Wrangler source config outside Git with the existing account/D1 binding named DB. Supply CLOUDFLARE_API_TOKEN through the existing secret manager/environment; never put a value in command text or source. The export command only reads the remote DB:

```sh
node scripts/recovery/snapshot-d1.mjs \
  --config /absolute/private/source-wrangler.json \
  --out /absolute/private/current-export
```

The output directory must not exist and must be outside a Git checkout. Raw export SQL/database files are removed after credential sanitization. The private output contains database.sqlite, review.json and private diagnostics. Keep it on access-controlled encrypted storage; filesystem permissions are restricted but the tool does not itself encrypt backups.

A review file binds a database checksum to an owner deletion review:

```json
{
  "databaseSha256": "SHA256_OF_SANITIZED_DATABASE",
  "reviewedAt": "CURRENT_UTC_ISO_TIME",
  "source": "current-live-export",
  "deletedRecordsExcluded": true
}
```

Fresh export creates this review at export time. It is valid for packing at that time, not permanent permission to restore in the future. Before a later restore, reconcile deletions/withdrawals since export using current authoritative records and produce a new reviewed database/review (`privacy-reconciled-export` where appropriate). Restore review must be newer than bundle creation, less than24 hours old and match the exact DB checksum. The export-time packing review cannot authorize a later restore unchanged. This is an owner attestation, not cryptographic proof that deletion reconciliation occurred. **If current deletion status cannot be established, do not restore participant records.** Use a freshly approved catalog-only dataset instead. No tool can infer later deletions from a lost old backup alone.

If a database is supplied separately, close/checkpoint it first and sanitize a copy:

```sh
npm run recovery -- sanitize-db --input /private/current.sqlite --output /private/sanitized.sqlite
```

Do not treat sanitization as a deletion audit; it removes credentials, not withdrawn records.

## 2. Pack verified external media/data

Restore media only from the owner's authorized original package, not arbitrary new downloads expected to sound the same. Every file must match LIVE_RELEASE.json, including checksums and the complete340-asset/200-recording set.

```sh
npm run recovery -- pack \
  --public /absolute/verified-release/public \
  --database /absolute/private/current-export/database.sqlite \
  --attestation /absolute/private/current-export/review.json \
  --out /absolute/private/bundle-update81
npm run recovery -- verify --bundle /absolute/private/bundle-update81
```

The bundle has a versioned manifest, source/migration fingerprint, file sizes and SHA-256 checksums. No symlinks, path traversal, missing media, unexpected asset paths or output overwrites are accepted. Bundles are private data, not Git artifacts. Copies are independent of release-source media (no mutable hardlink sharing). See [ENCRYPTED_BACKUP.md](ENCRYPTED_BACKUP.md) for encrypted off-device storage and retrieval. Destination records and recovery keys stay private. No recurring backup or retention automation is configured; future snapshots require current data and deletion review.

## 3. Restore into a fresh local checkout

Clone the matching recovery revision of GitHub into a new directory outside the owner private bundle. Install locked dependencies; do not initialize a database first. Obtain a fresh deletion review bound to the bundle's exact sanitized DB checksum. Then:

```sh
npm run recovery -- restore \
  --bundle /absolute/private/bundle-update81 \
  --checkout /absolute/fresh-checkout \
  --attestation /absolute/private/current-review.json \
  --import-local yes
```

Restore refuses existing .dev.vars, local DB state or .recovery-local; it also refuses overwriting changed public assets. It writes private local SQLite/SQL/report files under ignored .recovery-local, imports only into Wrangler's local D1, and generates new random local secrets. No remote import path exists in this command. A failed import leaves private diagnostics for inspection and is not silently retried over partial state; use a new fresh checkout after reviewing the failure.

Verify:

```sh
npm run build
node scripts/package-static-assets.mjs
npx tsc --noEmit
npm run test:recovery
node scripts/recovery/prepare-local-worker.mjs
node node_modules/wrangler/bin/wrangler.js dev --local --ip 127.0.0.1 --port 8932 --config .recovery-local/worker/wrangler.json --persist-to .wrangler/state
```

In another terminal, run `node scripts/recovery/check-local.mjs` from the restored checkout. This command accepts only an HTTP loopback origin and a completed local-restore report; it checks fresh local auth, target/ranking APIs, exact protected audio bytes and Sync, then erases its disposable local tester.

Full packaging must verify340 assets/200 recordings; public-only packaging remains a nondeployable preview. The local Worker includes the production gate, media routing and six abuse bindings. Its config has only local placeholder DB IDs and no production account/routes. The simpler npm run dev renderer preview does not assemble that gate and is not the full recovery test. The restored database includes schema, so do not run setup:local or replay migrations over it. Existing caller/auth credentials are intentionally invalid. For private production recovery obtain separate authorization and use the reviewed provider plan, fresh bindings/secrets, explicit canonicalOrigin and guard BUDGET_EXPRESSION. Preserve CPU5000ms, all six abuse limits, private media/admission, disabled public Worker URLs, edge protection and cost guard. Do not expose an incomplete replacement to work around missing protections.

## New account/domain review plan

Copy docs/recovery/new-environment.example.json outside Git and fill it with newly authorized resource identifiers. Run `node scripts/recovery/prepare-environment.mjs --profile /private/new-environment.json --out /private/offline-plan`. This makes no remote calls. It generates app bindings, edge/budget rule definitions, a separately scheduled guard configuration and fresh app secrets in private files. Install/encrypt secrets through the owner secret manager, supply provider/guard API credentials separately, and review provider state/resource adoption before any authorized future provisioning. Copy the tracked guard worker/policy alongside its generated config when preparing that separate Worker. No original account IDs or credentials are needed by this generator. Never blindly run a new stack over the existing production resources.

## Current status

Live is now update82 following a separate release. The encrypted recovery snapshot remains update81. This backup task did not deploy or change production data. See RECOVERY_TESTS.md for the actual rehearsal and limits. See REBUILD.md for the existing-stack deployment boundary and REBUILD_AUDIT.md for prior clone verification.
