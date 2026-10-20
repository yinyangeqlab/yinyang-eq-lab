# Full local site review — October 19, 2026

Completed local review candidate; findings and limits follow. No push, deployment, real account activation/history transfer, or production mutation. Browser reviews use only the hidden noncontributing test account. Admin and ordinary-participant write paths are exercised using isolated synthetic route/database fixtures, not a privileged browser session.

## Scope and evidence standard

- Inventory every application page, Tournament tab, main workflow, API contribution/read boundary and existing verification suite.
- Verify actual browser actions for safe local controls, navigation, selects, disclosures, playback, seeking, matched timing, local choices/results/undo and test-only song ratings. Record not exercised or blocked separately.
- Review displayed prose against implementation, consent/purpose separation, ranking eligibility and privacy behavior.
- Check representative mobile, tablet, laptop, desktop, 4 K, ultrawide and short/landscape screens plus breakpoint edges. Capture a long screenshot gallery with measured effective sizes, overflow and notes. Finite browser viewport testing cannot certify every physical screen or arbitrary width/height.
- Security review includes authorization/ownership, CSRF/origin, bounded inputs/query cost, publication projection, isolation and erasure. No destructive production tests or claims of a complete penetration test.

## Work order

1. Community overlap meters and exact timing/validation.
2. Functional regression and API/security checks.
3. Page/control/text review and responsive screenshot gallery.
4. Fix verified issues, rerun affected checks, rebuild and review final local pages.
5. Publish local report with completed coverage, proposed wording/design changes and explicit limits.

## Completed review candidate

The finite audit is complete as a local review candidate, with remaining recommendations and security work explicitly flagged. It is not a claim that every imaginable device, dataset, repeated button instance or malicious path was tested.

- 22 initial page/tab/access surfaces at 11 requested viewport sizes (242 cases), plus breakpoint, short-screen, access-state and final patched-runtime checks: **383 recorded viewport cases and 438 screenshots**. Observed widths 280–4096 CSS pixels; a 5120 request was capped at 4096. Listening reminder additionally fits a 320×240 viewport with its internal scrolling. Tables may intentionally scroll internally; page-level overflow is measured separately.
- The two observed page-overflow issues—admin sign-in at 320 px and Open Comparison at 280 px—are fixed and rechecked. Captures preserve before/fix states instead of silently replacing failure evidence.
- Actual browser tests used only the hidden noncontributing identity. Community A-only/disjoint playback remained at 0 sharedseconds; a matched A/B passage completed 5 seconds and enabled a test preview answer. Preview completion explicitly sent no answer. Separate shared sections/repeats/near-threshold/rate input cases are covered by actual timing and route fixtures.
- Personal required/free gates, tie 44→45 and Undo 45→44, pause/results and all three themes were exercised. The original 44 sample choices remain. A generated CSV created a private target without a raw measurement; Remove local copy/Undo worked and only that disposable fixture was removed. Added this reversible cleanup control rather than erasing any existing browser data.
- Real song Upvote/Downvote/clear, filter/search, protected-track playback, generated stereo WAV selection/playback, source switching, volume and waveform zoom worked. No official song rating was submitted.
- Tuning Bass edit, Undo/Redo, twelve generated EQ variants,10/15/20 band selectors and six actual target/EQ downloads worked. Export preflight stored labeled browser-only tests. No participant export was submitted.
- Ranking source/headphone/protocol/exact-file filters and expanded help worked. Method/eligibility fixtures cover repeats, ties, diagnostic exclusion, admin/test exclusion, source versions, participant balance and conditional model uncertainty. Local official rankings intentionally have no participant votes.
- All 63 regression suites pass; two native Worker media suites required explicit host-local retries because the restricted sandbox cannot bind sockets. Source TypeScript, all 37 fresh migrations, isolated production build,340 asset/200 protected-recording packaging, diff checks and 314 runtime/lock source comparisons pass. Browser warning/error capture was empty on the checked final tuning page; this is not a historical all-route console trace.

## Local fixes

Community meters now show unique common source time on both sides, separately from raw A/B listening. Replayed audio is counted once and separate matching passages sum. Exact overlap validation avoids rounding 4.999 seconds into completion; reference playback rate is fixed at 1. Community errors are private/no-store, action values are validated, candidate queries are bounded, paused requests cannot restore stale reference UI, and local preview fetch failures display an error. Permission refresh does not repeatedly pause the test preview.

Added anti-framing/nosniff headers, limited HTML frame/base/form CSP, conservative referrer defaults and disabled unused camera/microphone/location permissions at the Worker response boundary. Private media/admission, CPU 5000 ms, six abuse bindings and cost protections are preserved. Hidden test Sync shows its restriction instead of offering nonfunctional enrollment controls. Private-profile recovery controls wait for authorized data. My data explains test identity access accurately.

Fixed stale Welcome copy that incorrectly called Community merely planned/private-only; public numeric results remain withheld, but prospective pilot consent is implemented. Ranking help no longer implies admin activity counts. Music-library song ratings have a distinct label and current mode names. Clarified saved channel-matching settings and ordinary-participant versus local-test export disclosure. No participation notice is accepted or fabricated by this audit.

## Security advisories and release boundary

Updated Next 16.3.4→16.4.2, React/React DOM/RSC 19.2.6→19.2.8 and Vite 8.0.13→8.0.16, plus semver-compatible transitive fixes, without npm audit --force. Production-only npm audit reports 0 flags. The full dependency tree still reports **15 high and 4 moderate advisory flags** in framework/build/tool chains. A devDependency may contribute code to the bundled server; these flags are not dismissed as harmless. This is not a security sign-off for deployment.

Remaining chains include the Cloudflare plugin/Wrangler/Miniflare cohort, vinext, eslint-config-next and drizzle-kit. Registry metadata for the proposed vinext fix requires coordinated React/RSC 19.3.1 and plugin-rsc updates; the current Cloudflare fix pulls a new Miniflare major/beta cohort. Npm’s suggested force downgrades for drizzle-kit/eslint-config-next were not applied. A coordinated compatible-toolchain upgrade and reachability review is the next security recommendation. Exact scans, dependency chains, proposed fixes and decisions are in artifacts/full-review-20261019/dependency-review.json and the audit JSONs.

Primary advisories reviewed: https://github.com/advisories/GHSA-vcvr-r3jv-pc5j (conditional Next image-generation path), https://github.com/advisories/GHSA-wx67-qw84-cm4g (RSC server-function DoS), and Vite advisories GHSA-v6wh-96g9-6wx3 / GHSA-fx2h-pf6j-xcff. Installed-package flags alone are not proof that this particular Worker is exploitable; absence from a scan is not proof of safety. No exploit was run against production.

## Recommendations for owner review

1. Resolve the remaining coordinated framework/Cloudflare/toolchain advisory chains before a release sign-off.
2. Use the shared Tournament shell for Community; shorten its initial explanation and place measurement-system/method/dropout details under accessible help.
3. Reduce the mobile header/setup stack while preserving the first-play and manual-reopen behavior.
4. Move sharing status/actions ahead of lengthy My data retention/archive prose, keeping the full notice accessible without changing permission scope.
5. Add pagination or windowing to the 200 recording Listening Pool page; keep search/filter/rating semantics. One enormous full-page bitmap exceeded screenshot limits; viewport evidence is intact.
6. Curate reference-system metadata and perform the independent held-out listener/privacy validation before any numerical Community leaderboard. Matching rig labels does not establish calibration; browser timing does not prove attention or headphone use.

## Review artifacts and deliberate limits

Open the long, filterable screenshot/text/findings gallery at http://localhost:5175/__audit/review (localhost-only, hidden tester access). Its route/assets exist only in ignored local assembly. Source report: artifacts/full-review-20261019/review.html. Evidence manifests include layouts.json, verified-checks.json, overlap-browser.json, modal-layouts.json, build-source-match.json and verification.json.

No production mutation, push, deploy, backup/handover, real account activation/device grant, historical Brave/admin transfer, publication or erased-record restoration occurred. Real participant/admin mutations and erasure/Sync/publication paths were verified with synthetic handlers/database fixtures, not exercised against a real browser account. Representative repeated controls were exercised; this is not a separate manual click on every 200 recording row. Native popup pixels are unavailable to screenshots; dark menu styles and selection/keyboard behavior were verified separately. No physical-device, full penetration-test, legal/privacy or independent listening-study certification is claimed.


Final runtime smoke check: the patched React/RSC build completed an actual A/B passage with exactly5.0sharedseconds and enabled the noncontributing preview vote. Music stopped automatically after comparison. All nine selected report-gallery images loaded, filters worked, and the final localhost sign-in response carries the intended anti-framing/CSP headers. Personal medal results, a loaded Community check and the report are left open. The user’s existing Rankings tab was retained.
