# Review: blind EQ comparison (`/eq-compare`)

- **Reviewer:** Claude, read-only. No source changed, nothing run or built.
- **Base:** `86c60c0`, working tree dirty (45 tracked files modified plus untracked). This feature is entirely untracked.
- **Files read:** `docs/BLIND_EQ_COMPARISON.md`, `app/eq-compare/{page.tsx,style.css}`, `components/blind-eq-{editor,listener}.tsx`, `lib/blind-eq.ts`, `lib/blind-eq-audio.ts`.
- **Not covered:** `scripts/check_blind_eq.mjs`, the other dirty files, `layout.tsx`. I have not seen the page in a browser, so design comments come from markup and CSS only. Audio behaviour is read from code, not heard.
- **Overall:** the engineering is careful: strict parsing that fails closed, explicit RBJ shelf coefficients, memory-only state, honest limits in the docs. The main weaknesses are one experimental-design choice and three UX traps around preset readiness.

## Functional findings (most important first)

1. **Renaming a preset silently invalidates it** (`blind-eq-editor.tsx:45`). The name field calls `dirty()`, which sends `onChange(null)` and clears the "Ready" message. After uploading a TXT, changing the name disables "Hide presets & start" with no explanation, and the "Use these settings" button is inside a closed `<details>`. The name is also read at upload time, so typing it afterwards causes this. Fix: a name change should update the preset's name in place and not invalidate it.
2. **Manual entry has the same trap.** Any edit nulls the preset, and nothing says "click Use these settings". Suggest validating on change (debounced) and showing "Ready" or the specific error, or at least a visible "Not applied yet" status. Also tell the user why Start is disabled (for example "Preset 2 isn't ready; Choose at least one song").
3. **Discard or New session leaves the parent and the editors out of sync** (`page.tsx:34,69` with `88-89`). `reset()` keeps `presets` in the parent, but the editors unmount during a session and remount blank ("My EQ", one default row). Start is enabled with presets the user can no longer see, and the confirm text says "Your setup stays available". Either lift editor state up so it survives, or clear `presets` in `reset()` and say so.
4. **Revealed results can be lost.** `beforeunload` is removed once revealed (`page.tsx:26-31`), but results exist only in memory. Keep warning until the JSON has been downloaded.
5. **`revealedAt` is the download time**, not the reveal time (`page.tsx:72`). Store the timestamp in `revealBlindSession`.
6. **Header uses plain `<a>`** (`page.tsx:80`), which causes a full reload, so `beforeunload` currently protects a live session by accident. If these become `next/link`, add an explicit guard.
7. **Memory risk on large local files.** The limit is 100 MB of file size, but a 100 MB FLAC decodes to several hundred MB of float PCM, and the decode holds the whole buffer. Consider a duration cap, and a clear message when `decodeAudioData` fails on mobile.
8. **Minor a11y.** `aria-label` on the plain `div.eq-heard` (`blind-eq-listener.tsx:104`) is ignored without a role. Use `role="group"` or a status role. `role="status"` on `.eq-selected` (`page.tsx:94`) also wraps a button, so the Clear button is announced as live text.

## Design of the test (opinion)

- **A/B mapping is fixed for the whole session** (docs line 19, `blind-eq.ts:104`). A listener with a position or "first-heard" bias then has that bias confounded with one preset across every song. It also always starts on A. I'd re-randomise the mapping per song, and map back at reveal. The per-song table can still show the preset names. This is the biggest improvement to the evidence quality for little code. A mapping that is secret per song also removes the need to keep a single hidden mapping in session state.
- **Self-consistency option.** The project's listener-consistency research suggests an optional "repeat this song with a fresh random mapping" step. That gives the user a direct read on whether their choices are reliable, which a single pass cannot.
- **RMS level match.** Plain RMS is a rough proxy, and EQs that differ in bass or treble weight can still sound different in loudness. A K-weighted (BS.1770-style) RMS needs only two extra biquads and tracks perception better. The docs already avoid over-claiming; this would just narrow the gap.
- **Five seconds per side** unlocks voting, which is a low bar. That is fine as a guard against skipping, but the page should not imply five seconds is enough to judge an EQ. Consider a nudge ("most people need to hear several passes").
- **Loop point.** The 15 s passage loops with no fade, so a click at the seam is likely. It is equal on both sides and so not a bias, but a short crossfade at the loop would be more pleasant.

## Parsing and docs accuracy

- `LS`/`HS` → `LSC`/`HSC` (`blind-eq.ts:60`) matches the Equalizer APO reference as a fetched summary read it (plain LS/HS use a center frequency; 6/12 dB variants use a corner). That summary was imprecise about LSC/HSC, so Codex should confirm against the primary table before relying on it.
- **The default shelf Q of sqrt(0.5)** (`blind-eq.ts:60`, docs line 41): the reference page did not state a default Q for shelves in that read. This may be an assumption stated as fact. Check it, and say "assumed" in the docs if the reference does not define it.
- Everything else in the parser looks consistent with the docs. I did not run the test script.

## Design (from markup and CSS)

- The dark surfaces and explicit `option`/`optgroup` backgrounds (`style.css:21-22`) follow the dropdown rule in AGENTS.md. The expanded popup itself was not certified by the earlier review and I have not seen it either.
- Touch targets are 44 px, focus rings are strong, and there is a narrow-viewport media query, which is good. The A/B buttons are large and clear.
- The setup page is a long scroll with two heavy editors before the songs. Consider a three-step layout (Presets → Songs → Settings) with a ready check on each, which also fixes findings 1–3.
- This page defines its own palette in hard-coded hex. If other pages use shared tokens, this will drift. I did not compare.

## Writing

Current copy is mostly clear and honest. Suggested changes:

| Where | Now | Suggested |
|-------|-----|-----------|
| Second preset default name | "Friend’s EQ" | "Preset 2" (it presumes whose EQ it is) |
| Format note | "Supports preamp, peak (PK/PEQ)…" | Lead with plain words: "Export your EQ as a text file from Peace, Equalizer APO or Qudelix. Not sure? Enter the filters by hand." Keep the PK/LSC detail inside the details. |
| Level matching | "Match the EQs’ playback levels (recommended)" | Add why: "Louder usually sounds better, so this keeps the comparison fair." |
| Start button | disabled, no reason | Add a line under it listing what is missing. |
| Voting | "Choose after hearing both EQs" | "Listen to at least 5 seconds of A and B first (shown above)." |
| Reveal | "These are your preferences across N decisive choices…" | Keep. It is accurate. Consider adding "If A and B often tie, your ears may not hear a difference, which is a useful result too." |

## Suggested order of work for Codex

1. Findings 1–3 (they block the happy path), plus the not-ready explanation.
2. Per-song A/B randomisation, which also touches `blind-eq.ts`, `page.tsx` and `scripts/check_blind_eq.mjs`.
3. Findings 4–5, then 7–8.
4. Copy changes and the optional items.
