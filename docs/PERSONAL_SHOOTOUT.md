# Personal shootout preview — not deployed

Started October 18, 2026 against verified live update86 (`fb30ec5`). The canonical
checkout subsequently received the separately deployed update87 consent fixes
(`158e059`); these were preserved. The Personal Tournament entry opens `/shootout/personal`. Existing ranked and
Open modes retain their pairing and scoring rules. No production write has been performed. Optional research sharing requires additive migration0033 during a future approved deployment before the new API code is released. Existing data and schema are preserved. Do not deploy before owner review.

Personal Tournament is first in both mode strips, with a small muted Recommended
label. It shares the existing Shootout header, setup controls, headphone picker,
mint/amber blind A/B cards and player. Welcome explains all four modes and invites
listeners to use both personal discovery and ranked community research. Personal
is the recommended first entry, while research links remain explicit.

The owner's deployment instruction is: enable an informational update notice only
when an approved deployment actually begins, leave submissions open, support
ongoing tests, and end the notice after verification. Do not activate a notice
during implementation/review. Deployment approval has not been granted here.

## Discovery rules

1. Explore unseen eligible approved targets first. Among equally underheard
   targets, prioritize families with less exposure. The six explicitly identified
   MrChillStorm ISO226 85-phon variants share a scheduling family. Parent/child
   preference curves share their parent ID; other targets remain independent.
   Family grouping changes scheduling, not their identity or sound.
2. Fit a ridge-regularized fractional Bradley–Terry model to this run's choices.
   This adjusts for opponent strength; it is a practical summary, not a calibrated
   probability that a target is best. Ties score half; skips contribute no data.
3. After coverage, mix promising contenders with 25% underheard exploration.
   Cool down the previous pair where alternatives exist. Cross-family matchups
   are favored, with opportunities for within-family refinement.
4. Automatically bench only after at least five judgments, four more losses than
   wins, losses to three distinct opponents, and fractional preference below .35.
   These are reversible workload heuristics, not significance thresholds. Every
   tenth scheduled opportunity can rescue an automatically benched candidate.
   Manual exclusions remain excluded until restored. At least two stay available.
5. Freeze up to three current finalists for a separate confirmation phase.
   Compare each finalist pair on at least two different song families. Alternate
   recordings or dynamics versions from one song do not count as new families.
   A/B sides and matched-passage presentation order are randomized. A new song
   loads for each round; confirmation excludes families already used for that pair.
6. Show a current favorite only if the leading fitted target has a positive direct
   decisive margin against the other shortlisted candidates. Otherwise show no
   clear favorite. Reversals remain visible as a warning; completion of finalist
   checks never implies a statistically proven whole-pool winner.

Ten, twenty and forty comparisons are optional session checkpoints. Users can
pause earlier, replay, practice without scoring, skip, undo their last choice,
set targets aside, restore targets, check finalists, or continue exploration.
Coverage and remaining untested candidates are visible. A break reminder appears
after fifteen minutes on the page; this measures elapsed page time, not verified
continuous listening time.

## Research and what it supports

- [ITU-R BS.1284-2, sections5.2.1 and6](https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1284-2-201901-I!!PDF-E.pdf)
  supports matched programme passages, randomized condition order, listener
  control/repetition, and breaks after15–20 minutes. These motivate the existing
  matched-passage player and the practice, replay and break controls. Its test
  procedures are not adopted in full. The five-second gate is an interaction
  minimum, not evidence that five seconds resolves a subtle preference.
- [ITU-R BS.1116-3, sections4.1 and4.2](https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1116-3-201502-I!!PDF-E.pdf)
  describes familiarization and controlled blind testing for small impairments.
  We apply familiarization and concealed identities as useful design principles;
  headphone-target preference is a different task from reference-based impairment
  grading. This preview is not an ITU-compliant experiment.
- [Jamieson et al.,2015, Sparse Dueling Bandits](https://proceedings.mlr.press/v38/jamieson15.html)
  studies adaptive best-option discovery with noisy pairwise comparisons and shows
  the importance of preference gaps and model assumptions. It motivates spending
  comparisons selectively. Our scheduler is not SECS and does not inherit the
  paper's sample-complexity guarantees.
- [Haddenhorst et al.,2021, Testification of Condorcet Winners](https://proceedings.mlr.press/v161/haddenhorst21a.html)
  explicitly examines the assumption that one candidate beats every other.
  This motivates preserving mixed results and shortlists rather than forcing a
  champion. Our direct-margin check is not that paper's statistical procedure.

The scheduling mix, family balance, bench thresholds, two-family confirmation and
shortlist size are product choices informed by those principles. They are not
validated scientific constants. No confidence percentage or model SD is shown.

Music controls offer Random Listening Pool, Keep One Song, or a listener-selected
Listening Pool playlist. The policy is saved with the run; changing it retains
earlier results but discards current playback evidence. Confirmation excludes
already-used song families for each pair even when a song is pinned. Users must
switch to a varied playlist or random pool when a fixed song cannot supply new
confirmation evidence. Empty playlists cannot start or resume comparisons.

Open Comparison remains manual named-target exploration, including private curves
and existing adjustable playback. Personal manages adaptive hidden-target discovery
and a saved shortlist. Music control alone does not distinguish those workflows.

## Audio and result limitations

The new mode reuses the existing EQ fit, shared protective preamp, fixed source
normalization, automatic channel matching and matched five-second passage controls.
It does not change ranked playback. Source normalization and shared headroom are
not perceptual loudness matching between EQ curves. Fit error, headphone reseating,
the measurement used, listening level, music and fatigue can affect preferences.
Use consistent setup and comfortable volume; replay and try more passages/music.
An independent later session is a useful robustness check. No physical headphones,
human preference accuracy or universal optimum has been validated by software QA.

## Progress and data boundaries

`target-lab-personal-shootouts-v1` contains up to eight runs,500 choices each.
Runs retain candidate IDs/names/families, choices and source references, a pending
pair with exact side assignment, exclusions, phase and checkpoint. A SHA-256
fingerprint of the full selected measurement, target IDs/points/families and policy
version separates incompatible setups; old runs remain exportable/deletable.
Reload requires fresh playback evidence; it never restores permission to choose.

Writes occur before advancing. Storage errors surface, invalid data fails closed,
and changed storage prevents overwriting another tab's progress. Cross-tab erasure
stops playback and drops the in-memory run. The key is covered by existing browser
erasure and the explicit Sync allowlist. Sync still enforces512KiB; large history
can require exporting/deleting an old run. JSON exports are local files, not
automatic cloud backups or research submissions.

The personal page has no trial, vote, listening-run, feedback or export-submission API call. An optional, off-by-default `/api/personal-research` endpoint accepts only new explicitly shared answers in a separate dataset. Personal playback suppresses music-vote fetching and controls as well.
The existing gate continues to require admission and participation for protected
audio. Local renderer previews do not reproduce that full gate.

## Validation and review

Run `node scripts/check_personal_shootout.mjs`, `node scripts/check_browser_sync.mjs`,
`node scripts/check_audit_privacy.mjs`, `node scripts/check_passage_ranking.mjs`,
TypeScript, build and full media packaging. The personal suite covers pending-side
restore, invalid storage, family coverage, losses/ties, bench/restore, exclusions,
second chances, skips/stale actions, distinct-song confirmation, cycles, Sync and
absence of research-submission paths.

The suite also records seeded synthetic evaluation in ignored
`artifacts/personal-shootout/simulation.json`:30 seeds per policy/scenario,
12 candidates,80 comparisons, clear/close logistic and cyclic preference cases.
Both policies use the same fitted result model and observation budget. The uniform
baseline samples pairs with replacement. This is a scheduling sanity check, not a
comparison with the live unseen-pair sampler and not human accuracy validation.
Report coverage and mean Borda gap alongside exact-best rate: close candidates can
be useful alternatives even when the exact top candidate is not found.

Automatic approval review rejected a read of the private production catalog for
local transfer because that specific source/transfer lacked explicit authorization.
The empty canonical local database was therefore seeded with twelve clearly named
synthetic tilt curves for software QA. No production catalog or participant records
were copied. Real-catalog listening review still requires the owner's approval for
that catalog-only transfer. Existing private media assets remain local.

## Personal podium and history

The owner selected Personal Tournament only for the themed results/history. Its
existing test-results view now includes Field Day, Retro Arcade and Low-Poly Grove styles made
from simple flat SVG facets and CSS podium blocks, with no external image service or official sporting
marks. A small local theme preference is separate from research data. My Results
shows the same personal podium and saved checkpoints beside existing comparison
history. Public ranking scores, decorations and research result views are not
changed by this feature.

Gold/silver/bronze are provisional order cues only when the leading candidate has
a positive direct margin against its shortlisted opponents. Exact fitted ties
share the appropriate place; a tied/cyclic/underdetermined leading group gets a
neutral contender presentation instead of arbitrary medals.

Pausing or reaching a session/finalist checkpoint records comparison count, pool
coverage, phase and the then-current shortlist. Duplicate unchanged pauses are
not new history. Undo removes checkpoints that depend on the undone choice.
Current position can be compared with an earlier checkpoint for the same setup.
History and paused state are part of the existing local run, explicit Sync and
JSON export; this is not a permanent server archive. The bounded browser store
keeps up to1,000 checkpoints per run and500 choices. Sync retains its512KiB limit.

The visible result title is Your Winners (or Your Shortlist when unresolved),
with Winner and Runner-up labels plus medal colors. Field Day uses a running
track, finish-line checks, a trophy and ribbon medals. Retro Arcade is an original
high-score display with a geometric maze border and actual preferred/heard counts,
not fictional points; it includes no Pac-Man characters or copied game layout.
Low-Poly Grove keeps simple faceted foliage and landscape shapes.

## Preview verification record

- 15 personal-engine/storage/history/normalization checks passed, including a
  regression for imported-measurement normalization preserving setup identity
  across reloads.
- Existing browser Sync, privacy isolation and18 passage-ranking assertions passed;
 18 recovery safety checks passed with synthetic data.
- App TypeScript passed using a temporary config excluding generated audit/build
  artifacts. The unfiltered project config also includes a separate generated
  audit fixture with missing Pulumi packages; those unrelated files were preserved.
-Production build and full packaging passed:340 assets and200 protected recordings.
-Local gated browser QA played a matched A/B passage from protected FLAC audio,
  saved a personal preference, preserved the selected fixed song across rounds,
  restored paused results and theme after reload, and displayed the new themes.
  The local votes/listening-runs/ranked-trials tables remained empty.
-The owner-root snapshot check verified update87 with1,023 files. Canonical
  differences are intentional preview edits; the live mirror is not used for
  development. No Personal feature deployment, live notice or GitHub push occurred.

The full local review server is http://127.0.0.1:5175/shootout/personal. It contains
only clearly labelled synthetic target curves for software review. The lighter
renderer preview on5174 is not the protected-audio review server.


## Optional personal research and sharing shortcuts (local preview)

Migration0033 adds independent personal research choices, account permissions and private daily deletion totals. Existing ranking-input tables and all existing rows/schema remain unchanged. This migration has not run in production. Explicit current-notice consent is off by default; settings use account ownership, not a browser ID. Opt-in uploads only answers completed after enabling. No historical upload queue or automatic retries exists. Raw headphone measurements and audio are excluded; fields are bounded target IDs, result/tie, headphone category, setup fingerprint, site recording, intervals, phase, round number, candidate/excluded IDs, music-source mode and scheduler/protocol versions. Playback evidence is client reported, not a server-issued randomized ranked trial. Adaptive selection, repeated answers and undo/revisit behavior must be accounted for in any research; this is not an unbiased community win-rate dataset.

Server submission requires current opt-in, active participation, current approved compatible targets and matched five-second intervals. A rotating permission token and an atomic database trigger reject stale in-flight submissions after opt-out, participation withdrawal or opt-out/opt-in. Rows have authenticated submission ownership, appear in My data, and use the existing individual/all erasure path. Turning off sharing preserves earlier research records until deletion; local undo/deletion is explicitly separate. Personal choices do not enter ranking inputs or permanent study archives.

My data includes two review-before-save shortcuts: Enable all optional sharing (song metadata, identifiable activity monitoring, and future personal research) and Required sharing only. Both keep an already-active participation agreement. They do not accept a participation agreement for a nonparticipant, enable retrospective studies, upload past personal answers, or change any visitor's settings merely by opening the page. Required-only stops future optional sharing and erases monitoring logs under existing semantics. Other earlier contributions remain individually erasable.

The personal player reuses the actual ranked/Open spectrum/meter DOM and shared curve component. Target curves remain concealed during blind rounds; results offer a finalist-curve disclosure. Music choice is a compact dark toolbar. Export/download and data-management actions have separate outlined buttons and larger gaps. Full standings include untested and set-aside states. Field Day uses square alternating finish-line cells and sky; Grove adds faceted hills, water and trees. The isolated example results fixture uses the actual component with simulated choices/example names; it does not insert answers into a browser's saved run or research dataset.

Validation additions: `node scripts/check_personal_research.mjs` exercises fresh SQLite migrations, API consent/origin/target/passage rejection, separate dataset writes, stale consent tokens, withdrawal races, owned erasure and both bulk-setting paths. No participant records are used.

Final UI review: choice buttons use15–19px responsive labels, personal actions14–16px with44px minimum height, and a50px decision row. The player retains the exact shared transport styles through `music-panel-host`; its controls are not overridden by personal button rules. Matched-passage playback is an optional shortcut; five matched seconds per side remain required for saving. Curves are disclosed only in results. All-targets lists place heard targets first, then unheard and set-aside targets, with a bounded scroll area.

Required-only never disables explicit measurement/target contributions, ordinary ranked comparisons or local results. A contribution action retains its own rights/notice controls; local-only imports are not silently uploaded. The Personal tie button is labeled exactly `No Preference / Tie`.

## Playback controls and product wording

Personal now allows −14/−16/−18 LUFS or normalization off, and channel matching Auto/Uploaded/Off. Configurations have separate fingerprints/progress; the previous −16/Auto protocol key is preserved to keep existing default runs accessible. Uploaded two-channel presets are parsed with the existing bounded PEQdB/Qudelix parser and saved locally with their measurement, without changing that measurement’s Open-mode selection. Auto-mode parsing now preserves a saved preset for later use instead of dropping it. Off bypasses channel correction while retaining the ordinary target EQ and clipping headroom. Ranked normalization/channel behavior remains fixed. Optional research records include the selected loudness/channel modes.

Upload My Music uses the existing local stereo file player. Files must be reselected after reload; raw audio is not transferred by Sync or research. Local fingerprints distinguish exact files, with known Listening Pool hashes mapped back to known song families. Unknown uploaded versions cannot be proven distinct songs. Research uses a per-browser random recording token rather than uploaded filenames, tags or file fingerprints. The local hash-to-random-token map is included only in explicit browser Sync and local erasure. No automatic upload of historic choices exists.

Personal passage editing has a five-second hard minimum. Dragging the center grip preserves duration, while separate edge drags resize. The waveform outside those handles remains seekable. Focus Passage centers a zoomed view on the selection without seeking or starting audio; Personal supports up to256× waveform zoom. Hover/focus timing shows centisecond start/end and duration. Existing ranked fixed-five-second passage editing remains unchanged.

Visible Shootout wording is renamed Tournament throughout application pages, data/consent copy, owner UI and the browser Sync navigation. Existing `/shootout` routes, storage keys, database fields, APIs and identifiers remain compatible. Local export filenames use personal-tournament. New validations: `check_personal_playback.mjs`, existing fixed-passage editing/keyboard/playback checks, plus personal-research own-music context checks.

Latest local review: production build, application TypeScript, full 340-asset/200-recording packaging, 15 tournament-engine checks, 12 personal-research checks and six playback checks pass. Native browser dragging moved a seven-second passage without changing its duration; keyboard resizing stopped at five seconds. Clicking inside a focused five-second selection sought playback without changing the selection or starting audio. Local music selection was verified with a synthetic stereo file in an isolated player. The refreshed full preview retained the user's playlist and one saved comparison, with optional sharing Off. Personal own-music playback omits the unrelated song-detail sharing button. The root styling hook remains `personal-shootout` for compatibility despite the visible Tournament rename.

All changes remain local and uncommitted for owner review. No deployment, push, production migration or update notice was performed. Preview target curves and example results remain clearly labelled synthetic fixtures.

## Responsive layout review

Blind Research is now a single mode tab with Listening Pool / Bring Your Own buttons inside the existing playback source-controls row. Existing `blind`/`bring` trial, listening-record and vote tags, locked −16 LUFS, blind target masking, matched-passage gates and own-file privacy controls remain distinct. The source buttons stage a change without moving the active player into compact mode or hiding its comparison; Keep current source cancels it. Start fresh uses the existing sound reminder, then clears the old pairing/trial/listening evidence and starts a separate session. Completed results remain saved. The selected source is retained in page state, remembered when visiting Open, and reflected in the existing source-specific URL so reload restores the correct mode. Existing links for both sources remain supported. Rankings default to Combined and retain Listening Pool/Bring Your Own filters. Welcome and Personal navigation now have three listening modes.

Validation: six extracted-handler source-switch tests cover both directions, staging/cancellation, fresh evidence and session IDs, saved answers, busy/participation guards, Open mode preview and reload URLs. Existing blind-completion/write-failure and passage keyboard checks passed, as did app TypeScript and build. Local browser QA uses synthetic curves and no completed votes, music uploads, playback or sharing-setting changes.

Welcome already contained the four-mode guide and invitation to contribute to Personal and blind research. Its naming is now explicit: Blind Research is the pair of listening modes that feed existing Research Rankings; My Personal Results are each listener's tournament outcome. A compact expandable ranking guide describes those two and labels Community Preferences as planned, inactive and distinct from today's optional private-research permission. Mode titles, the ranking page heading and navigation use Research wording consistently. No community aggregation, public contribution permission or ranking calculation was implemented by this copy change.

Fine-tuning copy now names bass, mids and treble, with a casual explanation using thump, voices and sparkle. The favorite action reuses the existing Preference Tuning navigation's glow, sound ripple, floating notes and equalizer through optional AuraNavLink styling/accessibility props. Its illustrated holographic window opens on mouse hover or keyboard focus, shows an animated curve and five simplified tuning sliders, and closes on Escape or leaving the trigger/preview. It is decorative, labelled as a preview, and starts no playback or network activity. The window is hidden on touch/narrow screens; reduced-motion styles stop its animation. Browser checks verified animation names, keyboard opening/Escape dismissal and five responsive sizes with no page overflow. Build and TypeScript passed; no deployment or push occurred.

The yellow fine-tuning invitation now renders immediately after the winners scene and before All Your Targets through a result-component slot. It is a compact horizontal banner rather than a separate large panel after history. Phone copy is shortened and the redundant description is omitted while keeping the labelled tuning action. Desktop spacing is 12px below the scene and 16px before the list. The action still selects the same favorite curve; no saved results or research behavior changed.

Results refinement: channel-preset upload appears only for Uploaded matching, using a compact icon label beside the selector and explicit two-channel PEQdB/Qudelix TXT instructions. Native file controls are visually hidden while retaining keyboard focus. Music source and options are adjacent. Progress labels explain exploration, finalist repeat comparisons and completion; a disclosure explains Undo's local-only effect. Undo is hidden in read-only examples. Preview warnings use plain sample-curve wording.

Athletic flags now sit in the lower track decoration; names and award labels have protected contrast. Rankings and finalist curves have numbered gold/silver/bronze cues when a favorite exists, with shared numbers for exact ties. Curve names have accessible fine-tuning links. A static yellow callout invites tuning without guaranteeing an improvement. Preference Tuning validates the requested target against available approved/local targets, loads neutral adjustments and keeps the previous edit in Undo history; an unavailable target shows a message without changing existing tuning. Browser QA verified selection of the linked synthetic curve and Undo availability, plus eight result layouts from 320px to 3840px with no page overflow. No audio, export submission, research opt-in or deployment was triggered.

The actual `/shootout/personal?example=results` page now offers an in-memory example run on loopback hosts only, and only when every eligible target is a labelled synthetic preview curve. It uses the complete normal result layout, including bronze, 12-target standings, checkpoint history, finalist curves and contender disclosure. Setup fields and run-changing actions are disabled; returning to listening exits example mode. Personal persistence explicitly rejects example-run writes, optional research controls are omitted, and the fixture has no pending comparison. The owner's saved runs are neither replaced nor seeded with fabricated answers. `check_personal_shootout.mjs` includes the example's full coverage, completed finalists, history and safety guards (16 checks total).

The local Personal Tournament was checked at 320×740, 375×812, 768×1024, 1024×768, 1366×768, 1920×1080, 2560×1440, 3440×1440 and 3840×2160 CSS viewports. None had horizontal page overflow or controls outside the viewport. Three results themes were additionally checked at eight of those widths, with simulated example results only. Expanded methodology, saved-data controls, standings and history were inspected; table scrolling stays inside the table wrapper. A requested 5120-wide viewport is capped at 4096 by this browser backend; native 5120 and physical-device testing are not claimed.

Corrections: Personal uses a two-column setup header instead of inheriting an unused third column. Listening surfaces have bounded heights, tablets retain side-by-side A/B cards from 640px, and phone panels are shorter. Labels can wrap without clipping. Mobile mode tabs have consistent grid alignment, the music upload explanation has a bounded line length, and mobile results have less nested padding. Personal actions have consistent gaps; narrow decision rows retain compact gaps and equal heights. Playback, zoom, volume, passage actions, theme selection and matching controls have larger touch targets on small screens. Disclosures use aligned indicators and minimum 44px rows. Existing desktop playback styling and large-display scaling remain shared with the other modes. Final production build, full asset packaging and diff whitespace checks passed. Changes remain local for owner review.

Local design revision: removed the setup-level My Music selector. Research source buttons now sit beneath the playback waveform alongside the original stereo-file picker, with source-specific help and optional song-sharing controls retained. The shared TournamentModeTabs component now gives all three modes matching icon/label/purpose layouts; Personal has a soft gold trophy accent and Suggested label. Research/Open retain the existing guarded switching flow. Browser checks at375,768,1366 and3840 CSS-pixel widths found no page overflow or clipped mode labels. Source-switch tests, blind completion/write-failure checks, passage keyboard checks, TypeScript, build, packaging and diff checks passed. No push or deployment.

Listening safety and shared action feedback: common action buttons now use the mode tabs' soft colored aura/lift while retaining their existing fills, selected states and per-action accents. Pointer hover is limited to fine pointers; keyboard focus is explicit and reduced motion removes movement. Waveform seeking/dragging hit regions and disabled actions are excluded. Welcome, Preference Tuning and Listening Pool use the same action feedback with their existing page colors.

A shared BeforeYouListen dialog now serves Research/Open and Personal. It says “Set a safe and comfortable volume,” explains loud/prolonged sound, hearing changes, permanent hearing loss and tinnitus, and links to WHO's safe-listening FAQ and tinnitus FAQ. Expandable guidance quotes WHO's weekly80/90/100dB examples as exposure limits, not targets, and distinguishes LUFS from at-ear exposure. The dialog traps keyboard focus, restores it on dismissal and scrolls within the viewport. A persistent Before You Listen action reopens the reminder; acknowledging with Don't show again unchecked removes the saved skip preference. Personal checks the reminder at active listening/resume and every playback entry point; result-only views do not automatically prompt. No research permission or public ranking logic changes.

Validation: reminder acknowledgement, saved opt-out, new-test repeats, manual re-enable and playback-entry guards pass using isolated storage fixtures. Existing six source-switch, six Personal playback,16 tournament and blind-completion checks pass, along with TypeScript/build. Browser review covered the shared dialog, Personal-specific channel wording, WHO links, and375×667/768×1024/1366×768 dialog layouts with no page overflow; expanded phone content scrolls internally. Preview uses synthetic curves and no votes, music uploads or playback. Local only; no push, deployment or production migration.

Mobile follow-up: mode-tab glow and shared action transitions respond in80–100ms. Fine-pointer hover and reduced-motion guards remain. BeforeYouListen uses a compact scrolling body and a fixed footer inside the dialog, keeping the ready action visible with WHO details expanded on320×568,375×667,390×844 and667×375 layouts. Normal375px popup height is419px; expanded details are bounded by88dvh. No page overflow was observed. The small setup-arrow note explains one-time auto-hide and manual reopening. Auto-hide now follows the player's playback event, including Personal, and manual reopen remains visible for that test; failed attempts do not hide setup. Two real-handler regressions cover first play, reopen, repeat playback and manual hide.

Vote labels use mixed-case Prefer A / Unsure / Tie / Prefer B and weight600 with muted rose, neutral and blue ink. Personal retains No Preference / Tie. Open mobile decision buttons are equal13px labels with44px touch targets. Local Playback says Select segment. Music Upvote/Downvote controls remain visible, disabled with explanatory text until a pool recording is selected or matched. Explore Listening Pool remains. Track status wraps instead of clipping, and a separate note explains that music votes affect the shared Listening Pool ranking, not target-curve rankings or random track selection.

Playback Music Source now offers Listening Pool / Use Your Music. Open source changes stop/clear old media and listening evidence without replacing A/B targets or completed answers and do not autoplay. Switching back to the pool drops the local-folder selection so it cannot accidentally draw from it. Local song/folder controls appear only for Use Your Music; choosing a folder reveals its own song list. Blind Research uses the same source options beside playback while retaining the guarded fresh-session confirmation and source-specific data tags. check_open_music_source.mjs exercises the actual source-change/reset functions with isolated media/storage stubs. Build, source switching, reminder, Personal playback, auto-hide and whitespace checks pass. The broad app QA TypeScript invocation currently also reports unrelated unknown JSON values in app/participation/page.tsx, concurrent work outside this UI change; those sources were left untouched. No push, deployment, live votes, file uploads or playback during UI QA.

Matched-passage option: the common passage box now appears beside comparison decisions and in Personal's active comparison. A labelled checkbox requires at least five seconds per side and five seconds of common source audio. Off uses a dark panel and permits free local choices; existing local timing/overlap tracking stays visible and a genuine match turns it green. Green never overrides the unchecked privacy choice. Why-use-matched-passages copy explains reduced music-related variation and explicitly avoids claiming that five seconds guarantees accuracy.

Unchecked Research/Bring/Open choices save only a browser Trial marked matchedPassageRequired=false and with its observed match flag. They return before listening-run, choice or public-vote writes. Research uses local pair selection while unchecked and suppresses owner feedback. Enabling starts fresh research evidence; old private choices are not backfilled. Open starts with optional/free listening, while Research and Personal retain required defaults. Personal saves the requirement on its run and flags each choice, preserving the current pair when disabling. Optional Personal research submission additionally requires the checkbox; previously enabled sharing cannot override it. Unmatched observations can affect private standings but cannot complete finalist listening checks. Existing matched observations and older run formats remain valid; no production schema or migration changes.

Regression evidence: all three standard modes were tested with zero and qualifying matched evidence while off; no research requests occurred. Actual Personal advance-handler checks cover opt-in plus unchecked0/6-second choices, inadequate required playback and eligible required contributions, using isolated fixtures. Saved flag round-trip and finalist eligibility checks pass. Existing16 tournament,12 Personal research API, six source, playback, completion, reminder and setup tests pass. TypeScript and build pass. The fixed setup-control grid keeps toggle position and width identical when expanding/collapsing at375px and1366px, with the note on its own row. No live votes, music uploads, audio playback, push or deployment during QA.

Compact passage-strip refinement: the timing UI is now a full-width strip below the decision area, replacing the tall side panel. OFF is near-black with a distinct labelled checkbox surround, a22px check target and explicit ON/OFF badge. Timing copy remains visible while off and explains local checking independently of the vote requirement; unchecked target choices still never upload. Qualified optional playback can remain green while the OFF badge and local-only message remain explicit. Describe (optional) is now a secondary row below the voting buttons. At1440px the closed desktop strip is137px tall. Browser checks at320,375,768,1440 and3840px found no horizontal overflow or clipped requirement label; Describe stayed below the vote controls. ON/OFF styling and keyboard-visible checked state were verified without audio or votes. Build, privacy/eligibility regressions, setup-control checks and diff validation passed. Local review only; no push/deployment.

### Compact timing card beside desktop votes (local review)

Supersedes the full-width passage strip described above. At widths of 900px and above, the standard tournament decision area uses a flexible centered vote column and a compact 300–360px timing card on its right. Switch A/B sits above the centered three-button group; Describe remains underneath. The timing card keeps the explicit requirement checkbox, dark OFF state, local timing explanation, counters, playback actions and expandable research details. Playback actions no longer inherit the older extra-row layout in this desktop card. Narrower screens stack the card below the votes.

Validated locally with a loaded, paused Listening Pool song, requirement ON and OFF: centered 460px vote group and approximately 195px timing card at 1440px, side-by-side at 958px, stacked at 768px and 390px, and centered without horizontal overflow at 3840px. Production build, blind completion/private-choice checks, Personal passage opt-out checks and diff whitespace checks passed. Local preview only; no push or deployment.

### Slim shared timing toolbar and actual community song positions (local review)

Supersedes the side-card layout above. Each curve now has its own centered A/B listening meter. A shared toolbar beneath both curves contains the explicit five-second requirement, playback/shuffle/time controls, a persistent local-timing explanation and expandable research details. The standard vote group is centered beneath both curves, with Switch A/B in a balanced side slot and Describe underneath. Personal shares the toolbar/meters and places its centered choices before playback. Desktop toolbar measured approximately76px; compact mobile controls approximately187px with touch-sized buttons. Open checked at390/768/980/1440/3840, both requirement states, loaded paused song, zero desktop vote-center error and no horizontal overflow.

The former catalog-position label (e.g.15/200) is removed. Playback displays the same rated-only community order as Listening Pool, with an explicit rated-recording denominator, or Not ranked yet for zero-vote recordings. Counts refresh on source/recording changes, focus/data events, once per visible minute and immediately after successful vote/undo. Reads cannot overwrite newer vote snapshots. All modes may read community standings; Personal still has no music-vote write path. Ratings never change sampling odds. Existing private target-choice behavior is preserved.

Production build, TypeScript, music preference/API suite with community-position cases, actual music refresh/vote race and undo checks, blind completion, Personal protocol opt-out/playback/setup checks and whitespace validation passed. The old Personal structural assertion that blocked even read-only community standings was removed; its submission guard remains covered by the actual handler test. No production operations or Git publication.
