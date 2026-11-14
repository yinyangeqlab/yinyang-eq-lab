# Recovery boundaries and entry points

<!-- release-state:start -->
Recorded deployment: **update158**, source `d637e8c28644618b78bc17bb99715af2a428ee80`.
Current maintenance, publication and recovery status: [LIVE_STATE.md](../LIVE_STATE.md).
<!-- release-state:end -->

Read [ENCRYPTED_BACKUP.md](ENCRYPTED_BACKUP.md) before backup/recovery work. Current registration status comes from the generated state. A successful metadata handover is not a fresh data snapshot. Never infer current coverage from a prior update's successful receipt.

Local edits, commits, previews and this foundation verification do not trigger production exports. Routine data coverage is daily; manual hosted runs default to validation. For an authorized ordinary code-only deployment, the owner workspace’s reviewed `scripts/recovery/release_handover.py` procedure (private owner tooling, intentionally absent from a public clone) registers exact source/build metadata using the deployment receipt without exporting data. Preserve migration/schema, recovery-code, media, deployment/provenance verification, shared-media reuse, retention and failure notifications. Changed schema/media/recovery or risky imports require an explicit backup decision. Explain actual additional quota before requesting that decision.

If an export is declined, preserve previous recovery points, state the precise coverage gap and report any scheduled baseline-mismatch refusal. Resume only an inspected failed handover with its existing resume option; preserve unrelated pauses. Never relabel incompatible source/schema as a valid baseline. No handover or export is implicitly authorized by a documentation or test task.

Storage service/account, destination, private receipt and recovery key stay outside Git and public handoffs. Public descriptions say only encrypted off-device backup. Never upload the recovery key beside its archive or assert password-manager custody without owner confirmation. Never restore erased user records; review current deletion state before any restore.

Use the pinned environment (`npm run recovery:environment`), locked dependencies, and `npm run test:recovery` for the existing synthetic recovery safety tests when recovery tooling changes. An owner restore uses an authorized current sanitized bundle in a fresh isolated checkout, fresh local credentials and ignored state. Follow the command interface in `scripts/recovery/recovery.mjs`; inspect its plan before execution. Do not run `setup:local` over a restored database. `scripts/recovery/prepare-local-worker.mjs` and `scripts/recovery/check-local.mjs` support a loopback-only full Worker rehearsal with disposable local fixtures, distinct from a renderer preview.

For a newly authorized environment, `scripts/recovery/prepare-environment.mjs` produces an offline plan from an external private profile; it does not grant provisioning approval. Review adoption of existing resources, all access/media/CPU/abuse/edge/cost protections and secrets separately. Exact rollback uses the release's original immutable source/build/configuration evidence, with data compatibility checked explicitly.

The owner retains the historical recovery procedures and exact snapshots. Use the current release record when preparing a restore.
