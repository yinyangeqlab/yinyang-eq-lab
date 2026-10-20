# Current live release — update81, October 18, 2026

## Canonical workspace and tested recovery — October 18, 2026

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

# Current handoff — responsive welcome header, live update75


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

## Source commit

Header implementation commit `89c2cf4` and capitalization commit `62818576046ce3645a8be5bfa1f5f4fdad3ea89b` are in `work/github-live-sync-20261018` on main. No push was requested. A following documentation commit records this verified release; deployment and GitHub publication are separate. Private credentials/configuration, media and production data remain excluded from the source checkout.

## Continue work

This request is deployed and verified. Use the exact live snapshots above for further releases. Browser sync is a one-time saved-data copy plus shared identity, not continuous local-state replication. Monitoring remains an optional opt-in. Do not enable a notice or maintenance pause without an owner request.

Separate unpublished passage/playback/upload/ranking changes remain in root and isolated design folders. Their detailed pre-release notes are preserved in the archived HANDOFF.md; read those before continuing those tasks. They were not deployed by update73 or update74. The earlier private/no-submission Shootout proposal remains cancelled.

### Chains wrapping entire buttons — corrected local design interpretation

User clarified chains should cover entire button, over/under from top to bottom, not decorate only upper half. Isolated v3 now uses full76px-high crossed metal strands centered at y38, with the padlock itself centered at y38. Alternating front-facing oval links and narrow edge-on connectors have layered metallic gradients/shadows and highlights. Labels remain visible at bottom. Actual preview screenshot full-button-chain-wrap.png and SVG full-button-chains.svg under artifacts/passage-design-v3. No tests or deploy for this visual revision. Await design approval.

Before this revision re-read release docs/check: live is now update73 (browser-sync-release). Refreshed v3 non-design runtime files from current root, reconciled latest Shootout activity/privacy state while keeping local passage UI/wording, and refreshed latest base globals plus current service-status styles. Kept five intended design files (globals, Shootout page with reconciled changes, MusicPanel, TrackWaveform, comparison-passage). Main application files unchanged by this turn. Local preview banner now says Update73 layout + proposed changes; fresh server-full-chains.mjs port8898 avoids old module cache, queryreview7. Root pending upload/passage/ranking work remains unpublished; separate release pointers above govern deployment.

### Texture/shadow for locked buttons, padlocks and chains — local review

User requested texture/shadow for buttons and realistic varied shades/textures for locks, then clarified chains too. Added only staged v3 globals CSS: fine brushed plate grain, edge bevels/inset shadows and soft external shadow; warm/neutral/cool metal lock SVGs with gradient shackle/body, brushed face, bevel highlights and recessed keyhole. Chains use stronger round-tube metallic shading, darker inner edges, small wear highlights and contact shadows while retaining entire-button top/bottom X and center crossing. Full-button geometry, readable vote labels and right-edge passage action preserved. Styling only applies to locked state; no playback, eligibility or ranking changes. Source artifacts: textured-controls.css, textured-lock-{a,tie,b}.svg, textured-full-button-chains.svg. Actual app preview at8898 loaded queryreview8/layout8, visually verified; screenshot textured-buttons-full.png. No tests run for this visual-only revision, no production writes/deployment. Await design approval. Live source remains update73.

### Bolder red/gray/blue button color study — local only

User requests gray instead of purple Tie and more character in all3 backgrounds. Staged v3 CSS now uses crimson/red, graphite/gray and cobalt/blue layered same-color gradients, stronger edge highlights and shaded bevels, while retaining textured metal locks/chains. Middle text is white; unlocked Tie also uses neutral gray, with a brighter gray hover. Unlocked A/B get matching gradients. Discovered prior per-side background shorthands overrode generic texture/gradient rules; corrected locked gradient selector with button:is(.choice-a,.choice-tie,.choice-b) to take precedence. Actual computed backgrounds verified: all3 background-image gradients active; bases rgb40,14,25 /28,34,42 /11,34,60. No logic changes/tests/deploy. Export bold-button-gradients.css, screenshot bold-gradients-full.png. Fixture expired during design gap; started fresh synthetic test through actual UI and soundcheck, then collapsed options. Server8898 restarted, review10/layout10 query. Live release now74 (Welcome controls); staged Shootout preview remains reconciled update73 plus local design changes. Main application files unchanged. Await design approval.

### Passage actions integrated into gold listening guide — local design alternative

User proposed moving passage playback/randomizer near or inside gold5-second box with matching colors. Implemented in isolated v3 source: MusicPanel owns the same playback/selection state and portals its passage-controls into a dedicated #ranked-passage-actions slot inside listening guide when ranked Shootout is active; Open/other contexts retain playback bar fallback. Optional passageControlsHostId prop, effect-resolved DOM host, createPortal; no mirrored passage state. Labels now Play both targets and Shuffle passage. Gold shaded primary and secondary buttons sit below progress/copy with selected time at right. Existing source selection still green/editable below. Desktop playback transport remains centered when actions are in guide. Main root source untouched; not deployed or approved.

Preview server-gold-final.mjs port8900 (fresh cache); actual component preview queryreview12/layout12. TypeScript passed. Browser: shuffle changed green selection6.14→2.3s; Play both targets triggered existing sound-check then B first and A second automatically from the portal button. Phone390px shows no horizontal overflow. Screenshot gold-actions-desktop.png, with further mobile/ready evidence to follow. The gold design supersedes the requested right-edge placement only as this new user-requested alternative, awaiting approval.

Gold guide browser completion confirmed: READY TO VOTE with7.8sA /7.9sB after shuffled excerpt played under both targets. Mobile screenshot gold-actions-mobile.png; temporary viewport override reset. Desktop screenshot actual fullapp reviewed. No production reads/writes or deployment.

### Mobile gold-panel fit and larger passage time — approval preview only

User requested mobile layout, neat gold-panel/button fit, larger pictured passage time on all layouts, and explicitly no deployment. Added staged v3 globals CSS only: selected range14px bold monospace (was10px), high-contrast pale gold and inset readout background. Listening guide is named inline-size container; at guide widths<=410px, time has a separate upper row and two equal button columns beneath, min40px tap height with safe label wrapping at320px. Larger guide widths retain compact inline actions/readout. Actual screenshots large-time-mobile.png (focused viewport), large-time-mobile-full.png and large-time-desktop.png; CSS export large-passage-time.css. Phone390px visually inspected gold buttons, time and waveform together.

Browser verified320,360,390,430,768,1024,1280px: all14px time, no horizontal overflow, both actions within gold-panel bounds, no clipped button text. At320px button height42.83px;360–430px40px; tablet/desktop32px. Evidence large-time-responsive-checks.json. Full desktop source still isolated v3, server-gold-mobile.mjs8901, queryreview13/layout13. Normal viewport reset, review tab retained. No production changes, tests added or deployment. Await design approval. Current live release74 per latest manifest; root now includes independent pending Welcome edits—untouched.

### Full upload/Shootout QA completed; five-second cap — main source local, not deployed

User approved visual direction and requested full desktop/mobile testing before deployment, then requested maximum5-second passages. Candidate now selects exactly5s; dragging body/start/end moves fixed5s window. Initial playing-event/source end accounting preserves exact5s credit without extending recorded range. Actual browser and real route submissions accept5.00s A/B/common and unlock. UI retains larger time, gold actions, textured chains/padlocks and red/gray/blue gradients. No deployment authorization or deployment.

Completed full local browser QA with actual Home/MusicPanel/TrackWaveform and real trial/listening-run/vote handlers through disposable in-memory table and ownership/gate adapters. Desktop invalid/oversize/valid upload, compatible reference, Open A/B/Tie/Continue, ranked Bring A/Tie, finish/upload recovery, partial Stop, edit cancellation and fresh trial resets pass. Mobile390: confirmed expired-session upload recovery, two-target A/B reversal, Open B/Tie, Space activation, Bring B and Random A after exact-five unlock, Continue resets and gold-panel fit pass. Saved12 trials,9 runs,4 ranked runs (1Tie),3 decisive ranked votes; all successful browser write requests accepted, no Open calls to ranked vote endpoint. Replayed final browser payload into ranking reader/API. Native OS chooser not exercised; synthetic File objects used actual input handlers. Production auth/D1/hosting untested; no real data read or written.

QA fixes: global Space now ignores focused buttons/links/inputs/sliders, preserving native passage button activation; persistent edge player hides passage controls during mode previews so mobile mode transition remains clickable. Local QA server interrupted once (exit143), restarted with disposable records preserved and affected flows rerun. No unresolved app failure in exercised flows.

Consolidated exactly five tested files from work/passage-design-v3-20261018 into main root: app/globals.css, app/shootout/page.tsx, components/music-panel.tsx, components/track-waveform.tsx, lib/comparison-passage.ts. Verified shared base CSS and non-layout Shootout logic unchanged before consolidation; root/staged ranking guard already identical. Unrelated Welcome work preserved. Pre-consolidation originals under artifacts/full-flow-qa/before-consolidation; source hashes tested-source.json. Main root now contains latest candidate, superseding earlier notes that v3 was isolated only. Live release remains75; do not deploy until explicit user instruction.

Post-consolidation checks passed:18 upload cases;11 actual route checks;19 ranking cases using latest5s browser record; passage playback/edit/keyboard regressions; existing ranking API checks; active app TypeScript via artifacts/upload-flow-qa/tsconfig.json. Scripts/check_comparison_passage.mjs and check_passage_edit.mjs updated to5s; new check_passage_keyboard.mjs. Full QA scripts/evidence/limitations: artifacts/full-flow-qa/REPORT.md and verification.json. Current retained QA browser uses8903/artifacts/full-flow-qa/index.html?case=mobile (actual routes, local only); preview scripts need update to root alias for future source changes or use frozen source hashes. Viewport reset. Final screenshots desktop-unlocked.png, mobile-five-second-final.png. No commits, pushes or deployments.

## Vote label refinement — local only, 2026-10-18
Renamed A IS BETTER / B IS BETTER to Prefer A / Prefer B in main source and the v3 candidate. Unknown / Tie retained. Verified disabled labels before listening and enabled labels after actual five seconds on both sides, plus 390px mobile and desktop layout. Screenshots: artifacts/full-flow-qa/prefer-labels-mobile.png and prefer-labels-desktop.png. No deployment.

## Gold guide and prominent vote labels — draft only
Removed green ready-state overrides: the listening requirement panel and progress bars remain gold after unlock. Decisive buttons now say PREFER A / PREFER B, 900 weight, 15px desktop / 13px narrow mobile, white text with shadow. Locked buttons use 12px corners to keep enlarged labels visible; narrow decisive buttons use 4px side padding. Checked actual 320px locked layout. No deployment; live release is update77 per latest manifest, concurrent release work preserved.

## Vote label contrast correction — local draft
An older enabled-state selector at globals.css around line1580 overrode the previous white declaration, leaving unlocked labels pink/blue. Added matching specificity for enabled, hover and locked states across all three choices: solid white text and a small dark shadow. Main and v3 candidate synchronized. No deployment.

## Site style cleanup and final vote refinements — local only
Audited 12 app/component stylesheets, removed611 superseded declarations, replaced73 layered vote rules with one section, and archived superseded previews under artifacts/preview-history/20261018. Current runner: artifacts/full-flow-qa/server-current.mjs (QA_PORT8915). Retained gold guide; UNSURE / TIE label and clear identical-EQ consistency explanation; softened locked text; locked and unlocked votes share verified lift/glow, with disabled votes still blocked and reduced-motion behavior. Desktop/mobile flows, actual handlers, site/tab width checks and focused regressions passed locally. See artifacts/full-flow-qa/cleanup/REPORT.md for resolved fixture issues and exact limitations. Latest source hashes in tested-source.json. No deployment, push or publication; live77 and release/access/media/cost configuration preserved. Concurrent Welcome changes retained.

## Continue test button — local review after update79
Live update79 is deployed and verified. New root-only Continue design adds a warm gold plate, dark label, raised edge, arrow badge, matching short hover lift, keyboard focus and reduced-motion support. At ≤520px it spans the row. Existing nextPair, busy and disabled behavior retained; saving label added. Responsive1280/390/320 checks and passage→vote→Continue reset passed with disposable local data. Evidence: artifacts/continue-button-review/. Not deployed; awaiting design review. Root Welcome/config/license differences remain preserved.
