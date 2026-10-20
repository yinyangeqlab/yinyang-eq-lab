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
