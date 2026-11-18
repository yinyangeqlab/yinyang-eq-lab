# Recovery verification — October 18, 2026

The original recovery rehearsal targeted update81. A separate session later deployed update82 during the backup transfer. This recovery/backup task performed no deployment or production data mutation. Its production access was an authorized read-only current D1 export; raw export SQL/database files were removed after sanitizing the private copy.

## Completed rehearsal

- Created workspace/ as a separate clean Git checkout matching GitHub before edits. Verified no divergence. Reconciled the parent live mirror's config/license inconsistencies, preserving the previous config, and moved inactive legacy previews/generated output into the private archive. Existing release snapshots and Git worktree paths were preserved.
- Pinned the recovery Node26.12.0/npm12.2.1 toolchain and checked it. Independently installed app and infrastructure locked dependencies. App/infra TypeScript, upload/Continue regressions, real-gate browser pairing tests (including custom canonical origin and invalid-origin refusal), and18 recovery safety/roundtrip tests passed.
- Exported current live D1 read-only into owner-private storage. Sanitized the copy: invalidated invitation credentials, removed data sessions/devices/pairings/rate state, replaced ownership credential references, retained application records and schema relationships. No historical backup was used.
- Packed all340 verified public assets (including200 protected recordings) and the sanitized DB outside Git. File sizes/SHA-256, source and migration fingerprints were recorded. Copies are independent, not mutable release hardlinks.
- Exported tracked Git files alone into a fresh rehearsal directory, independently installed its locked dependencies, restored external media/data, generated new random local secrets and imported only to local D1. Production IDs/tokens were not supplied to the restore command.
- Full recovered application build and TypeScript passed. Packaging verified340 assets/200 recordings and69 client import dependencies; removed6 redundant stale preload entries as intended.
- Assembled the actual production gate/app/media module graph with six rate bindings in local Wrangler. Anonymous target/audio requests returned401. Fresh owner authentication worked; restored targets and ranking API returned200 with the current ranking methodology. Protected audio Range returned206 and exact recovered bytes. Welcome/Shootout returned200. Owner-only login correctly cannot use tester-only Sync (403); a newly issued local tester with explicit local consent received200 on Sync. The reusable check erased its own disposable tester afterward.
- Tampered bytes, traversal, symlink substitution, missing/changed release assets, stale deletion reviews, credential-bearing databases, private bundle paths inside Git and existing local state are refused. SQL export/import integrity roundtrip passed.
- Publication scan and tracked-input/runtime parity checks passed. Local test servers stopped. No credentials, participant records, numerical target curves, recordings, DB exports or stack state were staged for GitHub.

## Resolved test issues

The default preview port was already occupied, so testing used dedicated loopback ports. A first local Worker assembly omitted emitted .mjs modules; explicit ES-module rules corrected the assembly. The initial smoke check expected owner access to tester-only Sync; it was corrected to assert the intended403 and issue a fresh local tester for the200 path. A publication path check initially also matched the legitimate app archive API; it now blocks private/archive directories only at repository root. All final checks passed after these fixes.

## Recovery limits

This is verified local application/media/data recovery, not a production disaster-redeployment exercise or a claim of bit-identical compiled output across operating systems. Existing participants' access must be reissued/relinked through authorized identity handling; old credentials remain invalid. Browser-only state needs an owner-provided export/authorized browser sync. External provider domain/WAF/guard provisioning is documented but was not executed. The update81 bundle now has a verified encrypted off-device copy; it is not an update82 database snapshot and no recurring backup service was configured. Before any later participant-data restore, a fresh owner review must reconcile subsequent deletions; if authoritative deletion status is unavailable, participant history must not be restored.

Owner-private bundle: ../private/recovery/final-bundle-update81 relative to the canonical workspace. Owner-local logs are in ../artifacts/recovery-*. No private payloads are included in this report.

## Encrypted off-device verification

- Encrypted the verified update81 private bundle locally using GPG symmetric AES-256 with a separate random key. No key was uploaded or committed.
- Local decryption and all341 bundle-file checks passed before upload.
- An initial single-file transfer was interrupted and left no complete remote archive. Retried as encrypted pieces; remote sizes/checksums and owner-only file/folder permissions passed. No public sharing was created.
- Downloaded every piece independently, verified part checksums, reassembled the original ciphertext and matched its full SHA-256. Decryption succeeded.
- The verifier correctly rejected concurrent update82 source/migrations. Exported the exact recorded Git revision33f80d6 into a disposable verification directory; all341 downloaded/decrypted bundle files then passed source/migration/asset verification. No fingerprint was changed to bypass checks. This establishes an update81 snapshot only.
- Owner confirmed saving the key in a password manager. An independent-device copy has not been confirmed. Private receipt retains destination, matching Git revision and results.
- Removed the disposable restore rehearsal, temporary matching-source export, split-transfer fixtures and downloaded/extracted verification copies after success. Retained canonical workspace/, original private bundle, encrypted local archive, small private receipt/part manifest and release snapshots.
- All18 synthetic recovery safety checks passed again. The separate update82 session also recorded its own current-source checks; this backup does not claim a new update82 restore rehearsal.

See ENCRYPTED_BACKUP.md for retrieval and limitations. No recurring snapshot schedule, retention policy or production failover was configured.
