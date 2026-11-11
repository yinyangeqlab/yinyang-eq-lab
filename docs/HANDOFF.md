# Development handoff

<!-- release-state:start -->
Recorded deployment: **update152**, source `2b94fac545acde01b5e7b866af2e13872e784cbe`.
Current maintenance, publication and recovery status: [LIVE_STATE.md](../LIVE_STATE.md).
<!-- release-state:end -->

Update152 refines the Home rocket orbit and the folder paper animation. My Collection brings together results, headphones, saved targets and EQs. The release keeps the direct AutoEq catalog, Terms of Use, and the private admin tables.

Production verification matched 340 Worker modules and eight client assets. The dedicated layout account checked both animations, both themes, keyboard navigation, and reduced motion at 1366, 720, 390, and 320 px. All 122 selected release regression suites passed. [Deployment verification](releases/update152-verification.json)

Matching encrypted off-device source and build recovery passed independent reconstruction and hosted validation. Existing data snapshots retain their original timestamps. [Recovery verification](releases/update152-recovery-verification.json)

[Update152 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update152) · [Source provenance](releases/update152-source.json) · [Publication verification](releases/update152-publication.json) · [Update149 publication verification](releases/update149-publication.json)

Use the [release versioning skill](skills/yinyangeq-release-versioning/SKILL.md) when preparing the next preview, commit, deployment or handoff. Verify GitHub source links separately from the live deployment record.

Read [AGENTS.md](../AGENTS.md), [ENGINEERING.md](ENGINEERING.md), [REBUILD.md](REBUILD.md) and [RECOVERY.md](RECOVERY.md). `LIVE_RELEASE.json` and its receipt document the deployment captured by this source snapshot. See the [live version page](https://yinyangeq.com/version) for the build currently served.

Start from the lab repository's public `main` and inspect the current branch and working tree before preparing a change. Use the clone-safe check in [REBUILD.md](REBUILD.md) for public source. Full snapshot verification uses the exact source, build and infrastructure inputs recorded for the deployment.

Use `npm run verify:list` to inspect scope and prerequisites, then `npm run verify` for public/source/synthetic checks. Missing prerequisites or failed checks fail the run. App/infra types, lint, build, browser and owner checks remain separately declared. Neither a passing public profile nor a manifest refresh is a release approval.

The [historical foundation inventory](history/foundation-20261031/README.md) records earlier source inputs. Deployment receipts retain their original source and verification limits.
