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

# Current live release — update83, October 18, 2026

Live: https://yinyangeq.com. Ultrawide/TV layout update verified. Implementation commit `27aabe2b58988a17ff953a6ed72b1d07fa54c89c`; GitHub publication is separate and has not been performed for this release. Source/build: `work/ultrawide-release-20261018`; infrastructure: `work/ultrawide-infra-20261018`. Develop only in workspace/.

This release changes presentation only: centered wide-screen headers, a 1600px listening workspace, proportional UI scaling at 2400/3200/4800 CSS pixels, scaled viewport-height correction, and contained library/credits/footer gutters. Sign-in and sync receive the same scale rules. No protocol, scoring, admission, participant schema or notice state changes. Invites remain off and no maintenance notice is active. One existing Worker updated, three resources unchanged. CPU5000ms, all six abuse bindings, private media, disabled public Worker URLs, edge/cost guards remain unchanged. No migration, participant restoration or forced browser refresh.

All15 referenced live JS/CSS assets match;15 previous browser assets remain available byte-for-byte for already-open sessions. Existing clients keep their loaded interface. A hosting rollout cannot guarantee zero transient network disruption. Local browser layout checks covered375,768,1920,3440 and3840 pixel widths; the5120 request was capped by the browser tool at4096, so native5120 rendering and physical TV/browser testing are not claimed. Full live layout audit continues in workspace/artifacts/site-audit-20261018/.

The separately requested admin dark-green duration control is pending user review and is NOT in this release. Canonical pending changes are components/service-status-panel.tsx, app/owner-research/admin-layout.css, app/api/owner-research/service-status/route.ts, lib/service-status.ts and lib/notice-duration.ts, plus its focused test. Do not deploy those until the reviewed version is approved. All audit wording/function findings remain report-only.

## Historical release notes

# Current live release — update82, October 18, 2026

Site: https://yinyangeq.com. Invites are **off**. The admin-only control is at `/owner-research#tester-access`. Welcome says “Enter the shootout”; Shootout, Track Library and Preference Tuning navigation remain available. No additional Welcome redesign was applied.

This summary supersedes historical notes below. Develop, test, commit and push only in `workspace/`. Verified deployed source/build: `work/invite-release-20261018`; infrastructure: `work/invite-infra-20261018`. Implementation commit: `3565e5b803330e716a881f72e562c24e4211bd68`. Implementation and release records were published to GitHub main and independently confirmed at `21bcb1d6bcbe84b1d7a978c25cbbfd046f484a50`. Publication is separate from the verified live deployment.

The persistent toggle defaults off. With invites off, code restrictions, invitation links and visitor-facing invitation wording are hidden; invitation management/redemption are inactive. Turning it on restores the existing creation, single-use redemption, 48-hour session, expiry and revocation process. Existing invitation rows and expiry times are preserved. Automatic browser access retains consent, private media, verified data ownership and deletion controls; open credentials cannot pass invite-only admission when re-enabled.

Applied only additive migration `0031_site_access_settings.sql` to the existing database. No existing schema was altered or participant records restored. One existing Worker updated; three resources unchanged; final preview four unchanged. CPU5000ms, six abuse bindings, private media routing, disabled public Worker/preview URLs and the independently scheduled cost guard are retained. Separate edge/budget rules were not modified; the app token lacks zone-rule read scope, so those rules were not freshly read back.

Verified both live modes, then restored invites off. Thirty-six live assertions covered the admin-only toggle and CSRF, open admission, required consent, protected audio range, ownership, original invitation creation/redemption/single-use/48-hour expiry, rejection of open credentials when enabled and continued data management. Only disposable fixture accounts were created and erased; cleanup was independently checked. All14 live referenced JS/CSS assets matched the intended build. Live browser inspection confirmed Welcome wording in both modes and retained navigation. The final screenshot is `workspace/artifacts/invite-release/live-invites-off.png`.

Build, app/infra TypeScript, 340-asset/200-recording packaging,32-migration checks, invite/browser pairing, browser sync, participation preferences, activity monitoring, passage regressions and18 recovery safety tests passed. No physical-device testing was performed. Evidence is private/ignored under `workspace/artifacts/invite-release/`.

The previously tested update81 recovery bundle remains bound to its recorded source/migration fingerprint. This release did not create a new participant-data backup. Use the matching source revision and a fresh deletion review for any recovery. Unrelated local backup-documentation edits remain outside this release's commits.

## Encrypted recovery snapshot — backup task completion

The update81 recovery bundle passed encrypted off-device verification: remote sizes/checksums and owner-only permissions, independent download, whole-archive SHA-256, decryption and all341 bundle-file checks. Its matching Git revision is `33f80d6bb04d9fa1b66de47368d733c5f41c5eac`. A concurrent session released update82 during transfer; this is an update81 point-in-time snapshot, **not an update82 database backup**. Use matching source/migrations and a fresh deletion review for recovery. The verifier correctly refused the newer source before passing against the recorded revision.

Read docs/ENCRYPTED_BACKUP.md. Storage service/account, destination, receipt and key stay private. The owner confirmed saving the separate key in a password manager; an independent-device key copy has not been confirmed. No recurring backup schedule is configured. The disposable restore rehearsal and transfer/decryption fixtures were removed after verification; canonical workspace/, original private bundle, encrypted local archive and release snapshots remain. This backup task performed no deployment or production data mutation; the separate update82 release is preserved.

## Historical release notes

# Current live release — update81, October 18, 2026

## Canonical workspace and tested recovery — October 18, 2026

Published recovery/source commit `6c3f0524586f1c377bbb3285cd33a269ed4982b5` on GitHub main. Canonical checkout: workspace/. Final metadata publication is separate from the unchanged live deployment.

Live remains update81; no redeployment or production data mutation occurred. Develop, test, commit and push only in workspace/, the clean GitHub checkout. The parent is an owner container and verified live-source mirror. Inactive previews/generated output are archived under archive/legacy-workspaces-20261018; release snapshots and older Git worktree paths are retained for provenance, not development. Root config/license inconsistencies were reconciled after preserving the previous config.

Read workspace/docs/RECOVERY.md and workspace/docs/RECOVERY_TESTS.md. A verified external media/current-database bundle exists privately under private/recovery/final-bundle-update81. A fresh tracked-files-only checkout restored it locally, generated new credentials, built and packaged340 assets/200 recordings, and passed real gate/API/audio/Sync checks.18 safety tests and app/infra TypeScript passed. Offline generation of a new-account/domain binding and protection plan also passed. No private payloads or credential values are committed.

Recovery tooling and canonical-origin/guard binding improvements are not deployed. Current application runtime remains aligned with live81. Fresh owner deletion review is required before any later participant-data restoration; browser-only state and external provider provisioning have separate documented requirements. The bundle is local private storage, not an off-device encrypted backup service.


## GitHub rebuild audit — October18,2026

Current live release remains update81; this audit did not redeploy or write production data. Git runtime files match the verified live snapshot. GitHub now includes missing source validation/pairing coverage, audited credential-free deployment/gate and cost-guard source, clone-safe packaging and current rebuild/session instructions. Private media, numerical curves, participant data, credentials and stack configuration/state remain excluded.

Start the next session at docs/HANDOFF.md and docs/REBUILD.md. Public clones use `node scripts/check-live-source.mjs --source-only`; full owner snapshot checking requires the recorded local snapshots. Fresh app/infrastructure npm ci, build, separate TypeScript checks,31-migration local setup and focused regressions passed. A public-only preview package is explicitly rejected by the deployment code. Details and limitations: docs/REBUILD_AUDIT.md. Earlier root tooling/license differences were reconciled by the later canonical-workspace cleanup; no erased user records may be restored.


Site: https://yinyangeq.com. Verified application source/build: `work/tagline-release-20261018`. Infrastructure snapshot: `work/tagline-infra-20261018`. These pointers supersede historical current-release statements below.

## Two curves. Your choice.

Replaced “THE SOUND BETWEEN” with “Two curves. Your choice.” Larger14–17px bright text, tighter letter spacing and dark text shadows improve readability. No colored box, background or border. Phone layout shows the tagline on its own row instead of hiding it. Only app/page.tsx and app/welcome.css differ from exact live update80; current Shootout/Continue, credits, sync, consent, private/media and cost protections are preserved.

Build and packaging passed with340 assets and200 protected recordings; client dependency/preload packaging checks passed. Live Welcome and /sync returned200; all13 referenced JS/CSS assets matched the intended build. Browser screenshot verifies the shadow-only tagline. One existing Worker updated, three resources unchanged; final preview four unchanged. No migrations or participant-data writes. Evidence: artifacts/tagline-release/{source-scope.json,build.log,assets.log,preview.log,deployment.log,no-drift.log,live-verification.json,live-tagline.png}.

Implementation commit `08f166f1a542a0ed6aeadd1a37c489d08ae9a8c6` is on main in work/github-live-sync-20261018. A following documentation commit records the verified release. The approved update81 implementation and handoff were pushed to GitHub main (release commit17f8a8c). GitHub publication is separate from the already verified live deployment. Root tooling/license differences remain preserved; build uses the exact snapshot configuration. Never restore erased user records.

## Prior releases and retained work notes (historical)

# Current live release — update80, October 18, 2026

Site: https://yinyangeq.com. Verified application source/build: `work/continue-button-release-20261018`. Infrastructure remains `work/welcome-header-infra-20261018`.

## Approved Continue button release

Deployed the reviewed gold Continue test button with dark bold text, raised edge, arrow badge, short hover lift, visible keyboard focus and reduced-motion support. Full-width mobile layout; existing nextPair and disabled handling preserved, with Saving… busy label. Only app/globals.css and app/shootout/page.tsx differ from verified update79. Unrelated root Welcome draft excluded.

Build, TypeScript and340-asset/200-recording packaging passed. Live deployed assets matched the release build. Desktop1280 and responsive mobile390 passage→vote→Continue checks passed, with new blinded pair and listening credits reset to0/0;320px fit checked. These use deployed app/API through isolated loopback tester sessions and synthetic audio, not physical mobile devices. Test submissions erased afterward. Private access/media and cost protections unchanged; one Worker updated, three resources unchanged, final preview four unchanged. No migrations. Approved release commits and handoff are published to GitHub main.

Implementation commit: `15ec1a7` in `work/github-live-sync-20261018` on main. This records all approved deployed upload/passage/vote cleanup changes plus Continue. Portable test-only adjustments already in that checkout retained. Exact deployed build/source remains the manifest snapshot.

Evidence: `artifacts/continue-button-release/` — deployment.log, no-drift.log, live-verification.json, live-flow-events.json, live-desktop.png, live-mobile.png and REPORT.md.

GitHub sync verified: `yinyangeqlab/yinyang-eq-league`, branch `main`, release/handoff commit `f44e0c0a4d19a2adf65729272e43042de0810399`. All recorded runtime files match live update80. This publication adds no live deployment.

## Prior release and retained notes (historical)

# Current live release — update79, October 18, 2026

Site: https://yinyangeq.com. Verified application source/build: `work/shootout-passage-release-20261018`. Unchanged infrastructure: `work/welcome-header-infra-20261018`. Pulumi stack `staging` serves the live domain. These pointers supersede older release statements.

## Upload, matched passage and site style release

Upload resets expired/finished sessions and chooses a compatible reference. Open Continue advances properly. Guided playback uses a movable fixed five-second passage on A and B in random order; exact boundaries unlock voting reliably. Gold controls remain gold after unlock, time is larger, and the button labels are PREFER A, UNSURE / TIE and PREFER B. Locked text is softened; locked and unlocked hover share a short lift/glow. Ranking subset explanations and identical-EQ consistency wording are clearer. Current-protocol ranking evidence independently validates shared playback intervals. Site style cleanup removes superseded declarations while preserving active layouts.

Verified baseline update77 plus reviewed changes; unrelated root Welcome tagline draft excluded. Intermediate update78 exposed a pre-existing stale analysis-stage JS preload reference. Packaging now checks actual imports and removes only redundant stale preloads with a current emitted counterpart; final update79 passes all referenced live JS/CSS hashes. Snapshots preserve intermediate source separately.

Production build, TypeScript, 340-asset/200-protected-recording packaging, client dependency audit and focused upload/passage/ranking checks passed. Real deployed application and APIs were exercised at desktop1280 and mobile390 (plus320 layout check), using isolated tester sessions through a loopback relay. Invalid CSV recovery, valid private uploads, five-second passage edits/playback, early-stop locks, saved decisive/tie choices and Continue reset passed. Browser native picker automation was blocked by Brave extension file-URL permissions; synthetic File objects went through the deployed real input handlers. These are responsive desktop-browser checks, not physical iOS/Android tests. Test identities and their owned submissions were erased afterward. No real-user records restored or removed.

One existing Worker updated per rollout, three resources unchanged; final preview four unchanged. No migrations or access/media/cost-guard changes. CPU5000ms, six abuse bindings, private gate/media, disabled public Worker URLs and independent cost guard preserved. GitHub publication remains separate and was not performed.

Evidence: `artifacts/shootout-release/` — source-scope.json, build-final.log, types-final.log, assets-final.log, deployment-final.log, no-drift-final.log, live-verification.json, live-flow-events.json, live-browser.json, live-desktop-unlocked.png and live-mobile-unlocked.png.

## Prior release and retained work notes (historical)

# Current live release — update77, October 18, 2026

## Git commit and handoff — curve credits, update77

Implementation committed locally as `0ca660625ecae923c39158213fc2904e948f1851` in `work/github-live-sync-20261018` on branch `main`. This includes all42 curve attributions, source/use explanations and alphabetical ordering. The live release remains update77. GitHub push/publication was not requested and has not been performed. Build, packaging and live ordering/asset checks already passed; no application changes followed those checks. Root drafts remain preserved and uncommitted. The source checkout retains prior portable/sanitized test-script adjustments; it is a handoff checkout, while `LIVE_RELEASE.json` points to the exact deployed snapshot.

Site: https://yinyangeq.com. Verified source/build: `work/curve-credits-alphabetical-release-20261018`. Unchanged infrastructure: `work/welcome-header-infra-20261018`. Pulumi stack `staging` serves the live domain. These pointers supersede older current-release statements.

The /curve-credits page now lists all42 curves alphabetically by name, ignoring case and leading symbols such as ∆. Filtering preserves this order. Only data/curve-credits.json was reordered from the verified update76 snapshot; all entry content, attribution, licenses and use explanations are unchanged. Build and340-asset/200-recording packaging passed. Live verification confirms the exact42-entry rendered order and referenced asset hashes. One Worker updated, three resources unchanged; final preview four unchanged. No target or participant-data writes, migrations, access/media changes or cost-guard changes. CPU5000ms, private access/media, abuse controls, edge protections, disabled public Worker URLs and independent cost guard remain preserved. Unpublished root drafts remain excluded. GitHub publication is separate and was not performed.

Evidence: artifacts/curve-credits-alphabetical-{build,assets,preview,deployment,no-drift}.log, curve-credits-alphabetical-live-verification.json and curve-credits-alphabetical-source-scope.json.

## Prior release and retained work notes (historical)

# Current live release — update76, October 18, 2026

Site: https://yinyangeq.com. Verified source/build: `work/curve-credits-release-20261018`. Unchanged verified infrastructure: `work/welcome-header-infra-20261018`. Pulumi stack `staging` serves the live domain. These pointers supersede older current-release statements; `LIVE_RELEASE.json` records the exact source/build hashes.

## Attribution for every built-in curve — update76

The /curve-credits page now covers all42 approved built-in target curves, verified by a read-only live catalog query. Every entry has a creator/source credit, source reference, import or reconstruction details, and a use-basis explanation. The nine documented licenses (three scoped CC BY4.0 grants and six MIT grants) retain their terms/notices. Other entries show “Source credited” without an invented license. PEQdB download provenance is distinguished from original authorship; unresolved authorship and processing details remain explicit. The three YinYang variants also credit their Diamond-derived foundation. Sodium remains an approximate screenshot reconstruction.

The page describes comparative listening, technical evaluation and commentary as the purpose of use. It distinguishes imported numerical data from independent recreation and discusses the four fair-use factors, whole-curve use and potential substitution without claiming legal clearance or granting visitor redistribution rights. Creator correction, source clarification, reuse-concern and removal requests use the existing contact address.

Built from the hash-verified update75 snapshot with only app/curve-credits/page.tsx, app/curve-credits/style.css and data/curve-credits.json changed. TypeScript, production build, and340-asset/200-recording packaging passed. Live verification confirms all42 names render, the authenticated page returns200, referenced JS/CSS match the release build, and anonymous target access remains401. One Worker updated, three resources unchanged; final preview four unchanged. No target/participant writes, migrations, access/media changes or cost-guard changes. CPU5000ms, abuse bindings, edge burst protection, disabled public Worker URLs, private access/media and independent cost guard remain preserved. GitHub publication is separate and was not performed.

Evidence: artifacts/curve-credits-full-{catalog,live}-verification.json, curve-credits-full-source-scope.json, curve-credits-full-{build,assets,types-scoped,preview,deployment,no-drift}.log. Separate root passage/playback/upload/ranking drafts remain unpublished and excluded from this release.

## Prior release and retained work notes (historical)

# Current live release — update75, October 18, 2026

Site: https://yinyangeq.com. Verified source/build: `work/welcome-header-release-20261018`. Infrastructure: `work/welcome-header-infra-20261018`. Pulumi stack `staging` serves the live domain. These pointers supersede all older release statements. `LIVE_RELEASE.json` records the exact source, build, assets and configuration hashes.

## Responsive animated header — update75

Welcome now has a shallow full-width shaded header at the top edge. Brand, compact tool group and Your data control align in one row at800px and wider; smaller screens retain a compact second tool row. The tools are Shootout, Track Library and Preference Tuning, with related icons, subtle underlines and staggered decorative waves, notes or sliders scattering in varied directions on hover/keyboard focus. Reduced-motion preferences disable the particles. Thin dark shadows improve descriptive text over the artwork. The duplicate invitation/how-it-works header links were removed; their main hero controls remain. Admin sign in is a quiet bottom-right footer button using Shootout's ShieldCheck icon and utility styling. The amber sync callout and all sync/consent behavior remain unchanged.

Built from exact update74 source with only app/page.tsx and app/welcome.css changed. Production build and packaging passed:340 assets,200 protected recordings. Final layout checks at320,390,768,800,820,1024 and1440px showed no control overlaps or page overflow. Live Welcome and /sync returned200 and all referenced13 JS/CSS assets matched the release build. Live screenshot verifies the header and Track Library capitalization. One Worker updated, three other resources unchanged; final preview four unchanged. No migrations, participant-data writes, access/media changes or cost-guard changes. Evidence: artifacts/welcome-header-{build,assets,preview,deployment,no-drift}.log, welcome-header-responsive.json, welcome-header-source-scope.json, welcome-header-live-verification.json and welcome-header-live.png.

Earlier release descriptions below are historical context. Separate passage/upload/playback/ranking and locked-button design drafts remain unpublished and preserved.

## Previous welcome controls — update74

The top-right disclosure is now “Your data control,” with a centered three-line menu icon and label. It still contains Sync browsers, My data & sharing and Privacy notice. The existing “Already using another browser?” prompt now has bold light text on a dark panel beside a prominent amber Sync browsers button with circular arrows. The button gently scales/glows twice on page load, then settles; reduced-motion preferences disable animation. The welcome callout is visible to all visitors, including unsynced browsers; no new identity detection or monitoring was added.

This is a two-file UI release: app/page.tsx and app/welcome.css, built from the verified update73 snapshot. The /sync handshake page and its replacement warning are unchanged. No database migrations or participant-data writes were performed. Build and packaging completed with all340 assets/200 protected recordings. Live Welcome and /sync returned200; all11 referenced JS/CSS assets matched this build. Browser verification confirmed the new menu, amber button, circular icon and high-contrast prompt. Deployment updated one Worker; final preview four unchanged. Evidence: artifacts/welcome-sync-{build,assets,preview,deployment,no-drift}.log, artifacts/welcome-sync-live-verification.json, artifacts/welcome-sync-source-scope.json, artifacts/welcome-sync-live-welcome.png. Prior update73 checks below describe the earlier functional release.

## Browser sync and data options

Welcome has a top-right Your data control disclosure with Sync browsers, My data & sharing and Privacy notice. The existing “Already using another browser?” section remains below the invitation controls. Both browsers open https://yinyangeq.com/sync. The signed-in tester creates a ten-minute, single-claim code; both browsers compare a confirmation number and the original browser approves. The receiving browser accepts an explicit replacement warning and chooses Replace saved data and finish sync. Signed-in receivers can choose receive mode. Admin credentials cannot be shared this way.

The 512KB snapshot transfers saved results, measurements, private targets, saved EQs, shortlist/tuning/display settings and browser voter ID. Music files, unfinished tests, cookies and cached consent do not transfer. The receiving browser’s saved site data is replaced; prior server submissions are not erased or reassigned. Both browsers retain one tester account and voter identity afterward. Future local edits are not continuously mirrored. Up to four additional browsers; linking preserves the original invitation expiry. Disconnect revokes tester and data-management access. Temporary payloads clear on completion/cancellation; expired transfers purge on the next code creation. Client recovery and idempotent completion support retries; users are told to close other site tabs before replacing data.

## Separate optional monitoring

Comparison-data participation remains required for listening tools. Identifiable activity monitoring is a separate current opt-in, off by default. It records listed site routes, Shootout tabs/mode, active-test state and event times with visible-page heartbeats. Private Admin view → Test activity shows opted-in sessions; the active indicator is recent reporting, not proof of listening. Logs expire after30 days and purge when the service runs; opting out deletes them. Atomic consent rechecking prevents an in-flight event from recreating opted-out logs. Typed text, form values, keystrokes, audio, wider browser history, raw IPs and fingerprints are excluded from activity records.

## Previous functional verification — update73

Additive migrations0028–0030 were applied and verified; existing source-record counts were unchanged. All31 migration/schema checks, application/infrastructure TypeScript, production build and full340-asset/200-recording packaging pass. SQLite suites cover separate consent, withdrawal/erasure, activity flood/retention, pairing expiry/replay, origin protection, source binding, safe retry, four-device cap, replacement rollback and revocation races.

Live verification matched11 deployed JS/CSS assets and checked Welcome/Settings, /sync, anonymous/admin denial, explicit monitoring opt-in/opt-out, matching handshake, same account with independent browser credentials, payload removal, disconnection, original private audio bytes, rankings and existing service controls. All disposable account/session/event/pairing records were erased; zero comparisons/votes were submitted. Live browser screenshot: `artifacts/browser-sync-live-welcome.png`. Evidence: `artifacts/browser-sync-{build,preview,deployment,no-drift,live-check}.log`, `browser-sync-migration.json`, `browser-sync-live-verification.json` and `browser-sync-source-scope.json`. Deployment updated one existing Worker; final preview four unchanged.

## Preserved behavior and pending work

Update72’s yellow rate-limit notices and owner service/maintenance controls are preserved. Keep CPU5000ms, six fast abuse-limit bindings, edge burst protection, private media/access, disabled public Worker URLs, the $5 plan and the independent once-per-minute cost guard. The /sync form envelope allows URL-encoding the512KB authenticated snapshot; the handler caps unsigned bodies at2KB. No cost-guard thresholds, public routes or media permissions changed.

This isolated release excludes separate root passage/playback/upload and ranking-evidence drafts. Root `app/shootout/page.tsx` and other draft files intentionally differ from live; never build all root drafts for a live-only release. Use the current recorded snapshots, inspect `node scripts/check-live-source.mjs`, and preserve intentional work. Never restore erased listener records. Previous current-state documents and detailed pending-work notes are archived at `artifacts/handoff-history/2026-10-18-before-browser-sync73/`. GitHub publication is separate from deployment.
