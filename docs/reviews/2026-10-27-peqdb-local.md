# Local PEQdB integration review

Reviewed October 27, 2026. Repository `yinyangeqlab/yinyang-eq-lab`; isolated branch `work/peqdb-wasm-local-20261027`; base/HEAD `a0dad354fc62a5ac2f702b8a6fc8ee71348cc73a`, with uncommitted local changes. Live remains update124. Canonical drafts, lab identity guards and original historical provenance are preserved. No commit, push, deployment, production migration, live account action or participant-data operation occurred.

Codex owns implementation and verification. The owner explicitly approved sending the prepared code-only packet to Anthropic for read-only Claude review. That review completed with tools and workspace access disabled; see `2026-10-27-peqdb-claude.md` for the exact packet hash, scope and original findings. No credentials, numerical datasets, recordings, participant records or private recovery configuration were sent. Codex validated the findings and made the local fixes below. No deployment is authorized.

## Changes reviewed

- `lib/autoeq-client.ts`, `autoeq.worker.ts`, `autoeq-fit.ts` and `peqdb-engine.ts`: dedicated worker, unsmoothed fixed-reference fitting, bounded cache, cancellation, idle disposal, numeric validation and consistent pair-wide fallback.
- MusicPanel and Tuning: precompute before playback, retain immediate user-gesture playback once ready, reject stale preparation, mute changed setups, preserve existing level references, and record actual engine/version/rate. Completing a pending fit never restarts stopped audio.
- `eq-playback.ts`, LibraryWavePlayer and preset storage: explicit IIR coefficients preserve shelf Q; stage changes crossfade and retire old connections. Shelf types and engine provenance survive saved presets and TXT round trips.
- Tuning generation and export route: explicit PEQdB unsmoothed variants alongside the existing Standard/Precise choices; fallback labels remain honest; new method and shelf rows pass server validation; cancelled finalization cannot become a current export.
- Software-license page, footer, notices, build preparation and packaging: copyright and GNU license texts, runtime notices, dated modifications, matching engine/application source, replacement instructions and package/source hash checks.

## Findings resolved during verification

1. Awaiting initial fitting inside Play moved media play out of the direct user gesture. The app now prepares on setup changes, keeps graph output muted until ready, and requires a fresh Play action when preparation was still pending. The ready path retains synchronous resume/play calls. Existing playback request tests pass.
2. The framework's dev dynamic-import transform pulled browser-only hot-reload code into the worker. The generated engine now has an explicit external module import and external resolution in both app and worker builds. The real full-app browser and production-built worker both execute PEQdB successfully.
3. The previous export endpoint rejected the new method and implicitly assumed peak-only filters. It now accepts the explicit method, rejects an inconsistent smooth tag for it, and validates peak/shelf rows. Actual-handler tests cover acceptance and malformed rejection without real database writes.
4. Fitting/loudness updates now read the current track reference, preventing a completed fit from applying a prior track's normalization context.
5. The source archive and manifest are generated from the same captured application bytes. Packaging rejects changed hashes or a changed source inventory, and all archived application entries were independently compared with the manifest.

## Verification

- All 13 focused suites passed: actual PEQdB/core/export checks; music playback requests; private blind EQ DSP/session and actual workflows; target upload; listening audio; own-music source; blind completion; music preferences; listening reminder; shortcuts; consent choices; browser pairing.
- App TypeScript and zero-warning lint for the changed source passed. The complete application production build passed.
- The actual integrated player passed normal PEQdB, blocked WASM and blocked Worker browser cases. Both sides used one engine; delayed completion did not restart after Stop; real IIR audio played; fixture review sent no contribution mutations.
- The full Tuning app executed PEQdB at desktop and 360px. Listening Pool generated and stored a real 15-band PEQdB preset with shelf types intact. Native selects were expanded/dismissed with keyboard at desktop and narrow widths, with explicit option surfaces. Native popup pixel rendering, physical headphones/mobile hardware and real Safari/iOS remain unverified.
- A production-built worker loaded the packaged WASM and fitted both targets using PEQdB, rather than merely succeeding through fallback.
- Binary/license/runtime/source hashes and source inventory passed. Deliberately adding a source file or altering a package notice was rejected, and the temporary probes were removed/restored. All 661 archived application source entries matched their recorded hashes; engine modifications carried dated notices.
- Public-only local asset packaging and all 260 client dependency checks passed. The package remains explicitly marked nondeployable; protected recordings were not verified or copied for release.

Evidence is ignored under `artifacts/peqdb-autoeq/review/`; generated engine/source artifacts are under `artifacts/peqdb-autoeq/`. Raw third-party inputs and Emscripten remain outside Git. LGPL implementation and rebuild/recombination instructions: `docs/PEQDB_AUTOEQ.md`. No legal certification is claimed.

## Claude findings and Codex triage

All eight numbered findings were accepted and fixed locally, with these scopes:

| Finding | Verified correction |
| --- | --- |
| 1: device sample rates rejected before fallback | Structural validation accepts Web Audio's 3–768 kHz range; PEQdB retains its 44.1–192 kHz limit and other rates use legacy fitting. A per-request rate failure does not poison later supported fits. |
| 2: delayed file analysis refits an old pair | Removed the stale closure's direct applyFit call; the current render effect applies the updated loudness analysis. |
| 3: obsolete preview abort shown as an error | Tuning ignores catches from superseded graph/key/controller requests. |
| 4: old fit metadata recorded for a new pair | Metadata requires ready fits and the current curve/rate key; otherwise it is empty. |
| 5: repeated failure waits | Service remembers worker/load failures and timeouts until reload; later setups fall back immediately, even after idle teardown. |
| 6: incompatible RMS definitions in export cards | The actual async export wrapper uses the original weighted 241-point metric. Identical fallback and Precise cards now show identical error. |
| 7: ambiguous fallback provenance | Algorithm and metric version are explicit. Library fallback retains Precise/Smooth; Tuning's extra fallback retains Precise/Close. Existing records remain untouched. |
| 8: unreviewed files entering the source archive | Tracked source plus an explicit new-file allowlist; preparation and packaging refuse other untracked source/data. Published recipes have relative paths. Build/source snapshots must also match. |

Additional accepted lower-priority fixes: honest shuffle-pauses copy and 15/5 export counts; pending side choices are retained; cancelled Library generation replaces its preparing message; loudness-only Library updates reuse IIR stages; loudness-only and protected Library gain reductions ramp over 5 ms while new-filter/balance headroom can attenuate immediately; engine patch counts are asserted and only changed C files receive modification notices. Play without a comparison now explains that two targets are required. It retains the intentional safety gate for undefined EQ setups.

Codex also independently reproduced and fixed stale finalization/library generation after same-ID measurement edits, retired worker callbacks interrupting a replacement, and mutable input arrays contaminating fallback/cache keys. Actual-handler and service regression tests cover those cases.

No unproven sub-20-Hz optimizer defect is claimed: 20 Hz is exactly representable and no returned underflow was reproduced. Conditional parser concerns require a concrete accepted-input failure; the selected curves pass structural validation. Engine enum ordering, RBJ shelf-Q equations, real sample-rate input and `amp == NULL` disabling gain optimization were inspected in the pinned C source (`lib.h`, `biquad.c`, `autoeq.c`). A real constant-gain WASM regression checks that gain is carried by filters. Exact recovery of three prescribed filters is not used as a test: upstream initialization can find a different local optimum, and its documented top-octave rolloff changes the objective.

PEQdB's ±16 dB / shelf-Q-3 bounds are explicitly documented as a policy difference. Physical headphone audibility, real Safari/iOS and future production edge serving remain verification limits. Static edge source currently adds frame-ancestor/base/form CSP restrictions rather than script/worker/WASM restrictions. The current preview's direct license/source links work; GitHub main links describe the published baseline until separately authorized publication. No deployment should precede matching public source availability. Pre-existing passage gesture ordering, OS media-key graph bypass and uncapped positive MusicPanel normalization were identified separately and are outside this integration change.

## Final post-review verification

- App TypeScript and changed-source lint, including the build plugin, pass with zero errors/warnings. Python preparation syntax passes.
- Fourteen focused suites pass, including actual WASM/core/export tests, 46 actual main-workflow regressions and 21 playback request checks, plus the prior blind-EQ, upload, listening-audio, source, completion, music preference, reminder, shortcut, consent and pairing suites. The new checks cover 3/16/384/768 kHz fallback, failure memory across setup/idle changes, consistent export RMS and algorithm versions, gain automation, retired callbacks, input snapshots and same-ID edits.
- Complete disposable browser suite passes with normal PEQdB, blocked WASM and blocked Worker; real audio/IIR playback and stop-before-ready; actual Tuning and Library generation; desktop/360px and expanded native selects; source/license downloads. A transient resize assertion was resolved by waiting up to two seconds for layout to settle, retaining overflow diagnostics and a final hard assertion. No product layout change or API contribution was needed.
- Final production build succeeds. The real packaged worker passes on both a bare static fixture and the loopback Cloudflare production preview, including correct module/WASM MIME types. The same worker returns legacy fits at 384 kHz and subsequently real PEQdB fits at 48 kHz. Application APIs are intercepted in the disposable review context. This does not verify the future live edge configuration.
- Source/binary/notice hashes and build/source correspondence pass. Unreviewed code/data probes fail both Python preparation and JavaScript verification; modified assets and mismatched build stamps are rejected. Temporary probes were removed/restored. Independent archive reading verifies all 662 application entries, portable relative build commands, and dated notices on each changed C file.
- Final corresponding source archive SHA-256: `99242d6ea7a498f1d1ceb64a6913cfadd84c82c435203d8decd94c9850fef784`. Public-only packaging succeeds with all 260 client dependency imports checked. `dist/.public-only-package` remains present; protected recordings were neither copied nor verified for release.
- Live/recovery release metadata is unchanged. No commit, push, deployment, production migration, account action or participant-data mutation occurred. Original canonical drafts remain preserved.

The optional Claude review is complete and all demonstrated integration findings are resolved locally. Physical headphone listening and Safari/iOS remain unverified. The temporary production verification server is stopped after review; the main development preview remains available at `http://127.0.0.1:5200/preference-tuning`.


## Safari/WebKit follow-up — October 28 UTC

The owner requested local Safari/iOS compatibility checks and fixes without deployment. See `2026-10-28-peqdb-webkit.md` for the verified gesture, Tuning preloading/native-play, output-volume, interruption/progress and select-overflow corrections. Complete WebKit desktop/iPhone/iPad and Chromium emulation suites pass, as do the final typed build, matching LGPL package and real local production-preview worker checks. Actual Apple hardware remains unverified. The newer corresponding source archive is `9fa8a24bc72703761afda421a636caf3b6d17f30ca45baf1fb52f1714e989f75`; earlier archive hashes above remain historical checkpoints. No commit, publication or deployment occurred.
