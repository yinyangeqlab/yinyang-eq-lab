# Local WebKit / Safari compatibility review

Reviewed October 28, 2026 UTC, on dirty branch `work/peqdb-wasm-local-20261027`, base/HEAD `a0dad354fc62a5ac2f702b8a6fc8ee71348cc73a`. Origin was fetched anonymously and remained even with HEAD. Lab identity and original canonical drafts were preserved. This continues the local PEQdB integration; it does not publish or deploy anything. Live remains update124.

## Test scope

Playwright WebKit build 2336 reports engine version 26.5. Tests ran on Linux with desktop, iPhone 13 and iPad Pro 11 profiles. The device runs use trusted touch actions, device viewport/scale/touch settings and the real WebKit JavaScript, WASM and Web Audio implementations. A browser-only model also delays resume completion, enforces a first-play gesture, and makes the element-volume property read-only. Those models expose ordering/control bugs without pretending to reproduce every Apple OS policy.

This is not an execution of Apple Safari on macOS, an iOS Simulator or a physical iPhone/iPad. The emulated user agent's OS token is not a tested iOS version. Playwright's WebKit is built from WebKit main and can be ahead of Apple Safari. Physical hardware, actual lock-screen/call interruptions, Apple audio devices, hardware volume, codec differences and headphone audibility remain unverified.

All browser contexts were disposable, with synthetic stereo WAV media, external public headphone fixtures and intercepted application APIs. No production/admin session, research contribution, community vote, participant Sync, production data export or database mutation was used. The isolated browser and temporary runtime libraries remain outside Git; no system packages or project dependency locks were changed.

## Reproduced issues fixed

1. **Gesture ordering:** Library preview and matched-passage playback awaited context resume before invoking media play. Tests failed with only resume called while the gesture was active. Both calls now start together; cancellation and source guards remain. Selecting a side alone also no longer needlessly resumes the context while fitting is pending.
2. **Tuning stalled in WebKit:** actual media remained at zero seconds with readyState 3 and a running context. Disabling the worklet or skipping the native-control test did not fix it. Attaching the media source before metadata preroll did. Tuning now connects its processing graph before loading the source; a regression checks that ordering. Worklet setup has an in-flight guard so preconnection does not create duplicate processors.
3. **Native/OS Play bypassed Tuning initialization:** the original onPlay only changed UI state. It now blocks initial native playback until an explicit app Play initializes the path, checks the current fit key, and safely attempts resume for an already initialized path. The actual handler failed the bypass regression before the fix and passes afterward.
4. **iOS element-volume limitation:** all three integrated players now control user volume/mute with an output GainNode. The element stays at unity, avoiding double attenuation. These changes preserve EQ, normalization and export headroom. Browser checks keep element volume read-only and verify actual connected output-gain changes for 37%, mute and restoration.
5. **Context interruption and silent progress:** suspended/interrupted contexts pause their media and invalidate pending playback intents; recovery requires explicit Play. Listeners are retired with their graphs. Listening intervals cannot start unless the context is running, and start at the actual media position when it resumes. This prevents a native media clock advancing through silence from earning passage credit. Existing five-second/matched-coverage rules are unchanged.
6. **Narrow WebKit select overflow:** long selected EQ/measurement labels produced a 381px scroll area in a 360px viewport despite bounded control boxes. Small wrappers clip only native selected-value overflow, with padding for focus outlines; search popovers remain outside them. Desktop/360px expanded-menu and keyboard checks pass with dark option surfaces and solid focus outlines.

## Verification

- Complete WebKit desktop, iPhone 13 and iPad Pro 11 runs each pass three MusicPanel modes: real PEQdB, blocked WASM and blocked Worker. Both comparison sides use the same expected engine. Delayed fitting does not start audio after Stop.
- Each profile also passes actual Tuning and Library playback, first-play gesture ordering with delayed resume, output volume/mute under read-only element volume, real context suspension and explicit restart, native-play guarding, real shelf-containing Library EQ generation, responsive native selects, and source/license downloads. No unexpected full-app browser errors were reported.
- The same strict audio suite passes in Chromium. The MusicPanel fixture now loads the application's real responsive styles and bounds its debug JSON: the old unstyled fixture had a 2429px scroll area at a 390px viewport, which caused misleading mobile automation waits. No product code was changed to conceal that fixture problem. Screenshots are bounded and recorded in CSS pixels to avoid browser image-size limits.
- Actual-handler tests pass: 50 main-workflow checks, 33 Library preview/error/recovery checks, 22 playback request checks, comparison-passage workflow and selected-passage timing, plus media recovery, passage editing and source selection. Actual WASM/core/export checks pass with the six public headphone fixtures. Additional regressions exercise interruption/listener cleanup and exclude interrupted-context media time from listening credit.

Final checks also pass:

- App TypeScript, zero-warning changed-source/fixture lint, and the complete production build.
- The actual packaged module/WASM MIME types and built worker through the loopback Cloudflare production preview in desktop WebKit, iPhone WebKit, iPad WebKit and Chromium. Every run falls back at 384 kHz and then successfully fits both targets with PEQdB at 48 kHz in the same worker.
- Build/source correspondence, binary/notices/source hashes, and unreviewed-file/mismatched-build rejection tests. Independent archive reading matches all 662 source entries. Source archive SHA-256: `9fa8a24bc72703761afda421a636caf3b6d17f30ca45baf1fb52f1714e989f75`.
- Public-only packaging with all 260 client dependency imports verified. `dist/.public-only-package` remains present. Protected recordings were not copied or verified for release.

The temporary production verification server is stopped after these checks; the original local previews remain. No commit, push, deployment, live release/recovery metadata change or production operation occurred.

Evidence is ignored under `artifacts/peqdb-autoeq/review/webkit-desktop`, `webkit-iphone`, `webkit-ipad` and `chromium-safari-regressions`.

## Primary references and practical limits

- [Playwright browser support](https://playwright.dev/docs/browsers#webkit) distinguishes its WebKit build from Apple Safari; [device emulation](https://playwright.dev/docs/emulation) describes the emulated viewport, touch and device parameters.
- [WebKit's iOS media policy](https://webkit.org/blog/6784/new-video-policies-for-ios/) explains direct gesture-backed media play. The strict delayed-resume tests intentionally check that ordering rather than relying on permissive desktop autoplay.
- [Apple's iOS-specific media considerations](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/Device-SpecificConsiderations/Device-SpecificConsiderations.html) document the element-volume limitation. The output-gain approach does not depend on that property being mutable and does not change system hardware volume.
- [WebKit interruption report 273511](https://bugs.webkit.org/show_bug.cgi?id=273511) records iOS interrupted-context behavior. Our tests use real suspend/resume plus a deterministic interrupted-state unit case; they do not reproduce a physical phone call or guarantee recovery from WebKit/OS audio-process failures.

The engine remains pinned, unsmoothed and replaceable, with the original fitter fallback. Matching LGPL source packaging is rebuilt after these application changes. No legal certification or physical Safari/iOS certification is claimed.
