# Development handoff

<!-- release-state:start -->
Recorded deployment: **update133**, source `3bed26e06939de3f4b91d53fa5a289dc571ff057`.
Current maintenance, publication and recovery status: [LIVE_STATE.md](../LIVE_STATE.md).
<!-- release-state:end -->

**update134** is the local owner package source on `work/update134-owner-package-20261108`. It stages the release label and changelog for the committed `update134-preview.1` checkpoint `bfa19fe2f37e257cd6a2f306e23f934ef6e5c3c9`. Build evidence and the seal are kept in the owner's ignored package directory. The current deployment and recovery baseline is update133.

**update134-preview.1** is the Peak & Dip Finder review checkpoint on `work/peak-dip-finder-20261107`. It is based on the verified update133 source `3bed26e06939de3f4b91d53fa5a289dc571ff057`. It adds the saved-measurement frequency navigator, exact Hz entry, fine seeking, guided listening practice, hearing warning and continuous generated sound changes. GitHub publication, deployment and recovery registration are separate operations.

Browser review in an isolated local preview covered desktop and 390 px layouts, both tutorial practice rounds, safety choices, live sound generation, seeking, continuous source changes, the per-visit volume reset and a synthetic measurement saved through Tuning. The preview ID and notes appeared on the version page and matched the issue template and sidebar. All 117 selected public and Worker suites passed for the preview code, as did application typecheck and changed-file lint. The local report is `artifacts/verification/run-ULiov4/report.json`, source fingerprint `1a2dd037bdf4a7999d50fe875d9b5443b11be4572d7a16bcf683c5e8e3556e67` before this handoff-only edit. Physical audio output and iPhone Safari remain unverified. Native menu options were checked through the browser accessibility tree.

The verified **update133** deployment adds the direct link to the published update132 GitHub release. [Deployment verification](releases/update133-verification.json) · [Source-only recovery verification](releases/update133-recovery-verification.json)

The **update132** release build is based on the committed **update132-preview.1** on `work/listening-controls-20261104`. The version page lists the generated EQ graphs and restored results, free listening, gentler EQ, Tune by ear, and the music search. The scoped preview passed all 120 selected public, Worker, prepared-engine and built-package suites. Physical iPhone playback, the user's audio output and native select popup rendering remain unverified.

The previous update132 source is recorded in its [deployment verification](releases/update132-verification.json) and published as [GitHub release update132](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update132). [Publication verification](releases/update132-publication.json) · [Recovery verification](releases/update132-recovery-verification.json)

Use the [release versioning skill](skills/yinyangeq-release-versioning/SKILL.md) when preparing the next preview, commit, deployment or handoff. Verify GitHub source links separately from the live deployment record.


Read [AGENTS.md](../AGENTS.md), [ENGINEERING.md](ENGINEERING.md), [COORDINATION.md](COORDINATION.md), [REBUILD.md](REBUILD.md) and [RECOVERY.md](RECOVERY.md). `LIVE_RELEASE.json` with its receipt is production evidence. The generated state is a view, not a claim that the current checkout matches it.

The owner development root is `workspace/`; the parent is an old live mirror. Fetch the lab origin and inspect status/divergence before choosing a baseline. The canonical main contains preserved drafts and old history: do not reset, stash, clean or publish it. Use an assigned isolated worktree on scrubbed public lineage, carrying forward the current development source deliberately. Keep sealed source/build and infrastructure snapshots unchanged. A worktree's relative private snapshot paths need not exist: full snapshot checks belong in the owner root.

The engineering foundation is local work on `work/engineering-foundation-20261031`, based on development revision `08ede015c438e743f371fcf679058b5c27dcb3a1`. Its scope is shared guidelines, consistent release views and verification orchestration. It changes no runtime behavior. Commit, push and deploy were explicitly excluded. See [COORDINATION.md](COORDINATION.md) for the claim; status of production/publication/recovery always comes from the generated state.

Use `npm run verify:list` to inspect scope and prerequisites, then `npm run verify` for public/source/synthetic checks. Missing prerequisites or failed checks fail the run. App/infra types, lint, build, browser and owner checks remain separately declared. Neither a passing public profile nor a manifest refresh is a release approval.

Public copies of prior handoffs and the source manifest are [preserved byte for byte](history/foundation-20261031/README.md). Their old “current” headings and operational commands are historical; prefer this guide and the exact current receipt. Deployment receipts retain their original source and limits.
