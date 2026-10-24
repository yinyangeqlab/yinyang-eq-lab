# Main workflow review — October 24, 2026

Status: implementation and local verification complete; deployment verification pending.

Owner scope: review the remaining main workflows, fix reproducible bugs, test and deploy with owner-only maintenance retained. Baseline: scrubbed main `98d77db8b5416c5128892914a0849f69489a73fb` / deployed update121. Original canonical drafts and Claude setup files are preserved separately.

## Findings fixed

- Preference Tuning: a late decode or failure from a retired track could overwrite the current waveform/status. Source generations now reject retired results, abort retired curated fetches and invalidate work on unmount. Track changes reset duration and waveform zoom. A pending Play completion cannot undo a newer Pause or source selection.
- Preference Tuning: blocked browser storage could throw during mount or edits. Persistence now reports the temporary in-tab state without crashing; headphone selection/import remains usable and import failures receive feedback.
- Shareable shootouts: saving a private management key silently failed under blocked/quota-limited storage, but results still stripped the key fragment from the address bar. Persistence now verifies the key, results retain unsaved fragments, and creation/results explicitly tell the user to preserve their private link.
- Music library: the server could successfully save a vote, then a failed local cache write reported it as failed. Optional cache errors no longer misrepresent successful account reads/writes.
- My data: older refreshes could overwrite newer data and repopulate erased records after deletion. Reads now have generations, deletion invalidates prior reads and suppresses concurrent refreshes, and unmount invalidates pending reads. The erasure message distinguishes successful server deletion from failed browser clearing.
- Participant profile: delayed activity-page responses could restore older pagination. Reads now reject retired responses and paging waits for the current refresh.

## Review coverage and validation

Reviewed source and existing regressions for welcome/navigation, participation and consent, measurement/target import, main blind/open/free/matched listening, Personal Tournament start/resume/save/playback, music library, Preference Tuning, shareable shootouts, browser/account Sync and conflicts, My data, and participant profile paging. No scoring, research eligibility, schema, media or recovery semantics changed.

`node scripts/check_main_workflows.mjs` executes actual page/component handlers with synthetic storage and deferred transports: 28 checks covering out-of-order audio/data/profile work, unmount, blocked storage, private-key persistence, vote success and erasure feedback. The fixture never accesses production participant records or makes production contributions.

All 31 selected existing workflow suites passed: consent/access/participation (4), Personal Tournament (6), account/browser Sync (8), shareable shootout, target upload/file matching/context (3), playback/free/matched/passage (5), music refresh/local preview (2), and owner-only/per-feature maintenance (2). TypeScript passed. Changed-file ESLint retains seven baseline errors (state-in-effect and Next anchor rules) and six baseline warnings; no new unsuppressed findings. Two targeted state-in-effect exceptions document immediate feedback for failed external storage writes. Final full build and deployment checks are recorded with the release evidence.

Isolated browser review used actual components with synthetic data and audio at desktop and 360px width. Checked Tuning playback, source selection, keyboard target selection, closed/expanded native target/music menus, selected/disabled option styles and dark color scheme, no horizontal overflow, blocked-storage notice and preserved private-results fragment. Native popup pixels are not captured by the in-app screenshot; accessibility expansion and computed option styles were verified. No production admin browser session was used.

Limits: this is a bounded source/regression/UI review, not a claim that every workflow is bug-free. No physical-headphone listening certification, Safari/iOS certification, production account pairing, actual erasure, public voting or contribution was performed. Those mutations were exercised only with synthetic fixtures. Production verification remains read-only except the authorized deployment and authenticated verification login.

## Release and recovery

Prepared as a code-only release behind the existing non-expiring owner-only lock. No migration, media replacement, participant import/export, fresh manual data backup or new data snapshot is required. Matching source-only recovery registration must preserve the existing data recovery timestamps and encrypted off-device coverage. The preserved update121 build and stack state remain the rollback reference; a rollback must retain the owner-only lock.
