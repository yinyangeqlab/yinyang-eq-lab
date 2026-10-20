# Current live release — update80, October 18, 2026

Site: https://yinyangeq.com. Verified application source/build: `work/continue-button-release-20261018`. Infrastructure remains `work/welcome-header-infra-20261018`.

## Approved Continue button release

Deployed the reviewed gold Continue test button with dark bold text, raised edge, arrow badge, short hover lift, visible keyboard focus and reduced-motion support. Full-width mobile layout; existing nextPair and disabled handling preserved, with Saving… busy label. Only app/globals.css and app/shootout/page.tsx differ from verified update79. Unrelated root Welcome draft excluded.

Build, TypeScript and340-asset/200-recording packaging passed. Live deployed assets matched the release build. Desktop1280 and responsive mobile390 passage→vote→Continue checks passed, with new blinded pair and listening credits reset to0/0;320px fit checked. These use deployed app/API through isolated loopback tester sessions and synthetic audio, not physical mobile devices. Test submissions erased afterward. Private access/media and cost protections unchanged; one Worker updated, three resources unchanged, final preview four unchanged. No migrations or GitHub push.

Implementation commit: `15ec1a7` in `work/github-live-sync-20261018` on main. This records all approved deployed upload/passage/vote cleanup changes plus Continue. Portable test-only adjustments already in that checkout retained. Exact deployed build/source remains the manifest snapshot.

Evidence: `artifacts/continue-button-release/` — deployment.log, no-drift.log, live-verification.json, live-flow-events.json, live-desktop.png, live-mobile.png and REPORT.md.

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

## Operations

Run the source checker before choosing a baseline. Build the intended snapshot, package static assets, and preview/apply with an explicit DEPLOY_BUILD_ROOT. The private gate mounts application-owned lib/browser-pairing.mjs and lib/browser-sync.mjs as Worker modules; retain the abuse and service-status helpers/bindings. New schema operations and smoke checks are in infra/pulumi/apply-browser-sync.mjs and verify-browser-sync.mjs; credentials are read in memory from encrypted Pulumi configuration and never printed. Verification creates and erases only disposable records.

A rollback must retain the new erasure/session cleanup and existing schema; do not drop tables or restore deleted participant data. Existing cost and media controls remain mandatory. Update all four current-state files together after verified releases. Live update72 operations and prior guard recovery notes remain in infra/pulumi/SERVICE_NOTICES.md, infra/pulumi/ABUSE_CONTROLS.md and infra/edge-rate-limit/README.md.
