# Development handoff

<!-- release-state:start -->
Recorded deployment: **update153**, source `65fe2888e0f68e8468323cd95b042d2193eeba45`.
Current maintenance, publication and recovery status: [LIVE_STATE.md](../LIVE_STATE.md).
<!-- release-state:end -->

Update153 adds browser ID copying and one-time browser verification. It retains the Home rocket and My Collection changes from update152.

The deployment used the existing D1 database and applied migration 0044 for one-time verification codes. The deployment and encrypted off-device recovery were verified for the recorded source. [Deployment verification](releases/update153-verification.json) · [Recovery verification](releases/update153-recovery-verification.json)

[Update153 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update153) · [Source provenance](releases/update153-source.json) · [Update152 publication verification](releases/update152-publication.json)

Use the [release versioning skill](skills/yinyangeq-release-versioning/SKILL.md) when preparing the next preview, commit, deployment or handoff. Verify GitHub source links separately from the live deployment record.

Read [AGENTS.md](../AGENTS.md), [ENGINEERING.md](ENGINEERING.md), [REBUILD.md](REBUILD.md) and [RECOVERY.md](RECOVERY.md). `LIVE_RELEASE.json` and its receipt document the deployment captured by this source snapshot. See the [live version page](https://yinyangeq.com/version) for the build currently served.

Start from the lab repository's public `main` and inspect the current branch and working tree before preparing a change. Use the clone-safe check in [REBUILD.md](REBUILD.md) for public source. Full snapshot verification uses the exact source, build and infrastructure inputs recorded for the deployment.

Use `npm run verify:list` to inspect scope and prerequisites, then `npm run verify` for public/source/synthetic checks. Missing prerequisites or failed checks fail the run. App/infra types, lint, build, browser and owner checks remain separately declared. Neither a passing public profile nor a manifest refresh is a release approval.

The [historical foundation inventory](history/foundation-20261031/README.md) records earlier source inputs. Deployment receipts retain their original source and verification limits.
