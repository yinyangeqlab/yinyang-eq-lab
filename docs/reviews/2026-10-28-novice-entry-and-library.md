# Beginner audit: entry, shared navigation, setup, help, music library

Reviewer: Astra (`gpt-6-astra`), ultra reasoning. Commissioned as part of the October 28 whole-site beginner audit.

Source: deployed update125 commit `c9d6cc0e66804710f1948a71bbc568d75cfe7642`, read with `git show` / `git grep` from the repository object store. Immutable checkout: `AGENTS.md` was read for instructions only. No network, browser, account, production, participant data, source edits, commits, deployment or backups were used.

All findings below are **source-derived usability hypotheses**, not observations of a novice failing a task. Priority is relative to a zero-audio-knowledge audience: P1 can prevent a reasonable first-use decision or materially mislead; P2 adds substantial confusion or recovery friction; P3 is secondary polish or specialist information in a suitable place. Quotes and lines refer to this exact commit, not the current working tree. One-line JSX makes some references broad, but the quoted text pins the location.

## Most consequential findings

### E01 — P1 — The first action requires three undefined concepts
- Evidence: [app/page.tsx:60](../../app/page.tsx#L60): “Hear two headphone EQ targets side by side.” `:61`: “Find my target”; `:65`: “Two curves. Your choice.” `:81`: “Select a saved measurement or add one for your pair.” Metadata repeats “headphone target curves” in [app/layout.tsx:13,21](../../app/layout.tsx#L13).
- Why: A beginner must infer EQ, target, curve and measurement before understanding the promise or clicking. “Target” can sound like an achievement; “measurement” can imply owning laboratory equipment. “Side by side” may suggest simultaneous audio, although the next steps describe switching.
- Change: Introduce one plain sentence before the first CTA: “Compare two sound settings on your headphones and choose the one you enjoy more. EQ changes the balance of bass, voices and higher sounds.” CTA: “Find a sound I like.” At setup: “Choose your headphone model. We use a saved sound measurement to calculate its sound settings.” Define “target” once as the sound balance being tried and “curve” as its graph; retain expert names in detail/help.
- Accuracy: Do not imply any arbitrary model or no measurement works. Do not promise an exact personal correction or identical loudness. Clarify the availability requirement early.

### E02 — P1 — Headphone lookup is framed as a technical database, without selection guidance
- Evidence: [components/headphone-picker.tsx:12](../../components/headphone-picker.tsx#L12): “Browse measurement database / Use saved measurement / Upload measurement”; `:105`: “Search model or measurement source”; `:112–117`: “Your uploaded measurements”, “Imported measurements”, “Public measurement index · creator sources”, “Rig: … / Rig not listed”. [app/page.tsx:72](../../app/page.tsx#L72): “Targets are applied through your own measurement”.
- Why: Beginners likely know brand/model, not a measurement source or rig. Multiple entries for the same model have no plain explanation of why they differ or how to choose. “Your own measurement” can wrongly suggest personal measurement is mandatory when catalog import exists.
- Change: Primary route “Find my headphones”; helper “Search the brand and model printed on your headphones or packaging. You do not need to measure them yourself if a matching entry is available.” Explain duplicate entries and show source/measurement equipment under details. Label categories “Saved on this browser” and “Available measurements”. Give a truthful no-match path that says what is needed and how to obtain a supported file; do not silently recommend a similar model.
- Accuracy: Which sources are suitable or preferable requires a separate scientific policy; do not invent a default/best rig or imply database entries match the listener’s exact unit.

### E03 — P1 — Upload setup asks for specialist knowledge before saying who it is for
- Evidence: [components/measurement-manager.tsx:122–141](../../components/measurement-manager.tsx#L122): “Measurement name”, required “Measuring device / rig” with “711, KEMAR, 5128, other…”, “Fit, seal, vents”, “Driver type” with “Dynamic, planar, BA, hybrid…”, “Nozzle diameter, mm”, “Response files”, “raw response”, “dense REW files accepted”, “CH: 0 and CH: 1 sections”.
- Why: This is an expert form reached by an ordinary “Upload measurement” button. A person may upload a song, screenshot, frequency graph image or EQ preset, or invent a required rig name. Optional hardware fields look like prerequisites even though they are not.
- Change: Begin “Use this if you already have a headphone measurement file. To choose a model from our list, use Find my headphones.” State accepted file types and show a small valid example before selection. Basic fields first; “More measurement details (optional)” for tips/pads/driver/nozzle/notes; “Advanced: separate left/right measurements” and “Advanced: channel balance preset” for specialized choices. Explain “measurement = a file describing the headphone’s sound; EQ preset = instructions that change sound.” Give truthful guidance for an unknown measuring device rather than encouraging a guess.
- Accuracy: Keep required provenance rules. “Unknown” is supported for target reference systems but is not an explicit option in this measurement form; adding it is a product/scientific decision.

### E04 — P1 — The landing-page explanation is dominated by research vocabulary before the first task
- Evidence: [app/page.tsx:69–76](../../app/page.tsx#L69): “−16 LUFS source target”, “normalisation”, “Perceived loudness”, “non-elimination pool”, “underheard”, “benched”, “finalists”, “Community aggregates”, “randomized reference checks”, “independent listener validation”; `:83`: “identical-filter checks remain diagnostic”.
- Why: The site promises a simple three-step activity but asks readers to understand experimental design and multiple research destinations. “Tournament”, rankings and winner metaphors can suggest listener skill or objective headphone quality, despite accurate disclaimers.
- Change: Preserve three plain cards: “Find my favorites”, “Help with research”, “Choose settings myself”, with current mode names as secondary labels. Before first use show only setup, listening, choice and what happens to that choice. Move detailed comparison method, pool selection and research validity into named disclosures. Replace “No skill score…” repetition with one clear “There is no right answer: choose the sound you enjoy.”
- Accuracy: Keep required consent prominent. Do not collapse Personal, private research, Community Preferences and Blind Research data flows; each permission remains independent. Do not remove method caveats, only give them a readable first layer.

### E05 — P1 — “Match playback loudness” sounds more exact and effortless than its technical caveat permits
- Evidence: [app/music-library/page.tsx:186](../../app/music-library/page.tsx#L186): “Match playback loudness” and “−16 LUFS integrated · fixed gain only; peak safety may lower a song family’s shared target”; `:193` describes a family target and 1 dB true-peak headroom. [components/library-wave-player.tsx:169](../../components/library-wave-player.tsx#L169) shows “LUFS target · … dB gain”.
- Why: Beginners cannot translate the caveat. They may assume every recording or every EQ setting will sound equally loud. “Target” here means a level target, unlike the sound target elsewhere.
- Change: Control “Reduce volume differences between recordings”; helper “Adjusts each recording’s overall level. Some recordings are kept quieter to avoid distortion. EQ can still change how loud it sounds.” Put LUFS, gain and headroom in “Audio measurement details”; show an ordinary status such as “Volume adjustment on”.
- Accuracy: This does not measure headphone output level or provide safe listening-volume assurance. The implementation applies fixed source gain; avoid an exact perceived-loudness-match claim.

### E06 — P1 — Library EQ starts from an unexplained “Flat reference” and presents it like an ordinary target
- Evidence: [components/library-eq-panel.tsx:11,20–21](../../components/library-eq-panel.tsx#L11): flat is the initial target; `:101`: “Hear it through your headphones”; `:104`: “Choose a target”, “Fits the selected target and lowers preamp for headroom.”
- Why: “Flat” may sound like no processing or a universal neutral recommendation. Here it is a real curve used in fitting after a measurement is chosen. A novice can create a setting without understanding this choice, or confuse EQ off with Flat reference.
- Change: Do not present an unexplained technical reference as a beginner recommendation. Require an intentional target choice or explain it inline: “Flat reference is a technical comparison curve; it is different from turning EQ off.” First explain the operation: “Choose the sound balance you want us to try to create on these headphones.”
- Accuracy: Whether flat should be available or recommended needs domain review. Do not assert what it will sound like on all measurement systems.

### E07 — P1 — Music votes do not say what judgment the user is making
- Evidence: [app/music-library/page.tsx:167–169](../../app/music-library/page.tsx#L167): “Upvote / Downvote”, “Preference #…”, “Marked for review · still in random playback”; `:177` and `:183–184` state ratings do not affect pool inclusion or frequency.
- Why: A beginner cannot tell whether to rate the song, this recording’s sound, usefulness for headphone comparison, or a rights/quality issue. “Marked for review” can sound unsafe or broken. A target-comparison site makes the meaning especially easy to confuse with target votes.
- Change: Decide and state the intended question directly above the buttons, for example “Would you choose this recording for comparing headphone sound?” only if that is the actual study question. Then use labels answering that question. Add “This rates the recording, not the sound setting or artist. Votes do not change how often it is played.” Use “Low community rating — awaiting review” with explanation where applicable.
- Accuracy: Copy alone cannot invent or change the underlying study construct. Owner/research clarification is required for the exact voting question, not for identifying this ambiguity.

## Setup, upload and recovery findings

### E08 — P2 — In-ear / over-ear categories omit everyday examples and the unsupported edge cases
- Evidence: [components/headphone-picker.tsx:101–102](../../components/headphone-picker.tsx#L101); [components/measurement-manager.tsx:124](../../components/measurement-manager.tsx#L124): “In-Ear / Over-Ear”.
- Change: Explain with examples or illustrations (“In-ear: earphones that fit inside the ear canal”, “Over-ear: headphones with ear cups”). State what to do with on-ear headphones, open earbuds or speakers if supported policy exists.
- Accuracy: Do not silently recategorize devices; these categories also filter measurements.

### E09 — P2 — Import status and no-match states speak about indexes, not the next action
- Evidence: [components/headphone-picker.tsx:62–69](../../components/headphone-picker.tsx#L62): “Loading public index…”, “Public index unavailable.”, “public measurements indexed”; `:89,117–118`: multiple “No … measurements match” and counts; [lib/public-measurements.ts:45](../../lib/public-measurements.ts#L45): “HTTP …”.
- Change: “Loading available headphone measurements…”; failure “We couldn’t load the headphone list. Try again, or choose a measurement already saved in this browser.” Add a visible retry action. For no match, suggest checking the exact model, spelling and type filter. Keep HTTP codes in expandable technical details.
- Accuracy: Do not imply a retry exists until implemented; this is a behavior recommendation. The current lookup can retry by reopening/focusing after a failed load, but does not communicate that.

### E10 — P2 — One word, “measurement”, hides three file roles
- Evidence: [components/measurement-manager.tsx:131–141](../../components/measurement-manager.tsx#L131): “response”, “Left/Right”, “shared stereo EQ”, “Channel balance preset”; [lib/measurement-upload.ts:5–16](../../lib/measurement-upload.ts#L5) uses these terms in validation.
- Change: Label “One measurement used for both ears” and “Two measurements: one for the left earpiece and one for the right.” Explain channel balance once (“Adjusts differences between left and right”). Keep a preset separate as “Optional existing left/right correction settings”. Validation should name the visible field and what to do next.
- Accuracy: Listening uses the paired measurements’ average plus optional channel matching, not simply independent target fitting for each ear; preserve that distinction in technical details.

### E11 — P2 — Required rig metadata can block saving with no explanation of where to find it
- Evidence: [components/measurement-manager.tsx:70](../../components/measurement-manager.tsx#L70): “Name, headphone model, and measuring device are required”; `:125`: examples “711, KEMAR, 5128”.
- Change: Explain “This is the test equipment used to make the file, usually listed by its creator.” Use the field label in the error and link to its guidance. Explain what to do if the source does not identify it.
- Accuracy: Do not advise inventing equipment metadata. This is related to E03 but a distinct blocking state.

### E12 — P2 — A wrong file produces a numeric-format instruction instead of diagnosing the mismatch
- Evidence: [lib/curves.ts:18](../../lib/curves.ts#L18): “Add at least 10 frequency/gain rows between 20 Hz and 20 kHz.” [components/measurement-manager.tsx:109](../../components/measurement-manager.tsx#L109) and [app/shootout/page.tsx:527](../../app/shootout/page.tsx#L527) show the parser message directly.
- Change: “We couldn’t read this as a measurement/target file. Choose a CSV or TXT with two numeric columns: frequency in Hz and level in dB. Images, music files and EQ preset lists do not work here.” Link to an example; keep exact numeric limits under details.
- Accuracy: Parser can accept a valid file with ten points inside the interval; do not claim it verifies full frequency-range coverage. Use role-specific wording for measurement versus target.

### E13 — P2 — Target creation is accessible without establishing that it is an advanced import
- Evidence: [app/shootout/page.tsx:618](../../app/shootout/page.tsx#L618): “Add your target”; “Submission type”, “Device-specific target (derived from EQ)”, “Measurement / reference system”, “IEC 60318-4, B&K 5128, or Unknown”, “resulting frequency-response target, not a parametric filter list”, “Frequency response CSV”, “Frequency (Hz), gain (dB)”.
- Change: Start “Import a sound target (advanced)” plus “Already have a target curve file? Add it here. To listen with available targets, return to Listen.” Explain measurement vs target vs EQ preset with one example each. Put provenance/format details behind explicit help while keeping required fields visible. Label “Reference measurement equipment” rather than “reference system” with a short explanation.
- Accuracy: Some target imports are device-specific; do not label all target curves universal. Keep public-review choice explicit.

### E14 — P2 — Target input guidance is internally mismatched and provenance terms are opaque
- Evidence: [app/shootout/page.tsx:618](../../app/shootout/page.tsx#L618): free-text field guidance says “Select Unknown when unspecified”; file label says “Frequency response CSV” although CSV and TXT accepted; [components/target-lineage-picker.tsx:28–39](../../components/target-lineage-picker.tsx#L28): “Curve origin”, “Original curve”, “Preference based on another target”, accessible “parent targets”.
- Change: “Type Unknown if the source does not say”; file label “Target curve file (.csv or .txt)”; “How was this target made?” with “Created independently” and “Modified from an existing target”. Explain selected original target stays credited. Avoid “parent” in audience-facing accessibility labels.
- Accuracy: Verify provenance semantics before changing “original” to “independently”; do not imply legal ownership or licensing from this selection.

### E15 — P2 — Saved/setup success exposes specialist diagnostics before a usable next step
- Evidence: [components/library-eq-panel.tsx:78](../../components/library-eq-panel.tsx#L78): “Safe playback preamp: … dB”; `:89–92`: “PEQdB unsmoothed”, “Original fitter fallback”, “15 bands”, “dB fit error”, “dB safe preamp”, “EQ fitting failed”.
- Change: Main success “Your sound setting is ready and turned on”; main failure “We couldn’t create this sound setting. Try again or choose a saved setting.” If fallback matters, “An alternative calculation method was used” with details. Put engine, error, filter count and level reduction in technical details.
- Accuracy: “Safe” here concerns digital headroom, not ear safety; rename accordingly. Do not make fit-error numbers a sound-quality score.

## Library browsing and listening

### E16 — P2 — Repeated player metadata reads as a science dashboard
- Evidence: [app/music-library/page.tsx:165](../../app/music-library/page.tsx#L165): “LU LRA”, “Peak-to-mean … dB”, “kbps”, “AAC / FLAC / MP3”, “EQ ready”; [components/library-wave-player.tsx:169](../../components/library-wave-player.tsx#L169): “LUFS target … dB gain”.
- Change: Default card: title, artist, version, play, duration and rating question. Put measurements and encoding in “Recording details”. Define each only there: LRA is a loudness-range measurement; bitrate/file format describes the file, not a guaranteed quality ranking. “EQ ready” → “Works with the sound settings above”.
- Accuracy: Do not equate LRA, peak-to-mean or lossless encoding with better sound.

### E17 — P2 — Actual analysis notes appear under “Listen for”
- Evidence: [app/music-library/page.tsx:170](../../app/music-library/page.tsx#L170) uses `track.focus` unless `isAnalysisNote` matches; [lib/music-display.ts:2](../../lib/music-display.ts#L2) recognizes only “borderline|conflicting measures|review required”. [data/listening-pool-local.json:11](<data/listening-pool-local.json:11>): “Louder-passage contrast and/or repeated high-peak plateaus meet the dense/flattened screen; processing cause not established”; `:59`: “Short recording; do not infer a full-track category”; `:83`: “Distinct peak contrast in louder passages; no repeated-plateau flag”. These do not match the current analysis-note detector.
- Why: The label promises a perceptual task but supplies a measurement classification and caveat. Beginners may try to hear a “plateau flag”.
- Change: Separate explicit listening cues from analysis notes in the data model, rather than classifying prose with a regex. For records lacking a real cue show a neutral prompt such as “Listen to the voices, bass and higher sounds. Notice which sound setting you prefer.” Put measurement notes in technical details.
- Accuracy: Do not invent specific audible properties of an unlistened recording or tell users which target ought to win.

### E18 — P2 — Dynamics classification labels imply a hierarchy even though the caveat denies one
- Evidence: [app/music-library/page.tsx:170](../../app/music-library/page.tsx#L170): “Dense / flattened peaks”, “Preserved peaks”, “Exceptional dynamics”, “Peak-contrast classification pending”; `:193`: “loud-passage crest”, “peak-to-short-term-loudness contrast”, “repeated high-peak plateaus”, “integrated loudness”, “LRA”.
- Change: Put classification in expandable measured-audio details; use neutral names backed by the actual analysis, and preface “These are measurements of volume changes, not ratings of music quality.” Explain “mastering” before referring to it.
- Accuracy: Renaming categories needs scientific review; the source explicitly says category does not establish processing cause or sound quality. Preserve that limitation.

### E19 — P2 — Versions, alternate masters, recordings and songs are not explained at the browsing decision
- Evidence: [app/music-library/page.tsx:177](../../app/music-library/page.tsx#L177): “versions / songs / undecided”, “Alternate masters”; `:189`: “Each version has its own rating and measured characteristics”; `:191`: “Same performance, alternate mastering” and “Vocal / instrumental arrangement comparison”.
- Change: Explain “Some songs appear in more than one recording version. Each version has its own play button and rating.” Define mastering as a different final sound treatment of the same performance only for the relevant family. Label undecided “Not rated by you”.
- Accuracy: Do not call vocal/instrumental arrangements merely alternate masters; the implementation distinguishes them.

### E20 — P2 — Rating can remove a card from the default results without explaining why
- Evidence: [app/music-library/page.tsx:57](../../app/music-library/page.tsx#L57) defaults to `unrated`; `:111` saves/undoes a rating; `:133–141` filters rated entries out; `:187` labels default “Undecided”; active audio is preserved in `:189`.
- Change: Use “Not rated by you” as the filter, and immediate inline feedback “Rating saved. This recording is now hidden by your Not rated filter” with “Undo” / “Show all recordings”.
- Accuracy: This is source-inferred behavior; active playback has its own preserved-player UI, so do not claim the playing audio is lost.

### E21 — P2 — Voting prompts sign-in without a destination or local recovery action
- Evidence: [app/music-library/page.tsx:109,117](../../app/music-library/page.tsx#L109): “Sign in to submit a music vote”; `:188` displays global vote message above results. Generic failures at `:76,91,101,112`.
- Change: Provide an actual sign-in link/button and state whether the pending vote will be retained. Put saving/error/confirmation beside the affected rating. On error distinguish “not saved” from uncertain success where possible.
- Accuracy: Do not claim automatic retry/pending-vote persistence; none is visible here. Global account controls may exist elsewhere, but this error itself gives no path.

### E22 — P2 — Library headphone search has silent loading/no-match states
- Evidence: [components/library-eq-panel.tsx:52–60,95–96,103](../../components/library-eq-panel.tsx#L52): results only appear with a search of at least two characters; no visible minimum, loading state or no-match message. Errors say “public headphone index”.
- Change: “Type at least 2 letters of your headphone brand or model”; display “Searching…” / “No matching headphones found” and a retry after load failure. Label the list “Available measurements”.
- Accuracy: This is distinct from the main headphone picker, which does show match counts and loading text.

### E23 — P2 — EQ file upload provides a format extension but no way to identify a compatible preset
- Evidence: [components/library-eq-panel.tsx:102](../../components/library-eq-panel.tsx#L102): “Upload a downloaded EQ TXT”; [lib/music-library-eq.ts:10,12,33,35](../../lib/music-library-eq.ts#L10): “peak or shelf filters”, “preamp”, “unsupported filter”, “No supported EQ filters”.
- Change: Before upload, name supported export syntax and where the application can produce a compatible file. Give “Show an example” and a link to preset-format help. Error: “This TXT file is not a supported EQ preset. A music file or headphone-measurement file cannot be used here.” Keep exact filter syntax under details.
- Accuracy: Do not advertise every TXT or every Equalizer APO-style file as supported; parser supports a specific subset. Preserve unsupported-filter detection.

### E24 — P2 — Suggest-a-song copy promises discussion and refers to a nonexistent local file action
- Evidence: [components/song-suggestions.tsx:32](../../components/song-suggestions.tsx#L32): “listed below for community discussion and manual owner review”; rendered cards contain title, artist, note only. Aside says “Try a familiar track… The file stays on your device” while the form accepts metadata, not a file.
- Change: “Suggest a song for the project owner to review. Suggestions appear below; no audio file is sent.” Only mention community discussion if a discussion destination exists. Move own-file advice next to the actual Use Your Music control or link explicitly to it.
- Accuracy: There may be discussion elsewhere; this component provides none. Do not characterize suggestions as private when their stated purpose is a public/community list.

### E25 — P2 — Song-suggestion initial/loading/error states can claim there are no suggestions
- Evidence: [components/song-suggestions.tsx:7,20,32](../../components/song-suggestions.tsx#L7): empty state initializes as `[]`; same “No suggestions yet. Add the first one.” appears while fetching or after failure; button disabled by `busy || !ready` without explanatory busy label.
- Change: Separate “Loading suggestions…”, “No suggestions yet”, and “Couldn’t load suggestions — Try again”. Button while posting “Sending suggestion…”; if page readiness prevents posting, explain why.
- Accuracy: No user/browser failure was observed; these source branches warrant a targeted test.

### E26 — P3 — Remaining library terminology needs a nearby definition, not wholesale deletion
- Evidence: [components/song-suggestions.tsx:32](../../components/song-suggestions.tsx#L32): “tonal differences”, “Recording ID / ISRC”, “Bass texture”; [app/music-library/page.tsx:170–171](../../app/music-library/page.tsx#L170): CC license abbreviations; `:184`: ranking formula and “95% Wilson confidence interval”; [components/library-wave-player.tsx:168,170](../../components/library-wave-player.tsx#L168): “Waveform unavailable”, “Buffering audio…”.
- Change: “Differences in how the music sounds”; ISRC helper “Optional recording code — leave blank if you don’t know it”; “Loading audio…”; “Audio shape preview unavailable; you can still use Play” only when playback availability is known. Keep statistical and license terms in their already-disclosed detail context with a short plain-language introduction and links.
- Accuracy: License abbreviations and formulas may be important exact identifiers; do not rewrite their legal/statistical meaning or imply rights that are not granted.

## Navigation, help and secondary pages

### E27 — P2 — One destination changes names and broad labels hide required tools
- Evidence: [components/alpha-shell.tsx:14–21](../../components/alpha-shell.tsx#L14): “Listen”, “Tune”, “Rankings”, “My space”; [app/music-library/page.tsx:176](../../app/music-library/page.tsx#L176): “Tournament”, “Preference Tuning”, “Listening Pool”; [components/alpha-shell.tsx:65,139](../../components/alpha-shell.tsx#L65): “Devices & Sync”; [app/page.tsx:55](../../app/page.tsx#L55): “Sync browsers”, “Your data control”; [components/site-utility-links.tsx:5](../../components/site-utility-links.tsx#L5): “Data choices”.
- Change: Use one canonical destination name throughout. Give “My space” a descriptive subtitle or rename to “My headphones & targets” if it truly covers both. Prefer “Research rankings” where the distinction matters, “Help & shortcuts” rather than shortcuts-first, and explain Sync on first use as moving/keeping saved data across browsers/devices according to the actual account behavior.
- Accuracy: Do not collapse separate data-choice and device-sync pages into one feature or promise continuous synchronization where unsupported.

### E28 — P2 — Help starts with exceptions to keyboard behavior instead of the beginner task
- Evidence: [app/shortcuts/page.tsx:24](../../app/shortcuts/page.tsx#L24): opening text uses “active comparison”, “native form controls”, “concealed player”, “supported keys”, “playback area”, and different Space behavior; later “Hear the required common source passage” and “BT, EGC or TT”, “frequency placement”, “Axis”, “Bypass adjustments”, “starting correction”.
- Change: Lead with “New here? Choose your headphones, play a song, switch A/B, choose your preference.” Provide a short “What do these words mean?” section for EQ/target/measurement. Separate keyboard tables by mode; show tuning abbreviations only after spelling them out. Rewrite common passage as “Listen to the same required part of the song on both settings before choosing.”
- Accuracy: Different shortcut mappings are real and must remain documented; do not make Space universally play/pause. Tuning acronym expansion should come from the actual controls, not guessed meanings.

### E29 — P2 — “After using the player” does not clearly communicate a focus-dependent scope
- Evidence: [components/shortcut-scope-select.tsx:15–17](../../components/shortcut-scope-select.tsx#L15); [components/display-preferences-panel.tsx:17](../../components/display-preferences-panel.tsx#L17): “limits them to the last-used playback area”; [app/shortcuts/page.tsx:18,24](../../app/shortcuts/page.tsx#L18): “player area only”, “requires focus or a click in its playback area”.
- Change: Use a consistent label such as “Only while the player is active” and a concrete example showing what happens after clicking elsewhere. Test behavior against copy before selecting final wording.
- Accuracy: This audit did not trace keyboard-event handling deeply enough to certify the exact focus semantics; the three existing descriptions need reconciliation, not a guessed rewrite.

### E30 — P3 — Discover is concise but repeats research categories without translating them
- Evidence: [app/discover/page.tsx:7–11](../../app/discover/page.tsx#L7): “Targets & sources”, “preference pilot”, “eligible blind-comparison results”, “Meet the targets”.
- Change: Add short descriptions: sound settings and who created them; optional research study and its limits; results from research comparisons. Keep feature proper names as secondary labels.
- Accuracy: Research eligibility and pilot status are meaningful; explain rather than remove.

### E31 — P3 — Version history foregrounds implementation details that do not answer what changed for the listener
- Evidence: [lib/release-info.ts:13–15](../../lib/release-info.ts#L13): “Unsmoothed PEQdB AutoEQ fitting”, “original fitter…fallback”, “EQ shelf playback”, “export provenance”, “corresponding source”; `:21,24–28`: “AMOLED”, “A/B plots”, “frequency landmarks”, “axis controls”, “compact rail”. [app/version/page.tsx:22](../../app/version/page.tsx#L22): “source snapshot”, “tree differs from…deployment records”.
- Change: Lead each change with its user consequence, then optional technical detail. For example “The site can now calculate headphone sound settings using an additional EQ engine” if technically accurate; “Audio resumes more reliably after interruptions on Safari and iPhone/iPad.” Put source-history provenance in a developer detail disclosure.
- Accuracy: Preserve exact licensing/provenance facts; avoid claiming improved sound quality from engine replacement.

### E32 — P3 — Site-wide footer puts development and legal terms into every ordinary task
- Evidence: [components/site-data-footer.tsx:7–14](../../components/site-data-footer.tsx#L7): “Software licenses · PEQdB”, “Curve credits”, “Third-party notices”, “Apache 2.0”, “LGPL-3.0-or-later”, “AutoEQ engine”.
- Change: Keep clear data/help links first. Use audience-level links “Credits”, “Software licenses”, “Reuse permissions”; retain exact license names and required notices in appropriately visible legal detail. “Curve credits” → “Sound targets & credits” after defining target.
- Accuracy: Do not remove legally required attribution or hide notices in a way that violates license obligations. Legal scope not assessed here.

## Strengths worth preserving

- [app/page.tsx:59,82–83](../../app/page.tsx#L59): warm goal, explicit A/B switching, and tie/no-preference choice. [app/shortcuts/page.tsx:24](../../app/shortcuts/page.tsx#L24) correctly says no preference is valid and not failure.
- [components/tournament-mode-tabs.tsx:7–8](../../components/tournament-mode-tabs.tsx#L7): short purpose hints (“Find your favorite”, “Contribute comparisons”, “Explore freely”) are much more accessible than the detailed landing-page method text.
- [components/measurement-manager.tsx:136,140,142](../../components/measurement-manager.tsx#L136): replacement/removal consequences, deferred save behavior and whether a research copy will upload are explicit. Preserve these while simplifying adjacent terminology.
- [app/shootout/page.tsx:618](../../app/shootout/page.tsx#L618): private/public target choice describes who can see it and includes a live summary; “Remove local copy” and undo distinguish local removal from server submission.
- [app/music-library/page.tsx:180–184](../../app/music-library/page.tsx#L180): transparently states votes never remove tracks or change selection odds; formula is already behind a disclosure. Preserve the distinction.
- [app/music-library/page.tsx:189,194](../../app/music-library/page.tsx#L189): an active track outside current results has “Pause/Resume”, “Show track/recording” and retained-position guidance; clear empty search includes a reset action.
- [components/library-wave-player.tsx:42,112,172](../../components/library-wave-player.tsx#L42): interruption errors name the next action (“Press Play…”). This is the model for less-helpful errors elsewhere.
- [components/library-eq-panel.tsx:101,105](../../components/library-eq-panel.tsx#L101): EQ starts off; external/device EQ warning and separate loudness-processing state are useful. Keep limitations without requiring the novice to understand engine internals.
- [components/headphone-picker.tsx:108](../../components/headphone-picker.tsx#L108): keyboard help; selected headphone is stated explicitly at `:109`; delete confirmation says “from this browser” at `:89,122`.
- [components/display-preferences-panel.tsx:15–18](../../components/display-preferences-panel.tsx#L15): motion and accidental-key alternatives; shortcut scope is configurable.
- [app/shortcuts/page.tsx:24](../../app/shortcuts/page.tsx#L24): public GitHub-report privacy warning and email alternative are clear. [app/version/page.tsx:16](../../app/version/page.tsx#L16) explains beta means unfinished features, rather than assuming people know.

## Coverage and limits

Reviewed full public-facing source branches for:
- `app/page.tsx`, `app/layout.tsx`, `app/discover/page.tsx`, `app/shortcuts/page.tsx`, `app/version/page.tsx`.
- `components/alpha-shell.tsx`, `site-chrome.tsx`, `site-data-footer.tsx`, `site-utility-links.tsx`, `tournament-header.tsx`, `tournament-mode-tabs.tsx` (all destination labels, menu-state labels, visible/accessible utility text).
- `components/headphone-picker.tsx`, `measurement-manager.tsx`, `target-lineage-picker.tsx`; target-upload handlers/form/private-target list in [app/shootout/page.tsx:505–536,618](../../app/shootout/page.tsx#L505).
- `lib/measurement-upload.ts`, `public-measurements.ts`, `curves.ts`, `music-library-eq.ts` for direct surfaced validation/import errors and supported behavior.
- `app/music-library/page.tsx`, `components/library-eq-panel.tsx`, `library-wave-player.tsx`, `song-suggestions.tsx` (controls, help, empty/loading/error/success states, imported and conditional playback states).
- `components/shortcut-scope-select.tsx`, `display-preferences-panel.tsx`, `lib/release-info.ts`, `music-catalog.ts`, `music-display.ts`; sampled actual public catalog explanatory notes through targeted `git grep` in `data/listening-pool-local.json` and related catalog inputs. This was not an exhaustive individual-recording metadata audit.

No `app/help/page.tsx` exists at this commit. Help is `/shortcuts`. Public access/maintenance/consent, account flows, detailed research/result pages, core listening/personal flow, tuning and Blind EQ are assigned elsewhere. Owner-only controls and research tools were not audited; source references to private-test branches were not treated as ordinary participant findings. Production state and remote errors were not exercised.

This was not a rendered desktop/mobile, accessibility-conformance or dropdown contrast audit. Native option text was inspected; expanded menus, selected/disabled readability, visual hierarchy, keyboard behavior and real recovery states require targeted browser verification with the dedicated isolated review identity. The hypotheses above should drive small task-based sessions: first-time visitor explains what the site does; selects the correct model without guessing a rig; distinguishes a measurement, target and preset; plays without EQ; chooses a recording rating; understands where their data goes.
