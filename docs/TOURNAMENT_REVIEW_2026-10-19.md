# Tournament local review candidate — October 19, 2026

The owner resumed the paused WIP checkpoint7578d9b and requested completion of unfinished local work. This report supersedes its failing-check/UI status. No push, deployment, maintenance notice, live migration, real account activation, historical ownership transfer or public journal publication occurred. Production remains update93.

## Changes completed after resumption

- Resolved the original four failed suites using current policy and actual dependencies. Consented unchecked comparisons save research with real timing and the separate free-listening protocol; they never silently become controlled ranking votes. Tests cover all three comparison modes, failed saves and ordinary participant/source behavior.
- Reset the research comparison ID whenever a new comparison/feedback context starts. Owned free-listening descriptions must match the saved run, voter, pair, mode and headphone category. Cross-user or stale/missing runs are rejected.
- Added independent `researchRecorded` browser-result/export state. A successful research save remains visible even if a later ranked vote fails. Unchecked results no longer claim local-only when research was saved. Old results without this field retain an honest browser-copy label.
- Validated requirement booleans and intervals before storage in both run and Personal routes. Target headphone categories and compared curve versions are checked, including free/Open records; Personal approved-target selection excludes both owner and hidden layout-test sources. Optional song detail sharing still excludes uploaded-music provenance when declined.
- Completed participant/Personal explanation and privacy text: the five-second checkbox gates when a choice is permitted, while collection follows consent. Personal remains separately optional; practice, private targets and test identities preserve their distinct boundaries.
- Centered the complete visible playback group, rather than centering only Play while leaving the remaining controls weighted to one side. Controls wrap as a centered group. Centered source/song controls and Personal secondary actions below the player. Preserved the collapsed dock behavior.
- Capped the Personal vote row at720CSSpx, gave the longer tie label proportionate space and kept font/button dimensions bounded across screen scaling. Colors and hover language remain consistent.
- Fixed mobile standings headings that squeezed into single letters: readable minimum table width, keyboard-focusable scroll region and mobile scroll hint. Tuning invitation remains immediately below winners, before the long list. All three themes retain gold/silver/bronze and full standings.
- Fixed a real-flow Personal UI defect: a remounted player could inherit the prior player's qualified display while its timers were zero. Qualification now requires current parent timer state as well as actual matched playback. Switch-side state resets with the pair. The save handler independently retains its listening check.
- Finished the community-data design boundary in COMMUNITY_PREFERENCE_DESIGN.md with primary research citations and an explicit validation plan. A new public Community Discovery score is not claimed or silently introduced into this release; that remains a separately approved analysis/product.

## Verification

Expanded source regression run:51suites pass (49 normal suites plus2 media suites with disposable loopback sockets). Includes admin/test isolation, ownership, privacy/consent, pairing/Sync, Personal algorithms/playback/research, nickname protection, upload continuity, ranking/file matching, maintenance, reminders and media.

New free-listening coverage:28 actual-route cases plus3 real-migration SQLite consent/session race rollbacks, with no orphan run/ownership writes. Personal sharing tests also execute the real schema, permission-token rotation/withdrawal race, deletion and optional-off boundaries. The original administrative isolation coverage remains48 actual mutation denials plus24 gate denials, with zero application writes.

All35 migrations apply in synthetic SQLite; journal/current snapshot and attachment ownership/cascade checks pass. Production schema was not changed. Source-only TypeScript, production build, full packaging of340static assets/200protected recordings and18synthetic recovery checks pass. The TypeScript configuration excludes ignored historical audit/infrastructure copies with unrelated missing Pulumi packages; this is not a claim unfiltered discovery passes.

Browser review uses only the hidden non-contributing localhost test identity. Tested current player/results across mobile320/360/390,tablet768,4:3/laptop640/800/1024/1280/1366,1080p1920,2K2560,ultrawide3440 and4K3840 widths. A5120request is capped to actual4096 by the browser backend. No physical TV/CRT hardware or universal-device certification is claimed. The final control group was measured at11widths from320to3840px: center error below0.01CSSpx with zero page overflow, and vote text14–18CSSpx before existing large-screen scaling. The three results themes were checked at nine common widths without page overflow; the long table intentionally scrolls within its own region. Before You Listen fits mobile; matched A/B playback actually completed, voting unlocked at five matched seconds, a test tie saved locally and Undo restored the local run. No official participant vote was used for layout testing.

Ignored evidence: `artifacts/tournament-resume-20261019/`, plus final build/types/media/recovery logs in `/tmp`. An interrupted review briefly lacked packaged media while a new build replaced `dist/client`; rebuilding/full packaging and refreshing the loopback assembly restored successful real playback. Do not build over a review or release output while it is in use.

## Remaining execution boundaries

Owner acceptance/reconvening comes next. Deployment and GitHub push remain unrequested. DEPLOYMENT_STAGE_2026-10-19.md specifies the additive migration/compatible-client rollout and rollback limits. A matching encrypted off-device recovery baseline must be prepared for the exact approved release revision/schema at that stage.

Live hidden-test provisioning, YinYangEQ activation/device enrollment, original Brave capture and exact reviewed transfer are not local implementation omissions: they require live execution and original-session evidence. Keep all transferred history private until the owner explicitly publishes selected entries. Never infer ownership of every historical admin-associated record, restore erased data or auto-publish a journal.

Unrelated backup/recovery scheduling edits remain untouched and excluded from the Tournament commit. Release records are not updated to suggest this preview is live.

## Final owner decision: dynamics stays in Open Comparison

The owner explicitly chose to keep Dynamic Range Compression/Expansion exclusive to Open Comparison. Personal does not offer this source-processing control; it is not a missing feature. No additional Personal dynamics protocol, saved setting or research field is needed for this candidate. The retained Open controls were verified at390/1024/1920/3840px with centered transport and no page overflow.

## Subsequent local review: passage shuffle

The owner requested new regions before repeats, then confirmed that active sections should still be favored. The old selector kept only windows with energy at least65% of the peak and remembered only the previous window; it could repeatedly visit the same portion of a track. Stretched passages also inherited five-second start positions and clamped toward the right edge.

The new shared selector weights toward active audio without permanently excluding quiet sections. It keeps merged selection coverage for each loaded song during this page visit. Personal supplies the history above the player so a new comparison does not erase it. A shuffle chooses a fully unselected window whenever one fits; remaining short gaps get the maximum new coverage with minimal necessary overlap to preserve the selected duration. Only complete coverage starts a new cycle. Selecting a region is not counted as actual listening, and none of this in-memory history is uploaded or saved to browser Sync. Reloading the page starts fresh. Uploaded-file history is scoped to the selected file's local name/size/modification identity, not a cross-file claim about musical recording identity.

The activity weighting uses waveform energy as a convenience heuristic, not a validated estimate of musical quality or an optimal research passage. Actual listening intervals, eligibility, consent, research records and public scores retain their existing rules. The five-second minimum and chosen stretched length remain enforced. The final100ms end padding follows the existing player behavior where possible.

Verification:10focused suites pass, including176full coverage cycles across durations, stretched segments and random/constant generators; no early cycle reset; quiet sections eventually explored; actual per-song button handler isolation; passage playback/cancellation, keyboard/edit constraints and source/vote continuity. Source TypeScript, build and full200-recording asset packaging pass. In the hidden browser test account,12consecutive five-second shuffles on the same song had no overlap; three extended selections retained their approximately ten-second chosen duration and explored new regions. No vote was submitted for this check. This follow-up is local review work; no push/deployment or maintenance notice.

## Personal music layout follow-up (local review only)

- Moved the active-run music source selector and finalist-music help into Local Playback, replacing the separate full-width setup box. Before a run or while viewing results it stays in setup. Empty playlists retain the selector in the player and cannot enable voting.
- Added a full wrapping song title and artist above playback. Community song rank now sits beside the song-rating area; song metadata and audio/file diagnostics have separate compact disclosures. Removed the repeated combined title/rank/source line from Personal.
- Restored explicit Upvote/Downvote/Undo song controls in Personal using the shared music-vote handlers. These rate recordings, not targets, and do not bias random selection. Hidden test/admin choices stay local, with independent server mutation denials unchanged.
- Shortened secondary actions and arranged research/method/saved-data disclosures in a compact responsive group.
- Validation: source typecheck, production build, full private media packaging; eight focused regression suites passed including actual Personal song-vote handler behavior, out-of-order ranking reads, 48 admin/test mutation denials plus 24 gate denials, Personal playback/passage rules and music-source switching. Desktop 1366px, tablet 768px and mobile 390px visually reviewed; mobile had no page overflow. Existing 44 saved local comparisons preserved, no comparison submitted during review.
- Refreshed only the localhost:5175 loopback preview. No push, production notice or deployment.

## Owner deployment authorization

The owner subsequently clarified that the public website should be updated and explicitly authorized deployment of the latest reviewed work. Preparation has started; the earlier local-only statements above describe past status, not current authorization. Current encrypted backup, exact additive schema verification, clean committed candidate, provider preview and compatibility checks remain required before any production mutation. GitHub push remains separate. Owner profile activation, historical ownership transfer and publication are excluded from the release operation.


## Deployment completed — update94

Explicit owner authorization superseded the earlier local-only boundary. Implementation3762ff728bd545f92530eccbe7a40dcf56658251 is live.52 focused suites, source typecheck, isolated build, all200protected recordings, actual schema compatibility and223live asset hashes passed.183old browser assets retained.0033/0034 applied (46new definitions and reviewed ownership_update_guard replacement); no historical transfer, profile activation/publication or official test vote. Deployment notice began only at rollout, kept tests open and ended after verification. Matching encrypted off-device backup, full reconstruction, source/build portability and refreshed hosted verification passed; daily scheduling resumed. No GitHub push.


## Local follow-up: consent-aware status and public-ranking research

Production remains update94. The owner flagged the unconditional Personal ranking banner and expected community aggregation to exist. The audit confirms that only private-research collection shipped; the earlier community document described a future public analysis.

The local status fix removes the unconditional banner and uses confirmed On/Off/checking/unavailable/test/practice states. Explicit test identities retain their no-contribution warning. Stale permission reads cannot overwrite a newer save; focus/data changes during a save queue a fresh check afterward. No consent default, notice purpose, collection route or public ranking was changed. Eight meaningful check suites and source TypeScript pass; isolated build/full media packaging pass. The real hidden test browser still has 44 local comparisons, no official vote was submitted, desktop/mobile status wrapping has no overflow. The preview uses isolated assets and retains 191 earlier browser assets.

Expanded COMMUNITY_PREFERENCE_DESIGN.md records primary research, limitations of accuracy-versus-taste papers, selection/stopping bias, non-identifiability of missing comparisons, a concrete equal-account generalized Borda estimand and a purpose/consent-safe launch plan. The offline prototype and 240 seeded simulations plus exact expectation tests show correction under known positive selection probabilities and fixed horizons. No participant records were used. This is not a public-ready model or a claim of human accuracy. Current v1 rows lack validated sampling probabilities and private-only consent must not be retroactively broadened. Public implementation requires new explicit aggregate permission, prospective server-issued sampling/assignment records, calibrated uncertainty and independent validation.

These follow-up changes are local for review; they were not included in update94 or pushed/deployed afterward.

## Local follow-up: stable volume control centering

Opening the inline volume slider shifted the playback buttons approximately 47.5 CSS pixels left. The shared transport now displays the slider as a centered overlay without changing the button row's width; the persistent-dock variant opens above its controls. Audio handlers and voting behavior are unchanged.

Isolated production build, full media packaging and diff whitespace checks pass. Actual browser geometry in Personal Tournament and Open Comparison at widths 320, 390, 768, 1024, 1366, 1920, 2560, 3440 and 3840 shows zero horizontal button movement when volume opens/closes, center rounding error below 0.006 CSS pixels and no page overflow. Volume keyboard adjustment was checked and restored. No music or comparison vote was submitted; 44 saved local Personal comparisons remain. The persistent dock styling was updated but its active state was not browser-tested. Evidence is in artifacts/playback-volume-centering-20261019/. The local preview retains 198 prior assets. No push or deployment; production remains update94.

## Local follow-up: explicit source bitrate descriptions

Replaced the blanket non-WAV “estimated” label in both shared and Personal players. Bounded MP3 header parsing now reads Xing/Info and VBRI byte/frame counts for header-derived averages, and recognized LAME method metadata for CBR/VBR/ABR. A single frame remains explicitly “first frame”; catalog-only rates remain “catalog-reported”; neither silently establishes an encoding mode. Fallback file-size/duration averages explicitly include tags/container overhead. WAV byte rate retains its own label. Unknown encoding is stated rather than guessed. The bounded 64 KiB read, long-track streaming/no-PCM guards, audio behavior, consent and research schema are unchanged.

Header-layout reference: LAME encoder implementation, https://android.googlesource.com/platform/external/lame/+/refs/heads/jumper-stable-alt/libmp3lame/VbrTag.c . Focused synthetic tests cover Xing/Info/LAME CBR/VBR/ABR, VBRI averages, ID3, every truncated fixture prefix, unknown mode, WAV byte rate, fallback descriptions and both render sites. Audit/privacy regression, isolated source TypeScript, production build, full 340-asset/200-recording packaging and diff checks pass. Actual hidden-test browser recording displays “226 kb/s average (MP3 header) · VBR (variable)”; 390px view wraps without page overflow. 44 saved local comparisons remain; no vote or audio playback submitted. Screenshot/build evidence: artifacts/source-bitrate-20261019/. The preview retains 207 earlier files and its prior private configuration. Origin fetch failed DNS in the restricted environment; cached divergence is 5 ahead/0 behind. No push/deployment; live remains update94.

## Local follow-up: admin Sign Out

Added a top-right Sign Out form to the shared admin page header, with a soft blue glow, quick hover/focus highlight, visible keyboard focus and reduced-motion handling. At narrow widths it stays beside the brand while navigation wraps below. The new gate endpoint /admin-logout accepts only same-origin POST, clears the browser's secure host-only admin and data-management cookies, and redirects to Welcome with private/no-store headers. It leaves the tester cookie, saved browser tests and server records intact. This is browser sign-out, not global revocation of copied stateless admin sessions.

Actual logout-handler tests cover allowed/denied methods, foreign/missing origins, idempotency, exact cookie expiry/scope, no local-data clearing and form wiring. Admin-session indicator and profile gate regressions pass; isolated TypeScript, build and full media packaging pass. Actual shared header component rendered with its compiled CSS in a local-only sample without an admin login or private records; widths 320,390,768,1024,1366,1920,3840 show no overflow and at least44px button height. Evidence: artifacts/admin-signout-20261019/. Preview retained215 prior files and unchanged private test configuration. The sample route exists only in ignored local assembly, not canonical application routes. No push/deployment; production remains update94.

## Local follow-up: stray footer dot

The standalone separator in RootLayout's data/credits footer inherited the generic footer's space-between layout, leaving a tiny dot floating in the page center beneath the Tournament footer. Removed that decorative span and gave the root footer a dedicated centered/wrapping class, preserving both data-management and attribution links with visible keyboard focus. Actual Rankings view in the hidden test browser verified no separator and no overflow at320,390,768,1366,1920,3840 widths. Isolated TypeScript/build/full media packaging and diff checks passed. Evidence: artifacts/footer-separator-20261019/. Local preview retained222 previous files and unchanged test configuration. No push/deployment; public update94 still has the old footer until an authorized release.

## Local follow-up: compact centered sidebar playback

The expanded persistent player inherited a right-aligned full-player transport and leaked song-rating/settings content. Added dock-only CSS: the expanded transport is one centered normal-flow flex group; volume remains an overlay; only transport/waveform player regions are shown in persistent mode. Full-player source controls, Upvote/Downvote, disclosures and research settings remain intact. Collapsed dock retains only its expand and play controls. Playback handlers, storage and research behavior are unchanged.

Actual hidden-test browser with a loaded recording verified centering error below0.001CSSpx and zero horizontal button shift when volume opens at320,390,768,1024,1366,1920,2560,3440,3840 widths. Waveform stays visible, slider stays in viewport, no page overflow or ratings appear in the dock. Clicking the waveform sought to138.7seconds while paused; zoom in/out worked; collapsing/reopening worked and returning to Tournament restored song ratings. No audio started or vote submitted. Isolated build,340-asset/200-recording packaging and diff checks pass. Evidence: artifacts/sidebar-playback-20261019/. Local preview retained229 earlier files. No push/deployment; production remains update94.

## Local follow-up: distinguish admin-only records from browser-only results

Clarified the comparison agreement, privacy notice and Open Comparison helper text. “Saved on the site for admin-only research” now explicitly describes approved-target Open results and identical-EQ checks: admin-readable individual records, excluded from public rankings. “Kept in this browser” describes results involving targets not approved for shared tests; these results are not sent for research. Listening Pool song details versus optional own-music metadata sharing are stated separately. Collection rules, opt-ins and notice version are unchanged; this is a wording clarification.

Isolated production build, full340-asset/200-recording packaging and diff checks pass. The dedicated test account intentionally suppresses the participation dialog, so browser review verified the corresponding revised privacy-page explanation without signing into admin or changing consent. Evidence: artifacts/research-wording-20261019/. Preview retains238 earlier files and prior private configuration. No push/deployment; live remains update94.

Local label follow-up: renamed the top navigation control to “Data Agreement & Sharing” on both Tournament and Personal Tournament. Destinations, data controls and deletion access are unchanged. Isolated build/media package and diff checks pass; actual Personal browser label verified and preview refreshed, retaining246 prior files. Evidence: artifacts/sharing-label-20261019/. No push or deployment.


## Consolidated local implementation — owner review, no deployment

Implemented the full local proposal inventory in `LOCAL_IMPLEMENTATION_CHECKLIST_2026-10-19.md`: target submissions no longer require raw headphone measurements for ordinary curves; category/reference context is explicit, device-derived targets require source measurements, and moderation/test isolation is preserved. File hashes are described as file fingerprints. Research Rankings explains recalculation and a private coarse site-wide change log records reasons/day/method without retaining erased participant choices or target-specific deletion deltas.

Community Preferences now has an independent prospective consent notice, separate adaptive supporting records, server-issued frozen monthly/category/reference-system catalogs and ten randomized reference assignments, pause/resume, timing/source-version guards, equal-account diagnostics, uncertainty/cycles/ties/missingness, owner moderation and owned erasure. Main participation withdrawal disables this purpose. Private-only v1 consent is never reused. Required-only bulk settings disable it; enable-all requires its separate acknowledgement. Admin/test/practice/example activity cannot contribute. Welcome/Rankings/Personal link the pilot and explain its distinction from Research Rankings.

Reference checks require matching declared measurement-system labels; Unknown/mismatched curves do not enter this reference stream. Matching a label is not proof of calibration. Adaptive records remain supporting observations, not a purported selection-corrected leaderboard. Public numerical release is deliberately unfinished until independent held-out human validation and disclosure review; the public endpoint exposes status/method only, no raw or aggregate ranking rows. No hidden release toggle asserts those prerequisites completed.

All 26 regression suites pass, including synthetic YinYangEQ account/device/history/replacement/public-file workflows. Latest reference/estimator tests pass after the rig/cycle corrections. Source TypeScript, all 37 fresh migrations, isolated production build and full 340-asset/200-protected-recording package pass; 311 runtime source files match build input. Only local migrations 0035/0036 applied. Responsive target/reference-player checks cover 320 through 3840 CSS px with no horizontal overflow and transport centering error below 0.006 px. Hidden test account’s 44 saved sample comparisons remain; no audio, vote, upload, consent acceptance or real account operation submitted. Evidence and screenshots: `artifacts/all-proposals-20261019/`.

The loopback preview serves the verified build with prior private local configuration and 316 previous client dependencies retained for saved browser references. Live remains update94; no push, deployment, production data mutation, account activation, history migration/publication or backup operation. Existing backup/recovery changes remain untouched. Owner review should begin with the checklist, Personal Tournament, Community Preferences simulated states, target form, sharing notice and ranking explanation. External prerequisites are explicitly unchecked rather than treated as complete.


## Local review: dark native dropdowns and loaded examples

Added explicit dark option/optgroup surfaces and native color-scheme, with a matching Community select base color/focus treatment. Recorded closed/expanded dropdown review in AGENTS.md. Expanded the Community waveform to fill its player rather than shrink to its intrinsic width. Isolated build and complete 340-asset/200-recording packaging pass; diff whitespace check passes. Actual test browser verifies dark computed control/option colors at desktop and 390px, keyboard focus, no horizontal overflow, and a full-width loaded waveform. Native option popups are not included in browser screenshots, so expanded-state verification also uses DOM styles.

Personal is paused on its saved sample results: gold/silver/bronze and 12 target standings, 44 comparisons retained. Community has a loaded 2:46 recording and matched passage in its noncontributing reference preview. Music is paused; no answer, song vote, upload, consent change or real reference assignment was submitted. Screenshots/evidence: artifacts/dropdown-review-20261019/. Local preview retains 333 earlier client dependencies. No push/deployment; live remains update94.


## Full site functional, text, layout and security review

See FULL_SITE_REVIEW_2026-10-19.md for the completed bounded local review: 383 viewport cases, 438 screenshots, actual playback/overlap/local-choice/Undo/upload/download checks and 63 passing regression suites. Local fixes include exact Community shared-audio meters, response/access-state guards, tiny-screen layout fixes, reversible local-curve removal, current research explanations, response headers and targeted dependency security patches. The localhost-only filterable gallery is /__audit/review. Production remains update94.

Release review remains open: full npm toolchain audit has 15 high and 4 moderate flags despite a zero-flag production-only scan. Coordinated framework/Cloudflare tooling upgrades and reachability review are explicitly flagged rather than force-applied or dismissed. Independent Community listener/privacy validation and real YinYangEQ/history execution remain outstanding. No push, deployment or production mutation.

## Local remediation review

The October19 follow-up completes the compatible security-update cohort and remaining local UI proposals. See FULL_SITE_REVIEW_2026-10-19.md for the current48-case/66-image follow-up and DEPENDENCY_SECURITY_REVIEW_2026-10-19.md for the remaining single upstream advisory. Checkpoint5a53a63 and subsequent local source remain unpushed/undeployed. Human validation and real account/history/publication operations remain separate.
