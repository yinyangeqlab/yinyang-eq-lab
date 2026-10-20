# Large saved-data sync — October 19, 2026

Deployed as update101 from update100. Independent Shootout UI and recovery work remains excluded.

## Saved histories and measurements

Automatic account sync no longer uses the 512 KB whole-account envelope. Protocol3 transfers saved JSON in bounded packets, stores individual entries in smaller pieces, and downloads pages pinned to one epoch/revision. A single measurement can exceed a database row. The small account head switches only after every entry, section hash, source-ownership check and account/device permission is verified. Partial transfers do not replace the current copy. A tab can resume acknowledged upload packets after a network interruption; a lost optional resume marker restarts safely. Unchanged sections, including large measurement collections, can reuse their committed pieces.

The design avoids the provider's [2 MB string/blob/row limit](https://developers.cloudflare.com/d1/platform/limits/) rather than merely increasing the old snapshot cap. Request-body limits, all six abuse bindings, Worker CPU5000ms and the independent cost guard remain enforced. A long transfer may pause under service throttling and resume later. Browser capacity and overall service/database resources remain finite; this is not unlimited storage. No aggregate 512 KB cap is applied to automatic account data.

The three-way merge cache moves from localStorage to IndexedDB after a successful write, preserving the existing saved-data keys. Clearing browser data also clears this merge base; automatic sync remains paused there while the account copy is retained. Local apply failures roll back managed keys and report insufficient browser space. Music/audio files, embedded data URLs, browser file handles and admin tests remain excluded. Saved music fingerprints, metadata and segment/comparison data retain their existing permitted scope; users select the music files locally on each browser.

## Consent, ownership and erasure

No new account, device, research permission or public publication is granted. The shared sync notice explains the larger transport and real browser-capacity limits; its collection purpose is unchanged. Existing consent choices and explicit approved-device requirements remain authoritative. Older pages must refresh after an account uses the new format, preventing a small old snapshot from replacing the larger history.

Migration0039 adds three tables and one index; it does not rewrite existing account payloads or records. An opted-in approved browser converts its existing copy through the normal verified transfer. Current committed data has no age-based expiry. Only unfinished staging transfers and superseded internal representations are cleaned up; current referenced sections remain. Protected YinYangEQ retention and its explicit deletion requirement are unchanged.

Source erasure removes the exact affected entries and all their pieces, drops unfinished copies and rotates the account epoch in the existing erasure transaction. Unrelated history remains. Full erasure includes versions, entries and pieces. Recovery sanitization removes unfinished transfers even with FK cascades disabled while retaining committed data under the existing fresh deletion-review requirement. Device match checks cover the complete saved contents using entry/section/account digests, including after erasure.

## Verification

Synthetic SQLite integration checks cover a multi-megabyte measurement larger than one database row plus 900 results, bounded requests and rows, full download/hash verification, interrupted upload resume, unchanged-section reuse, late consent/pause/revocation races, incomplete/corrupted downloads, source deletion, stale-epoch replay, full account deletion and content/consent device confirmation. Existing sync, shared consent, ownership, pairing, profile, privacy and recovery regressions remain required. Browser review used disposable synthetic data: a 6,000-result IndexedDB cache survived a real reload with no localStorage cache writes and existing history unchanged; the updated notice/device text was checked at desktop and 320px width. No new native selects were introduced.

No new backup export is performed. The owner's earlier no-export decision remains in force. Existing verified encrypted off-device update96 recovery remains retained; its schema/source does not match this release, and matching current-release recovery baseline work remains pending. No incompatible scheduled backup is relabeled as verified.

All 17 targeted clean-source suites, 18 synthetic recovery tests, bounded TypeScript and production build passed. The full 340-asset/200-recording package deployed with 414 exact live JS/CSS hashes verified and 337 prior client assets retained. Additive migration 0039 and 213 schema definitions were verified. Original data/source and consent hashes remained unchanged; Brave and the refreshed phone both confirmed matching content and account consent at revision 6. The informational notice ended after verification.
