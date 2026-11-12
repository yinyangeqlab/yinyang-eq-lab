# Development handoff

<!-- release-state:start -->
Recorded deployment: **update155**, source `9e17dc4dbd8b98580ea7e37e616952069291f43a`.
Current maintenance, publication and recovery status: [LIVE_STATE.md](../LIVE_STATE.md).
<!-- release-state:end -->

Update155 adds a standalone EQ fitter benchmark guide, linked from Research and both Rankings sections. Glossary & Guides retains its existing section links, and the fitter guide shares the original benchmark chart.

The live source was verified against the deployed Worker modules and public client assets. The encrypted off-device recovery handover updated the source baseline. [Deployment verification](releases/update155-verification.json) · [Recovery verification](releases/update155-recovery-verification.json) · [Source provenance](releases/update155-source.json)

Earlier records include [update154 deployment verification](releases/update154-verification.json), [update154 recovery verification](releases/update154-recovery-verification.json), [update153 publication verification](releases/update153-publication.json) and [update152 publication verification](releases/update152-publication.json).

Use the [release versioning skill](skills/yinyangeq-release-versioning/SKILL.md) when preparing the next preview, commit, deployment or handoff. Verify GitHub source links separately from the live deployment record.

Read [AGENTS.md](../AGENTS.md), [ENGINEERING.md](ENGINEERING.md), [REBUILD.md](REBUILD.md) and [RECOVERY.md](RECOVERY.md). `LIVE_RELEASE.json` and its receipt document the deployment captured by this source snapshot. See the [live version page](https://yinyangeq.com/version) for the build currently served.

Start from the lab repository's public `main` and inspect the current branch and working tree before preparing a change. Use the clone-safe check in [REBUILD.md](REBUILD.md) for public source. Full snapshot verification uses the exact source, build and infrastructure inputs recorded for the deployment.

Use `npm run verify:list` to inspect scope and prerequisites, then `npm run verify` for public/source/synthetic checks. Missing prerequisites or failed checks fail the run. App/infra types, lint, build, browser and owner checks remain separately declared. Neither a passing public profile nor a manifest refresh is a release approval.

The [historical foundation inventory](history/foundation-20261031/README.md) records earlier source inputs. Deployment receipts retain their original source and verification limits.
