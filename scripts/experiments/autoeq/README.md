# Local PEQdB AutoEQ experiment

The subsequent app integration is documented in [PEQDB_AUTOEQ.md](../../../docs/PEQDB_AUTOEQ.md). This original lab retains its free-gain benchmark configuration; the app uses its explicit existing level reference.

Local prototype prepared October 27, 2026. No deployment, publication, participant-data access, migration or change to the production fitter. The experiment has a separate Vite entry point; ordinary application pages do not import it.

Baseline: current scrubbed `origin/main`, `a0dad354fc62a5ac2f702b8a6fc8ee71348cc73a`, containing update124 implementation `8c36be0aa4352f668f6cfbb351bc187713042191`. The owner’s dirty canonical checkout is preserved. Its immutable live snapshot passed all 2,771 file checks before work began.

## Run locally

Use the project’s pinned Node 26.12.0 / npm 12.2.1 toolchain and existing locked dependencies. Install Emscripten **4.0.14** in a directory outside Git. Keep downloaded engine source and curves outside Git as well.

```sh
python3 scripts/experiments/autoeq/prepare.py \
  --inputs /tmp/peqdb-wasm-inputs/data \
  --emsdk /tmp/peqdb-wasm-inputs/emsdk \
  --gpl /path/to/complete/GPLv3-license.txt
node node_modules/vite/bin/vite.js --config scripts/experiments/autoeq/vite.config.ts
```

Open http://127.0.0.1:5199/. This loopback-only lab needs no account and does not use the application's gate or database. Downloaded fixtures and compiled artifacts are ignored under `artifacts/autoeq-lab/`; do not copy them into the production asset directory. No dependency or production bundle change was needed.

The page calculates four presets on demand: current shootout, current precise/close export, unsmoothed PEQdB and adaptive PEQdB. Each uses ten bands. It offers response plots, JSON results, APO-style preset exports and randomized A/B playback of one local music passage. Playback uses our existing IIR coefficient and offline RMS/headroom code, including shelf Q. Music stays in memory. Playback stops when the tab is hidden or the comparison is replaced.

The engine initializes in a dedicated worker only after Calculate. Each request has a 20-second timeout. The worker is terminated after 30 seconds idle and recreated on the next request, releasing its WASM heap. No fitting occurs during continuous playback. The expensive four-way scoring and cross-rate headroom work belongs to this comparison lab, not to a single production fit.

## Pinned inputs and modifications

- PEQdB `autoeq-c`: `fdc0db772164387c2df8739742594197c6851fc3`. Every downloaded source file is verified against its Git blob SHA.
- Six public oratory1990 measurements from our existing AutoEq catalog: HD 600, HD 650, AKG K371, Blessing 2, Salnotes Zero and Chu. GRAS over-ear measurements use Harman over-ear 2018; GRAS in-ear measurements use Harman in-ear 2019. Exact measurement and target blob SHAs are recorded by `prepare.py` and in the ignored build receipt. These six examples are not a representative validation of every headphone or rig.
- The source helper `exp10` is renamed to avoid a libc symbol collision. Optimizer debug printing is disabled. The fitting algorithm is otherwise unchanged.
- Separate ES module and SIMD WASM, with Emscripten `-O3 -ffast-math`, 1 MiB stack and growing linear memory. Generated JS: 8,352 bytes; WASM: 26,548 bytes. License/source downloads are additional optional downloads, not startup assets.

## Measurement results

At 48 kHz, response-shape RMS error against the original unsmoothed correction:

| Headphone | Current shootout, 20 Hz–8 kHz | PEQdB unsmoothed, 20 Hz–8 kHz |
| --- | ---: | ---: |
| Sennheiser HD 600 | 0.455 dB | 0.239 dB |
| Sennheiser HD 650 | 0.403 dB | 0.195 dB |
| AKG K371 | 0.360 dB | 0.166 dB |
| Moondrop Blessing 2 | 0.419 dB | 0.187 dB |
| 7Hz Salnotes Zero | 0.330 dB | 0.066 dB |
| Moondrop Chu | 0.365 dB | 0.079 dB |

Evaluation uses an independent 2,049-point logarithmic 20 Hz–20 kHz grid, with separate 8 kHz and 16 kHz ceilings. A constant residual offset is removed for every solver, so level/normalization conventions do not decide the result. No private target seeds are used. PEQdB runs 3,000 iterations with its default shelf/peak constraints; our fitters retain their existing constraints and smoothing. This tests the engines as configured, not identical mathematical search spaces. At 44.1 and 96 kHz, our existing filters retain their actual 48 kHz fitting assumption and are evaluated at playback rate; PEQdB fits at the requested rate.

PEQdB unsmoothed improved both reported errors for all six examples at all three rates. At 48 kHz its response differed from our shootout by about 0.32–0.44 dB RMS through 8 kHz after removing constant level. This is a numerical result, not a listening threshold or proof of audible preference. No physical listening trial was performed. Adaptive smoothing changes the objective and often raises error against raw treble measurements; do not select its defaults solely from these RMS scores. Existing precise export is also reported separately.

Desktop Chromium warm WASM fits were approximately 40–46 ms, with an initial fit around 70 ms; our current shootout was about 5–7 ms warm. WASM linear memory was 17.06 MiB, unchanged after 50 repeated fits; this excludes JavaScript, browser and audio-buffer overhead. A six-headphone comparison batch took about 3.4–3.9 seconds including four presets, evaluation and headroom checks. Ordinary desktop batches produced no main-thread long tasks over 50 ms. These are local development timings, not hosted/mobile guarantees.

A six-times CPU-throttled **page** test recorded one 83 ms main-thread task and a maximum timer gap of 154 ms. DevTools page throttling did not comparably slow the dedicated WASM worker; its timings must not be presented as six-times-slower-device performance. Physical mobile, Firefox and Safari/iOS remain unverified.

## Verification

```sh
node scripts/experiments/autoeq/check-engine.mjs
AUTOEQ_PLAYWRIGHT=/absolute/path/to/playwright/index.mjs node scripts/experiments/autoeq/check-browser.mjs
node node_modules/typescript/bin/tsc --project site/tsconfig.json --noEmit --incremental false
node node_modules/eslint/bin/eslint.js --config scripts/eslint.config.mjs scripts/experiments/autoeq --max-warnings 0
node node_modules/vite/bin/vite.js build --config scripts/experiments/autoeq/vite.config.ts
node scripts/checks/application/check_blind_eq.mjs
node scripts/checks/application/check_blind_eq_workflow.mjs
```

The engine checks execute real WASM: invalid-input/configuration rejection, flat curves in all three smoothing modes, deterministic output and stable memory over 50 fits. Browser checks execute all four fitters on six real curves at three rates, lazy loading, finite output/headroom, responsive main thread, actual offline audio rendering/A/B switching, desktop/360px layout, dark native select surfaces and keyboard focus. Native popup pixel rendering is not certified by the headless screenshot. Idle disposal and successful reload are checked. Existing 85 DSP/session tests and 37 actual workflow checks pass. Evidence and raw numerical results remain ignored in `artifacts/autoeq-lab/review/`.

## Licensing and future adoption

The engine is LGPL-3.0-or-later, copyright 2026 PEQdB Inc. Our application remains under its existing license. The local page provides LGPLv3, GPLv3 and a source archive containing the exact engine source, modifications, build recipe and application code needed to rebuild this lab. Generated license/source archives stay outside Git. `createEngine()` takes a module URL, and the engine files are separate and replaceable; the source package supports rebuilding with a compatible replacement.

Before any public release, review the complete delivered package for LGPLv3 section 4, source availability, notices and practical recombination/replacement; separation by itself does not establish compliance. A link to unmodified upstream is insufficient for our modified build. Relevant primary sources: https://www.gnu.org/licenses/lgpl-3.0.html and https://www.gnu.org/licenses/gpl-faq.en.html#LGPLStaticVsDynamic.

Adopt the unsmoothed solver first only after owner review and broader measurement/browser checks. Keep correction limits, normalization, sample-rate handling, headroom, fallback/cancellation and engine-version provenance explicit. Changing official listening filters can affect research comparability even when scoring formulas remain unchanged. Adaptive smoothing is a separate policy decision. A production integration, commit, push and deployment are separate later steps.

## November 25, 2026 web fitter benchmark

The ranked snapshot compares 14 browser-based tools on seven identical measurement–target pairs at 48 kHz. The four requested budgets are 10, 15, 20 and 30 filters. Each ranked median uses all seven pairs for that budget, and each tool uses the supported budgets below. Several websites share CrinGraph/Squiglink code. They are distinct hosted tools with some identical defaults and outputs. Equal scores share a rank. The per-case CSV records active filters so an unused slot never appears as a fitted band. The original two-budget scores are retained as a historical record. [Ranked snapshot CSV](../../../public/eq-fitting/eq-fitter-web-scores.csv) · [Original CSV](../../../public/eq-fitting/eq-fitter-scores.csv)

On November 27 we ran the shipped Joint Fit 20 implementation (`yinyang-joint-fit-v1`, added in update226) on all seven pairs using the same evaluation grid and level offset. The seven additional rows have their own date in the CSV. The original captured scores reproduce byte for byte when the Joint Fit flag is omitted.

The six oratory1990 measurements and Harman targets use the Git blobs in `prepare.py` and the catalog. For the Samsung EO-IA500 with stock tips, the measurement and Harman IE 2019 are the Studio exports. Their SHA-256 hashes are `415599898d3bab4449ed6f1520a6db823e3b3ecc1ce3ab5d825933112741d58a` and `a9d9663666159620c4ae4a921f31471b1a0d687d93c025b0e9ea6e3bb2ea9044`. The similarly named AutoEq Harman 2019 target is a distinct input file.

| Tool or mode | Budgets tested | Build and settings |
| --- | --- | --- |
| YinYang EQ | 10, 15, 20, 30 | Export runner at `8dd52f8`, verified identical to the deployed update218 fitter files. Fixed Bands, Movable Bands, PEQdB Unsmoothed and Smoothed. PEQdB runs 3,000 steps with a fixed 1 kHz export reference. |
| [PEQdB Studio](https://peqdb.com/studio/) | 10, 15, 20 | Captured `index-CmzEZqn4.js` Standard and Precise solver at 100 steps with free overall gain. The menu in that build offers 5, 10, 15 and 20. The snapshot scores solver output on all seven fixtures. |
| [Super* Review Squiglink](https://squig.link/) | 10, 15, 20 | Automatic preset with 20–6,000 Hz filter centers, plus its 20–20,000 Hz configuration. Bell filters, ±40 dB gain, Q 0.1–10 and 60-phon graph normalization. |
| [Hangout Audio](https://eq.hangout.audio/) | 10, 15, 20 | Advanced Auto EQ defaults. 20–15,000 Hz centers, ±12 dB gain, Q 0.5–2 and 0-phon graph normalization. |
| [AutoEq.app](https://autoeq.app/) | 10, 15, 20, 30 | Custom Parametric EQ sent to the live /equalize endpoint. Fixed shelves at 105 Hz and 10 kHz with Q 0.7, additional bells to reach each budget, 10 kHz optimization ceiling and 0.5 s optimizer limit. Imported targets used zero added bass and treble boost and zero tilt. The timed endpoint may return different fits on repeat calls. |
| [modernGraphTool](https://potatosalad775.github.io/modernGraphTool/docs/features/autoeq-benchmarks/) | 10, 15, 20, 30 | v2.3.6, source `c47101a861d4969c30306732f5faa41e38a47f76`, turboEQ 0.3.1 verified against its lockfile. Exact match and Treble-safe, two movable shelves included in each budget, 20–15,000 Hz requested centers, gain ±12 dB, bell Q 0.5–2, 1/48-octave preprocessing and 500 Hz normalization. Treble-safe applies its internal 10 kHz center ceiling. |
| [Tryptify](https://tryptify.com/autoeq) | 10, 20 | November 25 browser engine, Peaking and Shelf ends, smoothing Off and 16 kHz fitting limit. The live page offers 5, 8, 10, 16, 20 and 31 bands. The captured engine accepts the shared custom targets and its native matched-Z coefficients are evaluated at 48 kHz. |
| [CurveLab](https://curvelab.fit/generator/) | 10 | November 25 generator, its maximum 10 bands, default ±6 dB per band and 1/12-octave measurement smoothing. Both curves use the app’s 1 kHz alignment. |
| [Audio Discourse](https://iems.audiodiscourse.com/), [Bedrock Reviews](https://bedrock.squig.link/), [HiFiEndgame](https://graphs.hifiendgame.com/), [Boizoff](https://boizoff.squig.link/headphones/) | 10, 15, 20 each | November 25 graph tools. Same 20–15,000 Hz center range, ±12 dB gain, Q 0.5–2 and 60-phon normalization. |
| [Unheard Lab](https://sai.squig.link/) | 10, 15, 20 | November 25 graph tool, 20–15,000 Hz centers, ±12 dB gain, Q 0.5–3 and 85-phon normalization. |
| [CSI-Zone](https://csi-zone.squig.link/) | 10, 15, 20 | November 25 graph tool, automatic preset and the same settings as Super* Review’s 6 kHz configuration. |

RootlessJamesDSP and Quve are Android DSP applications. Poweramp Equalizer’s AutoEq feature installs or imports presets. Loundess PEQ, a RootlessJamesDSP fork, adds the Squig AutoEQ optimizer. We replayed that fork’s Kotlin fitter at `a89c5a6f37536613febe9e04873617235e205109` with the shared curves, 500 Hz normalization, its default 30 Hz–6 kHz matching range and all four filter caps. It returned the same fits at every cap, with a median of three active filters. Its 28 Android reference results are in the CSV. The replay covered the JVM fitter and its response calculator. [RootlessJamesDSP](https://github.com/timschneeb/RootlessJamesDSP) · [Loundess PEQ fork](https://github.com/evoeram/Loundess-PEQ-RootlessJamesDSP/tree/a89c5a6f37536613febe9e04873617235e205109) · [Quve](https://github.com/nanbeimerco/Quve) · [Poweramp Equalizer](https://forum.powerampapp.com/files/file/84-powerampequalizer-build-963-uniapk/?changelog=27)

The captured graph engines ran locally on each site’s 1/48-octave input grid with site normalization. The benchmark uses the original 384-point logarithmic evaluation grid from 20 Hz to 20 kHz. At each sample the error is post-EQ measurement minus target. A single mean residual is removed over the full grid before computing all RMS ranges. Peak boost is the largest positive combined response on that grid before preamp attenuation. P95 error is the nearest-rank 95th percentile of the absolute residual. Worst error is its maximum. The no-EQ reference reproduces all five original RMS ranges for all seven measurements to CSV precision.

| Captured asset | SHA-256 |
| --- | --- |
| YinYang `autoeq-wasm.wasm` | `5e241beb0f382b80ca868f8e932bdff8033ea326878d34812add6f53eab461a8` |
| Studio `index-CmzEZqn4.js` | `93dcaf1d0e79e0c948c51d4bc4aaa62eefd2e929755b7b6299d4fbaea3c199c3` |
| Super* Review and CSI-Zone `equalizer.js` | `a8e630acee49b02355bfc794d7cb306ce47d7bdd6f9bf0c70042f9aef1fac124` |
| Hangout Audio, Audio Discourse, Bedrock Reviews and HiFiEndgame `equalizer.js` | `c261f39fb31c34af5f270bf3080c7529194b709ed5ef3763a01b2261d36cd4ce` |
| Boizoff `equalizer.js` | `a896360bbaae292303c4d1b6581e73df9b396c5e11ebd92935a8bcc5b4131aae` |
| Unheard Lab `equalizer.js` | `798025ba9d377ed95642e2f28233cc37017b156e60310c891d1428f349c1767d` |
| AutoEq.app `main.3996d468.js` | `449a15ea71fd30c0e78bca463db3ddc9bde185712704f2169256cdda08c09a3f` |
| modernGraphTool’s turboEQ package 0.3.1 | `5bb99341def0f011868efea293e24e89b0040a530d267cb60c54dc313abf6317` |
| Tryptify `autoeq-engine.js` | `b4a71270b9a16df7dc797b39c444bfb5ad661e88c445c6705b2df49ef16902d6` |
| CurveLab `219-8a82911d4218dd8f.js` | `857c3e9dfa7f6b29f9059298f481df93f7c8156bdd71705f446d777ca6c39d17` |

To rescore the snapshot, keep curves and preset captures outside Git. The input directory contains `fixtures.json` for the six oratory1990 fixture objects and `studio-fixture.json` for the one Studio fixture. Each uses `name`, `points` and `target`. Capture filenames, including `loundess-peq-fits.json`, are listed in `score-web-fitters.ts`. Each capture row contains `name`, `bands` and `filters`, with each filter specifying `type` (`PK`, `LSQ`, `HSQ`), `hz`, `gain` and `q`. For the Tryptify rows, `nativeCoefficients` contains `[b0, b1, b2, a1, a2]` for each filter.

```sh
node_modules/.bin/esbuild scripts/experiments/autoeq/score-web-fitters.ts \
  --bundle --platform=node --format=esm --outfile=/tmp/score-web-fitters.mjs
node /tmp/score-web-fitters.mjs /path/to/captures /tmp/eq-fitter-web-scores.csv /tmp/eq-fitter-rankings.json --joint-fit-date 2026-11-27
cmp /tmp/eq-fitter-web-scores.csv public/eq-fitting/eq-fitter-web-scores.csv
cmp /tmp/eq-fitter-rankings.json site/data/eq-fitter-rankings.json
```
