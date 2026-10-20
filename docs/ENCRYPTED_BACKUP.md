# Encrypted off-device recovery

## Deployment backup scope — owner preference, October 19, 2026

Commits and local previews do not trigger production backup exports. Distinguish source/build baseline maintenance from a fresh data export, and explain actual additional quota use before requesting approval. Prefer the existing verified recovery point and regular daily coverage for low-risk UI-only releases; avoid redundant exports and duplicate immutable media. Database/schema changes, destructive operations and risky imports require an explicit backup decision. One necessary matching release point should serve the release, rather than a point for every commit. Never relabel incompatible source/schema as a valid baseline or claim a declined/unverified export succeeded. If the owner declines an export, preserve existing recovery points, document the precise coverage gap and the scheduled runner's refusal on mismatched baselines. Any future work to separate metadata-only baseline handover from data exports must retain immutable provenance and verification safeguards.

## What is backed up

The recovery bundle contains the verified external media, sanitized application database and a manifest of file sizes, checksums and matching source/migration fingerprints. Git supplies the application and recovery tooling; the private bundle supplies the external inputs. Existing credentials and provider resource identifiers are not recreated. See [RECOVERY.md](RECOVERY.md) for deletion review, fresh credentials, browser-only data and provisioning limits.

The bundle is encrypted before leaving the owner's computer. The separate random recovery key is excluded from the archive and remote destination. Neither encryption nor a checksum authorizes restoring withdrawn participant records.

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

This is a point-in-time recovery copy. No recurring backup schedule or automatic retention/deletion policy is configured. Future snapshots require current data and deletion review; older copies cannot override later erasures. Before removing disposable rehearsal files, confirm the canonical checkout, verified local bundle and independent encrypted copy remain available.
