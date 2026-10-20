# YinYangEQ category sharing candidate — October 19, 2026

Implemented locally against live update98. Not pushed or deployed; no production publication, migration, backup export or new device approval was performed. Independent Shootout UI and recovery WIP remain excluded.

My profile now has category checkboxes and counts across all inventory pages, select-all/clear controls, a combined public preview, per-entry exclusions and grouped Publish/Hide actions. Categories cover comparison results, Personal research comparisons, descriptions, contributed measurements, saved EQ exports, contributed targets, current song ratings, suggestions and the Personal/song activity journal. Synced browser-only records are not automatically research contributions or public journal entries.

Review uses a stable kind/ID cursor and up to25 records per group, with an explicit next-group control. It selects existing contributions only; future records stay private. Cleaned downloadable files are a separate unchecked option. The preview shows exactly which fields/files will be public, and publishing replaces each selected entry's previous public version. Existing individual controls remain available. Hiding does not delete source or synced data.

The participant-only API validates categories, batch size, unique record references, preview hashes, ownership, moderation and optional file scope. It validates the entire publication batch before one transactional write. Missing/changed/foreign records prevent the entire publication. Public reads continue to recheck current source ownership, moderation and content hashes. Admin cannot publish as the participant. No schema change.

Validation: actual synthetic API tests cover all-page counts, cursor pagination, read-only preview, stale/foreign/origin/admin rejection, explicit file preview hashes, source preservation, selected publish/hide and future-private defaults. Account/files/history/device-replacement regressions pass. Bounded application TypeScript has zero diagnostics; isolated production build passed using the pinned Node26.12.0 toolchain. Desktop interactive fixture covers all-category selection, per-entry exclusion, publish/hide, next group, expanded fields and keyboard focus. A320px iframe was visually checked. No native select controls were added. Fixtures use synthetic data with no session and do not access participant Sync or production.

Local evidence: `artifacts/profile-category-sharing-20261019/`. Isolated candidate build excludes all independent drafts. Local synthetic layout server uses loopback5191 while running. Deployment/publication remain separate actions.

## Phone sign-in on the current live release

Admin → YinYangEQ participant account → Approve or recover a device. Name the phone, leave Automatic account sync selected, then Create single-use sign-in. On the phone's regular browser, open https://yinyangeq.com/profile-access, enter the private code within10 minutes, review and finish sign-in. Open My profile to receive the account copy and check automatically synced. Public invitations remain disabled. No recovery snapshot is needed. Preserve any separate pre-existing phone browser results before first sign-in; a new device receives the existing account copy. Each phone browser needs its own admin approval. Do not post approval codes in public handoffs.
