# Current live release — update101, October 19, 2026

Automatic account sync now transfers all permitted saved results and measurements without the former 512 KB whole-account cap. Verified entry pieces, paged downloads pinned to a revision, resumable uploads and atomic publication preserve the current copy through incomplete transfers. Unchanged sections reuse committed pieces. The merge cache uses IndexedDB; browser and service capacity remain finite, with explicit quota failures and managed-write rollback. Actual music/audio bytes, embedded media and browser file handles remain excluded. Saved fingerprints, metadata and segment data retain their existing permitted scope.

Implementation `f9717ad698a1b889b669cd82baa25031be19f023` is pushed. Source/build `work/large-sync-release-20261019`; infrastructure `work/large-sync-infra-20261019`. Additive migration 0039 applied four statements: three tables and one index, with existing account state unchanged. Schema 213 definitions verified. One existing Worker updated; three resources unchanged. All 17 targeted clean-source suites, 18 synthetic recovery checks, bounded TypeScript, production build, full 340-asset/200-recording packaging and 414 exact live JS/CSS checks passed; 337 prior client assets retained. Integration checks include a multi-megabyte measurement and 900 results; a real browser reload preserved a 6,000-result IndexedDB cache. Desktop/320px synthetic text and keyboard checks passed. CPU5000ms, six abuse bindings, private access/media, disabled public Worker URLs and edge/cost controls remain. Tests stayed available; the informational deployment notice ended after verification.

Read-only before/after hashes verified original scientific sources, saved collection entries, epoch and consent choices preserved. Brave and the owner-refreshed phone both confirmed matching content and account consent at revision 6. The all-device indicator certifies only fresh confirmations from active approved devices; offline/older confirmations age out. Physical phone rendering was not independently reviewed. Existing consent and approved-device requirements remain authoritative; no new research opt-in, enrollment, history reassignment or public publication was performed.

Current committed saved data has no age-based expiry. Protected YinYangEQ data remains indefinitely retained and excluded from routine 30-day monitoring cleanup and ordinary archives. Exact source erasure removes matching pieces and unfinished transfers while preserving unrelated data and preventing stale-epoch replay. The owner declined another backup export; verified encrypted off-device update96 recovery is retained, with a matching update101/schema baseline pending. Scheduled baseline compatibility refusal remains enforced; no current-release data backup is claimed. Independent Shootout UI and recovery WIP remain preserved and excluded. Evidence: workspace/artifacts/large-sync-release-20261019/. See docs/LARGE_SYNC_2026-10-19.md.

## Historical release notes

# Current live release — update100, October 19, 2026

All participant accounts now have optional continuous account sync after explicit opt-in in the shared data choices form. Approved browsers can be named, annotated, paused/resumed, disconnected and re-paired. Saved history, measurements, custom targets, EQs, progress/settings, song preferences and saved music fingerprints/metadata/segment data use private account copies. No music/audio bytes, credentials, admin tests or active playback are synchronized. Users select local music again in each browser. Initial/offline compatible changes merge; conflicts retain both copies for review. Current consent remains authoritative and new accounts default off. The protected owner's previously explicit automatic-sync authorization is retained with honest provenance, without manufacturing a new notice acceptance.

Implementation `3471da7d69a0196bcc43c12c4618529f2d0cc32d` is pushed. Source/build `work/participant-sync-release-20261019`; infrastructure `work/participant-sync-infra-20261019`. Additive migration0038 applied nine statements: three new tables and four pairing columns, with existing owner state unchanged. Schema209 definitions verified. One existing Worker updated; three resources unchanged. All16 targeted clean-source suites,18 synthetic recovery checks, bounded TypeScript, production build, full340-asset/200-recording packaging and390 exact live JS/CSS checks passed;314 prior client assets retained. Desktop/320px synthetic browser and keyboard checks passed. CPU5000ms, six abuse bindings, private access/media, disabled public Worker URLs and edge/cost controls remain. Tests stayed available; the informational deployment notice ended after verification.

Read-only before/after hashes verified existing owner history, collection entries, epoch and research choices preserved. Brave returned to the approved participant identity and confirmed matching data and account consent. After the owner refreshed the phone, both approved browsers reported matching content and account consent at revision5; the server all-device indicator was green. A green all-device indicator requires current content/epoch/revision/consent confirmation from every active approved device within two minutes; offline/paused/conflicting or older pages are not certified. Physical phone rendering and current contents are not independently verified. No enrollment, history reassignment, public publication or new research permission was performed.

Protected YinYangEQ data remains indefinitely retained and excluded from routine30-day monitoring cleanup and ordinary archives. Ordinary saved sync copies remain until explicit deletion; monitoring policy remains separate. The owner declined another backup export; verified encrypted off-device update96 recovery is retained, with a matching update100/schema baseline pending. Scheduled baseline compatibility refusal remains enforced; no current-release data backup is claimed. Independent Shootout UI and recovery WIP remain preserved and excluded. Evidence: workspace/artifacts/participant-sync-release-20261019/. See docs/PARTICIPANT_SYNC_2026-10-19.md.

## Historical release notes

# Current live release — update99, October 19, 2026

The owner-authorized release adds reviewed public-profile category selection, consolidates collection consent in the shared data form, and clarifies account-sync conflict controls. Four ongoing choices include one combined Personal research/Community control with explicit admin-versus-public-summary wording. Historical-study choices and selected measurement-file contribution/rights approvals use that same form. Current account choices stay authoritative; old all-sharing agreements never silently grant new permission. Unspecified future studies are not preapproved, and the protected owner account remains excluded from ordinary archives.

Implementation `04257bf4312d613b6d43a5ff55d52eca40933fb4` is pushed. Source/build `work/sharing-consent-final-release-20261019`; infrastructure `work/sharing-consent-final-infra-20261019`. Schema206 definitions remain unchanged. One existing Worker updated; three resources unchanged. All14 clean-source regression suites, TypeScript, production build, full340-asset/200-recording packaging and367 exact live JS/CSS checks passed;295 prior client assets retained. Desktop/320px synthetic browser and keyboard checks passed. Physical phone rendering is not certified. CPU5000ms, six abuse bindings, private access/media, disabled public Worker URLs and edge/cost controls remain. Tests stayed open; the informational deployment notice ended after verification.

Read-only before/after hashes verified existing linked source records, saved browser collection entries, sync epoch and consent receipts preserved. Existing approved devices remain approved. Original Brave history was already linked and remains in the account; deployment performs no enrollment, transfer, deletion, permission grant or publication. Automatic sync and indefinite protected retention remain deployed. The owner declined a new backup export; verified encrypted off-device update96 recovery remains retained, with matching current-release hosted baseline refresh pending. No current-release data backup is claimed. Unrelated Shootout UI and recovery WIP remain excluded. Evidence: workspace/artifacts/sharing-consent-final-release-20261019/.

## Historical release notes

# Current live release — update98, October 19, 2026

The owner-authorized account-link follow-up fixes historical review reads that exceeded D1's compound SELECT limit. Queries now read each fixed source separately and merge bounded results; legacy review includes up to100 candidates rather than silently truncating at25. Ownership verification, consent, complete graph transfer, erased-record protection and private publication remain enforced. This release performs no migration, enrollment or historical transfer.

Implementation `aca250b79a5b449245f22332f257754c4b700872` is pushed. Source/build `work/account-link-release-20261019`; infrastructure `work/account-link-infra-20261019`. Schema206 definitions are unchanged from update97. One existing Worker updated; three resources unchanged. Production build, TypeScript, full340-asset/200-recording packaging, history/API regressions and341 exact live JS/CSS checks passed;269 prior client assets retained. CPU5000ms, six abuse bindings, private access/media, disabled public Worker URLs and existing edge/cost controls remain. Tests stayed open; the informational deployment notice ended after verification.

Automatic reserved-account sync and protected indefinite retention from update97 remain deployed. Original browser linking remains a separate follow-up with current data preserved. The owner declined a new backup export; verified encrypted off-device update96 recovery remains retained, with matching current-release hosted baseline refresh pending. No current-release data backup is claimed. Commit/preview backups are unnecessary; distinguish metadata baseline work from fresh data exports and actual quota use. Unrelated Shootout UI and recovery WIP remain excluded. Evidence: workspace/artifacts/account-link-release-20261019/.

## Historical release notes

# Current live release — update97, October 19, 2026

The owner authorized publishing and deploying automatic YinYangEQ participant sync and protected indefinite retention. Approved devices share saved browser results/settings with offline retry, conditional writes, three-way merging and explicit conflict review. The participant and admin have separate private data/activity viewers. Routine monitoring cleanup/opt-out does not erase reserved account history; permanent archives exclude it. General erasure requires separate account-specific confirmation. Existing source ownership, consent, private publication and deleted-record protections remain enforced. Music bytes, credentials, consent choices, active playback and admin test data do not enter automatic browser sync. Incoming changes wait for safe pages.

Implementation `4d09994a48dc4a49fac288786f1315f52c383ef1` is pushed. Source/build `work/account-sync-release-20261019`; infrastructure `work/account-sync-infra-20261019`. Migration0037 adds only owner_account_sync. All205 earlier schema definitions remain unchanged; the deployed schema matches38 migrations plus operational service status. One existing Worker updated; three resources unchanged. Full340-asset/200-recording packaging and334 exact live JS/CSS checks passed;262 earlier client assets retained. CPU5000ms, six abuse bindings, private access/media, disabled public Worker URLs and existing edge/cost controls remain. Tests/submissions stayed open with an informational notice only; the notice ended after verification. No forced refresh or audio stop.

Account/monitoring/ownership regressions,38 synthetic migrations, bounded source TypeScript, isolated production build and18 synthetic recovery checks passed. Desktop/320px browser fixtures were reviewed without a real account. Physical devices and native-popup pixel rendering are not certified. Existing Community validation/privacy limits and the tracked build-tool advisory remain unchanged. Evidence: workspace/artifacts/account-sync-release-20261019/.

The owner explicitly declined a new backup export for this release. The existing verified encrypted off-device update96 recovery point is retained; no update97 data backup or refreshed hosted baseline is claimed. The existing daily schedule remains configured, but its safety checks will refuse the changed release/schema until an authorized matching baseline refresh. Do not rewrite fingerprints or label the old point current. Original-browser data was captured privately before linking; account enrollment/history transfer are separate follow-up operations. Unrelated Shootout UI and recovery development remain preserved and excluded.

## Historical release notes

> Update96 recovery verified: matching encrypted off-device database/source/build backup and source-history restore passed independent verification. This month’s full reconstruction remains valid for the identical schema/media; its original rehearsal identity is preserved. The refreshed hosted baseline passed validation, and the daily03:00 America/Los_Angeles schedule is enabled. Existing retention is unchanged.

# Current live release — update96, October 19, 2026

Live: https://yinyangeq.com. The owner authorized pushing and deploying the reviewed consent choices. The dialog shows all three numbered choices before nickname/profile details, including the optional own-music setting outside the full terms. “Opt in to all three” and “Required only” change drafts only; Save remains explicit. Separate Personal/Community contribution permissions are unchanged. No consent policy/version, backend, scoring, dependency or schema change.

Implementation `89dc69e1bfc1e00bdb17e72fc711ebe2fea783b8`. Immutable source/build `work/consent-release-20261019`; infrastructure `work/consent-infra-20261019`. One existing Worker updated; three resources unchanged. No migrations. Existing37 migrations plus operational service status remain unchanged. No owner account activation, device grants, historical transfer, profile publication or participant test votes.

An informational notice began only at actual deployment start. Tests and submissions remained open without feature locks, forced refresh or audio stop. All248 previous client assets retained. CPU5000ms, six abuse bindings, protected media/admission, disabled public Worker URLs and existing edge/cost controls preserved. Notice ended after live verification. The actual consent component, agreement, activity-monitoring and nickname regressions passed, along with bounded typecheck, clean isolated build and340 static assets/200 protected recordings. Reviewed layouts1280×720,390×844,320×568,768×1024,1024×320 and280×320; physical devices are not certified. Evidence: workspace/artifacts/consent-release-20261019/ and docs/CONSENT_UI_REVIEW_2026-10-19.md.

GitHub implementation publication succeeded. A fresh verified encrypted off-device backup preceded deployment. Matching update96 encrypted backup and hosted baseline refresh are verified; the daily schedule is enabled. Unrelated recovery work remains excluded. Existing Community validation/privacy limits and the unpatched build-tool advisory remain tracked. Never restore erased records or rewrite original source/schema fingerprints.

## Historical release notes

# Local consent follow-up ready — October 19, 2026

Live update95 (implementation0ef217b; published handoff2e5d987) is deployed and verified, with a matching reconstructed encrypted backup and an active validated daily schedule. A later owner request found the hidden music opt-in: the local draft now shows all three numbered choices and all/required-only draft shortcuts. It does not save automatically or enable separate Personal/Community permissions. This follow-up is not pushed or deployed. Read [CONSENT_UI_REVIEW_2026-10-19.md](CONSENT_UI_REVIEW_2026-10-19.md). Local preview: localhost:5175/shootout?mode=open → Data Agreement & Sharing; the dialog is open in the hidden tester browser. Build input: artifacts/consent-choices-20261019/build-input. Do not deploy that local preview assembly. Preserve unrelated backup/recovery work.

> Update95 recovery verification: a matching encrypted off-device backup passed independent download/decryption, complete reconstruction with original source/schema fingerprints, and source-history/build portability checks. The private hosted baseline was refreshed, its validation run passed, and the same daily03:00 America/Los_Angeles schedule was re-enabled. Existing retention is unchanged. No storage details, keys or private receipts are published.

# Current live release — update95, October 19, 2026

Live: https://yinyangeq.com. The owner authorized pushing and deploying the reviewed Community Preferences and Tournament audit fixes. Community evidence uses separate prospective permission and true shared-source timing. Numerical Community results remain withheld pending independent listener validation and privacy review. The release includes clearer research/sharing text, target context, coarse ranking change logs, waveform seek/volume fixes, shared compact navigation, mobile layout fixes, sharing-first My data and continuous paginated Listening Pool playback. Compatible runtime/toolchain dependencies were upgraded; one unpatched build/lint braces advisory remains tracked and was absent from the inspected Worker output.

Implementation `0ef217b900198760f7f81adb447a0fbd1e5ef731`. Immutable source/build `work/community-release-20261019`; infrastructure `work/community-infra-20261019`. One existing Worker updated; three resources unchanged. Migrations0035/0036 applied with38 reviewed statements. Existing schema matched35 migrations plus operational service status before rollout; final schema matches all37 migrations plus that configuration. No account activation, device grants, historical transfer, public profile publication or official participant test votes.

An informational notice began only at deployment start. Listening tests/submissions remained open, with no feature locks, forced refresh or audio stop. All238 prior browser assets retained. CPU5000ms, six abuse bindings, protected media/admission, disabled public Worker URLs and existing edge/cost controls preserved. The notice ended after live verification. All63 effective regression suites, bounded typecheck, isolated build and340 static assets/200 protected recordings passed. Follow-up UI review covered48 affected viewport cases and66 new screenshots; physical devices and full penetration testing are not certified. Live page/asset/guard evidence is in workspace/artifacts/community-release-20261019/.

GitHub implementation publication succeeded. A verified encrypted off-device backup preceded migration; the matching update95 encrypted backup and hosted baseline refresh are verified, with the daily schedule enabled. Unrelated recovery work remains excluded. Never restore erased records or change source/schema fingerprints to accept an old snapshot.

## Historical release notes

# Local remediation ready for review — October 19, 2026

Checkpoint `5a53a63` and the follow-up are local only. Shared Community shell, compact mobile navigation, sharing-first My data and continuous paginated music playback are implemented;63 suites and the final build/typecheck pass. The updated local visual audit is http://localhost:5175/__audit/review#latest. See LOCAL_REVIEW_HANDOFF_2026-10-19.md and DEPENDENCY_SECURITY_REVIEW_2026-10-19.md for exact evidence and the one unpatched build-tool advisory. No push, deployment, production/account/history execution or backup change. Live remains update94.

# Local review checkpoint — October 19, 2026

Owner authorized a local checkpoint commit and handoff, then remaining security/UI remediation. No push or deployment. Live remains update94; canonical local candidate includes migrations0035/0036, which are applied only to the ignored local database. Start with [LOCAL_REVIEW_HANDOFF_2026-10-19.md](LOCAL_REVIEW_HANDOFF_2026-10-19.md) for the candidate, evidence, next work and execution boundaries.

> Update94 recovery verification: a matching encrypted off-device backup passed independent download/decryption, complete reconstruction with original source/schema fingerprints, and source-history/build portability checks. The private hosted baseline was refreshed, its validation run passed, and the same daily03:00 America/Los_Angeles schedule was re-enabled. Existing retention is unchanged. No storage details, keys or private receipts are published.

# Current live release — update94, October 19, 2026

Live: https://yinyangeq.com. The owner explicitly authorized deployment of the latest reviewed Tournament work. Personal Tournament is the first suggested mode, with saved personal progress, themed results, uploads/shared playback, compact music source and full title/artist display, restored song ratings, and activity-weighted passage exploration without early repeats. Blind Research/Open Comparison, listening/consent explanations, responsive controls, admin/private-test isolation and reserved-name protections are included. Dynamic Range Compression/Expansion remains Open Comparison only.

Implementation `3762ff728bd545f92530eccbe7a40dcf56658251`. Immutable source/build `work/tournament-release-20261019`; infrastructure `work/tournament-infra-20261019`. One existing Worker updated; three resources unchanged. Migrations0033/0034 applied:46 new schema definitions and the reviewed scoped replacement of ownership_update_guard; existing tables and historical participant rows were not rewritten. No YinYangEQ activation, device enrollment, historical transfer or profile publication occurred. No official participant test vote was cast. These operations remain separately reviewed execution steps.

Deployment began with an informational notice and no feature locks. Existing tests/submissions stayed open; no forced refresh or audio stop. The notice ended after verification. All183 prior browser assets retained. CPU5000ms, six abuse bindings, protected media/admission, disabled Worker public URLs and edge/cost guards preserved.52 focused regression suites, all35 synthetic migrations, source TypeScript, isolated production build and340staticassets/200protected recordings pass. Live checks verified six public pages and223exact asset hashes. Existing schema matched the migration chain before rollout; final schema matches all35 migrations. Physical-device coverage remains limited to the documented browser viewport review.

A fresh encrypted off-device backup succeeded before deployment. A matching update94 encrypted backup and hosted baseline refresh are verified; the daily schedule is enabled. Unrelated backup/recovery development is preserved. GitHub publication is separate and was not requested or performed. Evidence: workspace/artifacts/tournament-release-20261019/.

## Historical release notes

# Operational handoff — maintenance expired, October 18, 2026

Live baseline remains **update93**, implementation `4dbba07333b0755a1ffbd5dc2ce0416b936c6249`. Source/build: `work/maintenance-ui-release-20261018`; infrastructure: `work/maintenance-ui-infra-20261018`. The owner approved and this chat deployed that exact redesigned maintenance UI. No deployment is required for this handoff.

## Current operation

At approximately 11:02 PM Pacific on October18, read-only checks verified that maintenance was inactive, no feature locks remained effective, and public `/shootout` returned HTTP200. Browser inspection confirmed the normal Shootout setup and no maintenance notice. The full stored notice row was identical to its pre-deployment capture, with original expiry `1792389524011` (October18,10:58:44PM PDT). Nothing was republished, cleared, extended or restarted. The exact transition second was not observed; the expired state was verified after the original deadline. Do not reactivate the old notice or treat its retained database row as an active lock. Effective availability is determined by expiry. No comparison was started or submitted for verification.

Evidence (local, ignored): `workspace/artifacts/maintenance-expiry-20261018/verified.json` and `shootout-restored.jpg`. Earlier active-state deployment evidence is point-in-time history, not a claim maintenance is still active. The deployment comparison of the entire stored row is in `workspace/artifacts/maintenance-ui-release-20261018/live-notice-check.json`.

## Completed work

- The full site audit and approved fixes are recorded in `workspace/artifacts/final-site-check-20261018/final-review.html`. Broad review covered60verified-size public-page cases,24Shootout-tab cases and5admin cases. Two minor terminology/notice-duplication observations remain documented. Destructive operations and real participant research submissions were not exercised live. Physical TV/OLED hardware and native5120 rendering are not certified; browser5120 requests cap at4096.
- Shootout Rankings defaults to recommended matched A/B passage evidence, cites the controlled-listening principles and distinguishes the practical five-second rule from a guarantee of accuracy. The historical20-song filter was removed. Counters follow the selected test version/headphone type and include ties.
- SHA-256 matching uses valid file hashes and retains consented stored hashes for ties. The two-participant-group requirement remains. Read-only evidence found89qualifying comparisons,38current/51earlier,16ties and46validhashes, with no qualifying two-group hash cohort. Older data was not discarded or silently reclassified;3earlier records have common five-second passage evidence but retain their earlier-protocol label.
- Initial consent includes an optional private Sync-linked nickname, no email, and explicit monitoring Yes/No. The compact layout was checked at360×640. `/participation` keeps consent accessible independently of paused Shootouts. My data remains the place to edit/remove nickname and manage privacy.
- Maintenance supports separate feature locks and combined custom durations. The final dark-green UI has labelled Paused/Available cards, quick duration choices, a custom-unit form, readable totals and separate live-versus-draft timing. Updating a notice intentionally starts a new timer; loading or deploying controls does not. Contribution forms additionally require the Shootout page unlocked.
- Tuning uses current matched A/B rankings from both music sources, across headphone types; its target selector fits inside its panel on mobile/tablet/desktop/ultrawide/4K. The separate20-song convenience playback menu is unchanged. Track Library and Listening Pool are accepted terminology.

Update93 validation: isolated production build/TypeScript,340staticassets/200recordings,448maintenance route/method cases, duration/expiry regressions, keyboard and simulated UI interactions. Live checks verified16JS/CSS assets and all145retained earlier client assets. One Worker updated,3resources unchanged, no schema/migration/scoring/protocol change, no forced refresh or audio stop. CPU5000ms,6abuse bindings, private media/admission and edge/cost guards are preserved. Root snapshot verification passed against update93 before this documentation-only handoff.

## Git reconciliation and next work

Fetched `origin` before this handoff. Latest remote `origin/main` is `c41196d` (Document verified encrypted recovery snapshot and cleanup); latest local commit at inspection was `846a9f7` (Record verified maintenance UI release93 with unchanged timer). Remote is an ancestor of local main: **0behind/34ahead** before the handoff commit. Our changes already include the latest remote history; no pull, merge, rebase or cherry-pick is needed. The runtime UI implementation and release records are already committed. This handoff adds documentation only. GitHub push/publication is separate and has not been requested.

The canonical working tree also contains unrelated uncommitted personal-shootout, admin-test-isolation and backup/recovery work, including an independent backup note in this handoff. Those edits are preserved and excluded from this chat's handoff commit. Do not stage them wholesale or deploy the dirty checkout. A clean committed-source check and the verified immutable live snapshot are distinct from the intentionally dirty canonical working tree. Never restore erased user records from old snapshots.

For any future change: read AGENTS.md and the current live release first, fetch/reconcile again, isolate only the authorized scope against verified live source, and preserve existing schema, ownership, consent, deletion, media and cost guards. No remaining action is required for the maintenance-expiry request.

## Release history

# Current live release — update93, October 18, 2026

Live: https://yinyangeq.com. The owner approved the redesigned maintenance UI shown in the local preview. Feature availability now uses labelled Paused/Available cards; duration uses quick choices and a custom combined-unit form with a readable total. Current live expiry and next-publication duration are clearly separated. Selections take effect only when published. Dark green styling, keyboard controls and mobile layout are retained.

Only components/service-status-panel.tsx and components/service-status-panel.css changed. Implementation `4dbba07333b0755a1ffbd5dc2ce0416b936c6249`. Source/build `work/maintenance-ui-release-20261018`; infrastructure `work/maintenance-ui-infra-20261018`. Pending personal-shootout and backup/recovery changes remain preserved and excluded. No backend policy, schema, scoring, listening-protocol or participant-choice changes. One Worker updated; three resources unchanged. All145 earlier client assets retained. CPU5000ms, six abuse bindings, private media/admission, disabled public Worker URLs and edge/cost guards remain unchanged. No forced refresh or audio stop. GitHub publication remains separate and unrequested.

The entire stored maintenance row was read before and after deployment and is identical, including notice ID, text, pause setting and expiry. No notice was published, cleared or extended. Original automatic expiry remains October18,10:58:44PM Pacific (`1792389524011`). The effective state at verification is recorded in workspace/artifacts/maintenance-ui-release-20261018/live-notice-check.json; natural expiry must not be mistaken for a deployment change or manually reactivated.

Isolated production build/TypeScript,340staticassets/200recordings,448maintenance route/method cases, duration validation/expiry and local UI interactions passed. Preview verified360/390/768/1280/1920/3440/3840 widths, no horizontal overflow, correct1590-minute combined duration, invalid-field publication protection and keyboard toggles. Live deployed admin layout and retained asset hashes verified read-only. No live form save or participant comparison submitted. Evidence: workspace/artifacts/maintenance-ui-release-20261018/. Design review remains workspace/artifacts/maintenance-ui-review-20261018/review.html, now superseded by this verified deployment.

## Historical release notes

# Current live release — update92, October 18, 2026

Live: https://yinyangeq.com. The owner explicitly approved and this session deployed the final reviewed maintenance-controls release. Admin now selects locks for Shootouts, Listening Pool, Preference Tuning, and shared uploads/suggestions; privacy/data/admin access remains available. Contribution forms also need the Shootout page unlocked. The existing notice remains Shootout-only and its original automatic expiry is unchanged: October18,10:58:44PM Pacific (`1792389524011`). Do not republish or extend it just to test controls.

Three substantive final-audit findings are corrected: new visitors can review the existing compact agreement at `/participation` while Shootouts are paused, including optional private nickname and explicit monitoring Yes/No; Preference Tuning's target selector stays inside its panel across mobile/tablet/desktop/ultrawide/TV sizes; and Tuning uses matched A/B blind rankings from both music sources across headphone types, replacing its historical20-song rank subset. The separate convenience playback menu is unchanged. Consent remains required; no participant agreement was accepted during live testing.

Implementation `8eb2789dd805fd5d1534659c147cc10ec61a6c06`. Source/build `work/maintenance-controls-consent-release-20261018`; infrastructure `work/maintenance-controls-consent-infra-20261018`. Canonical pending personal-shootout changes are preserved and excluded. One existing Worker updated; three resources unchanged; no migrations or scoring/listening-protocol changes. CPU5000ms, six abuse bindings, private media/admission, disabled public Worker URLs and edge/cost guards preserved. All118 earlier client assets retained, with16 deployed JS/CSS hashes verified. No forced browser refresh or audio stop. GitHub publication is separate and remains unrequested.

Build/TypeScript,340staticassets/200recordings,448route/method cases across all16lock combinations, legacy notice/timer preservation, custom-duration and warning regressions, independent consent gate, atomic nickname/agreement/rollback tests, ranking API/model/passage and24ranking-fragment cases passed. Live read-only checks confirm admin scope and unchanged deadline, fresh consent redirects without bypass, established-browser Pool200tracks and Tuning access, and89unchanged qualified comparisons (38current/51earlier). Browser verifies selector fit and new wording at360/768/1280/1920/3440/3840. The deployed admin controls were read through a GET-only viewer; no live notice was republished and no research comparisons/settings were submitted.

Final report: workspace/artifacts/final-site-check-20261018/final-review.html. The broad audit covers60verified-size public-page cases,24Shootout tab cases and5admin cases. The report records two minor copy/usability observations (browser-account terminology and notice duplication). Destructive/publishing/research actions were not executed on live users; synthetic tests and prior release evidence cover those flows. Native5120 is capped4096 by the browser backend; physical TV/OLED hardware is not certified. The initial mis-targeted public matrix was discarded and replaced. No remaining deployment approval for this reviewed release. Evidence: workspace/artifacts/maintenance-controls-20261018/.

## Historical release notes

# Current live release — update91, October 18, 2026

Live: https://yinyangeq.com. The owner-requested one-hour maintenance freeze is active until Oct 18, 2026, 10:58 PM Pacific, with automatic expiry. The notice explains that major updates are underway. Public Shootout pages and new trial/comparison/vote/feedback writes are paused. Listening Pool playback/votes and Preference Tuning/downloads remain usable; My data, privacy and admin access are preserved. Already-loaded audio is not forcibly stopped, and no browser refresh is forced.

Implementation `44a63aea01da8c85cf045fdd00fc5614e254b4e2`. Source/build `work/maintenance-freeze-release-20261018`; infrastructure `work/maintenance-freeze-infra-20261018`. The maintenance gate was narrowed from all writes to Shootouts, and the notice/admin wording updated. No schema, scoring, listening protocol or participant-record change. One existing Worker updated; three resources unchanged; 95 earlier client assets retained. CPU5000ms, six abuse bindings, private media and edge/cost guards preserved. Pending personal-shootout work is excluded. GitHub publication remains separate.

Build/types, full340-asset/200-recording packaging,19 selective route/method cases, warning and duration regressions passed. Live public Shootout shows the maintenance page, with working Listening Pool and Preference Tuning links. The freeze starts from the stored activation time and expires automatically; it is not extended by later deployments. Evidence: workspace/artifacts/maintenance-freeze-20261018/.

Outstanding work in this chat: configurable per-feature admin maintenance locks and the final whole-site wording/counter/layout audit. The user requested the freeze after originally asking to keep Shootouts open; this explicit newer instruction authorises pausing Shootouts for the stated hour.

## Historical release notes

# Current live release — update90, October 18, 2026

Live: https://yinyangeq.com. Same file across listeners now matches valid SHA-256 fingerprints across at least two participant groups. Song tags and recording IDs are descriptive, so missing or different tags no longer exclude identical files. Ties preserve valid hashes already retained in their consented listening-run context. Invalid or missing hashes fail closed. Synced browsers remain one authenticated group; test-version filtering, moderation, common-passage requirements and private output are preserved.

Implementation `5b4cd5867f9a96aca9f8f7778abf95d90259308d`. Source/build `work/file-matching-fix-release-20261018`; infrastructure `work/file-matching-fix-infra-20261018`. Runtime changes are the research ranking reader, tie evidence projection, shared fingerprint validation and Rankings explanations. Clean build isolated under workspace/artifacts/file-matching-fix-20261018/build-input. Pending personal-shootout application, schema and gate work is preserved and excluded. Develop only in workspace/. GitHub publication remains separate and has not been performed for updates83–90.

One existing Worker updated; three resources unchanged. No migration, write-API change, participant-data update, audio/listening-protocol change or maintenance change. Only the requested same-file eligibility rule and tie provenance projection changed; the scoring model and other ranking views are unchanged. No hashes or tags were invented or backfilled, and no erased records were restored. Submissions stayed open; no forced refresh. 85 prior browser assets retained. CPU5000ms, six abuse bindings, private media/consent/ownership/erasure, disabled public Worker URLs and edge/cost guards preserved. A rollout cannot guarantee zero transient network interruption.

Validation: isolated TypeScript/build and340-asset/200-recording packaging;18 focused matching API/evidence cases cover hash validation, absent/different tags, ties, synced groups, missing retained provenance, moderation, protocol isolation and passage requirements. Existing ranking API/model,18 passage assertions and24 page renders passed. Read-only live evidence confirms that saved tie hashes survive projection and the API matches the new implementation. All other ranking views match their prior counts and model results within1e-7 numerical tolerance across runtimes. Mobile/ultrawide/TV CSS layouts and asset availability were verified. The current data still correctly shows0 same-file comparisons because no valid file hash spans two qualifying participant groups; nonzero and tie-only matching was verified synthetically. No live votes or participant settings were changed.

Evidence: workspace/artifacts/file-matching-fix-20261018/. Requested5120 viewport is capped at4096 by the browser backend; physical phone/TV/OLED hardware is not certified.

## Historical release notes

# Current live release — update89, October 18, 2026

Live: https://yinyangeq.com. The historical 20-song research filter is removed from the Rankings interface as requested. Its comparison records remain available to the broader eligible views. Old saved selections fall back to All blind votes. The main and same-file counters use the selected test version and headphone type and include ties. The same-file explanation distinguishes matching SHA-256 file bytes plus tags/recording ID from tag-only song selection and from matching audio across encodings. Matched A/B passage remains the recommended default with its existing research references and limitations.

Implementation `bc806a513bccee93b158199f93b5e9f29b821dc8`. Source/build `work/rankings-fix-release-20261018`; infrastructure `work/rankings-fix-infra-20261018`. Only app/shootout/page.tsx changed at runtime; scripts/check_ranking_view.mjs adds real-fragment regression coverage. Clean build isolated under workspace/artifacts/rankings-fix-20261018/build-input. Pending personal-shootout application, schema and gate work is preserved and excluded. Develop only in workspace/. GitHub publication remains separate and has not been performed for updates83–89.

One existing Worker updated; three resources unchanged. No migration, API, ranking model, audio protocol, data or maintenance change. Submissions stayed open; no forced refresh. 78 prior browser assets retained. CPU5000ms, six abuse bindings, private media/consent/ownership/erasure, disabled public Worker URLs and edge/cost guards preserved. A hosting rollout cannot guarantee zero transient network interruption.

Validation: isolated TypeScript/build and340-asset/200-recording packaging;24 actual ranking-fragment renders cover all visible modes, test versions and headphone types, including tie-only/singular and loading states; old-filter restoration; ranking API/model and passage regressions passed. Browser preview exercised changing cohort counts and mobile/ultrawide/TV layouts. Live checks confirm filter removal, displayed counters against ranking rows for every selected test version/headphone type, accurate SHA-256 wording, asset hashes and submissions open. Evidence is workspace/artifacts/rankings-fix-20261018/. Requested5120 is capped at4096 by the browser backend; physical TV/OLED hardware is not certified. No live research votes or participant settings were changed.

## Historical release notes

# Current live release — update88, October 18, 2026

Live: https://yinyangeq.com. The consent popup is compact: optional listener nickname, participation and explicit monitoring Yes/No appear together. Music sharing and full privacy/retention/deletion explanations remain expandable. The initial 360×640 layout fits its controls and action buttons without scrolling; smaller 320×568 and landscape layouts keep nickname and monitoring choices visible and action buttons accessible. Full terms scroll independently. Monitoring remains optional and is never preselected on; the same atomic save and browser Sync identity apply.

Implementation `a80e13a5505d7de79b374d5c15c0c0ce86016d74`. Verified source/build `work/consent-compact-final-release-20261018`; infra `work/consent-compact-final-infra-20261018`. Only components/comparison-data-settings.tsx and its CSS changed from update87. Clean build isolated under workspace/artifacts/consent-compact-20261018/build-input. Concurrent personal-shootout application, schema and gate changes are excluded and preserved. Develop only in workspace/. GitHub publication remains separate and has not been performed for updates83–88.

One existing Worker updated; three resources unchanged. No migration, API, scoring, listening protocol, target data or maintenance-state change. Submissions stayed open; no forced refresh was sent. 71 previous browser assets are retained for already-open sessions. Private media/ownership/consent/erasure, CPU5000ms, six abuse bindings, disabled public Worker URLs and edge/cost guards are preserved. A hosting rollout cannot guarantee zero transient network interruption.

Validation: isolated TypeScript/build and340-asset/200-recording packaging passed. Synthetic consent regression verified combined nickname save, validation/transaction rollback, explicit monitoring and opt-out. Local real-component checks verified initial blank selection, join disabled until an explicit Yes/No, both saved outcomes, nickname, expandable terms and keyboard focus. Live popup and asset checks are in workspace/artifacts/consent-compact-20261018. Responsive checks cover mobile, landscape, desktop, ultrawide and TV-sized CSS viewports. Requested5120 is capped at4096 by the browser backend; physical phone/TV/OLED hardware is not certified. No participant preferences were changed or research votes submitted during verification.

## Historical release notes

# Current live release — update87, October 18, 2026

Live: https://yinyangeq.com. The participation popup now includes the same optional private account nickname used by My data and explicit browser Sync. No email field. Nickname and consent changes save together in one database transaction. Invalid input or a failed transaction does not partially change consent. Initial participants choose Yes or No for optional activity monitoring before joining. No keeps listening available; monitoring is never preselected on. Returning users see the saved On/Off setting, loaded afresh from the server when the popup opens. Unsaved changes and load failures are distinguished from saved consent. Existing accepted participants are not forced through a new popup.

Implementation `158e059965976b49d1763124d72081fd9f940477`. Verified source/build `work/consent-release-20261018`; infra `work/consent-infra-20261018`. The clean build was isolated under workspace/artifacts/consent-final-20261018/build-input to exclude concurrent personal-shootout work. Develop only in workspace/. Uncommitted personal-shootout work remains separate and was not deployed. GitHub publication is separate and has not been performed for updates83–87.

One existing Worker updated; three resources unchanged. No migration, schema, ranking model, listening protocol, target data or maintenance-state change. Submissions stayed open, no forced refresh was sent, and63 prior browser assets were retained for already-open sessions. Private media/ownership/consent/erasure, CPU5000ms, six abuse bindings, disabled public Worker URLs and edge/cost guards are preserved. A hosting rollout cannot guarantee zero transient network interruption.

Validation: isolated TypeScript/build and340-asset/200-recording packaging; combined nickname/consent transaction and rollback, monitoring On/Off, activity privacy, nickname, submission notices and blind completion checks passed. Live checks used only disposable empty accounts, verified explicit acknowledgement, monitoring event recording and removal, nickname labels, a complete two-sided Sync handshake and settings shared across linked sessions; those fixtures were erased. No preference votes or real participant deletions. Public and authenticated assets matched;63 previous assets remained available. Mobile, landscape, desktop, ultrawide and TV-sized CSS viewport checks are documented in artifacts/consent-final-20261018/final-check.txt. Requested5120 was capped at4096 by the browser backend; physical TV/OLED devices are not certified.

The inspected existing browser's monitoring setting was Off and was left unchanged. The site cannot determine from that state alone whether an earlier checkbox was saved. All26 earlier audit findings remain addressed; see the prior resolution report. The remaining uncommitted personal-shootout work is not part of this task or live baseline.

## Historical release notes

# Current live release — update86, October 18, 2026

Live: https://yinyangeq.com. The approved optional nickname and whole-site audit corrections are deployed and verified. Implementation `fb30ec5dc40d813a4a031d3e2e60150892d68a5e`; source/build `work/site-audit-fixes-release-20261018`; infrastructure `work/site-audit-fixes-infra-20261018`. Develop only in workspace/. GitHub publication remains separate and has not been performed for updates83–86.

All26 original audit findings are addressed by corrections or explicit explanations; see workspace/artifacts/site-audit-20261018/audit-resolutions.html. The historical observations remain in full-site-audit.html with a resolution link. Nicknames are optional, private, removable, account-bound and shared only through existing explicit browser Sync. No email field. Migration0032 added one initially empty account-linked table; no existing tables or participant rows were changed by the migration. Private-target Open comparisons now stay local, and the run API rejects private targets. Approved-target comparisons remain collected under the existing agreement. Public browser accounts and invitation accounts share protected-study consent/ownership eligibility; shared admin and unowned legacy records remain excluded. Existing sealed releases are unchanged.

Other fixes cover the music-vote consent refresh, keyboard focus, compact-player positioning, feedback privacy/persistence wording, ranking-cohort explanations, contacts and discoverable public credits, visitor terminology, empty search states, display-only title cleanup, count grammar, page metadata and the Welcome home destination. Stored recording metadata, source assets, comparison protocol and ranking model remain unchanged. The two audit harness gaps are repaired; the optional extra browser-events fixture is explicit rather than silently required.

One existing Worker updated; three resources unchanged. CPU5000ms, six abuse bindings, private media, disabled public Worker URLs and edge/cost guards preserved. Fifty-five earlier browser assets are retained for open sessions. No forced refresh or research-data restoration. The requested informational notice was enabled with pauseSubmissions=false, then disabled after deployment and verification. Invites remain off; submissions remain open. A rollout cannot guarantee zero transient network interruption.

Validation: TypeScript, production build,33-migration chain,340-asset/200-recording packaging, focused nickname/private-comparison/archive-eligibility tests, browser pairing/sync, agreement/activity, ranking API/model, media-recovery, passage-ranking and18 recovery tests passed. Eighteen live checks exercised nickname save/read/remove, isolation, invalid input, public credits and redirects using disposable empty accounts, then erased those fixtures. No preference votes or existing participant deletions. Fifteen public live asset hashes and55 retained assets matched. Fifty live page/viewport cases across10 routes at375/768/1920/3440/3840 had no page overflow; compact player, library clear/search and instructions keyboard navigation were checked live. Native5120 and physical OLED/TV/browser/audio testing are not claimed; the backend caps5120 requests at4096.

No remaining deployment approval or planned code change for this task. The full audit and approved corrections are complete. Publication to GitHub has not been requested. The historical update81 encrypted backup still requires matching source and a fresh deletion review; no new recovery bundle was produced.

## Historical release and audit notes

Audit completion: the full report is workspace/artifacts/site-audit-20261018/full-site-audit.html (also.txt). It lists26 outstanding report-only findings, three separately authorised live corrections and two test-harness gaps. Public pages and six Shootout tabs were inspected; destructive/publishing operations were not executed on participant records. Final live layout matrices cover60 page cases plus24 tab cases; ranking update checked at375/1920/3440/3840. Requested5120 was capped to4096; physical OLED/TV devices were not tested. Track Library and Listening Pool are accepted terminology.

Optional nickname preview commitae7c196 is tested and NOT DEPLOYED. My data can set/remove a private nickname on authenticated ownership shared through explicit Sync. No email is collected. Admin labels use verified record ownership; nicknames do not change ranking or monitoring. Migration0032 creates one empty table only and has NOT run live. TypeScript/build/full media packaging, nickname isolation/validation/removal, real synthetic sync/account erasure, agreement, activity and18 recovery checks passed. Await the owner’s explicit deployment approval; screenshot nickname-preview-saved.png. Other audit findings remain report-only.

# Current live release — update85, October 18, 2026

Live: https://yinyangeq.com. Matched A/B passage is the default recommended ranking view. The explanation references ITU-R BS.1116-3 §4.2/§6 and BS.1284-2 §5.2.1, and states the limits of the five-second site rule and lack of full ITU compliance. Earlier views remain available. No listening requirement, scoring or participant data was changed.

Implementation `18bf9c70d4c8b383536409d217f129dea71bdb6f`. Verified source/build `work/matched-ranking-release-20261018`; infrastructure `work/matched-ranking-infra-20261018`. Develop only in workspace/. One existing Worker updated; three resources unchanged. No migration, data restoration, maintenance activation or forced refresh. Invites off. CPU5000ms, six abuse bindings, private media, disabled public Worker URLs and edge/cost guards preserved. Previous browser assets retained for open sessions; a rollout cannot guarantee zero transient network disruption. GitHub publication is separate and has not been performed for updates83 onward.

The optional account nickname is a canonical-workspace preview awaiting explicit deployment approval. No nickname collection is live. Whole-site audit findings remain report-only. Browser layout checks cover375–3840 pixels; requested5120 was capped at4096, and physical TV/OS/browser testing is not claimed.

## Historical release notes

# Current live release — update84, October 18, 2026

Live: https://yinyangeq.com. Dark green admin notice controls and combined custom duration in months (30 days), weeks, days, hours and minutes. Existing preset clients remain supported. The notice remains inactive.

Implementation `0a36cfb76b3f6d70d729d7601828115f45298e46`. Verified source/build `work/admin-duration-release-20261018`; infrastructure `work/admin-duration-infra-20261018`. Develop only in workspace/. One existing Worker updated; three resources unchanged. No migration, data restoration, maintenance activation or forced refresh. Invites off. CPU5000ms, six abuse bindings, private media, disabled public Worker URLs and edge/cost guards preserved. Previous browser assets retained for open sessions; a rollout cannot guarantee zero transient network disruption. GitHub publication is separate and has not been performed for updates83 onward.

The optional account nickname is a canonical-workspace preview awaiting explicit deployment approval. No nickname collection is live. Whole-site audit findings remain report-only. Browser layout checks cover375–3840 pixels; requested5120 was capped at4096, and physical TV/OS/browser testing is not claimed.

## Historical release notes

# Next-session handoff — current live update83

Start with ../LIVE_STATE.md, ../LIVE_RELEASE.json and REBUILD.md. Work only in workspace/. Live ultrawide/TV presentation update: `27aabe2b58988a17ff953a6ed72b1d07fa54c89c`. Source/build `work/ultrawide-release-20261018`; infra `work/ultrawide-infra-20261018`. GitHub publication is separate and not yet performed. One Worker updated; three resources unchanged; no migration or test-protocol change. Invites off; maintenance inactive. Fifteen previous browser assets retained to support open sessions;15 referenced current assets verified.

The main whole-site wording/function audit remains report-only. The separate admin dark-green custom notice-duration change is awaiting review/approval and is not deployed. Preserve pending canonical changes and review their files against the recorded live snapshot. Local375–3840 responsive checks were run;5120 requested viewport was capped at4096 by the browser backend. No physical TV/device test or zero-interruption guarantee is claimed.

Preserve private media/consent/ownership/erasure, current schema, CPU5000ms, six abuse bindings, disabled public Worker URLs, edge burst rule and separate cost guard. Never restore erased participant data or publish private stack/data/recovery inputs. See prior release and recovery notes below.

# Next-session handoff — current live update82

Start with ../LIVE_STATE.md, ../LIVE_RELEASE.json and REBUILD.md. Canonical development checkout is `workspace/`; owner-root application files mirror verified live source. Fetch and inspect divergence/local changes before editing. Do not use historical previews or recovery bundles as a development baseline.

Live: https://yinyangeq.com. Invites are **off**. The admin-only switch is `/owner-research#tester-access`. “Enter the shootout” guides visitors into Shootout; all existing Welcome navigation remains. No additional Welcome design change was requested for deployment.

Implementation: `3565e5b803330e716a881f72e562c24e4211bd68`. Immutable source/build: `work/invite-release-20261018`; infrastructure: `work/invite-infra-20261018`. Migration0031 adds only the toggle table. Existing schema and participant records were preserved. One Worker updated, three resources unchanged; final preview four unchanged. See INVITE_SYSTEM.md for admission and ownership details.

Both toggle modes were verified on the live site, including open consent/audio access, original single-use invite redemption/48-hour expiry, admin-only controls, rejection of automatic open credentials when invites are enabled, and continued privacy management. The final setting is off. Disposable test accounts were erased and cleanup independently checked. All14 referenced JS/CSS assets match. Build/types,32 migrations, focused regressions and18 recovery safety tests passed. Browser checks used a desktop browser, not physical iOS/Android devices.

Keep private media routing, consent/data management, CPU5000ms, all six abuse bindings, disabled public Worker URLs, edge protection and the separate scheduled cost guard. Edge/budget rules were not changed; fresh zone-rule readback was unavailable to the app token. Never restore erased participant data or commit credentials, recordings, numerical curve seeds, stack state/configuration or private recovery records.

GitHub main publication is verified at `21bcb1d6bcbe84b1d7a978c25cbbfd046f484a50` (implementation and release records). Publication is separate from the live deployment. Unrelated backup-documentation edits were preserved and excluded from this release. The existing update81 recovery bundle requires its matching Git/migration revision and fresh deletion review; no new backup was generated for update82.

For a public clone: npm ci; node scripts/check-live-source.mjs --source-only; npm run build; node scripts/package-static-assets.mjs --public-only. Public-only packages cannot be deployed. Owner snapshot verification runs from the owner root. Use RECOVERY.md for private inputs and REBUILD.md for production deployment boundaries.

## Encrypted recovery snapshot — backup task completion

The update81 recovery bundle passed encrypted off-device verification: remote sizes/checksums and owner-only permissions, independent download, whole-archive SHA-256, decryption and all341 bundle-file checks. Its matching Git revision is `33f80d6bb04d9fa1b66de47368d733c5f41c5eac`. A concurrent session released update82 during transfer; this is an update81 point-in-time snapshot, **not an update82 database backup**. Use matching source/migrations and a fresh deletion review for recovery. The verifier correctly refused the newer source before passing against the recorded revision.

Read ENCRYPTED_BACKUP.md. Storage service/account, destination, receipt and key stay private. The owner confirmed saving the separate key in a password manager; an independent-device key copy has not been confirmed. No recurring backup schedule is configured. The disposable restore rehearsal and transfer/decryption fixtures were removed after verification; canonical workspace/, original private bundle, encrypted local archive and release snapshots remain. This backup task performed no deployment or production data mutation; the separate update82 release is preserved.

The saved project still points at the parent container. Its instructions redirect new work into workspace/; the owner can make workspace/ the primary project folder for direct Git discovery.
