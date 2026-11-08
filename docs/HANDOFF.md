# Development handoff

<!-- release-state:start -->
Recorded deployment: **update132**, source `f33b8fb2906e3005a50f06e3fc436b1b145c2e79`.
Current maintenance, publication and recovery status: [LIVE_STATE.md](../LIVE_STATE.md).
<!-- release-state:end -->

The **update132** release build is based on the committed **update132-preview.1** on `work/listening-controls-20261104`. The version page lists the generated EQ graphs and restored results, free listening, gentler EQ, Tune by ear, and the music search. The scoped preview passed all 120 selected public, Worker, prepared-engine and built-package suites. Physical iPhone playback, the user's audio output and native select popup rendering remain unverified.

The deployed source is recorded in [the verification receipt](releases/update132-verification.json). The matching application source is published as [GitHub release update132](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update132). [Publication verification](releases/update132-publication.json) The owner retains the complete deployment and recovery records. [Recovery verification](releases/update132-recovery-verification.json)

Use the [release versioning skill](skills/yinyangeq-release-versioning/SKILL.md) when preparing the next preview, commit, deployment or handoff. Verify GitHub source links separately from the live deployment record.


Read [AGENTS.md](../AGENTS.md), [ENGINEERING.md](ENGINEERING.md), [REBUILD.md](REBUILD.md) and [RECOVERY.md](RECOVERY.md). `LIVE_RELEASE.json` and its receipt document the deployment captured by this source snapshot. See the [live version page](https://yinyangeq.com/version) for the build currently served.

The owner development root is `workspace/`; the parent is an old live mirror. Fetch the lab origin and inspect status/divergence before choosing a baseline. The canonical main contains preserved drafts and old history: do not reset, stash, clean or publish it. Use an assigned isolated worktree on scrubbed public lineage, carrying forward the current development source deliberately. Keep sealed source/build and infrastructure snapshots unchanged. A worktree's relative private snapshot paths need not exist: full snapshot checks belong in the owner root.

Use `npm run verify:list` to inspect scope and prerequisites, then `npm run verify` for public/source/synthetic checks. Missing prerequisites or failed checks fail the run. App/infra types, lint, build, browser and owner checks remain separately declared. Neither a passing public profile nor a manifest refresh is a release approval.

Public copies of prior handoffs and the source manifest are [preserved byte for byte](history/foundation-20261031/README.md). Their old “current” headings and operational commands are historical; prefer this guide and the exact current receipt. Deployment receipts retain their original source and limits.
