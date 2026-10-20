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
