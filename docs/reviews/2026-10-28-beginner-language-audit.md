# Making YinYang EQ understandable without audio knowledge

October 28, 2026 · update125 · review and proposed wording only

## Assessment

The concern is well supported by the current source. The site repeatedly asks people to understand how its audio and research systems work before helping them complete an ordinary task. A newcomer wants to hear a difference, choose what they enjoy, and know what happens next. Instead, they encounter targets, measurements, reference systems, several comparison modes, technical settings and research distinctions at the same time.

This is both a **language problem and an order-of-steps problem**. Replacing a few acronyms will help, but it will not resolve missing next actions, unexplained choices, inconsistent names or unclear saving. The beginner route needs fewer decisions and a clear explanation at each step. Experienced users should retain the detailed controls and methods.

The review covered entry and setup, listening and results, privacy and trust, and tuning and access. The detailed reports identify affected wording, source locations, proposed replacements and coverage limits.

These are source-based assessments of likely difficulty. They are not claims that real beginners were observed failing, or that every device/browser state was exercised.

## What should change first

| Order | Problem | Concrete direction | Detailed evidence |
|---|---|---|---|
| 1 | The first button already assumes people know EQ and targets. | Lead with “Compare two sound settings on your headphones and choose the one you enjoy more.” Define EQ once. Give the beginner one prominent starting action. | Entry E01/E04; Listening L03 |
| 2 | Choosing headphones looks like finding or making a laboratory measurement. | Lead with “Find my headphones.” Explain that a matching measurement may already be available; distinguish brand/model from source/test equipment. Make upload an advanced alternative. Give an honest no-match path. | Entry E02/E03/E09/E11; Listening L04 |
| 3 | The site exposes its internal categories before explaining what the visitor can accomplish. | Present goals first: find my favorites, explore specific sound settings, help with research, adjust a sound I like. Keep existing mode names secondary and keep their data rules distinct. | Entry E04/E27; Listening L03/L16; Trust T11 |
| 4 | Disabled choices do not always explain the remaining step. | Every blocked action should say what is missing and offer that action: choose headphones, review required participation choices, play the same section on A and B, or wait for preparation. | Listening L07/L14; Trust T02; Tuning T14 |
| 5 | Expert controls compete with Play and the preference choice. | Keep the default path focused on music, A/B, preference and progress. Put LUFS, Q, fit error, engine names, channel-correction choices and detailed statistics under clearly named advanced sections. | Entry E05/E15/E16; Listening L06/L19; Tuning T06–T15 |
| 6 | Results sometimes read like an examination of the listener. | Lead with “Your favorites so far” and “Your saved comparisons.” Explain repeated/identical-setting checks without implying a hearing grade. Keep uncertainty and methodology accessible. | Listening L08/L09/L15; Trust T18 |
| 7 | “Saved”, “private”, “shared” and “sync” have several meanings. | State the destination and audience at the action: this tab, this browser, private synced account copy, research submission, or public result. Explain what survives leaving, clearing storage or deleting. | Trust T01/T04/T08/T09/T14; Listening L16/L21/L29; Tuning T17/E09 |
| 8 | Tuning ends with unexplained fitting/export choices. | Explain the intended destination first. Ten bands is already selected, but five methods/priorities still need a decision rule. Offer a reviewed starting option; explain how to use the output. Distinguish curve data, EQ settings and a manual-entry guide. | Tuning T13–T19/T21 |
| 9 | Errors and empty screens often provide technical diagnosis without recovery. | Use “What happened → what it means for your work → what to do next.” Distinguish loading, genuinely empty, failed, partially saved and not-yet-confirmed states. Replace the cheerful “Thanks for listening!” rate-limit failure heading with a clear wait/retry message. | Entry E09/E12/E21/E22/E25; Listening L10/L12/L27; Trust T12 |
| 10 | Advanced help often repeats the terms that caused the problem. | Teach a complete first comparison with concrete clicks and listening examples. Put a short glossary at first use, with detailed methods available afterward. Use the same destination names on every page. | Entry E27–E32; Tuning T21; Trust T15/T16/T17 |

## Two source-confirmed risks to verify in a browser before fixing

**Submission feedback can be hidden by the page itself.** In the main comparison page, starting playback automatically collapses setup. The main status message remains inside that collapsed region, including partial-save and ranking-submission outcomes. Put those outcomes beside the preference buttons or Continue action. See Listening L01, especially `app/shootout/page.tsx:399,606,620` and its save handlers.

**A bookmark can lose the private results access key.** The shared-results page saves its key in browser storage and then removes the key from the address bar. Creation tells the person to bookmark the private URL, but the opened results page offers no persistent “Copy private results link” action. A bookmark made at that point is not an independent recovery copy. See Listening L02, `components/embed-results.tsx:39–42,104–106` and `components/embed-create.tsx:98`.

These findings are not grounds to weaken access or duplicate submissions. Test the exact rendered states with synthetic data and the permitted review identity, then preserve the current protections in any fix.

## A beginner journey to design around

This is a proposed interface, not an implemented change. The current participation requirements, measurement eligibility and listening rules remain in force.

1. **Understand the purpose.** “Find a sound you enjoy. Hear the same music with different sound settings and choose your favorite. You do not need to know audio science.” Explain EQ as changing the balance of bass, voices and high sounds. Avoid promising everyone can use every headphone model.
2. **Choose headphones and understand data choices.** “Search for your headphone brand and model.” Explain why a measurement is needed and what to do if none is available. Before a tool requires participation, show a short, accurate account of what must be shared and which choices are optional. Do not describe the entire site as private just because one mode stores a result locally.
3. **Hear a comparison.** Use an existing appropriate default music choice. “Press Play both sounds. You will hear the same short section twice.” Keep comfortable-volume/other-EQ guidance. Display progress toward the actual same-section listening requirement without exposing file hashing or trial preparation as unexplained tasks.
4. **Choose without feeling tested.** “Which sounded better to you?” → “I prefer A” / the mode's accurately defined no-preference/uncertainty choice / “I prefer B.” Names can stay hidden until the proper reveal. Do not imply “can't tell” proves two settings are identical or equally liked.
5. **Know what happened and what to do next.** Show the actual save/submission outcome immediately. Offer “Compare another pair”, “See my favorites so far”, or the relevant next task. A tuning/export destination needs an explanation of whether it changes only this website's playback or produces settings for another app.

A person should not need to consult a glossary to finish this path. Definitions should help curious people and clarify the few concepts that really are necessary.

## Examples of more understandable wording

| Current wording | Proposed first layer | Detail that must remain available |
|---|---|---|
| Find my target | Find a sound I like | A target describes the desired sound balance; it is not itself the headphone-specific EQ file. |
| Browse measurement database | Find my headphones | Which exact model/source was selected and the limitations of that measurement. |
| Upload measurement | Use a measurement file I already have | Accepted file types, measuring equipment/source, left/right rules and contribution choice. |
| Matched source loudness / −16 LUFS | Keep song volumes similar | Fixed source adjustment, peak limits and the fact that perceived loudness/headphone exposure are not guaranteed equal or safe. |
| Hear 5 s of the same passage on A and B | Listen to the same 5 seconds on both sounds | Actual overlapping-section requirement, preparation state and why a choice can still be locked. |
| Finalize preference curve | Make EQ settings for my headphones | The result can be regenerated; current band/method choices; measurement requirement. |
| Bypass adjustments | Hear without my added EQ changes | Baseline headphone adjustment and separate dynamics processing may remain active. |
| Fit error | How closely these settings follow the curve | Numerical definition; this is not a sound-quality score. |
| Save listening EQ | Save for music-library playback | Saved in this browser; does not change all audio on the device. |
| Qudelix 5K | Qudelix 5K manual setup guide | The file requires manual entry, not an automatic import. |
| Your Winners / HIGH SCORES | Your favorites so far | Provisional personal preferences, comparisons completed and remaining limits. |
| This handshake expired | This browser connection request expired | Create a new code on the signed-in browser; approval/security rules remain. |
| Use account copy for this item | Keep the account's entire [named section] | Actual whole-section replacement, readable changes and counts; no invented per-item merge. |
| Delete all my submitted data… | Delete all linked data and sign out… | Exact account/browser/research scope must be checked before finalizing this label. |

These are context-specific drafts, not global search-and-replace instructions. In particular, “target”, “measurement” and “EQ preset” must remain distinct.

## Working vocabulary

| Concept | Plain explanation / preferred usage |
|---|---|
| EQ | Sound adjustments that change the balance of bass, voices and high sounds. Use the full explanation on first encounter, then EQ is acceptable. |
| Target / target curve | The desired sound balance / a graph of that balance. It is used with a headphone measurement to calculate suitable EQ settings. |
| Headphone measurement | A saved description of how a headphone model reproduces different pitches. It may come from a catalog; it is not a hearing test or necessarily a measurement of the listener's exact pair. |
| EQ preset | A saved set of adjustments that can be applied to audio. It is not interchangeable with a measurement or a target-curve file. |
| Sound profile / listener profile | Always qualify the word. A sound profile describes sound; a listener profile/public journal concerns a person and publication. |
| Blind | Names/settings are hidden while choosing. Explain the purpose; do not conflate this with visual accessibility or an ABX identification test. |
| Open | You choose the settings and can see their names. Avoid assuming “open” means public data. |
| Personal | A sequence to find your own preferences. The name alone does not describe storage or optional research sharing. |
| Passage | A short section of the song. |
| Round / trial / comparison / run | Prefer “comparison” for one A/B choice and “session” for a set when accurate. Preserve distinctions in research detail and saved-record identifiers. |
| Listening Pool / curated music | Music library. Use one main name consistently and explain any special subset. |
| Music from my device | A file the person selects on their device. This does not imply upload to a server or support for streaming-service tracks. |
| Rig / reference system | Equipment used to make the measurement. Exact equipment still matters to compatibility/provenance. |
| Frequency / Hz / kHz | How low or high a sound is; Hz/kHz are the units. Not required to use the simple sound sliders. |
| Gain / dB | How much a sound region or signal level is raised or lowered. Explain the control's role; do not confuse this with measured ear exposure. |
| Q / shelf / filter / band | Advanced adjustment controls. Introduce only where someone deliberately edits them; keep exact supported semantics. |
| Preamp / headroom | Starting level adjustment / room to avoid digital distortion. Neither word guarantees hearing safety. |
| LUFS / level normalization | Ways the site measures or adjusts signal level. Explain what the selected option does and its limits before the unit/method. |
| RMS | Define its role where it appears: a signal-level measurement in level matching, or an average curve-fitting error in fit diagnostics. These are different quantities. |
| Dynamics / LRA / peak-to-mean | Differences between louder and quieter parts, and particular measurements of them. They are not automatic sound-quality grades. |
| Fit / fit error / fitter | Calculation of EQ from a measurement/target and how closely it follows the requested curve. Keep engine names in details. |
| Fingerprint / hash | A code calculated from specified data to recognize it or check whether it changed. Say whether it describes a music file, setup, curve or saved account data. Do not call it random or guarantee anonymity. |
| Source / provenance | Where something came from and what changes were made. Exact licensing/permission facts must remain. |
| This tab | Temporary work that can disappear on refresh/close, when that is how the feature behaves. |
| This browser | Saved in this browser/profile. “On your device” alone is too broad: another browser on the same device may not have it. |
| Private synced copy | Saved account data available to approved browsers, with the site's actual administrator access disclosed. It excludes music files. |
| Research submission | Information sent to the project for the stated study/ranking purpose. A saved browser copy is a separate object. |
| Public result | Specify individual public activity versus combined rankings/group results; “nothing published” must not conceal aggregate effects. |
| Opt out / withdraw / delete | Name the specific permission and effects. Withdrawing participation stops listening access without automatically deleting earlier submissions. Turning off optional permissions may also remove logs or exclude records from analysis. Deletion erases the specified records. They are not synonyms. |
| Sealed result | A finalized protected group statistic that can remain after original records are deleted. Keep the exact protection and retention limitations. |
| Sync / linking / snapshot | Keeping supported data across approved browsers; approving access; an extra recovery copy. One-time replacement is different from ongoing sync. |
| JSON / CSV / TXT | Data file / spreadsheet-style file / text file, with the actual supported destination explained. A file extension does not imply the site can restore/import it. |

## Page coverage

The release has 26 `page.tsx` routes, including the legacy Tuning redirect. All were covered at source level, plus the gate-rendered sign-in/linking/maintenance pages and `/home` redirect. Owner-only pages are recorded separately from ordinary visitor burden. Coverage does not imply every imported owner diagnostic panel or every possible data-generated string was exhaustively reviewed.

| Page / route | Main area to address | Report |
|---|---|---|
| Welcome `/` | Purpose, first action, undefined concepts, research-heavy introduction | Entry |
| `/discover` | Translate destinations into useful goals | Entry |
| `/shootout` | Modes, equipment, timing locks, status, target selection, setup | Listening |
| `/shootout?tab=rankings` | What scores mean; whose comparisons; loading/error vs empty | Listening |
| Other `/shootout` tabs | My space, target import, measurement upload, personal/research history | Entry + Listening |
| `/shootout/personal` | Starter, saved setups, music rules, practice, finalists, provisional results | Listening |
| `/music-library` | Rating question, source/recording metadata, EQ setup, search/error states | Entry |
| `/preference-tuning` | Setup order, sound controls, preview truth, export choice and destination | Tuning |
| `/eq-compare` | Prerequisites, supported files, preparation, match levels, reveal and saving | Tuning |
| `/share-shootout` | Listener link vs private access link vs website embed | Listening |
| `/s/[id]` | Sound comparison explanation, choices, data disclosure, reveal | Listening |
| `/embed/[id]` | Same flow in an embedded window, errors and shortcut differences | Listening |
| `/s/[id]/results` | Recovery link, counts, statistics, exports, sharing/deletion | Listening |
| `/participation` | Required vs optional choices, first refusal vs withdrawal, clear consequences | Trust |
| `/privacy` | Short useful summary before full technical/retention detail | Trust |
| `/my-data` | Copies/locations, deletion scope, older results and recovery | Trust |
| `/account-sync` | Sync state, browser/device roles, conflicts, retained copies | Trust |
| `/community-preferences` | Optional purpose, prerequisites, reference checks and research limitations | Trust |
| `/listeners/yinyangeq` | Public journal vocabulary and failed loading | Trust |
| `/curve-credits` | Define the credited object; plain provenance labels | Trust |
| `/shortcuts` | Beginner help first, then accurate mode-specific keyboard behavior | Entry |
| `/version` | Explain changes for listeners before implementation details | Entry |
| `/software-licenses` | Specialist information belongs here; retain exact notices | Tuning |
| `/my-profile` | Owner participant publication console; not a general profile feature | Trust, owner section |
| `/profile-access` | Owner participant sign-in; keep distinct from ordinary access/admin | Trust, owner section |
| `/test-history` | Hidden/admin testing history; technical details appropriate | Trust, owner section |
| `/owner-research` | Owner-only source review; do not treat admin jargon as onboarding | Trust, owner section |
| `/personal-tuning` | Redirect to current Tuning route | Tuning |
| `/home` | Context-dependent redirect; make Home/Welcome destination clear | Tuning + Entry |
| `/access`, `/admin-login` | Invitation/access instructions; separate owner sign-in | Tuning |
| `/sync`, `/pair`, `/devices` | Two-browser steps, connection errors, ongoing vs one-time transfer | Trust + Tuning |
| Whole-site / feature maintenance | Existing plain closure copy is good; preserve current lock | Tuning |
| Shared navigation, dialogs, dropdown labels, empty/errors | Consistent terms, visible requirements and recovery actions | All four |

## Detailed audit files

- [Entry, navigation, headphone setup and music library](2026-10-28-novice-entry-and-library.md) — 32 entries.
- [Listening, personal results, research rankings and shared links](2026-10-28-novice-listening-and-results.md) — 30 entries.
- [Data choices, privacy, account sync, community and owner-only pages](2026-10-28-novice-data-and-trust.md) — 18 entries plus owner-only notes.
- [Tuning, private preset comparison, access and special routes](2026-10-28-novice-tuning-and-access.md) — 38 entries.

The 118 entries in the four integrated area reports retain cross-page overlaps so an implementer can see each place a problem occurs. They should not be presented as 118 independent defects. Each file has a coverage inventory, positive patterns and accuracy caveats.

## Follow-up review decisions

- Introduce the listening goal before explaining targets, measurements or export formats. State the measurement and supported-output requirements at the point where users choose them.
- Describe audio processing and research data by mode. The explanation should distinguish file audio, comparison records, optional tags and Sync rather than making a blanket claim about what stays on the device.
- Offer a clear way to load existing Sync data on a new browser. Use destination labels that distinguish this browser, private account storage and public results.
- Keep match requirements and research eligibility visible. Explain rate-limit and save errors with a concrete recovery step and avoid unsupported estimates of how long a comparison takes.

## What to preserve

The site already has useful foundations: a clear “Shape the sound you want” promise, a guided Personal starter, no-preference/skip choices, explicit browser-only warnings, stated deletion consequences, optional research controls, detailed methodology, and many errors that tell users to press Play again. The goal is to make these protections and actions understandable at the moment they matter.

Keep measurement/reference restrictions, same-section listening requirements, randomization, scoring, separate permissions, private-access controls and honest uncertainty. Keep license identifiers and necessary attribution accurate. A readability review is not authority to change scientific methods, consent, legal claims, access or retention.

## Suggested work sequence

1. Resolve the two feedback/recovery risks and other concrete misleading states. Validate with synthetic success/failure cases.
2. Agree on the beginner journey and canonical names. Rewrite Welcome, headphone search, first-listen guidance, the primary choices and the immediate result together.
3. Simplify Tuning/library/results by moving advanced explanations behind relevant details and making output destinations understandable. Select any recommended defaults through separate domain review.
4. Rewrite data choices and sync/deletion screens around audience, storage location and consequences. Validate the wording against the handlers before replacing it.
5. Apply the agreed vocabulary across remaining pages, tooltips, accessible names, option menus, empty states and errors.
6. Test with people who have no audio knowledge. Fix what they cannot complete or correctly explain; do not use an AI review as a substitute for that evidence.

Two product questions should be decided during design: **What exactly are song votes meant to rate?** and **which fitting option should be the beginner recommendation for each supported destination?** The current code cannot establish those answers by itself. They do not block recording the present usability problems.

## Acceptance checks for the redesign

Ask first-time users to do ordinary tasks without coaching: explain what the site offers; find their exact headphones; finish one comparison; explain whether their answer is local, research-shared or public; return to a saved result; use a generated setting in the intended place; decline optional sharing; connect another browser; resolve a conflict; and delete one item while predicting which copies remain. Record completion, hesitation, wrong turns, help needed and whether they can explain the consequences in their own words. Agree success criteria before testing rather than declaring an arbitrary score afterward.

For implementation, verify desktop and narrow layouts, keyboard focus, screen-reader labels/announcements, closed and expanded native selects, selected/disabled readability, and long-message wrapping. Include slow/failed requests, zero search results, no measurement, no eligible songs, interrupted audio, partially successful saves, blocked browser storage and unavailable downloads. Use the dedicated isolated review identity or a synthetic preview; never a contributing participant/admin session without the required explicit exception.

## Baseline and evidence

- Canonical workspace: `workspace/`; existing dirty application drafts were preserved. No application implementation was changed by this audit.
- Deployed source: `c9d6cc0e66804710f1948a71bbc568d75cfe7642`, `work/peqdb-release-final-20261028`, update125.
- GitHub was fetched successfully. Published `origin/main` was `3ecad7342063f1f228456967c71d17560e729043`. Its application/component/library/private-gate source has no diff from the reviewed release. Canonical main remains intentionally divergent; it was not reset, rebased or used as the product baseline.
- Before the audit notes were added, the full snapshot check passed: **2,838 files verified**, rerun using pinned Node 26.12.0. The final snapshot check reports only the intentional update to `docs/COORDINATION.md`; no source/release manifest was rewritten to conceal this documentation difference. All 416 app/components/lib source hashes still match the reviewed release. Source references point to that immutable release, not the dirty drafts.
- Claude completion was verified from its invocation and result: `claude-fable-5-1`, requested `max` effort, success, 158 turns, no permission denials. Its tool set was limited to Read/Glob/Grep. No substitute model was used.
- All 416 reviewed release files under app/components/lib remained byte-identical after review; source-link targets were checked. No application tests/build were needed for these documentation-only additions.
- No deployment, commit, push, migration, backup export, participant-data access, production browser activity or maintenance change was performed.
- This is a broad source/copy review. No new rendered browser or real-user usability tests, screen-reader certification, native popup pixel check, physical audio test, legal validation or statistical-method validation is claimed. Catalog prose was sampled; individual track metadata and imported owner diagnostics were not exhaustive.

The review deliberately stays separate from implementing the proposed redesign.
