# Beginner listening and shared-shootout audit

Reviewer: Astra (`gpt-6-astra`), ultra reasoning. Commissioned as part of the October 28 whole-site beginner audit.

Source reviewed: immutable release commit `c9d6cc0e66804710f1948a71bbc568d75cfe7642` (update125), read with `git show`, in `workspace`. The working checkout is dirty and was not used as product evidence. Read its AGENTS.md for working rules. No source changes, live browser sessions, network requests, participant records, commits, publication, deployment, backups or fixture creation were performed. This is a source-derived language/flow audit, not observed usability testing. CSS was inspected only to establish the collapsed-message issue. No claims of desktop/mobile/native-menu/audible correctness are made.

Audience: an everyday first-time visitor who does not know EQ, target curves, frequency response, headphone measurements, LUFS, PEQ, hashing, or research statistics. Priority: P1 = likely prevents completion or materially misleads about a saved result; P2 = substantial first-use comprehension/recovery friction; P3 = useful polish. Wording below is proposed, not approved scientific/consent text.

## Route and state coverage

| Route / surface | Source states reviewed |
|---|---|
| `/shootout`, `?mode=blind`, `?mode=bring`, `?mode=open` | First use; agreement gating; no headphone; insufficient targets; ready/playing; setup auto-hide; target selectors and draft/apply/shuffle states; source/mode previews; before-listen dialog; matched/free listening; disabled choices; private-target and public-target choices; tie/same-filter checks; saved/failed/partial submissions; idle expiry; finish summary; persistent player. |
| `/shootout?tab=rankings` | Current/all/legacy version; IE/OE; Combined/Listening Pool/Bring Your Own/same-file subset; loading/fetch failure implications; empty rows; method and research-basis disclosures; uncertainty labels. |
| `/shootout?tab=upload`, `?tab=measurements` | Target creation, formats, category/reference system, optional measurement and required device-EQ measurement, private/public choice, pending/approved removal/withdrawal/undo states. Measurement editor delegates to another component; parent audit owns detailed headphone/editing controls. |
| `/shootout?tab=music`, `?tab=profile` | Legacy Music library link; research/Open result history, headphone tally, diagnostics, filters, browser-only removal and server deletion/legacy-review disclosure; Personal results summary. SongSuggestions implementation is outside this subaudit. |
| `/shootout/personal` | Guided starter, saved setups, all/custom/private target pools, start blockers, advanced loudness/channel setup, music modes, practice, skip, matched/free listening, pause/resume, final checks, podium/shortlist/curves/all-target table/history, bench/restore, undo, exports, delete confirmation, research/community states, load/storage errors, sample-only view. |
| Shared `MusicPanel` | Pool and own-song/folder selection, unavailable source/decoding/fit errors, waveform/transport, play-both/passages, music votes and matching, change-source reset warning, loudness/metadata/dynamics, privacy and processing disclosures, source-ready/loading states. |
| Shared helpers | BeforeYouListen; MatchedPassageStrip/Help; TournamentModeTabs; ResearchMusicSource; RankingChangeExplanation; PersonalTargetPicker; PersonalSharingStatus; PersonalStartBlock; PersonalContributionStatus; FeedbackPanel; ResultsProfile; PersonalPodium; ComparisonDataActions. |
| `/share-shootout` | Initial target/title creation; 2–4 selection bounds; loading/unavailable; API failure; created state; public/embed/private links; copy helper; browser-save failure; prior saved shootouts. |
| `/s/[id]`, `/embed/[id]` | Loading/unavailable; intro; setup/peek/own-file; listening/busy/disabled vote; submit/error/retry; repeated run; reveal and ties; crowd results; copy; iframe chrome/link differences. |
| `/s/[id]/results` | Missing/invalid/private key; loading/API errors; local key persistence/fragment stripping; empty and populated result views; totals, uncertainty, pair breakdown, setup/sound tables, CSV/JSON export, sharing toggle/failure, permanent deletion confirmation and success. |

## Highest-impact findings

### L01 — P1: Save and submission outcomes can disappear inside automatically hidden setup

Evidence: [app/shootout/page.tsx:399](../../app/shootout/page.tsx#L399) auto-collapses setup when music plays. At `:606`, the only shootout `message` renderer (`role="status"`) is in `shootout-setup-panel`, which becomes `aria-hidden` and `inert`; [app/globals.css:1541–1542](../../app/globals.css#L1541) makes the collapsed panel zero-height, transparent and overflow-hidden. [app/shootout/page.tsx:620](../../app/shootout/page.tsx#L620) renders the separate message only when `tab !== "shootout"`. After voting, messages include `:469` “Comparison saved to My results in this browser. Research submission failed…”, `:493` “Public ranking unchanged…”, `:497` “Comparison counted toward the rankings…”, and `:500` “Could not confirm the public ranking submission…”.

Likely experience: a novice sees names revealed and Continue test, then reasonably assumes everything was saved/submitted. The actual success, partial failure or uncertainty is hidden in a setup region that playback itself closed.

Recommendation: put the comparison outcome beside the choices/Continue button in a persistent status region. Distinguish “Saved on this device”, “Research received”, and “Public-ranking submission confirmed / not confirmed”. Preserve current durable-local-save and no-duplicate behavior; do not imply a failed network response proves no server record exists. Browser-validate this with simulated API failures in an authorized isolated preview.

### L02 — P1: Private shared-results recovery link is easy to lose after opening it

Evidence: [components/embed-create.tsx:98](../../components/embed-create.tsx#L98): “This link is the only way to see your results or delete the shootout, and it cannot be recovered… bookmark it too.” [components/embed-results.tsx:39–42](../../components/embed-results.tsx#L39) saves the key locally and removes the URL fragment. Its loaded-page links at `:104–106` offer Share link and Embed code, but no Copy private results link; the rest of the component ends at `:186` without that action.

Likely experience: creator opens results, then follows the instruction to bookmark it. The address is now keyless. It works in this browser while storage survives, but the bookmark alone cannot recover results on another device or after browser data is cleared. This is especially hard for a nontechnical user to diagnose.

Recommendation: keep an always-available “Copy private results link” button that reconstructs the complete link from the in-memory key, and explain “Save this private link somewhere safe. A bookmark of the address bar on this page may not contain access.” Better eliminate that trap in the design. Do not weaken key protection or create recovery promises that are not implemented. Source-inferred; browser verification still needed.

### L03 — P2: The app asks beginners to choose “targets” before defining what one is

Evidence: [app/shootout/personal/page.tsx:325](../../app/shootout/personal/page.tsx#L325): “Your choices narrow … targets to a personal shortlist”; `:329`: “Each target is applied through your headphone’s measurement, so it sounds the way it would on yours.” [app/shootout/page.tsx:606](../../app/shootout/page.tsx#L606): “TARGETS IN THE POOL”, “Target A”, “Target B”. [components/embed-create.tsx:57–58](../../components/embed-create.tsx#L57): “ear-test targets, blind”, “headphone targets”.

Confusion: target can mean a headphone model, loudness goal, person, or exercise; “measurement” sounds like something the visitor must personally make. The personal starter explanation may also overpromise exact sound reproduction.

Proposed first-use explanation: “A target is a sound-balance setting: a different mix of bass, voices and higher sounds. We play the same music with two settings. Choose whichever you enjoy more.” For measured playback: “We use a saved measurement of your headphone model to estimate how to apply each setting. Your own pair and fit can differ.” Keep the precise target/EQ distinction in expandable help, and do not claim exact replication.

### L04 — P2: The missing-headphones recovery emphasizes uploading specialist files

Evidence: [app/shootout/page.tsx:606](../../app/shootout/page.tsx#L606): “Select your headphones first… Choose a saved measurement above, or upload your own” with primary “Upload a measurement” and secondary “View saved measurements”. The route does have HeadphonePicker above and `browseMeasurements()` at `:107`.

Confusion: a new visitor with no saved measurement may think they need lab equipment or a CSV to start, and miss the available database path.

Recommendation: primary “Find my headphone model” that opens the existing picker, secondary “Use a saved measurement”, with “Upload a measurement file” under advanced choices. Add “You do not need to measure your headphones yourself if your model is available.” Do not suggest guessing a similar model if correct measurements are unavailable.

### L05 — P2: Required first-listen instructions assume knowledge of multiple EQ systems

Evidence: [components/before-you-listen.tsx:15](../../components/before-you-listen.tsx#L15): “Disable system/device EQ, sound enhancements and device channel matching.” Personal adds “Auto, Uploaded or Off”; other modes add “supported channel matching” and “saved preset”. It is a modal with “I’m ready to listen” and no brief examples.

Confusion: a zero-knowledge visitor may not know what to turn off or where, and may think the website checkbox controls their phone/headphone application.

Proposed lead: “Turn off any sound presets or equalizer in your phone, computer, music player, or headphone app—for example Bass Boost. This avoids applying two sound adjustments at once.” Then a short optional “What counts as a sound effect?” disclosure for EQ, spatial/enhancement and left/right correction, reviewed against supported protocol. Preserve comfortable volume, breaks, and the clear existing statement that LUFS/slider do not measure ear exposure. Do not replace the health guidance with a numeric volume target.

### L06 — P2: The main loudness and channel controls present numbers/acronyms without a safe default explanation

Evidence: [app/shootout/page.tsx:606](../../app/shootout/page.tsx#L606): “−14 LUFS / −16 LUFS / −18 LUFS / Normalization off”, “−16 LUFS · locked”, “Channel balance… Auto Match / My PEQdB preset”. [app/shootout/personal/page.tsx:307–308](../../app/shootout/personal/page.tsx#L307) likewise has “Matched source loudness”, “Channel matching… Auto / Uploaded / Off”, “Left and Right responses”.

Confusion: a user may treat −14 as quieter, think this is headphone volume, or switch Off while trying to turn EQ off. “Uploaded” is an origin, not an explanation of its effect.

Recommendation: lead with “Keep song volumes similar · standard setting” and keep −16 LUFS as secondary technical text. Label choices with effect, e.g. “Standard (−16 LUFS)”, “Quieter source (−18 LUFS)”, “Louder source (−14 LUFS)”, “Keep original song levels”. For matching, “Balance left and right sound” with “Automatic”, “Use my correction file”, “No left/right correction”. Keep existing alert for Off and explicit limits: source normalization does not guarantee equal perceived loudness after EQ or safe exposure.

### L07 — P2: Locked voting needs a next action, especially when A and B meters look full

Evidence: [components/matched-passage-control.tsx:34–39](../../components/matched-passage-control.tsx#L34) renders two per-side meters and “Hear 5 s of the same passage on A and B to vote”; no common-passage meter is shown. [app/shootout/page.tsx:427–428](../../app/shootout/page.tsx#L427) also requires `commonHeard >= 5` and a server `trialId`. `:437` may report “Please wait for local file hashing to finish.” The helpful play action exists in [components/music-panel.tsx:945](../../components/music-panel.tsx#L945), with behavior described only in title: “Plays the selected passage once on each target, in random order, then stops.”

Confusion: two full bars can coexist with a locked choice when different sections were played, or the trial is not ready. A user does not know what a passage is or why Play music did not finish the requirement.

Recommendation: prominent first instruction “Press Play both targets. It plays the same short part of the song twice, then you can choose.” Add cause-specific lock text: “Both played, but different parts of the song—play both targets together”, “Preparing your comparison…”, or “Checking your music file on this device…”. Prefer a visible matched-time indication or make the bar semantics explicit. Preserve five seconds on each side plus five overlapping source seconds; no threshold relaxation.

### L08 — P2: Results lead with a diagnostic examination of the listener

Evidence: [app/shootout/page.tsx:606](../../app/shootout/page.tsx#L606) blind results lead with “same-filter accuracy … (SD …)”. [components/results-profile.tsx:52–54](../../components/results-profile.tsx#L52) displays “Repeated pair agreement”, “correct tie answers”, “accuracy SD”, “Identical-target check reliability… Beta(2, 2) prior”, and “Not calibrated yet”. `:62` calls tie “the accuracy answer”.

Confusion: “accuracy”, “correct” and “not calibrated” suggest the person passed/failed a hearing test, even though adjacent notes say otherwise. The diagnostic density obscures the everyday question: what did I prefer?

Recommendation: first show “Your choices in this session” and comparisons/preference summary. Put diagnostics under “Repeated-comparison details (optional)” with “Sometimes both choices use the same sound setting. These checks describe the answers; they do not grade your hearing.” Keep exact statistics and prior in technical details, and retain their exclusion from preference weighting. Avoid inventing a pass threshold.

### L09 — P2: Research ranking terminology still needs a plain-language first layer

Evidence: [app/shootout/page.tsx:607–615](../../app/shootout/page.tsx#L607): “QUALIFIED COMPARISONS”, “participant groups”, “SCORE ± MODEL SD”, “fractional Bradley–Terry”, “350 SD prior”, “bounded total influence”, “Same file across listeners”, “valid SHA-256 fingerprints”. The detailed limitations are unusually thorough.

Confusion: rank number looks like a universal best-headphone result; model scores look like percentages or quality ratings; “qualified” sounds certified. The careful limits require reading a large specialist disclosure.

Recommendation: directly above rows: “These are sound settings preferred in the comparisons shared with this site. They are early results, not a best-headphone list. Small score differences may not be meaningful.” Label the first-level column “Estimated preference score” and help “Higher means more preferred in this model; the ± value shows model uncertainty.” “Comparisons included in this view” is clearer than QUALIFIED. Keep full grouping/prior/method details; never relabel model SD as a confidence interval or unique people.

### L10 — P2: A failed/unloaded ranking can look like a legitimate empty result

Evidence: [app/shootout/page.tsx:247](../../app/shootout/page.tsx#L247) only sets research when its fetch is OK, without a separate research loading/error state; `:607` defaults missing data to `[]`; `:615` says “No votes meet this ranking’s criteria yet.”

Confusion: visitors may conclude the study has no data, or their new vote vanished, when data simply could not load.

Recommendation: distinct “Loading results…”, “Results could not be loaded. Try again”, and genuine “No comparisons match these filters yet—try Combined or another headphone category.” Ensure retry preserves filters. Source-path evidence only; no live request was made.

## Personal tournament, player, and collection refinements

### L11 — P2: Music wording varies enough to obscure that it is one file-on-device workflow

Evidence: [components/research-music-source.tsx:14–15](../../components/research-music-source.tsx#L14) offers “Use Your Music” but describes active mode as “Bring Your Own”; [app/shootout/personal/page.tsx:304](../../app/shootout/personal/page.tsx#L304) says “Upload My Music”, then explains files stay on device and selection occurs after starting. [components/music-panel.tsx:978](../../components/music-panel.tsx#L978): “Choose a real stereo song”.

Confusion: Upload suggests sending the audio to the site; “real stereo” sounds like a quality/authenticity test; selecting Upload in setup without a file chooser looks unfinished.

Recommendation: consistently use “Music from my device”, “Choose an audio file”, and “Choose a stereo file (separate left and right audio)”. State before Start “You’ll choose the file in the player next; it stays on this device.” Keep stereo/protocol requirements and privacy details, including reselect-after-reload. Avoid implying streaming-service tracks can be selected as local files.

### L12 — P2: Several player errors name internal mechanisms instead of a recovery step

Evidence: [components/music-panel.tsx:555](../../components/music-panel.tsx#L555): “Headphone EQ could not be prepared. Check the selected measurement.” `:763`: “Choose a decodable two-channel stereo audio file.” `:769`: “300 MB hashing limit.” `:794`: “No eligible recording is available.” `:888`: “No decodable two-channel stereo files found directly in this folder.” [app/shootout/personal/page.tsx:192](../../app/shootout/personal/page.tsx#L192): “Could not fingerprint this setup. Use a secure browser context.”

Recommendation: pair precise diagnostics with “Try another headphone measurement”, “This browser could not read this stereo file. Choose a different supported file”, “Choose a file under 300 MB”, “These songs have already been used for this finalist check. Add a different song”, and “Open this page using its secure website address, then try again.” For folder selection explain “Songs inside subfolders are not included.” Verify exact trigger before attributing every no-eligible case to finalist checks. Preserve technical detail in a disclosure for support.

### L13 — P2: Setup changes can make progress appear to disappear

Evidence: [app/shootout/personal/page.tsx:283](../../app/shootout/personal/page.tsx#L283): “Each setup keeps separate progress; switch back to resume its saved run.” `:334,344`: separate measurement/catalog/loudness/channel setups. `:312` Saved setups lists long labels and only Export/Delete buttons. At `:215`, the eighth-setup limit asks users to “Export and delete an older run below”.

Confusion: the user changes volume matching and returns to a fresh starter, then must remember exact former settings to get back; there is no obvious Resume this setup action in the saved list. “Catalog” is also a system term.

Recommendation: show “You are viewing a different listening setup. Your previous results are still saved” with a chooser for saved setups and direct resume where feasible. Label setup ingredients in everyday terms. Link the max-setups blocker directly to Saved setups, and avoid implying JSON export has a restore path unless one exists. Preserve strict separation of non-equivalent setups.

### L14 — P2: A one-song choice can stall finalist checking without an immediate explanation

Evidence: [app/shootout/personal/page.tsx:304](../../app/shootout/personal/page.tsx#L304) offers Keep One Song; its help says finalist checks need “at least two different song families”. `:147–150` excludes used recording families in confirmation; [components/music-panel.tsx:794](../../components/music-panel.tsx#L794) says “No eligible recording is available.”

Recommendation: at “Check top … on different music”, detect the chosen one-song/undersized playlist and explain “This step compares your favorites using different songs. Choose a varied playlist or the random music library to continue.” Keep uploaded-file fingerprint caveats; do not equate different files with proven different songs.

### L15 — P2: Winner/medal language is stronger than the provisional personal result

Evidence: [components/personal-podium.tsx:85–86](../../components/personal-podium.tsx#L85): “Your Winners” followed by “Provisional winners”; `:93` and `:96` show Winner/Runner-up/Gold; `:66–69` Retro Arcade says “HIGH SCORES”. [app/shootout/personal/page.tsx:363](../../app/shootout/personal/page.tsx#L363) correctly states “Current favorite… not a universal winner or a confidence estimate”.

Recommendation: lead with “Your favorites so far” and “Current favorite”; retain celebratory themes but keep “Based on your listening so far” next to medals rather than requiring discovery of a footnote. A tie/no-clear-favorite should remain neutral. Preserve untested-target notice and two-song-check limits; do not turn completed checks into certainty.

### L16 — P2: Browsing results still requires decoding several names for the same kind of saved answer

Evidence: [components/results-profile.tsx:51–55](../../components/results-profile.tsx#L51): “profile”, “Total trials”, “Recorded votes”, “Private trials”; `:60`: “Random blind”, “Own music blind”, “Ranked”, “Research saved”, “Browser copy only”. [components/tournament-mode-tabs.tsx:7–8](../../components/tournament-mode-tabs.tsx#L7) uses Personal Tournament / Blind Research / Open Comparison.

Recommendation: use “comparison” consistently; “Saved comparisons”, “Confirmed public-ranking submissions”, “Saved only on this device”; match mode names with navigation (“Blind Research · Listening Pool”, “Blind Research · My music”). Keep browser-copy/research/ranking distinctions accurate, including ties that are research evidence but not marked as an ordinary recorded win. Avoid using Private as a catch-all for both browser-only and owner-visible records.

### L17 — P2: Optional sound descriptions are expert adjectives and can be mistaken for saved notes

Evidence: [components/feedback-panel.tsx:7](../../components/feedback-panel.tsx#L7): “harsh / bright / dark / muddy”; `:44`: generic “Submit” plus “Other feedback (private to the owner)”; private-target descriptions are temporary and not saved (`:23,44`).

Recommendation: use short examples alongside existing tags, e.g. “Too sharp or piercing”, “Not enough high sounds”, “Sounds blurred or boomy”, subject to audio-domain review because these are not exact synonyms. Label action “Send description to the site owner”. When private targets are active, show “Temporary note—cleared when this comparison changes” before text entry, or provide an explicitly local note-save function separately. Preserve optionality and separate submission consent; do not change research tag meanings silently.

### L18 — P2: Song voting and target voting share “vote” language on the same player

Evidence: [components/music-panel.tsx:987](../../components/music-panel.tsx#L987) renders Upvote/Downvote, “Sign in to vote”, “For future tournaments” and later explains that music votes affect Listening Pool rankings, not target rankings or random selection. Main choices are Prefer A/B and “Voting unlocked”.

Recommendation: title the extra group “Rate this song for the music library (optional)” and label “Like this song”/“Dislike this song” if semantics fit. On a listening-first layout, place it behind a disclosure. Preserve its independent sign-in and public-ranking effect; do not imply song votes influence random music selection.

### L19 — P3: The player displays engineering detail in the primary source strip

Evidence: [components/music-panel.tsx:972](../../components/music-panel.tsx#L972): source kHz, bitrate, measured/estimated LUFS and “L / R · pre-EQ · click to seek”. Open adds Dynamics at `:947` and peak spread/reduction/net gain at `:973`. `:1000` already has good optional explanatory detail for After-EQ levels.

Recommendation: primary strip = song title, artist, “Playing from this device / music library”, and clear click/drag action. Put format/sample-rate/bitrate/LUFS/Dynamics under “Audio details” or “Advanced sound tools”. Keep diagnostics available and distinguish visual spectrum from the target curve; do not remove valuable source provenance.

### L20 — P2: Adding a target is correctly advanced but lacks an understandable entry/escape

Evidence: [app/shootout/page.tsx:618](../../app/shootout/page.tsx#L618): “Submission type”, “Device-specific target (derived from EQ)”, “Measurement / reference system”, “IEC 60318-4, B&K 5128”, “frequency-response target, not a parametric filter list”, “Frequency (Hz), gain (dB)”, and ten points from 20 Hz–20 kHz. The insufficient-pool empty state at `:606` directs users to upload a frequency-response CSV.

Recommendation: add “Already have a target-curve file? Add it here. If you want to adjust a sound by ear, use Preference Tuning instead.” Explain target versus headphone measurement versus EQ preset with one sentence each and a valid downloadable example. Link directly to My space → Headphone measurements rather than “Use Measurements”. Keep exact accepted schema, category, reference provenance and measurement requirements; never accept an incompatible file by merely renaming it.

### L21 — P2: Public review copy uses “private” in two conflicting senses

Evidence: [app/shootout/page.tsx:618](../../app/shootout/page.tsx#L618): “Send it to the owner for review. It is private to you until approved”; later the same section correctly says “The owner will see its name, creator and curve.” At `:526` message: “Sending it to the owner for public review; it stays private to you until approved.”

Recommendation: “Only you and the site owner can see this submission while it is under review. If approved, its curve and creator name become public.” Retain the distinct “Only you; owner never sees it” wording solely for truly local private targets. Parent privacy audit should verify all data fields and the scope of these statements.

## Shared shootouts and private results

### L22 — P2: Shared shootout intro overloads the easiest entry point with signal-processing language

Evidence: [components/embed-shootout.tsx:293–294](../../components/embed-shootout.tsx#L293): “hidden EQ curves”, “same mean band power across 125 Hz–8 kHz”, “perceived playback loudness”, “No headphone correction”. [lib/embed-shootout.ts:200–201](../../lib/embed-shootout.ts#L200): “In-ear monitors”, “Pink noise”, “Synth pad”.

Proposed lead: “Hear the same short sound with two different sound-balance settings. Switch between A and B, then choose the one you enjoy more—or Can’t tell.” Then “This quick comparison adds the sound changes to your headphones’ usual sound; it does not use a measurement of your headphones.” Keep the precise band-power approximation under “How sound levels are handled”; do not say equal perceived loudness. “Earbuds / in-ear headphones” is more familiar than In-ear monitors. Explain built-in sounds before playback so Pink noise is not mistaken for broken audio.

### L23 — P2: Shared and main players assign different behavior to Space

Evidence: [components/music-panel.tsx:958](../../components/music-panel.tsx#L958): “Space play / pause”; [components/embed-shootout.tsx:247,326](../../components/embed-shootout.tsx#L247): “Space or S switches A/B (shared shootout)”.

Confusion: a user moving from the personal test to a shared link may hit Space expecting audio to stop and instead keep playing another setting.

Recommendation: preferably use one shortcut convention across the product; otherwise explicitly put “Space switches A/B here; use Pause to stop” next to the visible player before sound starts. Changing shortcuts requires a compatibility/accessibility review, not a cosmetic copy replacement.

### L24 — P2: Shared reveal describes a tie as equal liking, although Can’t tell also means uncertainty

Evidence: [components/embed-shootout.tsx:330](../../components/embed-shootout.tsx#L330): “Can’t tell”; `:343` fallback headline “You liked them about equally”; `:352` “You: {wins + ties/2} of {comparisons} rounds”.

Confusion: inability to notice a difference is converted into an asserted equal preference; half-counts such as 1.5 of 3 are unexplained. The main routes also use Unsure/Tie and No Preference/Tie differently.

Recommendation: “No clear favorite from these choices” when scores tie; show “Preferred in X rounds; Y ties” or explicitly “Preference score; ties count half”. Preserve the existing scoring semantics and distinguish “uncertain” from proven equivalence in explanatory copy.

### L25 — P2: Shared results call anonymous completed runs distinct “listeners”

Evidence: [components/embed-results.tsx:112](../../components/embed-results.tsx#L112): “blind listeners”; `:128`: “of listeners”; `:151,155`: Listeners. The limitation at `:163` correctly says one person could vote more than once by clearing browser data. Reveal [components/embed-shootout.tsx:352](../../components/embed-shootout.tsx#L352) uses “% of … listeners”.

Recommendation: label “Completed blind runs” and “of completed runs” with a plain explanation “One person may be counted more than once; the site does not identify listeners.” On the reveal, “In the completed blind runs so far…” avoids implying verified distinct people. This preserves anonymous collection, without adding identity tracking.

### L26 — P2: Shared statistics overstate interpretability for small, repeated, unverified samples

Evidence: [components/embed-results.tsx:120](../../components/embed-results.tsx#L120): “Whiskers show a 95% range; wide whiskers mean more votes are needed before trusting the order”; `:144`: shuffled sides “should sit near 50%”; `:115`: “listeners consistent across rounds”. [lib/embed-shootout.ts:176–178,195](../../lib/embed-shootout.ts#L176) makes repeat agreement applicable only to two-target runs with at least two decisive choices; for other cases a dash appears. `:186–187` uses Wilson on fractional ties.

Recommendation: add a short first layer: “Early descriptive results from these runs. Repeated answers and different listening setups can affect the order.” Explain whiskers as the model’s approximate range and keep limitations next to the chart; do not imply enough votes guarantees trustworthy population ranking. Replace an unexplained dash with “Available only for two-target shootouts with repeated decisive answers.” “A chosen X% of the time” is clearer than Position bias; avoid implying a small sample must be exactly 50%. Statistical interpretation warrants method-owner review; this audit did not validate the model.

### L27 — P2: Unavailable shared shootout gives the listener no direct retry or clear cause

Evidence: [components/embed-shootout.tsx:128](../../components/embed-shootout.tsx#L128) connection error says “try again”, while `:288` renders only “Shootout unavailable”, error, and non-embed “Make a new shootout”; embed renders no action. Audio initialization failure also enters this same state (`:169`).

Recommendation: distinguish ended/deleted link, temporary connection failure, and browser audio failure. Offer Retry load, Return to setup or Open in full page where appropriate. “Make a new shootout” is a creator action and does not help a friend trying to complete a link. Do not claim the link ended on an ambiguous fetch failure.

### L28 — P2: Private results export and share interfaces need clearer everyday actions

Evidence: [components/embed-create.tsx:95–98](../../components/embed-create.tsx#L95) presents public link, iframe code and private link in one group; [components/embed-results.tsx:165–166](../../components/embed-results.tsx#L165) says Download CSV / Download JSON. [components/embed-common.ts:29–40](../../components/embed-common.ts#L29) copy failure returns false, while both callers only show feedback on true (`embed-create.tsx:47`, `embed-results.tsx:74`).

Recommendation: visually separate “Send this to listeners” from “Keep this access link private”; place “Add to a website (advanced)” around iframe code. Label exports “Spreadsheet file (CSV)” and “Full data file (JSON)”. On failed copy say “Couldn’t copy automatically. Select and copy the link below.” Preserve private-key secrecy and all export data explanations. UI inspection is still required for real visual hierarchy.

### L29 — P2: Participant-facing shared-link promises are shorter than the actual data explanation

Evidence: [app/s/[id]/page.tsx:10](../../app/s/[id]/page.tsx#L10) preview says “Anonymous: only your picks are sent”; [components/embed-create.tsx:59](../../components/embed-create.tsx#L59) says “Voters send only their picks”; details at `:83` include setup answer, curve-peek flag and hour. Listener intro at [components/embed-shootout.tsx:309](../../components/embed-shootout.tsx#L309) only promises the sharer sees “combined results”, whereas private results allows exporting individual anonymous run rows ([components/embed-results.tsx:162,165–166](../../components/embed-results.tsx#L162)) and later owner sharing (`:171–174`).

Recommendation: use a consistent short disclosure: “No account needed. Your choices, optional listening setup and whether curves were shown are sent as an anonymous completed run. The creator can view/export these runs and may share them with the lab owner.” Exact final wording must be reconciled with the current privacy notices and API behavior by the parent audit. Do not equate anonymous with only aggregated data or imply the creator cannot see run-level records.

### L30 — P3: Several beginner-facing labels reference names that are not the navigation labels

Evidence: [components/personal-target-picker.tsx:57](../../components/personal-target-picker.tsx#L57): “Add one under Upload”; live page names the collection “My space” and “Target curves” ([app/shootout/page.tsx:617](../../app/shootout/page.tsx#L617)). [lib/personal-start-status.ts:29](../../lib/personal-start-status.ts#L29) sends missing channel presets to My space although the Personal advanced panel has its own upload ([app/shootout/personal/page.tsx:308](../../app/shootout/personal/page.tsx#L308)). [components/results-profile.tsx:60](../../components/results-profile.tsx#L60) uses Random blind rather than Blind Research · Listening Pool.

Recommendation: use the exact destination name and a direct link/action: “My space → Target curves”, “Open Advanced setup → Channel matching”, etc. Review all route aliases before removing old terminology. Keep established deep links functional.

## Existing strengths worth preserving

- Personal starter gives three concrete steps and an immediately useful “Find the sound you like best” promise ([app/shootout/personal/page.tsx:322–331](../../app/shootout/personal/page.tsx#L322)). It recommends random library music without requiring knowledge of recordings.
- Personal start blockers name the missing step and expose a retry for unavailable sharing state ([lib/personal-start-status.ts:24–33](../../lib/personal-start-status.ts#L24), personal page `:319`). This is a strong model for all disabled actions.
- “Play both targets” and explicit “same passage” timing text make fair comparison possible without manually seeking (`music-panel.tsx:945`, `matched-passage-control.tsx:30–41`). Keep the automated path prominent.
- The main player distinguishes local saved answers, private research, and public-ranking confirmation in code and copy ([app/shootout/page.tsx:444–503](../../app/shootout/page.tsx#L444)). The issue is visibility/terminology, not lack of these states.
- Personal practice is explicitly not saved/contributed; Pause & see results and session stopping-point caveats reduce pressure to keep listening (`personal/page.tsx:226,352–362`).
- Mode/source previews explicitly warn that a fresh test resets listening progress while keeping completed results (`shootout/page.tsx:606`, `research-music-source.tsx:15`).
- Personal results already say current preferences are not a universal winner or confidence estimate and expose untested counts and differing recording limitations (`personal/page.tsx:363`).
- Research Rankings already distinguishes source matching within a comparison from same-file matching across groups, and does not claim ITU compliance or a research-validated five-second minimum (`shootout/page.tsx:614–615`). Preserve this rigor while adding a simple first layer.
- Private-target visibility has distinct controls and an explicit current-choice status; local removal has Undo; withdrawal/removal confirmations explain what persists (`shootout/page.tsx:341–342,559–590,618`).
- Music changes visibly explain immediate application and reset listening progress; Done explicitly does not undo the change (`music-panel.tsx:975`).
- Shared shootouts give a duration estimate, visible round progress, understandable A sounds better / Can’t tell / B sounds better, an explicit repeat-run policy, optional setup answer, and local-file privacy (`embed-shootout.tsx:291–309,313–333,360`).
- Shared private-result creation explicitly warns that the private link grants access and cannot be recovered, handles storage failure, explains retention and deletion, and keeps sharing off by default (`embed-create.tsx:83,97–98`; `embed-results.tsx:170–179`). Resolve the bookmarking trap without weakening these controls.

## Suggested implementation order and verification limits

1. Fix visible save outcomes and durable private-results-link recovery first (L01/L02).
2. Give the first comparison a single plain-language path: define sound setting/measurement, search for headphones, use default music, Play both targets, choose a preference, see saved outcome (L03–L07).
3. Make returning, recovering and interpreting results understandable (L08–L16, L24–L27), preserving all scientific and consent distinctions.
4. Add progressive disclosure and consistent terms to advanced controls and sharing (remaining findings).

Before claiming fixes work, validate desktop and narrow screens, keyboard-only focus, closed and expanded native selects, disabled-state readability, screen-reader announcements, auto-collapsed state, API failure states and private-results bookmarks in an isolated authorized test context. Do not use production/admin or contribute real votes for this validation. The current review deliberately does not certify rendering, keyboard behavior, privacy implementation, loudness safety, statistical validity or auditory results.
