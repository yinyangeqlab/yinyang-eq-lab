# Development handoff

<!-- release-state:start -->
Recorded deployment: **update149**, source `f07966b0b6b07a2502ba3c4e4b7c331ab3d72744`.
Current maintenance, publication and recovery status: [LIVE_STATE.md](../LIVE_STATE.md).
<!-- release-state:end -->

Update149 makes 65 AutoEq curves selectable in Open Shootout, Personal custom pools, Preference Tuning, Peak & Dip Finder and Music Library EQ. Ten use existing target IDs. The other 55 load from the pinned upstream CSVs and enter eligible Blind Research comparisons. Rankings lists the new targets and scores them as eligible evidence accrues. Credits covers all 61 source files, including two rig conversion references. The oratory1990 in-ear target includes the “USOUND1v1 approximation” alias.

The browser checks the file and curve hashes. The Worker checks the curve version when it accepts ranked evidence. Numerical curves stay at the original source and user exports stay on the listener’s device. [Target inventory and attribution](TARGET_INVENTORY.md)

The deployment passed 122 regression suites. Isolated Chromium checks covered target selection and search, retry after a failed source request, keyboard controls and local downloads at 1220 and 360 px. Physical audio and native popup pixels were outside verification. [Deployment verification](releases/update149-verification.json)

Hosted validation for the matching encrypted off-device source and build recovery baseline passed on November 11, 2026 at 12:20 UTC. Independent reconstruction verified 1,117 application inputs and 3,266 compiled build files. The existing data snapshots and their timestamps were preserved. [Recovery verification](releases/update149-recovery-verification.json)

[Update149 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update149) · [Source provenance](releases/update149-source.json)

Use the [release versioning skill](skills/yinyangeq-release-versioning/SKILL.md) when preparing the next preview, commit, deployment or handoff. Verify GitHub source links separately from the live deployment record.

Read [AGENTS.md](../AGENTS.md), [ENGINEERING.md](ENGINEERING.md), [REBUILD.md](REBUILD.md) and [RECOVERY.md](RECOVERY.md). `LIVE_RELEASE.json` and its receipt document the deployment captured by this source snapshot. See the [live version page](https://yinyangeq.com/version) for the build currently served.

Start from the lab repository's public `main` and inspect the current branch and working tree before preparing a change. Use the clone-safe check in [REBUILD.md](REBUILD.md) for public source. Full snapshot verification uses the exact source, build and infrastructure inputs recorded for the deployment.

Use `npm run verify:list` to inspect scope and prerequisites, then `npm run verify` for public/source/synthetic checks. Missing prerequisites or failed checks fail the run. App/infra types, lint, build, browser and owner checks remain separately declared. Neither a passing public profile nor a manifest refresh is a release approval.

The [historical foundation inventory](history/foundation-20261031/README.md) records earlier source inputs. Deployment receipts retain their original source and verification limits.
