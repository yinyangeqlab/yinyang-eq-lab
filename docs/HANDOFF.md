# Development handoff

<!-- release-state:start -->
Recorded deployment: **update177**, source `867cb113729a7df640d4d23e8297b75bd97cbf32`.
Current maintenance, publication and recovery status: [LIVE_STATE.md](deployment/LIVE_STATE.md).
<!-- release-state:end -->

## Update177 Saved EQ uploads

Import a parametric EQ TXT file from Saved EQs, Tuning, or Music library. Saved EQs can open the imported preset in Tuning for listening. Update177 also includes the revised IEM measurement guide and its fillable checklist.

[Deployment verification](releases/update177-verification.json) · [Source-only recovery verification](releases/update177-recovery-verification.json)


## Update175 Arya Stealth preset and Version history

Research Rankings adds an approved Arya Stealth preset entry. The Version page keeps both update174 refresh links and discovers the current GitHub release after publication. The deployed source matches the verified encrypted source-only recovery baseline.

[Update175 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update175) · [Deployment verification](releases/update175-wallpaper-and-tuning-links-verification.json) · [Recovery verification](releases/update175-wallpaper-and-tuning-links-recovery-verification.json)

The live page discovered the update175 link in both sections after publication on the same Worker deployment. The next build keeps the verified release tag and source commit in Version history. The guarded rollout checks both against the owner release record. [Publication verification](releases/update175-publication.json)

## Update174 Version page link for the Tuning playback fix

The update173 Preference Tuning playback entry links to its GitHub release and source commit. The public checkout carries that entry alongside the recorded update171 build baseline. [Live Version entry](https://yinyangeq.com/version#update173) · [Playback fix release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update173)

The production link refresh was deployed from `77b6546a4e4ca339f6d7ece853d81f570d987a4b`. The live destination returned the published release, and packaged Brave checks verified keyboard navigation at desktop and phone widths. [Deployment verification](releases/update174-tuning-playback-release-link-verification.json) · [Recovery verification](releases/update174-tuning-playback-release-link-recovery-verification.json)

## Update173 Preference Tuning playback

Preference Tuning now uses the same EQ readiness check when preparing playback and when the browser starts the track. The fix prevents library tracks and local files from pausing immediately.

The production fix was deployed from `6645a56537b19b5568630b4e0f710603b2b727ca`. The public source replays the playback fix and its regressions on scrubbed main. The deployment was verified in Brave at desktop and phone widths. [Deployment verification](releases/update173-verification.json) · [Recovery verification](releases/update173-recovery-verification.json)

## Update169 release links on the Version page

The Version history entry links to the published [Rankings release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update169) and [Sidebar refresh](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update169-sidebar-rollout). Both links were verified on the live update171 Version refresh from source `fb04020c6c1a0122fd3482398833993e9fa89e86`. Desktop and phone checks covered keyboard navigation, and both live destinations returned HTTP 200. The matching encrypted off-device recovery passed hosted validation. [Live Version page](https://yinyangeq.com/version#update169)

## Update171 Wallpapers and Version history

The wallpaper gallery adds portrait phone, portrait and landscape tablet, and ultrawide downloads. The live gallery provides the wallpaper files and their personal-use terms. Version history links to the update169 Rankings release, and update171 uses automatic release discovery.

The deployment checks covered desktop, tablet, and phone layouts, wallpaper downloads and animation playback, and the linked releases. The encrypted source-only recovery passed hosted validation.

A fresh download of the encrypted off-device source-only backup for `d28f1735ada00e926b27610d06a44579061d8c6a` passed an isolated restore. Browser checks at desktop, tablet, and phone widths covered the wallpaper gallery and downloads. The restored app also passed animation playback and Version history link checks.

[Deployment verification](releases/update171-verification.json) · [Recovery verification](releases/update171-recovery-verification.json) · [Isolated recovery verification](releases/update171-wallpapers-isolated-recovery-verification.json)

## Update170 IEM PDF link title

A fresh download of the encrypted off-device source-only backup for `cdf527117bb3d3d349eebb7b96e81d9b8d330c40` passed an isolated restore. Desktop and phone browser checks verified the link title **YinYang EQ IEM Measurement Guide (711 Coupler, PDF)** and keyboard focus. [Isolated recovery verification](releases/update170-iem-guide-pdf-label-isolated-recovery-verification.json)

## Update170 IEM measurement guide

Glossary & Guides includes a beginner guide to measuring IEMs with a 711 coupler. The live guide includes annotated REW screenshots, two AKG comparison plots, and a technical PDF.

Desktop and phone browser checks passed, and production served all 14 verified guide assets. The matching encrypted source-only recovery passed independent reconstruction and hosted validation.

[Live guide](https://yinyangeq.com/glossary/iem-measurement) · [Deployment verification](../docs/releases/update170-verification.json) · [Recovery verification](../docs/releases/update170-recovery-verification.json)

## Update170 IEM measurement guide

A fresh download of the encrypted off-device source-only backup for `3ee4b03e8e07e45af6e9ed362a15f8edc8a8a005` passed an isolated restore. Desktop and phone browser checks verified the glossary link, all 13 images, and nine visible callout lists. [Isolated recovery verification](releases/update170-iem-guide-isolated-recovery-verification.json)

## Update169 Version history refresh

The update168 history entry on the Version page links to the original EQ preset import release and its direct-link refresh.

Desktop and phone browser checks and live link verification passed. The matching encrypted source-only recovery passed independent reconstruction and hosted validation.

[Deployment verification](../docs/releases/update169-version-history-refresh-verification.json) · [Recovery verification](../docs/releases/update169-version-history-refresh-recovery-verification.json)

## Update169 sidebar refresh

The Home icon is larger. The strip that extends from the fully closed sidebar is teal in both themes. The production refresh was deployed on top of the Rankings release.

All 126 selected deployment checks passed. Brave verified the packaged sidebar at desktop, tablet and phone widths. The matching encrypted off-device source-only recovery passed hosted validation.

[Deployment verification](../docs/releases/update169-sidebar-rollout-verification.json) · [Recovery verification](../docs/releases/update169-sidebar-rollout-recovery-verification.json)

## Update169 Rankings and preset reactions

A fresh download of the encrypted off-device source-only backup for `b382bec78f9ecccfb821a8119a7be697ea9cbf44` passed an isolated restore. Using synthetic data, the restored app passed the Target and EQ preset rankings, preset reactions, and Version page release-feed fallback checks. [Isolated recovery verification](releases/update169-isolated-recovery-verification.json)

Research Rankings shows target and EQ preset rankings together. The Version page can discover the current GitHub release using the public release feed when the API is unavailable.

[Update169 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update169) · [Deployment verification](releases/update169-verification.json) · [Recovery verification](releases/update169-recovery-verification.json)

## Update168 Direct GitHub release links

Source `020a77ee343860bfdb74b70dbb58daf5cbb53079` displays the update168 GitHub release link in Changes in this build and in Release history. Both links rendered with outbound requests blocked in an isolated restore from a fresh download of the encrypted off-device source-only backup. [Isolated recovery verification](releases/update168-direct-release-link-isolated-recovery-verification.json)

## Update168 EQ preset imports

EQ preset imports accept Q from 0.01 to 20. Blind EQ Comparison and saved EQs preserve wide filter settings and their precision.
The Version page includes the verified update166 history link.

A fresh download of the recreated encrypted off-device source-only backup for `210500eb9f6de865b286111f9ec5639955483df4` passed an isolated restore. The restored build passed Blind EQ Comparison and saved EQ checks, including preservation of imported filter Q precision.

[Update168 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update168) · [Deployment verification](releases/update168-verification.json) · [Isolated recovery verification](releases/update168-eq-import-isolated-recovery-verification.json)

## Update168 Version page refresh

Source `3a421c972c81f197719b879a0ae52784b598684c` adds direct links to the update166 Peak & Dip Finder release and its published source commit. A fresh download of its encrypted off-device source-only backup passed an isolated restore with synthetic data. All 3,974 build files matched the original release record.

[Deployment verification](releases/update168-version-link-refresh-verification.json) · [Isolated recovery verification](releases/update168-version-link-refresh-isolated-recovery-verification.json)

## Update167 sidebar controls

The full and icon-only sidebars use a silver arrow that grows in place on hover and presses inward when held. The collapsed arrow reveals green-tinted glass near the left edge.

All 125 selected release checks passed. Brave verified all three sidebar states, keyboard focus, reduced motion and the phone menu. The live sidebar assets matched the verified package. Encrypted source-only recovery and hosted validation passed.

A fresh download of the recreated encrypted off-device source-only backup for `dc69875afb2bd197ead726458039d51108760099` passed an isolated restore. A local browser verified all three desktop sidebar states, hover and press behavior, keyboard controls, reduced motion, and the phone menu.

[Update167 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update167) · [Deployment verification](releases/update167-verification.json) · [Recovery verification](releases/update167-recovery-verification.json) · [Isolated recovery verification](releases/update167-sidebar-isolated-recovery-verification.json)

## Update166 Peak & Dip Finder

Peak & Dip Finder accepts a saved EQ or target fit as its reference and plays boosts and cuts as they are edited. Update167 carries forward this deployed source.

A fresh download of the recreated encrypted off-device source-only backup for `8c4a50bb2da689a3947d84240b47b9128dc67863` passed an isolated restore. Desktop and phone browser checks verified saved EQ selection and all three response curves. A muted desktop browser confirmed live boosts and cuts through its output meter using a synthetic tone.

[Deployment verification](releases/update166-verification.json) · [Recovery verification](releases/update166-recovery-verification.json) · [Isolated recovery verification](releases/update166-finder-isolated-recovery-verification.json)

## Update165

Preference Tuning selects Target match, the generated EQ with the lowest fit error, by default for exports. Lower boost remains available. Both choices show their preamp adjustment.

All 125 selected release checks passed. Browser checks verified both downloaded EQs at desktop and phone widths. The live Tuning assets match the tested package. The encrypted source-only recovery passed independent reconstruction and hosted validation.

A fresh download of the encrypted off-device source-only backup for `658403035df3bcd207f5297517368419de898917` passed an isolated restore. Desktop and phone checks verified that Target match is selected first, Lower boost is selectable by keyboard, and both EQ downloads contain their displayed preamp values.

[Update165 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update165) · [Deployment verification](releases/update165-verification.json) · [Recovery verification](releases/update165-recovery-verification.json) · [Isolated recovery verification](releases/update165-tuning-target-match-isolated-recovery-verification.json)

## Update164 Version page refresh

The Version page displays the verified update164 GitHub link without waiting for GitHub’s API. The live link opened the original [update164 release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update164).

The shared rollout guard passed, and all 125 selected release checks passed. The refreshed build’s encrypted source-only backup passed independent reconstruction and hosted validation. The job created zero new data snapshots.

A fresh download of the encrypted off-device source-only rebuild from `069253c28566b1a1b0c726ae4ca8913dcabd108d` passed an isolated restore. Desktop and phone checks verified the direct update164 and update159 history links and keyboard navigation with outbound requests blocked.

[Refresh source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update164-version-link-refresh) · [Verified deployment](releases/update164-version-link-refresh-verification.json) · [Verified source-only backup](releases/update164-version-link-refresh-recovery-verification.json) · [Isolated recovery verification](releases/update164-version-link-refresh-isolated-recovery-verification.json)

## Update164

Site Help answers questions about Personal Tournament, Preference Tuning, My data, and related listening tools. Show me walks through reviewed steps and highlights the relevant control. Questions stay in the browser.

The rollout used the shared guard and accepted the active update163 recovery before applying. [Deployment verification](releases/update164-verification.json) · [Prior recovery verification](releases/update163-automatic-version-link-worker-recovery-verification.json)

Matching encrypted off-device source-only recovery passed hosted validation and independent reconstruction. The existing data snapshot retained its timestamp. [Recovery verification](releases/update164-recovery-verification.json)

## Update163

Failed POSTs to `/api/listening-runs` and `/api/votes` go to a private Cloudflare Worker configured for 100% log sampling. The main Worker keeps its 10% sample. The existing owner-only query still finds `shootout_submission_failed`; rows include the route, HTTP status, stage and reason code. Isolated test-account denials are labeled `test_account`.

The collector receives no submission content and has no access to the rankings database. Coverage starts at the site Worker. Errors before a browser sends a request and blocks before Cloudflare invokes the site Worker are outside this diagnostic.

Cloudflare recorded one expected 403 denial from each endpoint using the isolated test account. Both live ranking counts stayed unchanged. [Deployment verification](releases/update163-verification.json)

Encrypted off-device source-only recovery and hosted validation passed. The daily backup schedule was verified active at 3 a.m. Pacific. The existing data snapshot was retained with its original timestamp. [Recovery verification](releases/update163-recovery-verification.json)

[Update163 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update163) · [Publication verification](releases/update163-publication.json)

### Earlier update163 automatic Version link build

Build `f41a8036` was superseded before its recovery handover finished. On November 14, 2026, a fresh download of its encrypted off-device source-only backup passed an isolated restore. All 3,758 build files matched the original release record, and the app ran locally with synthetic data.

The restored Worker reproduced the automatic GitHub lookup failure. The Version page displayed its recorded fallback link. [Isolated recovery verification](releases/update163-automatic-version-link-recovery-verification.json)

## Update162

Personal Tournament plays leading curves more often. Progress bars show how close each curve is to leaving rotation after a vote, in tournament results, and in My Collection. Listeners can restore curves that leave rotation.

All 123 selected release checks passed. The dedicated layout account verified vote review, progress bars, standings, keyboard navigation and Restore at desktop and phone widths with synthetic curves and audio. [Deployment verification](releases/update162-verification.json)

Encrypted off-device source-only recovery and hosted validation passed. [Recovery verification](releases/update162-recovery-verification.json)

[Update162 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update162) · [Publication verification](releases/update162-publication.json)

## Update161

Play both segments shows Preparing audio… while the track and EQ load. Ranked Blind Shootout requires five seconds of the same passage per side. Eligible new Rapid choices count in a separate Free Listening ranking with no playback minimum.

The isolated account verified both modes live without submitting a public vote. In a disposable database, a Ranked vote updated Standard and a Rapid choice updated Free Listening. [Deployment verification](releases/update161-verification.json)

Update162 superseded update161 during the live backup handover. On November 14, 2026, a separate encrypted off-device source-only recovery point for update161 passed an isolated restore. A fresh download matched the preserved build, and the restored app ran locally with synthetic data. Both Shootout modes, separate ranking views, protected audio and test account write restrictions passed. No database export was performed. [Update161 recovery verification](releases/update161-recovery-verification.json)

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

## Update145–147 recovery

On November 14, 2026, each encrypted off-device source-only rebuild passed an isolated restore from a fresh download. The builds came from the original source revisions and ran locally with synthetic data. Byte-for-byte equivalence to the original deployed builds remains unverified. No database export was performed.

- Update145 showed both PEQdB fitting modes in the fitter guide. [Recovery verification](releases/update145-recovery-verification.json)
- Update146 loaded both wallpaper download cards and served the verified offline ZIPs. [Recovery verification](releases/update146-recovery-verification.json)
- Update147 loaded the 61-file AutoEq catalog and passed the browser search check. [Recovery verification](releases/update147-recovery-verification.json)

## Update113–115 recovery

On November 14, 2026, all three encrypted off-device source-only rebuilds passed isolated restores from fresh downloads. Each app ran locally with synthetic data. Byte-for-byte equivalence to the original deployed builds remains unverified. No database export was performed.

- Update113 passed the playback shortcut checks and loaded the Personal Tournament starter. [Recovery verification](releases/update113-recovery-verification.json)
- Update114 passed the target-removal schema and participation checks. [Recovery verification](releases/update114-recovery-verification.json)
- Update115 passed public and private link-preview checks. Its original deployment documentation was preserved alongside the saved Git revision. [Recovery verification](releases/update115-recovery-verification.json)

## Update97–100 recovery

On November 14, 2026, all four encrypted off-device source-only rebuilds passed isolated restores from fresh downloads. Each app ran locally with synthetic data. The source files matched the original release records. Byte-for-byte equivalence to the original deployed builds remains unverified. No database export was performed.

- Update97 passed Owner Sync and retention checks. [Recovery verification](releases/update97-recovery-verification.json)
- Update98 passed private history and account-linking checks. [Recovery verification](releases/update98-recovery-verification.json)
- Update99 passed participation and consent checks. [Recovery verification](releases/update99-recovery-verification.json)
- Update100 passed checks for participant Sync and device controls. [Recovery verification](releases/update100-recovery-verification.json)

Use the [release versioning skill](skills/yinyangeq-release-versioning/SKILL.md) when preparing the next preview, commit, deployment or handoff. Verify GitHub source links separately from the live deployment record.

Read [AGENTS.md](../AGENTS.md), [ENGINEERING.md](ENGINEERING.md), [REBUILD.md](REBUILD.md) and [RECOVERY.md](RECOVERY.md). `docs/deployment/LIVE_RELEASE.json` and its receipt document the deployment captured by this source snapshot. See the [live version page](https://yinyangeq.com/version) for the build currently served.

Start from the lab repository's public `main` and inspect the current branch and working tree before preparing a change. Use the clone-safe check in [REBUILD.md](REBUILD.md) for public source. Full snapshot verification uses the exact source, build and infrastructure inputs recorded for the deployment.

Use `npm run verify:list` to inspect scope and prerequisites, then `npm run verify` for public/source/synthetic checks. Missing prerequisites or failed checks fail the run. App/infra types, lint, build, browser and owner checks remain separately declared. Neither a passing public profile nor a manifest refresh is a release approval.

The [historical foundation inventory](history/foundation-20261031/README.md) records earlier source inputs. Deployment receipts retain their original source and verification limits.
