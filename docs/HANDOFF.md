# Development handoff

<!-- release-state:start -->
Recorded deployment: **update155**, source `9e17dc4dbd8b98580ea7e37e616952069291f43a`.
Current maintenance, publication and recovery status: [LIVE_STATE.md](../LIVE_STATE.md).
<!-- release-state:end -->

## Update156 release candidate

The candidate is based on fetched public main `f09297bfe5a410197d56c77faff12fbc03a06c93`, which matches the application source from update155. It standardizes Shootout vote labels, adds target search and rank sorting in Preference Tuning, puts CSV and TXT downloads beside target selection, and organizes My Collection around dated trials and a separate Personal Tournament view. The shortlist totals use all dates for the selected shootout and measurement. Earlier Personal runs without a saved measurement ID remain available by their recorded setup.

The production compilation and 15 focused suites passed on Node 26.12.0 and npm 12.2.1. Disposable Chromium fixtures at 1366 and 360 pixels verified search, sorting, downloads, source retry, trial filters and readable locked vote labels. Keyboard selection and option colors were checked for native selects. Expanded popup pixels were unavailable in the capture. Production remains on update155 with its existing recovery point. The update156 candidate is authorized for deployment and GitHub publication. The recorded live state changes after deployment verification.

Update155 adds a standalone EQ fitter benchmark guide, linked from Research and both Rankings sections. Glossary & Guides retains its existing section links, and the fitter guide shares the original benchmark chart.

The live source was verified against the deployed Worker modules and public client assets. The encrypted off-device recovery handover updated the source baseline. [Deployment verification](releases/update155-verification.json) · [Recovery verification](releases/update155-recovery-verification.json) · [Source provenance](releases/update155-source.json) · [Publication verification](releases/update155-publication.json)

Earlier records include [update154 deployment verification](releases/update154-verification.json), [update154 recovery verification](releases/update154-recovery-verification.json), [update153 publication verification](releases/update153-publication.json) and [update152 publication verification](releases/update152-publication.json).

Use the [release versioning skill](skills/yinyangeq-release-versioning/SKILL.md) when preparing the next preview, commit, deployment or handoff. Verify GitHub source links separately from the live deployment record.

Read [AGENTS.md](../AGENTS.md), [ENGINEERING.md](ENGINEERING.md), [REBUILD.md](REBUILD.md) and [RECOVERY.md](RECOVERY.md). `LIVE_RELEASE.json` and its receipt document the deployment captured by this source snapshot. See the [live version page](https://yinyangeq.com/version) for the build currently served.

Start from the lab repository's public `main` and inspect the current branch and working tree before preparing a change. Use the clone-safe check in [REBUILD.md](REBUILD.md) for public source. Full snapshot verification uses the exact source, build and infrastructure inputs recorded for the deployment.

Use `npm run verify:list` to inspect scope and prerequisites, then `npm run verify` for public/source/synthetic checks. Missing prerequisites or failed checks fail the run. App/infra types, lint, build, browser and owner checks remain separately declared. Neither a passing public profile nor a manifest refresh is a release approval.

The [historical foundation inventory](history/foundation-20261031/README.md) records earlier source inputs. Deployment receipts retain their original source and verification limits.
