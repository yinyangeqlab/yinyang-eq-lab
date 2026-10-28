# Claude read-only PEQdB review

Reviewed October 27, 2026 after explicit owner approval to send the prepared code-only packet to Anthropic. Base/HEAD `a0dad354fc62a5ac2f702b8a6fc8ee71348cc73a`; dirty branch `work/peqdb-wasm-local-20261027`. Packet: 30 files, 517,627 bytes; SHA-256 `04805adf1bf2a5e2f8be5e69aac53bdc6acf79573beaef4ddb3d3c4c2cc70439`. The packet contained line-numbered implementation, relevant tests/build/license code and selected diff. Its local hash manifest lists the exact files. No credentials, numerical measurement/target datasets, recordings, participant records or private recovery configuration were sent.

Claude ran in safe mode with tools, MCP, plugins, hooks, workspace discovery and Chrome disabled. It made no file edits or publication. Its model was `claude-opus-5-5`, reported by the completed CLI result; no model override was supplied. Findings below refer to the submitted snapshot. Codex reproduced and triaged them against local source; subsequent fixes are recorded in `2026-10-27-peqdb-local.md`. This is a static engineering review, not legal certification.

## Original review output

Static review of the packet only; nothing was executed. These are engineering observations, not a legal assessment.

**Summary:** one P1, seven P2s, then lower-priority items, verification gaps, pre-existing defects, and a short list of what checked out clean.

## P1

### 1. Out-of-range sample rates block playback instead of falling back
- **Where:** `lib/autoeq-fit.ts:12-13`. It runs in `lib/autoeq-client.ts:50` and again inside `legacyBatch` (`lib/autoeq-fit.ts:39`), so the fallback can't rescue it.
- **Trigger (demonstrable in the existing Node harness):** `createAutoEqService(factory).fit({ ...request, sampleRate: 384000 })` rejects with "Unsupported EQ request." instead of returning a legacy fit.
  - In the app, `new AudioContext()` runs at the output device's rate. Any device rate above 192 kHz (an output set to 352.8 or 384 kHz) or below 22.05 kHz hits this.
  - How common these rates are among users is not measured.
- **Effect:**
  - MusicPanel's `applyFit` catch (`components/music-panel.tsx:546-549`) shows "Check the selected measurement", which is misleading.
  - `fitReady` never becomes true, so every play path returns early (`:498-505`, and `onPlay` at `:945`).
  - Tuning fails the same way (`app/preference-tuning/page.tsx:448-451`, `:488`).
  - HEAD played at any rate. The docs promise fallback for unsupported rates, but here nothing runs.
- **Minimal fix:**
  - Keep only structural checks in `validateRequest`, using the Web Audio range (3000–768000 Hz).
  - Leave the 44.1–192 kHz limit in `peqdb-engine.ts:38`, so the worker falls back. `legacyBatch` already clamps `hz` to 0.49 × rate.
  - Optionally, fit PEQdB at `min(rate, 192000)` and describe the result at the real rate.
- **Conditional, same pattern:** `validatePoints` is also terminal (requires sorted, unique frequencies, at most 20,000 points, |dB| ≤ 200). If the measurement and target parsers don't already guarantee this, sanitize the curves instead of rejecting them.

## P2

### 2. A stale `applyFit` closure in `processFileData` pauses playback and refits the previous pair
- **Where:** `components/music-panel.tsx:746`. It is reached from the closures created at `:842` (`chooseRandomSample`) and `:918` (`chooseFile`).
- **Trigger:**
  1. In Open mode, start a Listening Pool track. Its full download and decode finish seconds later.
  2. Press Play, then use "Shuffle & apply" to switch pairs, and press Play again once the new fit is ready.
  3. When the background analysis resolves, that old render's `applyFit` computes the old pair's key, which no longer matches `fitKey`.
  4. It aborts the current fit, pauses audio, mutes the preamp, and starts fitting the old pair.
  5. The effect at `:553` (re-run by the `loudnessStatus` change) then restores the current pair.
- **Result:** an unexpected stop, and the listener has to press Play again.
- **Minimal fix:** delete the call at `:746`. The effect already re-runs after `measuredLufsRef` is updated and `setLoudnessStatus` is called.

### 3. Tuning shows "EQ request cancelled." after a target or measurement change
- **Where:** `app/preference-tuning/page.tsx:448-451`.
- **Trigger:** with a measurement selected, change the target while a preview fit is still pending.
  - This window is easy to hit: an abort with no other pending request terminates the worker (`autoeq-client.ts:56`), so the next fit is a cold load.
- **Why it's wrong:**
  - Line 437 aborts the old controller and then replaces `current.fitAbort`.
  - The old call's catch checks the new, unaborted controller and shows the AbortError message.
  - Nothing clears that message when the new fit succeeds.
- **Minimal fix:** in that catch, add `if (graph.current !== current || current.fitKey !== key || error?.name === "AbortError") return false;`. MusicPanel already has an equivalent key guard at `:547`.

### 4. Vote EQ metadata can describe the previous pair
- **Where:** `components/music-panel.tsx:469`, consumed at `app/shootout/page.tsx:442` and sent to `/api/listening-runs`.
- **Why it's wrong:** `engine.current.fits` survives key changes, so `fitMetadata()` returns the last installed fits even when `fitReady` is false.
- **Trigger:** in free-listening mode, where voting is allowed immediately, change the pair and vote before the new fit installs (or after it fails).
- **Result:** the research record stores another pair's engine, RMS and preamp. HEAD computed this from the current pair.
- **Minimal fix:** return fits only when `fitReady` is true and `fitKey` matches the current key; otherwise return `[]`.

### 5. A timeout doesn't disable the engine, so every new setup waits the full 20 s again
- **Where:** `lib/autoeq-client.ts:24-31`, `:57`.
- **Trigger:** the module or WASM fetch stalls. You can reproduce this by never releasing the route `delay` in `check_peqdb_browser.mjs`.
- **What happens:**
  - `failWorker` terminates the worker and caches the legacy result for that one key only.
  - Each new pair, target or measurement spawns a fresh worker, which refetches the module and waits another 20 s muted.
  - A load that is merely slow (over 20 s) never completes, because each timeout kills it.
  - This contradicts the docs' "reload to retry". Separately, the worker's `unavailable` flag resets after the 30 s idle teardown, which the docs don't mention.
- **Minimal fix:** after a timeout or worker error, set a service-level flag that routes later requests to `legacyBatch` until reload. Alternatively, use a separate load timeout that is remembered once it fires.

### 6. Export "Fit error" uses two different definitions in the same grid
- **The two definitions:**
  - PEQdB cards (and their fallback) use `describeFit` RMS (`lib/autoeq-fit.ts:31`): unweighted, 384 points, 20 Hz–20 kHz.
  - Standard and Precise cards use `finalizeVariant`'s weighted 241-point RMS (`lib/preference-finalize.ts:142`).
- **Demonstrated by the fallback path:** the "Original fallback" card has filters identical to Precise/Close (`legacyBatch` at `:41`) but shows a different Fit error.
- Both definitions are stored in the same research `rms` column.
- **Minimal fix:** in `finalizePeqdb`, overwrite `rms` using `finalizeVariant`'s weighted metric, exported as a shared helper. The original methods stay unchanged.

### 7. The legacy provenance label is ambiguous
- **Where:** `lib/autoeq-fit.ts:34`; `lib/preference-finalize.ts:147`, `:152`, `:160`.
- **Why it's wrong:**
  - The label `yinyang-update124` covers two different algorithms: the greedy shootout fitter and Precise/Close.
  - Its RMS and preamp now come from `describeFit`, not from the update124 definitions.
  - Library EQ previously used Precise/Smooth, so its "Original fitter fallback" isn't actually the original Library algorithm.
- **Minimal fix:** encode both the algorithm and the metric version in the label, e.g. `legacy-shootout@update124;metrics=describeFit-v1`. Use the same string in TXT headers.

### 8. The source package can publish untracked files from the dirty checkout
- **Where:** `scripts/prepare-peqdb-autoeq.py:32-36`, mirrored in `scripts/peqdb-assets.mjs:14`.
- **Why it's wrong:**
  - `git ls-files --cached --others --exclude-standard` includes any untracked, non-ignored file under app/, lib/, scripts/, data/ or vendor/.
  - Examples: a scratch note, or a downloaded fixture saved under `data/`.
  - All of it lands in the publicly served `source.tar.gz`.
  - The inventory and hash checks prove consistency, not that the contents are suitable to publish.
  - `build-receipt.json` also publishes absolute local paths (`:71-77`, `:83-85`).
- **Minimal fix:**
  - Package from a committed tree (`git archive <commit>`) and record that commit in the receipt.
  - For dirty previews, fail on any untracked path outside an explicit allowlist.
  - Make the paths in `buildCommand` relative.

## Lower priority / behavior to confirm

- **Open-mode copy is now false.** `applyFit` pauses on every key change, even instant cache hits (`music-panel.tsx:511-513`). The tooltip at `shootout/page.tsx:606` still says Shuffle & apply works "while playback continues".
- **Play does nothing when there is no pair.** After "Finish & see results" or session expiry, Play silently no-ops: `preparePlaybackFit` returns false at `:500`, and `onPlay` pauses at `:945`. HEAD played unprocessed audio here.
- **One bad request poisons the worker.**
  - `autoeq.worker.ts:21-24` sets `unavailable = true` on any per-request error, including the engine's 44.1 kHz floor.
  - Separately, `describeFit`'s `hz >= 20` check sits exactly on the optimizer's lower bound (`peqdb-engine.ts:50`). A float32 result just under 20 Hz would be rejected.
  - Clamp results to the bounds, and set `unavailable` only on load failure.
- **`safeGain` steps instantly on every decrease** (`eq-playback.ts:29`). Enabling Library EQ or lowering loudness mid-playback causes an audible click. A 5–10 ms ramp would fix it.
- **Library player rebuilds IIR stages on loudness-only changes** (`library-wave-player.tsx:65`). Skip the rebuild when the filters are unchanged.
- **Stale Tuning copy.** "12 EQs" and "4 options" (`page.tsx:633`, `:639-640`) should now be 15 and 5.
- **Library panel keeps a stale message.** After an abort it still shows "Preparing headphone EQ…" (`library-eq-panel.tsx:84`, `:91`).
- **A side click can be lost.** `listenToSide` returns before `selectSide` (`:463`), so a click on B is dropped while the fit is pending.
- **Prepare script modification notices.** The script prepends the modification notice to every source file without checking that the exp10 and INFO replacements actually matched (`:66-70`). Assert the replacement counts.
- **Footer licensing links point to GitHub `main`.** `LICENSE_SCOPE.md` and `THIRD_PARTY.md` there won't include the LGPL text until publication. Publish before any deployment, or link to served copies.
- **Packaging doesn't tie the source snapshot to `dist/`.** A sequence of build, edit, re-prepare, package still passes.

## Verification gaps (no demonstrated defect)

1. **The WASM's model isn't tested against the app's model.** The coefficient test compares app math to app math (`blind-eq`), never to the WASM. Nothing confirms:
   - that type codes 1/2/0 mean LSC/HSC/PK,
   - that the engine uses RBJ shelf Q,
   - or that it honors the sample rate.

   **Suggested test**, at 44.1, 48 and 96 kHz:
   - Use the app's `response()` of a known LSC (100 Hz, +6 dB, Q 0.7), HSC (6 kHz, −5 dB, Q 1.5) and PK (1 kHz, +6 dB, Q 2) as `desired`.
   - Fit with 3 bands.
   - Assert the recovered parameters, and that `describeFit` RMS is about 0.
2. **`amp = 0` semantics are unverified** (`peqdb-engine.ts:56`).
   - Risk: upstream may still optimize the overall gain and only skip writing it. The filters would then assume an offset that is never applied.
   - Test: set `desired` to a constant +2 dB.
   - Expected: the shelves reproduce it with RMS near 0.
3. **Production serving is untested.** The built-worker check uses a bare static server. Verify through the real sites worker:
   - `/vendor/peqdb-autoeq/*` is served with the correct MIME types;
   - any CSP allows `wasm-unsafe-eval` and module workers.

   Otherwise every fit silently falls back to legacy, visible only in `eqFits.engine`.
4. **An undisclosed policy change needs an explicit decision.**
   - PEQdB allows ±16 dB at every frequency (`peqdb-engine.ts:51`). The legacy fitter allowed ±12 dB, and 8 dB above 8 kHz.
   - Shelf Q can now go up to 3.
   - Exported shelves rely on EasyEffects and Qudelix interpreting shelf Q the RBJ way; earlier exports were all PK.
5. **The AudioContext is now created at mount, outside a user gesture** (`music-panel.tsx:553`, Tuning `:453`). Combined with the pre-existing resume-then-play ordering below, this is a risk for the still-unverified Safari/iOS testing.

## Pre-existing (not caused by this integration)

- `playPassageSide` awaits `resume()` before `play()` (`music-panel.tsx:329-331`). The file's own comment warns this ordering can lose playback permission.
- In Tuning, an OS media-key play before the first Play bypasses the audio graph entirely (no EQ, no attenuation).
- Positive loudness gain is uncapped in MusicPanel's preamp (`:543-544`).

## Checked, no finding

- **Normalization:** playback uses the 250–2500 Hz mean on the legacy grid; exports use the 1 kHz reference.
- **Pair-wide engine uniformity** holds in both the worker and the client's `validResults`.
- **Client abort and cache:** cancelled requests aren't cached, and stale IDs are ignored.
- **Playback filters:** IIR shelves are computed at the context rate, and the fallback clamps to Nyquist.
- **Headroom** is checked across rates, with common A/B attenuation.
- **Export route** validation accepts the PEQdB variants correctly.
- **Type and Q** round-trip correctly through TXT exports and Library storage.
