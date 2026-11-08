# Development handoff

<!-- release-state:start -->
Recorded deployment: **update132**, source `f33b8fb2906e3005a50f06e3fc436b1b145c2e79`.
Current maintenance, publication and recovery status: [LIVE_STATE.md](../LIVE_STATE.md).
<!-- release-state:end -->

Update132 added generated EQ graphs and restored results, free listening, gentler EQ, listening-based tuning, and music search. The release candidate passed 120 selected public, Worker, engine and packaging checks. Physical audio output, iPhone playback and native select popups were outside that verification.

The deployed source is recorded in [the verification receipt](releases/update132-verification.json). The matching application source is published as [GitHub release update132](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update132). [Publication verification](releases/update132-publication.json) The owner retains the complete deployment and recovery records. [Recovery verification](releases/update132-recovery-verification.json)

Use the [release versioning skill](skills/yinyangeq-release-versioning/SKILL.md) when preparing the next preview, commit, deployment or handoff. Verify GitHub source links separately from the live deployment record.

Read [AGENTS.md](../AGENTS.md), [ENGINEERING.md](ENGINEERING.md), [REBUILD.md](REBUILD.md) and [RECOVERY.md](RECOVERY.md). `LIVE_RELEASE.json` and its receipt document the deployment captured by this source snapshot. See the [live version page](https://yinyangeq.com/version) for the build currently served.

Start from the lab repository's public `main` and inspect the current branch and working tree before preparing a change. Use the clone-safe check in [REBUILD.md](REBUILD.md) for public source. Full snapshot verification uses the exact source, build and infrastructure inputs recorded for the deployment.

Use `npm run verify:list` to inspect scope and prerequisites, then `npm run verify` for public/source/synthetic checks. Missing prerequisites or failed checks fail the run. App/infra types, lint, build, browser and owner checks remain separately declared. Neither a passing public profile nor a manifest refresh is a release approval.

The [historical foundation inventory](history/foundation-20261031/README.md) records earlier source inputs. Deployment receipts retain their original source and verification limits.
