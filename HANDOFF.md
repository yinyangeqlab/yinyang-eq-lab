# Current handoff — welcome controls, live update74


Site: https://yinyangeq.com. Verified source/build: `work/welcome-sync-release-20261018`. Infrastructure: `work/welcome-sync-infra-20261018`. Pulumi stack `staging` serves the live domain. These pointers supersede all older release statements. `LIVE_RELEASE.json` records the exact source, build, assets and configuration hashes.

## Welcome controls — update74

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

UI implementation commit `76fabe5c98cd425d70806bdd5dc5ac044b6c7afe` is in `work/github-live-sync-20261018` on main. No push was requested. This release preserves the existing generic sync/monitoring implementation and excludes private configuration, media, credentials and production records. A subsequent documentation commit records this verified release.

## Continue work

This request is deployed and verified. Use the exact live snapshots above for further releases. Browser sync is a one-time saved-data copy plus shared identity, not continuous local-state replication. Monitoring remains an optional opt-in. Do not enable a notice or maintenance pause without an owner request.

Separate unpublished passage/playback/upload/ranking changes remain in root and isolated design folders. Their detailed pre-release notes are preserved in the archived HANDOFF.md; read those before continuing those tasks. They were not deployed by update73 or update74. The earlier private/no-submission Shootout proposal remains cancelled.

### Chains wrapping entire buttons — corrected local design interpretation

User clarified chains should cover entire button, over/under from top to bottom, not decorate only upper half. Isolated v3 now uses full76px-high crossed metal strands centered at y38, with the padlock itself centered at y38. Alternating front-facing oval links and narrow edge-on connectors have layered metallic gradients/shadows and highlights. Labels remain visible at bottom. Actual preview screenshot full-button-chain-wrap.png and SVG full-button-chains.svg under artifacts/passage-design-v3. No tests or deploy for this visual revision. Await design approval.

Before this revision re-read release docs/check: live is now update73 (browser-sync-release). Refreshed v3 non-design runtime files from current root, reconciled latest Shootout activity/privacy state while keeping local passage UI/wording, and refreshed latest base globals plus current service-status styles. Kept five intended design files (globals, Shootout page with reconciled changes, MusicPanel, TrackWaveform, comparison-passage). Main application files unchanged by this turn. Local preview banner now says Update73 layout + proposed changes; fresh server-full-chains.mjs port8898 avoids old module cache, queryreview7. Root pending upload/passage/ranking work remains unpublished; separate release pointers above govern deployment.

### Texture/shadow for locked buttons, padlocks and chains — local review

User requested texture/shadow for buttons and realistic varied shades/textures for locks, then clarified chains too. Added only staged v3 globals CSS: fine brushed plate grain, edge bevels/inset shadows and soft external shadow; warm/neutral/cool metal lock SVGs with gradient shackle/body, brushed face, bevel highlights and recessed keyhole. Chains use stronger round-tube metallic shading, darker inner edges, small wear highlights and contact shadows while retaining entire-button top/bottom X and center crossing. Full-button geometry, readable vote labels and right-edge passage action preserved. Styling only applies to locked state; no playback, eligibility or ranking changes. Source artifacts: textured-controls.css, textured-lock-{a,tie,b}.svg, textured-full-button-chains.svg. Actual app preview at8898 loaded queryreview8/layout8, visually verified; screenshot textured-buttons-full.png. No tests run for this visual-only revision, no production writes/deployment. Await design approval. Live source remains update73.
