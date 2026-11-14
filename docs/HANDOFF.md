# Development handoff

<!-- release-state:start -->
Recorded deployment: **update163**, source `b7aca62fa3bd8c1d7776eb82f30c76eadebc9ef7`.
Current maintenance, publication and recovery status: [LIVE_STATE.md](../LIVE_STATE.md).
<!-- release-state:end -->

## Update163

Failed POSTs to `/api/listening-runs` and `/api/votes` go to a private Cloudflare Worker configured for 100% log sampling. The main Worker keeps its 10% sample. The existing owner-only query still finds `shootout_submission_failed`; rows include the route, HTTP status, stage and reason code. Isolated test-account denials are labeled `test_account`.

The collector receives no submission content and has no access to the rankings database. Coverage starts at the site Worker. Errors before a browser sends a request and blocks before Cloudflare invokes the site Worker are outside this diagnostic.

Cloudflare recorded one expected 403 denial from each endpoint using the isolated test account. Both live ranking counts stayed unchanged. [Deployment verification](releases/update163-verification.json)

[Update163 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update163) · [Publication verification](releases/update163-publication.json)

## Update162

Personal Tournament plays leading curves more often. Progress bars show how close each curve is to leaving rotation after a vote, in tournament results, and in My Collection. Listeners can restore curves that leave rotation.

All 123 selected release checks passed. The dedicated layout account verified vote review, progress bars, standings, keyboard navigation and Restore at desktop and phone widths with synthetic curves and audio. [Deployment verification](releases/update162-verification.json)

Encrypted off-device source-only recovery and hosted validation passed. [Recovery verification](releases/update162-recovery-verification.json)

[Update162 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update162) · [Publication verification](releases/update162-publication.json)

## Update161

Play both segments shows Preparing audio… while the track and EQ load. Ranked Blind Shootout requires five seconds of the same passage per side. Eligible new Rapid choices count in a separate Free Listening ranking with no playback minimum.

The isolated account verified both modes live without submitting a public vote. In a disposable database, a Ranked vote updated Standard and a Rapid choice updated Free Listening. [Deployment verification](releases/update161-verification.json)

Update162 went live before update161 completed source-only recovery. Hosted validation later passed for update162, and the daily backup schedule was active at that verification. See the live state above for current recovery status. [Recovery verification for update162](releases/update162-recovery-verification.json)

[Update161 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update161) · [Publication verification](releases/update161-publication.json)

## Update160

The full and icons-only sidebar handles use smoky teal glass. The larger chevron gains a subtle mint glow on hover.

The deployed source passed all 123 release checks. The isolated browser review covered both sidebar widths, keyboard focus, reduced motion, and the phone menu. The post-deployment infrastructure preview found no drift. [Deployment verification](releases/update160-verification.json)

Encrypted off-device source-only recovery and hosted validation passed. The existing data snapshot and its timestamp were retained. [Recovery verification](releases/update160-recovery-verification.json)

[Update160 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update160) · [Publication verification](releases/update160-publication.json)

## Update159

Home keeps its main action visible on ultrawide screens. Blind Research fits target and identity labels on narrow screens. The release improves accessibility labels, feedback for private results, and keyboard controls for folder tracks in Preference Tuning.

The deployed source passed all 123 release checks. The isolated browser review covered narrow and wide layouts, dropdowns, keyboard interaction, and protected playback. The post-deployment infrastructure preview found no drift. [Deployment verification](releases/update159-verification.json)

Encrypted off-device source-only recovery and hosted validation passed. The existing data snapshot and its timestamp were retained. [Recovery verification](releases/update159-recovery-verification.json)

[Update159 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update159) · [Publication verification](releases/update159-publication.json)

## Update158

The Preference Tuning target list opens directly below search. The Sort button offers global rank and alphabetical order. Both target download options offer CSV and TXT, and Make my EQ opens the measurement picker when no headphones are selected.

Deployed source `d637e8c28644618b78bc17bb99715af2a428ee80` passed all 123 selected regression checks. The isolated account verified the live picker at desktop and phone widths. [Deployment verification](releases/update158-verification.json)

Encrypted off-device source-only recovery and hosted validation passed. Daily scheduled backups were active at verification on November 13, 2026 at 7:35 p.m. Pacific. The existing data snapshot was retained and no database export was performed. [Recovery verification](releases/update158-recovery-verification.json)

[Update158 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update158) · [Publication verification](releases/update158-publication.json)

## Update157

The server logs sampled failure reasons for listening runs and votes. Research Admin links to the saved Cloudflare query for the owner.

The deployed source is `68d486c95a6c246b41ca373780917cbfcf247b70`. All 123 selected suites passed. The isolated test account verified Blind Shootout curve loading, playback, local choices and denied submissions. Global vote counts stayed unchanged. Cloudflare retained diagnostic events for both endpoints. [Deployment verification](releases/update157-verification.json)

Encrypted off-device source-only recovery and hosted validation passed on November 13, 2026 at 7:14 p.m. Pacific. Daily scheduled backups were active at verification. The existing data snapshot was retained with no new database export. [Recovery verification](releases/update157-recovery-verification.json)

[Update157 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update157) · [Publication verification](releases/update157-publication.json)

## Update156

Shootout voting uses Prefer A, Unsure / Tie and Prefer B. Preference Tuning offers target search, A–Z or global-rank sorting, and local CSV and TXT downloads. While the Standard cohort is empty, rank numbers use the separately labeled earlier matched-passage cohort. My Collection shows dated trials by headphone measurement and keeps Personal Tournament history in a separate view.

The deployed source is `79193036fbcf0aba496efa12507bda04ac78da86`. All 123 selected suites passed. The dedicated non-contributing layout account verified the fixes at 1366 and 360 pixels. [Deployment verification](releases/update156-verification.json)

Matching encrypted off-device source-only recovery and hosted validation passed. [Recovery verification](releases/update156-recovery-verification.json)

[Update156 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update156) · [Publication verification](releases/update156-publication.json)

Update155 adds a standalone EQ fitter benchmark guide, linked from Research and both Rankings sections. Glossary & Guides retains its existing section links, and the fitter guide shares the original benchmark chart.

The live source was verified against the deployed Worker modules and public client assets. The encrypted off-device recovery handover updated the source baseline. [Deployment verification](releases/update155-verification.json) · [Recovery verification](releases/update155-recovery-verification.json) · [Source provenance](releases/update155-source.json) · [Publication verification](releases/update155-publication.json)

Earlier records include [update154 deployment verification](releases/update154-verification.json), [update154 recovery verification](releases/update154-recovery-verification.json), [update153 publication verification](releases/update153-publication.json) and [update152 publication verification](releases/update152-publication.json).

Use the [release versioning skill](skills/yinyangeq-release-versioning/SKILL.md) when preparing the next preview, commit, deployment or handoff. Verify GitHub source links separately from the live deployment record.

Read [AGENTS.md](../AGENTS.md), [ENGINEERING.md](ENGINEERING.md), [REBUILD.md](REBUILD.md) and [RECOVERY.md](RECOVERY.md). `LIVE_RELEASE.json` and its receipt document the deployment captured by this source snapshot. See the [live version page](https://yinyangeq.com/version) for the build currently served.

Start from the lab repository's public `main` and inspect the current branch and working tree before preparing a change. Use the clone-safe check in [REBUILD.md](REBUILD.md) for public source. Full snapshot verification uses the exact source, build and infrastructure inputs recorded for the deployment.

Use `npm run verify:list` to inspect scope and prerequisites, then `npm run verify` for public/source/synthetic checks. Missing prerequisites or failed checks fail the run. App/infra types, lint, build, browser and owner checks remain separately declared. Neither a passing public profile nor a manifest refresh is a release approval.

The [historical foundation inventory](history/foundation-20261031/README.md) records earlier source inputs. Deployment receipts retain their original source and verification limits.
