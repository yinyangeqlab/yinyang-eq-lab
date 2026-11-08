# Listening controls and Personal Tournament candidate

November 4, 2026. The candidate was based on foundation revision `28291111370bd035dfd0d0f29e73cd123bd8a654` for update131.

## Earlier device testing

Exploratory listening on a Windows PC with Bose headphones found quiet playback, ineffective EQ bypass in Tuning and Library, and missing normalization controls. Testing on an iPhone found sidebar animation failures and unresponsive EQ and Tuning buttons. The exact models and iPhone browser version were unavailable. No physical iPhone retest was completed.

## Changed behavior

- Tuning has visible EQ and channel-match checkboxes above the chart, enabled by default when paired measurements are available. New tone cards distinguish lavender Voice, orange Edge and mint Air. Rotated native horizontal inputs retain keyboard support on older WebKit layouts.
- Changing a target, saved EQ or fitter retains the active music path while replacement filters are prepared. Pause remains available during refitting. Measurement/source changes retain their existing playback safety boundaries. Music defaults to 100% master volume; required signal-dependent headroom is retained. Arbitrary preview attenuation was removed, and full EQ bypass removes the base EQ preamp.
- Shared fitter controls in Personal Tournament, Blind Research, Open Comparison, Tuning and Library offer Standard, Precise and PEQdB, each at 10/15/20/30 bands. The independently versioned Community reference pilot retains its original fixed-ten-band request, engine and fallback semantics, with a visible protocol label; it does not expose selectable fitters. Changing that study needs a separately versioned protocol and evidence partition, rather than silently inheriting browser preferences. A selection is temporary until explicitly marked as the browser default. Standard10 remains the initial default and the named main ranking reference, per owner preference, without a claim that it sounds best.
- Listening evidence includes requested method/count and actual engine/version, count, sample rate, RMS and preamp. Public ranking views separate exact fitter cohorts. Missing historical provenance is displayed separately and never inferred as today's default. Refit transitions clear listening evidence and cannot accrue credit for the previous filters.
- Tuning and post-shootout result panels generate all 12 candidates off-thread in one run, graph the raw response, target and predicted curves, and allow local save/download. Post-run generation does not alter the actual test's fitter or answers. Qudelix export rejects more than 20 bands.
- Automatic channel-match WAVs are directly downloadable and visible from saved paired measurements, even without uploaded match presets. Names use `YinYang-AutoMatch-48k.wav`; generated files are described as generated from saved responses, not falsely described as stored binaries.

## What the old fitter names mean

Smooth and Close are priorities inside the legacy algorithms, not independently validated fitting methods. Both smooth the correction over a 241-point logarithmic 20–20kHz grid. Smooth uses Gaussian sigma 5.5 bins (about 0.228 octave); Close uses 1.2 bins (about 0.050 octave). Precise Smooth also caps its Q search at 2.4 and adds a Q penalty; Precise Close permits Q9. Standard Close searches several fixed-band widths and selects its weighted-loss result. Close is therefore not an unsmoothed globally optimal fit, and Smooth is not evidence of preferred sound.

The new ordinary controls expose the actual methods and use Close for the legacy methods; Smooth is not multiplied into another confusing set of 12 export choices. Existing legacy helpers remain available for historical reproduction. PEQdB uses the existing bounded configuration (Q up to4, gain ±16dB, two shelves plus peaks and 3,000 optimization steps). Actual fallback provenance remains visible and separated.

A local benchmark evaluated 6 public headphone fixtures, four band counts, both legacy priorities and PEQdB: 120 fits using the same 1kHz-reference weighted export RMS. Mean RMS at10 bands was Standard Close1.487dB, Standard Smooth1.500dB, Precise Close0.435dB, Precise Smooth0.812dB and PEQdB0.432dB. This small numerical benchmark supports offering a bounded optimizer alongside the simple fixed-band reference. It does not establish audible superiority, represent measurement uncertainty, or show that more bands always help. PEQdB and Precise can converge differently as count changes.

Primary background: [PEQdB engine](https://github.com/peqdb/autoeq-c), [AutoEq processing explanation](https://github.com/jaakkopasanen/AutoEq/wiki/How-Does-AutoEq-Work%3F), [Qudelix5K 20-band specification](https://www.qudelix.com/products/qudelix-5k). The benchmark assesses this application's implementation, rather than assuming upstream defaults match it.

## Recommendation and headroom

Gold is a disclosed numerical heuristic: prefer candidates whose filters all have Q≤4 when available; retain candidates within0.15dB weighted RMS of the best such candidate; prefer fewer bands, then less negative preamp, then lower error. The0.15dB margin is a product heuristic, not a validated audibility threshold. If every candidate exceeds Q4 the comparison falls back to the available candidates and displays the same disclosure. The numerically closest fit is also identified independently.

Cyan marks the preamp closest to0dB, including ties within0.05dB (the displayed precision is0.1dB). Less preamp reduction does not prove better sound or eliminate clipping risk elsewhere. These badges remain separate because the best numerical fit and greatest output headroom can disagree. User listening preference should decide the final choice.

## Dynamics

The actual stereo worklet was executed on a16-second synthetic signal with20dB steady quiet/loud contrast. At−0.75 the measured contrast was10.019dB (compression); at+0.75 it was35.438dB (downward expansion); zero was sample-exact bypass. Stereo ratios were retained and output remained finite and bounded. Expansion reduces quieter sections relative to louder sections; it cannot reconstruct detail removed by earlier mastering compression. These are signal-level results, not physical headphone measurements or standardized whole-track loudness-range measurements.

The waveform renderer previously reduced its original reference for expansion, exaggerating the apparent difference. Original and processed traces now share the same amplitude scale. Worklet processing did not need an algorithm change. A live Dynamics interaction was not certified in the in-app review browser; its worklet control stayed unavailable there. Physical iPhone behavior remains an explicit gap. [WebKit media policies](https://webkit.org/blog/6784/new-video-policies-for-ios/) are relevant background; desktop checks do not certify iOS gesture/audio behavior.

## Personal Tournament

The coverage-first scheduler could spend the whole initial budget on disjoint pairs in a large pool, producing many1/1 rows. New runs use `personal-v2`: newcomers face known contenders, every third discovery decision compares already-heard contenders, and likely leaders meet each other more often after coverage. Existing manual exclusions, conservative bench criteria, rescue opportunities and confirmation across distinct recordings remain.

An optional short starter uses up to 12 targets, spread across known target families before filling remaining slots. It is clearly a subset, not a full-pool result. Early results say Early contenders; they do not declare a favorite after one win. Confirmation requires pool coverage, at least3 appearances and enough distinct opponents for each prospective finalist, and no exact third/fourth boundary tie. A new-run favorite requires completed finalist confirmation and positive direct margins against the other finalists. Ties and cycles can remain unresolved. Legacy runs retain the earlier scheduler/provenance; no saved records are rewritten.

Regression checks cover60-target early contender meetings,12-target coverage/revisits, ties, old-run behavior and starter parsing. Seeded clear/close/cyclic simulations are diagnostics, not a human preference accuracy guarantee. The algorithm is a practical discovery procedure, not a definitive statistical ranking estimator.

## UI review evidence and limits

The dedicated local synthetic fixture blocks all API writes and contributes nothing to research, rankings, community song votes or participant Sync. Desktop and390px narrow review covered visible checkboxes, distinct tone cards, fitter method/count selection, temporary/default labels, persisted default after reload, keyboard Bass adjustment, generated recommendations and local saving. Playback previously remained active while changing targets and saved EQs. An automatic match WAV downloaded successfully. A narrow fitter-panel overflow found during review was corrected; the expanded panel subsequently fit inside the375px content viewport without horizontal overflow.

Dark select/option backgrounds, selected state and disabled styles are explicit. Native menus were opened; the in-app screenshot API did not expose popup pixels, so popup pixel appearance remains a review gap. No current physical iPhone or standalone WebKit run is claimed. No production account or private audio was used.

Final automated verification and local build results are recorded in the final implementation handoff; raw synthetic reports remain ignored under `artifacts/verification/`. Public-only packaging is a clone-preview artifact and must not be deployed.
