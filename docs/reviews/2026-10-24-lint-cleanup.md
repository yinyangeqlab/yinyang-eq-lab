# Lint cleanup — October 24, 2026

Status: prepared and tested; verified rollout/recovery records pending.

Baseline: scrubbed main `7121ee23b1dfeecfe00d9626880ba63a0df517eb`, live update122. Original canonical checkout/drafts and Claude setup files remain preserved. Owner authorized remaining lint fixes, tests and any runtime deployment under the persistent owner-only lock.

## Findings and implementation

The full source lint baseline was 113 errors and 98 warnings. The reviewed source now has zero errors and zero warnings. Core lint/React checks remain enabled. `docs/LINT_POLICY.md` explains the narrow intentional lifecycle/framework/immutable-toolchain exceptions; this is not a claim that all lifecycle code was rewritten to satisfy compiler heuristics.

Runtime fixes include clock-driven activity/sign-in/invitation/archive expiry displays, reactive matched-listening/player/analyser snapshots, current shortcut callbacks, and stable Tuning/Tournament/Sync read commands. Tuning now captures a previous edit before queueing a history update, so batched changes Undo/Redo correctly. Main idle-session display uses rendered activity state rather than reading its mutable ref. The comparison meter now has its required initial ARIA value. A decorative picture keeps its empty image alternative without an unsupported picture ARIA attribute.

Removed obsolete inline participation-submit code and its unused state; the shared choices editor remains authoritative. Removed unused imports/read results and strengthened the Sync transfer declaration types. Full-document navigation after privacy/device changes uses a shared explicit helper so mounted account/playback state is discarded. Worker exports were named without changing handler behavior; the independent cost guard is not redeployed for this source-only naming change. Private access/media, Worker URLs, CPU/abuse controls, consent/scoring, schema and media are unchanged.

Removed one superseded `flex:1` declaration from Music Library; the later `flex:1 1 12rem` and open-details rule retain the same computed layout. Test harnesses now understand memoized shipped handlers, named Worker exports, the current ranking JSX branch, all three bitrate description surfaces and the hidden-account guard. No assertions or production guards were removed. The nickname fixture now executes the real hidden-account policy and checks its refusal.

## Verification

All 89 existing `scripts/check_*` regression suites pass after repairing six failures (five stale harness assumptions and one superseded CSS declaration). The 35 actual-component main-workflow checks include seven new regressions for batched Tuning history and automatic activity/grant expiry. Both owner-only maintenance (672 denials) and per-feature maintenance suites pass, as do security headers, account isolation/Sync, consent, measurement/target, listening/passages, blind EQ and ranking regressions. App/infra TypeScript and the production build passed. Fresh full lint passes with zero errors/warnings.

Synthetic browser review used actual components without a production account: desktop1280/narrow360 Tuning keyboard gain edits, Undo/Redo, target/source native menu expansion and selection, Play/Space pause, dark selected/disabled options, and no horizontal overflow. Music Library expanded credits retained `flex:1 1 100%` at both widths. Native popup pixels, Safari/iOS, physical headphones and real participant write/pair/delete flows are not certified. New expiry behavior is tested through synthetic clocks; no admin browser session or production data mutation was used.

## Release constraints

This is a code-only release with unchanged schema/media/recovery semantics. Keep owner-only maintenance enabled with no automatic expiry. Deploy only the existing app Worker with prior browser assets retained. Source-only encrypted off-device recovery registration must preserve existing data snapshots/timestamps; do not create a fresh participant-data export for lint cleanup. Update all release/handoff records only after verified deployment.

Release-scan correction: the initial local commit preceded a failed scan of two already-public in-memory SQL fixtures. It was not published/deployed. Exact reviewed path/blob hashes now permit only those synthetic setup rows; every credential/path check remains active and changed/new fixtures fail closed. The actual scanner regression passes in a disposable index. The commit is corrected and rescanned before any publication/deployment.
