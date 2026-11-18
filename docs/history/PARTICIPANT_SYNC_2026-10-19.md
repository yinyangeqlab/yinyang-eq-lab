# Participant automatic sync and approved devices — October 19, 2026

Deployed as update100 from the existing update99 baseline. No real participant data is used for implementation tests or layout fixtures. Independent Shootout and recovery development remains excluded.

## Behavior and consent

Every participant account can enable Private account sync in the same data choices form used by the listening tools and My data. It defaults off. Saving requires the explicit current sync notice acknowledgement; older research agreements cannot enable it. The all-current-sharing draft preset includes sync and all available described historical studies. It never accepts file rights or unknown future studies. Research withdrawal does not implicitly enable or disable the independently chosen sync setting. Existing explicitly authorized protected-owner automatic sync is retained with an honest existing-owner consent source and no invented acceptance timestamp.

Saved comparison results, measurements, custom targets, EQs, tuning settings, Personal progress and playback configuration, song preferences, saved music fingerprints/reference mapping, metadata and segment/comparison data synchronize through an account-private server copy. Saved display preferences synchronize through a bounded allowlist. Active listening trials, device headphone selection, credentials, admin tests and file handles remain local. Audio bytes are never captured by the sync client; users must select local music files again in each browser. Account choices and nickname are already authoritative server settings, rather than copied consent flags.

New browsers need two-sided approval from an existing browser; the protected owner account retains its exclusive admin-issued device approval. Linking does not replace local storage. Initial and offline changes use three-way merging; conflicts retain both copies and pause for explicit review. Incoming data applies on safe management/home pages, keeping active listening tools intact. A 512 KB limit stops the whole sync with a visible message, without truncating local data. Updated writes require protocol2, so older pages cannot drop newly supported keys; refresh them once.

## Device controls and honest status

Account sync & devices and My data list approved devices, optional names/browser names/private notes, last confirmation and individual states. Names/notes do not grant access. Pause stops device uploads/downloads; resume retains approval. Disconnect revokes future account access and its data-management session, including root credentials, without deleting existing local or account copies. Re-pair requires fresh approval. Admin mode pauses participant sync.

A device check compares saved content digest, epoch/revision and account-consent stamp. The account check is green only when every active approved device has confirmed the current state within two minutes. Pending/conflicting/paused/offline/older pages cannot produce a current all-device checkmark. It cannot certify changes made on an offline device after its last confirmation.

## Data protection and implementation

Migration0038 adds three account-scoped tables and four pairing columns; it does not rewrite saved histories or research records. The protected account continues using its existing owner sync state and indefinite retention. Ordinary monitoring still expires after30 days; saved sync data remains until explicit deletion. Individual source erasure filters corresponding cloud items and rotates the epoch, preventing stale offline replay. Full account erasure includes new state, permissions and device metadata. Recovery sanitization removes confirmations with revoked credentials. APIs enforce participant identity, same origin, scoped ownership, device approval and atomic consent/pause/revocation rechecks. No session hashes or credentials are returned in device lists.

## Verification and limits

Sixteen targeted suites cover the actual APIs/client, consent acknowledgement and atomic rollback, first-link merge, independent/offline edits, conflicts, erasure, legacy in-flight transfer compatibility, updated transport, account/device isolation and authorization races. All18 synthetic recovery checks passed. Desktop and320px synthetic browser review checked optional naming, keyboard focus, readable wrapping, pause/resume, shared-form sync choice and match/stale states. No new native selects were added. Physical phone access is unavailable; actual cross-device status requires that browser to refresh and report. The isolated production build, full340-asset/200-recording package, additive migration and one-Worker deployment passed verification;390 live JS/CSS hashes matched, original history and research choices were retained, and Brave confirmed matching data/consent. After the owner refreshed the phone, both approved browsers reported matching content and account consent at revision5, and the server all-device indicator was green.

The owner previously declined a fresh backup export. Existing verified encrypted off-device update96 recovery remains retained; a matching current release data/schema baseline remains pending. Do not claim it matches migration0038 or that scheduled exports succeed while the configured baseline is incompatible. This feature does not export or duplicate a backup for each commit.
