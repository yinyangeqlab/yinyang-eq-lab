# Design and accessibility review — October 22, 2026

Local review. First pass on live update110 (`a8030b0`); then rebased without conflicts onto live update111 (`1e236e6`: Codex's four reconciled-draft commits plus records). Changes are local, uncommitted and undeployed in `work/design-a11y-review-20261022`; they are exported as three separate patches by concern (see Patches). The canonical workspace, its WIP and HEAD were not modified. No commit, push, deployment, migration, production write, consent change, Sync, research contribution or backup occurred.

## Method and coverage

- Local preview `npm run dev` on 127.0.0.1 with a fresh synthetic database (40 migrations, no targets, no recordings, no participant data). Not signed in; no admin or participant session. `/owner-research` was not visited (the loopback worker injects the owner token there).
- Automated: axe-core 4.11.4 via @axe-core/playwright 4.11.0 and playwright-core 1.56.1 (installed outside the project), system Chromium 155; WCAG 2.0/2.1/2.2 A+AA and best-practice tags, no rules disabled.
- Scans: 23 routes × 320×568, 390×844, 1440×900 (69 scans), plus 15 routes × 768×1024, 430×932, 1920×1080, 844×390 (60 scans). Open consent dialog states were included where they render.
- Manual/scripted: consent-dialog focus containment and Escape (90 Tab/Shift+Tab presses, desktop and 390px), sidebar cycle/persistence/Escape/focus return, native select option surfaces and disabled contrast, conservative gradient-contrast check (text vs. worst gradient stop), truncation at mid widths, reduced/paused motion, single-key shortcuts.
- Brave 155 with the Claude in Chrome extension (owner's fresh profile, local preview only) for visual checks at 852, 420 and 1280px windows.

Not covered: real screen reader (none installed), physical devices, Safari/iOS, Firefox (not installed), audio playback, populated comparisons/results/rankings (no targets or media locally), gate-served routes (`/sync`, admission, maintenance status), native select popup pixels (not captured by screenshot surfaces).

## Results

Axe violations: 78 instances of 5 rules before → 0 after across all 69 core scans; no horizontal overflow at any viewport before or after. Remaining needs-review items are color-contrast only (text on gradients/overlapping layers); the conservative worst-stop check found no failures on Welcome, Personal, Tuning, Library, Rankings and Discover at 1440px. Zero automated violations does not establish full accessibility.

Regressions on the update111 base: pristine 67/70; with these changes 70/73 (three new checks added). The same three (`check_listener_nickname`, `check_ranking_view`, `check_source_bitrate`) fail identically on pristine update111 (Codex's commits fixed `check_setup_auto_hide`). TypeScript, production build and public-only packaging pass. ESLint errors: 112 on pristine update111, 111 with these changes, none new. Final axe scan ran against the production build preview.

## Live defects found in update111 and fixed locally

| ID | Severity | Finding | Fix | Test |
|---|---|---|---|---|
| L1 | Major | Passage coverage is summed as `end - start` and clipped to the passage, so a fully heard 5.0s passage can total 4.999999999999998 and fail `heard >= 5`; replaying cannot raise it. 828/60,001 swept positions failed; 7.5% of 10,000 passages from the real generator with a synthetic waveform. Real-recording rate and UI behavior unverified (no audio locally). Blind Research and Personal gates both read this value. | Coverage within 1 microsecond of 5.0 counts as 5.0; a 10 ms shortfall still fails. Requirement unchanged. | `check_passage_float_tolerance.mjs` fails on pristine update111, passes with the fix |
| L2 | Major | Account Sync polled on every page change, refresh, tab focus/visibility and data event (each zeroed `lastPoll`, and also cleared the error backoff), and sent a status write after every check. Five page loads in eight seconds made 5 account reads and 5 status writes, repeatedly tripping the per-credential rate limit and its one-minute notice. | Check time, heartbeat and backoff are shared through device-local storage; focus/visibility/data events are passive; only a permission change forces a check; heartbeat is sent when state changes or at least once a minute (keeps the two-minute "synced" contract); 429 waits quietly without an extra report. Merge, conflict, consent and deletion logic unchanged. Server limits and abuse bindings untouched. | `check_account_sync_frequency.mjs` fails on pristine update111 (5 reads vs 1), passes with the fix; existing Sync suites pass |
| L3 | Note | The passage change also clips the intervals submitted with research data to the selected passage. May be intended; confirm. | none | none |

## Fixed locally (accessibility and layout)

| ID | Severity | Finding | WCAG | Fix |
|---|---|---|---|---|
| A1 | Moderate | `/shootout` (all tabs/modes) and My space rendered a second `<main>` + duplicate h1 because the embedded consent editor always renders `<main>` | 1.3.1 | Embedded editor uses a `div`; its dialog keeps its labelled heading. `/participation` unchanged. |
| A2 | Serious | Prose links on Privacy, My data, My profile, Discover, Curve credits, Community, Profile access distinguished only by color (1.05–1.37:1 vs text) | 1.4.1 | One scoped rule underlines unclassed links in prose; classed/button links and Welcome unchanged. |
| A3 | Serious | Tuning drag surface `<rect>` had a prohibited `aria-label` | 4.1.2 | Pointer-only surface hidden from AT; keyboard sliders and exact gain controls already provide the function. |
| A4 | Serious | Track-title marquee looped forever with no pause | 2.2.2 | Pans only on hover; fades at the edge otherwise; full title in text and `title`. |
| A5 | Serious | Persistent decorative loops (current nav icon, selected mode art/tiles, headphone switch) had no in-page pause; Welcome “Pause motion” affected only the hero and was not remembered | 2.2.2 | Per-browser “Pause decorative motion” preference (Shortcuts & help, and Welcome's button) applies the existing reduced-motion rule site-wide. |
| A6 | Serious | Page-wide single-key shortcuts 1/2/A/B/S with no off switch | 2.1.4 | “Letter and number shortcuts” preference (default on); Space/arrows unaffected. |
| A7 | Minor | Labels on role-less elements ignored (track title prefix, curve credit stats, tournament utility header) | 4.1.2 | Visually hidden “Track:” prefix; `role="group"` where the label is meaningful. |
| A8 | Minor | Tuning curated-track placeholder (disabled option) looked like a selectable track | — | Restored muted disabled color lost to a higher-specificity rule. |
| D1 | Major (usability) | Narrow windows (≤800px) with a saved desktop “Full” layout opened the modal nav drawer over content on every page load | — | Narrow page loads start at Icons without overwriting the saved preference; cycle, persistence and resize unchanged. |
| D2 | Moderate | Tuning gain cards, region tabs and headphone switch truncated (“Ear …”, “Upp…”, 9px text) when full navigation leaves ~520–700px | — | Container query on the chart card for that band; switch text 9→11px. Viewport breakpoints elsewhere untouched. |
| D3 | Moderate | Welcome desktop “Sync browsers” filled, glowing and pulsing like the primary action | — | Uses the owner-approved mobile secondary style; “Find my target” stays primary. |
| D4 | Minor | Setup auto-hide note (“Hides once… Reopen…”) unclear | — | Clarified copy, same meaning. |
| D5 | Moderate | “Admin view” link shown to every participant on listening pages | — | Hidden unless an admin session is active; Welcome footer “Admin sign in” remains. Existing indicator test updated; active-session indicator still asserted. |
| D6 | Feature | Nothing on Welcome explained why comparisons are fair | — | “How the comparison stays fair” strip (same loudness, same passage, hidden names, your headphones, honest results), all current behavior; the loudness claim is limited to what each mode does. |

Display preferences are stored under `yinyang-display-preferences`: not in the Sync allowlist, cleared with other `yinyang-*` site data, no server or research involvement.

## Confirmed non-issues

Consent dialog focus stays contained and Escape follows the documented required-consent exit. Native select popups have explicit dark option/optgroup surfaces (≥13:1) with dark color-scheme on every scanned route. Sidebar Full → Icons → Hidden → Full, inert hidden state, mobile modal, Escape and focus return pass. Tuning transition markers are named keyboard sliders with value text. `<br>` in headings does not merge words in the accessibility tree.

## Proposals no longer open

- Personal Tournament first-visit hierarchy: largely delivered by Codex's reconciled commits (“Add your headphones to begin” with Browse, Use saved and Upload actions, plus a search field and Browse database button). No further restructuring made.
- Duplicate brand header and footer on `/shootout`: already hidden by CSS; not exposed to assistive technology. Welcome's own header is part of the approved hero and was left.
- Remaining optional work: consolidate accumulated CSS overrides (eight grid definitions for the Tuning headphone row; about twenty Welcome breakpoints) with visual regression.

## Patches

Exported to the review scratchpad, each independent: (1) passage hotfix: `lib/listening.ts` and its test; (2) Sync frequency: `components/account-auto-sync.tsx` and its test; (3) accessibility and UI: everything else. Patches 1 and 2 fix live behavior and can ship without patch 3.

## Outstanding / unverified

Screen reader, physical devices, Safari/iOS, Firefox, playback/A-B switching and populated result states; gate-served `/sync` and admission pages; the three pre-existing failing checks; real-device Sync request volume (verified only in a harness with a synthetic server and a controllable clock) and the server's actual per-credential limits (private stack configuration); production behavior of the “research sharing could not be verified” state (observed locally because the API has no participant session).
