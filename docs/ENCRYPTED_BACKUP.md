# Update116 schema change; recovery baseline pending with Codex — October 23, 2026

**Recovery completed October 23, 2026.** One owner-approved encrypted off-device export established the update116 baseline (schema 220), including the deployed changes from updates113–115. All 341 recovery files passed independent download, decryption and reconstruction with matching source/schema; synthetic recovery checks and all 56 backup safety tests passed. All 340 media files reused existing encrypted objects. Independent checks after publication confirmed all four prior snapshots, their original timestamps and encrypted-object hashes/owner-only permissions unchanged. Exact deployed source/build and original Git history are preserved, including the documented source-manifest variant; original migration fingerprints are unchanged. Hosted validation passed, daily scheduling is active at 03:00 America/Los_Angeles, and the first subsequent scheduled data backup succeeded. The manual repair made exactly one snapshot; the subsequent scheduled run followed the normal daily cadence. No production writes, application import or website deployment occurred. See docs/releases/update116-recovery-verification.json.

update116 is deployed and verified with additive migration 0041 (embed_shootouts and embed_shootout_runs; schema 216 to 220). Updates 113 to 116 are unregistered. No export or snapshot was made with the deployments; coverage is the existing encrypted daily snapshots plus D1 Time Travel bookmarks before migrations 0040 and 0041 (private rollback folders). The owner approved exactly one fresh encrypted export to establish the baseline and delegated it to the private recovery tooling (Codex), to be taken against the deployed update116 baseline. It is pending; do not record a new recovery point until it completes and verifies.

## Earlier recovery notes (historical)

# Update114 schema change and source-only metadata handover pending — October 22, 2026

update114 is deployed and verified with additive migration 0040 (target_removal_requests; schema 213 to 216). Its source/build metadata is not registered, and update113's never was. Because the schema changed, the code-only handover should refuse until the schema baseline is updated with an explicit backup decision. No export or snapshot was made with the deployment; coverage until then is the existing encrypted daily snapshots plus a D1 Time Travel bookmark taken before the migration. The owner then approved exactly one fresh encrypted export to establish the update114 baseline and restart the daily schedule; it is pending and runs through the private recovery tooling. The scheduled data backup refuses the mismatched baseline until registration. All earlier encrypted off-device snapshots and timestamps are unchanged.

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

# Encrypted off-device recovery

## Deployment backup scope — owner preference, October 19, 2026

Commits and local previews do not trigger production backup exports. Distinguish source/build baseline maintenance from a fresh data export, and explain actual additional quota use before requesting approval. Prefer the existing verified recovery point and regular daily coverage for low-risk UI-only releases; avoid redundant exports and duplicate immutable media. Database/schema changes, destructive operations and risky imports require an explicit backup decision. One necessary matching release point should serve the release, rather than a point for every commit. Never relabel incompatible source/schema as a valid baseline or claim a declined/unverified export succeeded. If the owner declines an export, preserve existing recovery points, document the precise coverage gap and the scheduled runner's refusal on mismatched baselines. Any future work to separate metadata-only baseline handover from data exports must retain immutable provenance and verification safeguards.

## What is backed up

The recovery bundle contains the verified external media, sanitized application database and a manifest of file sizes, checksums and matching source/migration fingerprints. Git supplies the application and recovery tooling; the private bundle supplies the external inputs. Existing credentials and provider resource identifiers are not recreated. See [RECOVERY.md](RECOVERY.md) for deletion review, fresh credentials, browser-only data and provisioning limits.

The bundle is encrypted before leaving the backup environment. The separate random recovery key is excluded from the archive and remote destination. Neither encryption nor a checksum authorizes restoring withdrawn participant records.

## Keep private records separately

The owner maintains the destination, encrypted object name, matching Git revision, ciphertext size/checksum and verification receipt outside Git. Keep a secure copy of that receipt and recovery key accessible if the original computer is lost. Store the key separately from the encrypted archive. A password entry stored only on the original computer is not an independent recovery copy.

Public documentation deliberately omits the storage service, account, destination and key. Do not add them to issues, handoffs, screenshots, command logs or commits. No public share link is needed. Check that the remote folder and file are accessible only to the owner.

## Retrieve and validate

Download the encrypted archive through the owner's private storage records. If it is stored as pieces, also download the part manifest, verify each piece's size/checksum and concatenate the ciphertext in the manifest's explicit order into one archive. Do not decrypt individual pieces. The reassembled archive must match the full byte count/SHA-256 in the trusted private receipt. Compare its byte count and SHA-256 with the separate trusted receipt before opening it. A checksum stored beside an archive alone cannot establish authenticity. These commands use example paths only:

```sh
sha256sum /private/download/archive.gpg
umask 077
gpg --output /private/download/bundle.tar --decrypt /private/download/archive.gpg
```

Enter the key through GPG's secure prompt. Never put the key in a command argument, environment variable, source file or shell history. Require GPG to exit successfully before extracting; an integrity/decryption failure means stop. Extract only the owner's verified archive into a fresh private directory:

```sh
mkdir -m 700 /private/extracted-bundle
tar --no-same-owner --no-same-permissions -xf /private/download/bundle.tar -C /private/extracted-bundle
node scripts/recovery/recovery.mjs verify --bundle /private/extracted-bundle
```

Use the matching Git revision recorded in the private receipt. Bundle verification checks every file and its source/migration compatibility. Then follow RECOVERY.md, including a fresh deletion review newer than bundle creation and bound to the exact sanitized database checksum. Do not import participant records when current deletion status cannot be established. Verification/decryption alone does not deploy or restore anything remotely.

## Verification and ongoing upkeep

For each backup, verify local decryption and all bundle checksums, upload only ciphertext, check remote size/hash and owner-only permissions, download it independently, compare SHA-256, and decrypt/verify that downloaded copy. Keep the verification time and result in the private receipt. Preserve a verified local bundle until the remote roundtrip passes.

## Recurring indexed backups

### Authorized hosted-runner key exception

On October 19, 2026 the owner explicitly approved storing the existing recovery
key as an encrypted Actions secret in the dedicated private backup job repository.
For that job only, the key may enter the disposable hosted runner through a
step-scoped secret environment variable. The launcher removes it from its
environment, writes a mode0600 temporary key file outside Git, and excludes it
from child-process environments. GPG receives it by file descriptor. Remove all
temporary secrets and plaintext on completion or failure; never upload them to
storage, logs, caches, workflow artifacts or the repository. This exception does
not authorize other key transfers or relax local recovery-key handling.

The hosted manual run passed complete independent reconstruction on October 19,
2026: all341 recovery files, matching source/schema and18 synthetic recovery checks.
All23 local backup safety checks pass. The single-writer cutover is complete and
the daily schedule is enabled. Configuration and acceptance details are in
scripts/recovery/github-actions/README.md; private receipts establish coverage.

Encrypted off-device backups run daily at03:00 America/Los_Angeles through an
independent hosted job in a private repository. The owner's computer and desktop
app do not need to be running. The old desktop schedule is paused, and owner
configuration blocks its local scheduled writer. Hosted scheduling is best effort;
a missed run is not a successful backup. Workflow failure email/web notifications
are enabled. The latest private success receipt establishes actual coverage.

For an owner-controlled manual backup, first disable the hosted writer and arrange
an explicit single-writer handover. Do not run both. The local command remains:

```sh
python3 workspace/scripts/recovery/backup.py run
```

The script requires Linux, Python 3.12 or newer, GnuPG, rclone, the pinned Node toolchain and existing Pulumi credential access for read-only exports. It reads destination and key-file references from owner-only configuration outside Git. It does not select a new destination or upload the key. It checks the recorded live snapshot including media, preserves the exact implementation revision, exports the current database read-only and sanitizes the local copy. It never imports, migrates, provisions or deploys production resources. Separate unfinished workspace changes are excluded. Take an additional snapshot before an authorized migration or major data operation, and after a verified major release; those operations are not automatically hooked by this schedule.

The hosted adapter does not use Pulumi credentials or state. It uses a separate
read-only provider token and a private pinned snapshot baseline. It authenticates
the current encrypted index/receipt, downloads the matching original source,
checks the active deployment before/after export, and refuses schema mismatches.
It takes the database snapshot using a SELECT-only batch with typed serialization,
row-count/schema checks and zero reported writes, then sanitizes disposable local
SQLite. The standard export endpoint rejected the read-only token during setup;
the token's scope was kept read-only. Existing media/source/history/build objects
remain shared. No plaintext backups or secret files are committed to the job
repository, and no caches or workflow artifacts are uploaded. Temporary files are
removed after completion or failure.

After any authorized future deployment, capture and verify a matching new backup
and refresh the private hosted baseline. Until refreshed, deployment/schema
mismatch intentionally stops the job and produces a workflow failure notification.
Never change original source/migration fingerprints to bypass this guard. Local
reconstruction remains available and authenticates the latest remote recovery
receipt when hosted execution owns the repository.

Each snapshot contains a full sanitized database and a complete file index. Unchanged assets reuse encrypted objects identified by their plaintext checksum. This saves media space without a chain of daily database deltas: a selected snapshot needs its own index, matching source and all referenced objects. Preserve unpublished source history in a verified Git bundle as well as the original source archive. Small generated runtime files are preserved separately from shared media for exact build recovery. Supplemental portability objects, when present, are referenced by the encrypted index and participate in retention. Never remove a shared object while any retained snapshot references it. The original historical encrypted backup remains separate.

New objects undergo local encryption/decryption verification, remote ciphertext size/hash and owner-only permission checks, and independent download/decryption/plaintext checksum verification. Reused objects have remote hashes and permissions rechecked on subsequent runs. The encrypted recovery index is also roundtrip-verified. Private receipts retain trusted ciphertext hashes and exact object references. Keep the private receipt/configuration and independently accessible recovery key outside Git. A separate encrypted recovery receipt is also roundtrip-verified off-device; it records the index checksum and storage configuration but never the key. The recovery key must remain separate from all uploaded files.

Retention keeps the latest successful snapshot on each of seven distinct backup dates, in each of four ISO weeks, in each of twelve calendar months and in each calendar year, using Pacific time. The sets overlap. Only unreferenced objects in the new indexed repository are eligible for removal, after a verified retained index has been uploaded. The latest successful point in every calendar year is preserved without automatic annual expiry, as explicitly requested by the owner. Annual history grows gradually; monitor capacity and obtain owner approval before shortening that policy. This does not authorize restoring withdrawn participant data. Later erasures still take precedence over every retained copy.

Once each calendar month, reconstruct a complete disposable bundle from independently downloaded ciphertext and verify it with the exact matching source/migration fingerprints. Also run the synthetic recovery safety tests. Reconstruction does not import historical participant records or certify a running replacement website. A full application restore requires a fresh authoritative deletion review, fresh credentials and the checks in RECOVERY.md.

## Reconstruct an indexed snapshot

With the owner's existing private configuration and separate key available, use a new private directory outside every Git checkout:

```sh
python3 workspace/scripts/recovery/backup.py reconstruct \
  --snapshot latest --out /absolute/private/new-reconstruction
```

An explicit retained snapshot ID can replace `latest`. The command downloads and decrypts the index, source and referenced files, then verifies the reconstructed bundle. It does not import into an application. Preserve the private trusted index receipt; a mismatch stops recovery. If the original computer is lost, obtain the separate key from the owner's independent records. Download and decrypt the separate encrypted recovery receipt, require successful integrity verification, then compare its index checksum before decrypting the index. Recreate private configuration and authenticate storage on the new computer. The encrypted source object includes the matching original source plus the owner backup tools. Tools recovered from the archive can take `--owner /absolute/new-owner-container` after the private configuration has been recreated there. Supplemental source-history/build archives are downloaded into `additional-recovery/`; the build archive omits media already recoverable from shared objects. Use the captured release's build file list to place and verify those files. Fresh hosting setup, credentials and external safeguards remain a separate authorized step.

The reconstructed source contains `recovery-release.json`, captured from the backed-up live release. Pass that file through the recovery module's `release` option when verifying/restoring; the original source/migration fingerprints have not been rewritten. Never change fingerprints to make another release's tools accept a snapshot. Before any later restore, obtain a new deletion review newer than the snapshot, less than 24 hours old and bound to the exact reconciled database checksum. If authoritative deletion status is unavailable, do not restore participant records.
