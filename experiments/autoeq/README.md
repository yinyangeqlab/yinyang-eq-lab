# Local PEQdB AutoEQ experiment

The subsequent app integration is documented in [PEQDB_AUTOEQ.md](../../docs/PEQDB_AUTOEQ.md). This original lab retains its free-gain benchmark configuration; the app uses its explicit existing level reference.

Local prototype prepared October 27, 2026. No deployment, publication, participant-data access, migration or change to the production fitter. The experiment has a separate Vite entry point; ordinary application pages do not import it.

Baseline: current scrubbed `origin/main`, `a0dad354fc62a5ac2f702b8a6fc8ee71348cc73a`, containing update124 implementation `8c36be0aa4352f668f6cfbb351bc187713042191`. The owner’s dirty canonical checkout is preserved. Its immutable live snapshot passed all 2,771 file checks before work began.

## Run locally

Use the project’s pinned Node 26.12.0 / npm 12.2.1 toolchain and existing locked dependencies. Install Emscripten **4.0.14** in a directory outside Git. Keep downloaded engine source and curves outside Git as well.

```sh
python3 experiments/autoeq/prepare.py \
  --inputs /tmp/peqdb-wasm-inputs/data \
  --emsdk /tmp/peqdb-wasm-inputs/emsdk \
  --gpl /path/to/complete/GPLv3-license.txt
node node_modules/vite/bin/vite.js --config experiments/autoeq/vite.config.ts
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
node experiments/autoeq/check-engine.mjs
AUTOEQ_PLAYWRIGHT=/absolute/path/to/playwright/index.mjs node experiments/autoeq/check-browser.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/eslint/bin/eslint.js experiments/autoeq --max-warnings 0
node node_modules/vite/bin/vite.js build --config experiments/autoeq/vite.config.ts
node scripts/check_blind_eq.mjs
node scripts/check_blind_eq_workflow.mjs
```

The engine checks execute real WASM: invalid-input/configuration rejection, flat curves in all three smoothing modes, deterministic output and stable memory over 50 fits. Browser checks execute all four fitters on six real curves at three rates, lazy loading, finite output/headroom, responsive main thread, actual offline audio rendering/A/B switching, desktop/360px layout, dark native select surfaces and keyboard focus. Native popup pixel rendering is not certified by the headless screenshot. Idle disposal and successful reload are checked. Existing 85 DSP/session tests and 37 actual workflow checks pass. Evidence and raw numerical results remain ignored in `artifacts/autoeq-lab/review/`.

## Licensing and future adoption

The engine is LGPL-3.0-or-later, copyright 2026 PEQdB Inc. Our application remains under its existing license. The local page provides LGPLv3, GPLv3 and a source archive containing the exact engine source, modifications, build recipe and application code needed to rebuild this lab. Generated license/source archives stay outside Git. `createEngine()` takes a module URL, and the engine files are separate and replaceable; the source package supports rebuilding with a compatible replacement.

Before any public release, review the complete delivered package for LGPLv3 section 4, source availability, notices and practical recombination/replacement; separation by itself does not establish compliance. A link to unmodified upstream is insufficient for our modified build. Relevant primary sources: https://www.gnu.org/licenses/lgpl-3.0.html and https://www.gnu.org/licenses/gpl-faq.en.html#LGPLStaticVsDynamic.

Adopt the unsmoothed solver first only after owner review and broader measurement/browser checks. Keep correction limits, normalization, sample-rate handling, headroom, fallback/cancellation and engine-version provenance explicit. Changing official listening filters can affect research comparability even when scoring formulas remain unchanged. Adaptive smoothing is a separate policy decision. A production integration, commit, push and deployment are separate later steps.
