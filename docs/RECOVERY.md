# Update122 main workflow fixes verified — October 24, 2026

Main workflow fixes are deployed under persistent owner-only maintenance. Owner-approved source-only recovery metadata, independent reconstruction and hosted validation passed with existing data snapshots/timestamps unchanged. No migration, fresh export or new data snapshot. Read LIVE_STATE.md and docs/releases/update122-verification.json; prior immutable provenance is preserved.

## Earlier records (historical)

# Update121 workflow fixes verified — October 24, 2026

Private blind EQ workflow fixes are deployed under persistent owner-only maintenance. Source-only recovery metadata, independent reconstruction and hosted validation passed with existing data snapshots/timestamps unchanged. No migration, fresh export or new data snapshot. Read LIVE_STATE.md and docs/releases/update121-verification.json; prior immutable provenance is preserved.

## Earlier records (historical)

# Update120 verified — October 24, 2026

PRs #7–10 are merged and their runtime changes are deployed under persistent owner-only maintenance. Source-only recovery registration, independent reconstruction and hosted validation passed; all prior data snapshots and original timestamps remain unchanged. No migration, data export or new snapshot. See LIVE_STATE.md and docs/releases/update120-verification.json.

## Earlier records (historical)

# Update117 matching encrypted recovery point verified — October 23, 2026

One owner-approved matching encrypted off-device recovery point was verified before rollout, using a current SELECT-only export from update116 with the unchanged schema220 and the exact prepared update117 source/build/media. All 365 recovery files were independently reconstructed and verified. All 340 prior media objects were reused; only 24 new AAC assets were added. Prior snapshots, timestamps and encrypted object records were preserved. The point was activated only after deployment verification; hosted validation passed and daily03:00 America/Los_Angeles scheduling is active. No second data export or snapshot was made during finalization. Additional encrypted storage: 144,847,044 bytes. No private storage identifiers or recovery key are published.


## Earlier recovery records (historical)

# Update116 encrypted recovery baseline verified — October 23, 2026

**Recovery completed October 23, 2026.** One owner-approved encrypted off-device export established the update116 baseline (schema 220), including the deployed changes from updates113–115. All 341 recovery files passed independent download, decryption and reconstruction with matching source/schema; synthetic recovery checks and all 56 backup safety tests passed. All 340 media files reused existing encrypted objects. Independent checks after publication confirmed all four prior snapshots, their original timestamps and encrypted-object hashes/owner-only permissions unchanged. Exact deployed source/build and original Git history are preserved, including the documented source-manifest variant; original migration fingerprints are unchanged. Hosted validation passed, daily scheduling is active at 03:00 America/Los_Angeles, and the first subsequent scheduled data backup succeeded. The manual repair made exactly one snapshot; the subsequent scheduled run followed the normal daily cadence. No production writes, application import or website deployment occurred. See docs/releases/update116-recovery-verification.json.

## Earlier recovery notes (historical)

# Update112 source-only recovery handover repaired — October 22, 2026

Matching update112 source/build metadata and hosted validation-only checks passed. Independent authentication verified all prior encrypted off-device data snapshots and original timestamps unchanged; no database export, new snapshot or retention run. Daily scheduling is active with the matching baseline. Today’s earlier scheduled run failed on the previous baseline, and the next data export remains on the normal daily schedule. Durable private hashed evidence preserves the two inspected empty validation proofs across releases; each active run is still checked live and unknown, scheduled, data-writing or started jobs still block. Workflow enablement now has a propagation delay and active-state check before dispatch; this does not establish a repair to GitHub’s stranded-record defect. The host still refuses cancellation/deletion of those two records. All 56 canonical backup safety tests and 33 isolated tooling tests passed. Private ledger, original receipts, configuration and keys stay outside Git. This is source metadata registration, not a new data recovery point.

## Earlier recovery notes (historical)

# Update111 source-only metadata handover verified — October 22, 2026

Matching source/build metadata and hosted validation-only checks passed for the reconciled code-only release. Independent authentication verified all prior encrypted off-device data snapshots and original timestamps unchanged; no database export, new snapshot or retention run. Daily scheduling remains active. Existing single-writer, schema/media/deployment checks and exact private evidence for known empty validation readers remain enforced. Private configuration, destination, receipts and key remain outside Git. This is source metadata registration, not a new data recovery point. Reviewed source and verified release records are included in this lab-attributed publication. See docs/releases/update111-verification.json.

## Earlier recovery notes (historical)

# Update110 source-only metadata handover verified — October 22, 2026

Matching source/build metadata and hosted validation-only checks passed for the UI-only CSS cleanup release. Independent authentication verified all prior encrypted off-device data snapshots and original timestamps unchanged; no database export, new snapshot or retention run. Daily scheduling remains active. Existing single-writer, schema/media/deployment checks and exact private evidence for the two known empty validation readers remain enforced. Storage credentials, destination, private receipts and recovery key remain outside Git. This is source metadata registration, not a new data recovery point. See docs/releases/update110-verification.json.

## Earlier recovery notes (historical)

# Update109 source-only metadata handover verified — October 21, 2026

Matching source/build metadata and hosted validation-only checks passed for the UI-only mobile readability release. Independent authentication verified all prior encrypted off-device data snapshots and original timestamps unchanged; no database export, new snapshot or retention run. Daily scheduling remains active. Existing single-writer, schema/media/deployment checks and exact private evidence for the two known empty validation readers remain enforced. Storage credentials, destination, private receipts and recovery key remain outside Git. This is source metadata registration, not a new data recovery point. See docs/releases/update109-verification.json.

## Earlier recovery notes (historical)

# Update108 source-only metadata handover verified — October 21, 2026

Matching source/build metadata and hosted validation-only checks passed for the UI-only sidebar release. Independent authentication verified all prior encrypted off-device data snapshots and original timestamps unchanged; no database export, new snapshot or retention run. Daily scheduling remains active. Existing single-writer, schema/media/deployment checks and exact private evidence for the two known empty validation readers remain enforced. Storage credentials, destination, private receipts and recovery key remain outside Git. This is source metadata registration, not a new data recovery point. See docs/releases/update108-verification.json.

## Earlier recovery notes (historical)

# Metadata-only recovery handover verified — October 21, 2026

Current live update107 has matching source/build metadata and a successful hosted validation-only check. Independent authentication verified every existing encrypted off-device data snapshot and timestamp unchanged. No data export, new data snapshot, retention run or site redeployment occurred. Daily03:00 America/Los_Angeles execution remains enabled. All50 backup safety tests passed. Unknown, scheduled, data-writing or started jobs still block a metadata writer. A private operator-inspected proof can identify an exact empty validation-only orphan; it binds the prior handover receipt, lab actor, unique dispatch and immutable workflow/launcher code. Two such host records remain visible because the host refuses cancellation/deletion; the successful matching run and unchanged single concurrency group establish that they do not block the real writer. Future handovers must retain fail-closed checks and use separate inspected evidence for each known reader. Private receipts and evidence remain outside Git. This is metadata compatibility, not a new data recovery point.

## Earlier recovery notes

# Daily backups and source-only release handover verified — October 20, 2026

Routine data backups remain daily at 03:00 America/Los_Angeles. Commits and
previews do not trigger exports. Manual workflow runs now default to validation
only. The hosted validation-only run passed, and independent authentication
confirmed its encrypted index/data history and existing data-backup timestamp
were unchanged. This improvement created zero data exports or data snapshots.
All 42 synthetic Python backup/handover safety tests pass.

Ordinary verified code-only deployments can register exact source/build metadata
through scripts/recovery/release_handover.py. Matching migrations, operational
schema SQL, live schema, recovery semantics, media hashes and exact deployment
identity are required. Original data/source provenance is preserved; metadata
registration never claims a new data recovery point. The next scheduled export
uses the registered source. Schema/media/recovery or risky data changes still
require an explicit backup decision. Unknown deployments remain blocked.

Retention and shared-media reuse are unchanged. Only the active source metadata
pin is kept separately; it does not chain earlier handovers. Daily retention
prunes unreferenced objects. The new validation/resume checks preserve an
unrelated owner workflow pause. An inspected failed handover can be resumed with
--resume-paused-handover; inspect its private failure receipt first.

The private backup tooling was published with verified lab author and committer.
The prepared update102 deployment runner now invokes the source-only handover
and preserves the previous data-backup record. Its sealed package check passes;
this task did not deploy the website, change production data, export data or
publish application source. Existing unrelated work and the parent mirror remain
preserved. Private receipts establish actual backup coverage.

## Earlier handoff state

# Backup workflow repaired — October 20, 2026

Encrypted off-device backup now has a verified matching update101 recovery point
and private hosted baseline. The owner explicitly approved one fresh read-only
snapshot and baseline refresh after the earlier release-time export declines.
The hosted validation run completed successfully; daily 03:00 America/Los_Angeles
execution and failure notifications remain enabled. The old update96 point was
preserved through handover, immutable media was reused, and retention policy is
unchanged. No website deployment, production data write or source publication
was performed.

The October 20 failure was the intentional deployment compatibility refusal:
the pinned update96 baseline no longer matched update101/schema213. Exact
update101 source/build/assets and all 213 schema definitions were checked before
the SELECT-only export. Encryption, owner-only access, independent download and
decryption, complete 341-file reconstruction and matching recovery checks passed.
The 23 backup safety tests and 18 synthetic recovery tests also passed. Original
release and migration fingerprints remain unchanged, including historical source
provenance outside scrubbed publication history. Current owner instructions were
preserved; their intentional AGENTS.md documentation drift was recorded privately
instead of rewriting the recorded live fingerprint. Restore still requires a
fresh authoritative deletion review; no participant database import was tested.

Private receipts establish coverage. Runtime/source baseline remains update101;
canonical dirty work and the parent live mirror were preserved. Fetch refreshed
origin/main to the already published scrubbed source; local HEAD was not moved.

## Earlier handoff state

Current live release is update94.0033/0034 applied; a fresh database uses all35 migrations. Matching encrypted off-device backup, full reconstruction and the refreshed hosted baseline are verified; the daily backup schedule is enabled. See LIVE_RELEASE.json for the latest verified status. Historical update93/81 instructions below require their matching source/schema.

# Recovery and workspace guide

Current live release is update93 with invites off; see HANDOFF.md. The approved nickname feature and migration0032 are live; a fresh database uses all33 migrations. The recurring encrypted off-device backup plan and indexed reconstruction command are documented in [ENCRYPTED_BACKUP.md](ENCRYPTED_BACKUP.md). The latest successful private receipt establishes actual snapshot coverage. The standalone update81 bundle and rehearsals below are historical and require their matching source/migration revision. Keep any recovery environment closed until its ownership/deletion review is complete.

## One development checkout

The owner container has one active development checkout: `workspace/`. Fetch, edit, test, commit and push there. Its tracked files match GitHub after publication. Dependencies and local state stay ignored. Do not run a blind pull over local changes; inspect status and divergence first.

The parent folder retains a verified update81 source mirror and `work/` release snapshots for provenance. Existing Git worktree paths stay in place to preserve Git metadata. `archive/legacy-workspaces-20261018` holds inactive old previews, independent checkouts and generated output. `private/` contains external recovery inputs. These areas are outside the canonical Git checkout and must never be committed. The parent README and AGENTS.md direct new sessions here.

## Historical standalone recovery snapshot

The original standalone encrypted snapshot is update81, bound to Git revision `33f80d6bb04d9fa1b66de47368d733c5f41c5eac` and its migration/source fingerprints. A separate session released update82 while that backup was uploading. It is not an update82 database backup. Restore/verify that bundle using the recorded matching revision; do not rewrite its manifest to bypass compatibility checks. New indexed snapshots preserve their own current export and matching original source. Do not use the update81 commands below to verify a newer snapshot.

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

The bundle has a versioned manifest, source/migration fingerprint, file sizes and SHA-256 checksums. No symlinks, path traversal, missing media, unexpected asset paths or output overwrites are accepted. Bundles are private data, not Git artifacts. Copies are independent of release-source media (no mutable hardlink sharing). See [ENCRYPTED_BACKUP.md](ENCRYPTED_BACKUP.md) for the recurring schedule, retention policy and encrypted off-device storage/retrieval. Destination records and recovery keys stay private. Every snapshot requires current data; every later restore requires a fresh authoritative deletion review.

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

## Historical rehearsal status

The original standalone rehearsal covered update81; live advanced to update82 in a separate release during that task. That task did not deploy or change production data. See RECOVERY_TESTS.md for its rehearsal and limits. New indexed backup coverage is recorded by the latest private success receipt. See REBUILD.md for the existing-stack deployment boundary and REBUILD_AUDIT.md for prior clone verification.
