# Hosting handoff

<!-- release-state:start -->
Recorded deployment: **update190**, source `8952dc90f3e0f7fc880fedfae6333a2f7b91cacb`.
Current maintenance, publication and recovery status: [LIVE_STATE.md](LIVE_STATE.md).
<!-- release-state:end -->

## Update190 ultrawide homepage

The desktop panorama extends the red and blue mountains to the edges and reveals more waves. The listening heading sits above the midpoint at 3440 × 1440 and 5120 × 1440. The phone keeps its original artwork framing.

Encrypted off-device source-only recovery and hosted validation passed.

[Deployment verification](../releases/update190-verification.json) · [Recovery verification](../releases/update190-recovery-verification.json) · [Publication verification](../releases/update190-publication.json)


## Update189 Android downloads

The Android page links directly to the signed Companion APK alongside App Manager. The downloads matched their published releases. Both controls were checked at 320, 390 and 1280 px and with keyboard navigation.

Encrypted off-device source-only recovery and hosted validation passed.

[Deployment verification](../releases/update189-verification.json) · [Recovery verification](../releases/update189-recovery-verification.json) · [Publication verification](../releases/update189-publication.json)


## Update188 Google Search discovery

The root sitemap lists 31 public pages, including the Android Companion. Live checks verified the sitemap, crawler metadata, and protected sign-in pages. [Deployment verification](../releases/update188-verification.json) · [Recovery verification](../releases/update188-recovery-verification.json) · [Publication verification](../releases/update188-publication.json)


## Update187 homepage artwork

The homepage artwork fills its content column and crops vertically around the red and blue lights when needed. The comparison heading starts by the vertical midpoint. On short phones the closed Help button sits in a corner of the artwork. Motion and carpet controls share the page background. Carpets start hidden and the browser saves the visitor’s choice. Local browser checks covered fourteen viewport sizes from 320 to 5120 px. Production delivered the matching homepage, artwork and client assets.

The encrypted off-device recovery baseline passed reconstruction and hosted validation. Existing data recovery points retain their original timestamps.

[Deployment verification](../releases/update187-verification.json) · [Recovery verification](../releases/update187-recovery-verification.json) · [Publication verification](../releases/update187-publication.json)


## Update186 homepage artwork

The homepage fits the entire panorama on phone, tablet and ultrawide screens. Motion and carpet controls share the page background. Carpets start hidden and the browser saves the visitor’s choice. Local browser checks covered twelve viewport sizes from 320 to 5120 px. Production delivered the matching homepage, artwork and client assets.

The encrypted off-device recovery baseline passed reconstruction and hosted validation. Existing data recovery points retain their original timestamps.

[Deployment verification](../releases/update186-verification.json) · [Recovery verification](../releases/update186-recovery-verification.json) · [Publication verification](../releases/update186-publication.json)


## Update185 portrait trailer sharing

The Android page includes the 58-second Companion walkthrough below the screenshot gallery. Its player has native playback controls and English captions. The [trailer share page](https://yinyangeq.com/q5k4android/trailer/portrait) supplies the video and poster to Discord. Production checks verified the public MP4 hash, browser playback and crawler metadata. The media endpoint supports byte-range playback and seeking.

The encrypted off-device recovery baseline passed reconstruction and hosted validation. Existing data recovery points retain their original timestamps.

[Deployment verification](../releases/update185-verification.json) · [Recovery verification](../releases/update185-recovery-verification.json) · [Publication verification](../releases/update185-publication.json)


## Update184 Companion walkthrough

The Android page includes the 58-second Companion walkthrough below the screenshot gallery. Its player has native playback controls and English captions. The [trailer share page](https://yinyangeq.com/q5k4android/trailer) supplies the video and poster to Discord. Production checks verified the public MP4 hash, browser playback and crawler metadata. The media endpoint returned the full MP4 for a Range request.

The encrypted off-device recovery baseline passed reconstruction and hosted validation. Existing data recovery points retain their original timestamps.

[Deployment verification](../releases/update184-verification.json) · [Recovery verification](../releases/update184-recovery-verification.json) · [Publication verification](../releases/update184-publication.json)


## Update183 Qudelix 5K Android gallery

The Android Companion page at /q5k4android shows ten screens in four themes. The gallery supports white arrows, page dots, touch swipes and keyboard navigation. The App Manager download opens the Lab’s signed GitHub release. The former /android URL redirects to the new page. The Discord card shows the original 5K and both apps. Production checks covered the Manager APK, 40 gallery screenshots and 397 Worker modules.

The matching encrypted off-device source-only recovery passed independent reconstruction and hosted validation. Existing data snapshots retain their original timestamps.

[Deployment verification](../releases/update183-verification.json) · [Recovery verification](../releases/update183-recovery-verification.json) · [Publication verification](../releases/update183-publication.json)


## Update181 Listening Homepage and Guides

The homepage offers an immediate A/B listening preview. Personal Tournament opens its data choices at Start. The IEM Measurement Guide and other guides share the desktop and mobile navigation. Production verification covered 391 Worker modules and the nine homepage assets. The encrypted off-device backup passed reconstruction and hosted validation using the existing data recovery point.

[Deployment verification](../releases/update181-verification.json) · [Recovery verification](../releases/update181-recovery-verification.json) · [GitHub publication](../releases/update181-publication.json)


## Update179 repository layout and restore

The verified update179 rollout retains the existing hosting safeguards and public URLs. Production checks covered the IEM guide PDF, its legacy redirect, the guide assets, and the Version page.

[Deployment verification](../releases/update179-verification.json) · [Recovery verification](../releases/update179-recovery-verification.json)

## Update178 Version page and mobile Help refresh

The Version page includes searchable release notes, direct links to all 76 updates, and nine restored GitHub links. Ask for help has its own row above the blind comparison controls on phones.

[Deployment verification](../releases/update178-mobile-compare-help-verification.json) · [Version page verification](../releases/update178-version-page-fixes-verification.json)

The live Version page discovered the GitHub release automatically. [Source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update178) · [Publication verification](../releases/update178-publication.json)


## Update175 Arya Stealth preset and Version history

Research Rankings adds an approved Arya Stealth preset entry. The Version page keeps both update174 refresh links and discovers the current GitHub release after publication. The deployed source matches the verified encrypted source-only recovery baseline.

[Update175 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update175) · [Deployment verification](../releases/update175-wallpaper-and-tuning-links-verification.json) · [Recovery verification](../releases/update175-wallpaper-and-tuning-links-recovery-verification.json)

The live page discovered the update175 link in both sections after publication on the same Worker deployment. The next build keeps the verified release tag and source commit in Version history. The guarded rollout checks both against the owner release record. [Publication verification](../releases/update175-publication.json)

## Update171 Wallpapers and Version history

The wallpaper gallery adds portrait phone, portrait and landscape tablet, and ultrawide downloads. The live gallery provides the wallpaper files and their personal-use terms. Version history links to the update169 Rankings release, and update171 uses automatic release discovery.

The deployment checks covered desktop, tablet, and phone layouts, wallpaper downloads and animation playback, and the linked releases. The encrypted source-only recovery passed hosted validation.

[Deployment verification](../releases/update171-verification.json) · [Recovery verification](../releases/update171-recovery-verification.json)

## Update170 IEM measurement guide

Glossary & Guides includes a beginner guide to measuring IEMs with a 711 coupler. The live guide includes annotated REW screenshots, two AKG comparison plots, and a technical PDF.

Desktop and phone browser checks passed, and production served all 14 verified guide assets. The matching encrypted source-only recovery passed independent reconstruction and hosted validation.

[Live guide](https://yinyangeq.com/glossary/iem-measurement) · [Deployment verification](../releases/update170-verification.json) · [Recovery verification](../releases/update170-recovery-verification.json)

## Update169 Version history refresh

The update168 history entry on the Version page links to the original EQ preset import release and its direct-link refresh.

Desktop and phone browser checks and live link verification passed. The matching encrypted source-only recovery passed independent reconstruction and hosted validation.

[Deployment verification](../releases/update169-version-history-refresh-verification.json) · [Recovery verification](../releases/update169-version-history-refresh-recovery-verification.json)

## Update169 sidebar refresh

The Home icon is larger. The strip that extends from the fully closed sidebar is teal in both themes. The production refresh was deployed on top of the Rankings release.

All 126 selected deployment checks passed. Brave verified the packaged sidebar at desktop, tablet and phone widths. The matching encrypted off-device source-only recovery passed hosted validation.

[Deployment verification](../releases/update169-sidebar-rollout-verification.json) · [Recovery verification](../releases/update169-sidebar-rollout-recovery-verification.json)

## Update169 Target and EQ preset rankings

Research Rankings shows target and EQ preset rankings together. The Version page can discover the current GitHub release using the public release feed when the API is unavailable.

[Update169 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update169) · [Deployment verification](../releases/update169-verification.json) · [Recovery verification](../releases/update169-recovery-verification.json)

## Update168 EQ preset imports

EQ preset imports accept Q from 0.01 to 20. Blind EQ Comparison and saved EQs preserve wide filter settings and their precision. The Version page includes the verified update166 history link.

[Update168 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update168) · [Deployment verification](../releases/update168-version-link-refresh-verification.json)

## Update167 sidebar controls

The full and icon-only sidebars use a silver arrow that grows in place on hover and presses inward when held. The collapsed arrow reveals green-tinted glass near the left edge.

All 125 selected release checks passed. Brave verified all three sidebar states, keyboard focus, reduced motion and the phone menu. The live sidebar assets matched the verified package. Encrypted source-only recovery and hosted validation passed.

[Update167 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update167) · [Deployment verification](../releases/update167-verification.json) · [Recovery verification](../releases/update167-recovery-verification.json)

## Update166 Peak & Dip Finder

Peak & Dip Finder accepts a saved EQ or target fit as its reference and plays boosts and cuts as they are edited. Update167 carries forward this deployed source.

[Deployment verification](../releases/update166-verification.json) · [Recovery verification](../releases/update166-recovery-verification.json)

Use the [release versioning skill](../skills/yinyangeq-release-versioning/SKILL.md) for candidate build IDs and changelog entries. This generated release block records the last verified live update.


Deployment, GitHub publication and recovery registration are separate actions. Follow [the engineering process](../ENGINEERING.md) and [rebuild guide](../REBUILD.md). Preserve private admission/media, CPU5000ms, six abuse bindings, disabled public Worker URLs, edge burst protection and the independent cost guard. Keep stack configuration/state, secrets and private receipts outside Git.

Use the existing owner stack and exact prepared build; never initialize replacement resources to work around missing state. Inspect the resource plan and recovery coverage before any authorized rollout. A public-only preview package cannot deploy. Verify actual modules/assets and gate behavior, then update the authoritative release record and regenerate/check all views with `npm run release:refresh` and `npm run release:check`. Review the diff, explicitly approve new source paths, then run `npm run source:refresh` and `npm run verify`. Do not deploy for a documentation audit. Original resource/deployment evidence remains in the release receipts and [historical source inventory](../history/foundation-20261031/README.md).

Before applying the next production release, finish the **currently live** release's handoff and verify its encrypted source-only backup and hosted validation. From the existing Pulumi stack directory, first check the baseline and stack target without applying a plan.

```sh
bash "$release/scripts/deploy-reviewed.sh" --check "$workspace"
```

Apply the reviewed candidate and saved plan from that same stack directory.

```sh
DEPLOY_BUILD_ROOT="$release" bash "$release/scripts/deploy-reviewed.sh" "$workspace" "$plan"
```

`workspace` is the canonical owner checkout, `release` is the absolute path to the prepared candidate, and `plan` is the absolute path to its reviewed plan. Use the guarded command with older local infrastructure snapshots too. The check verifies the handoff views, public and private recovery receipts, and active Worker version under the same lock as recovery registration. When it blocks, resolve the mismatch or wait for hosted validation and update the owner records before retrying. After the rollout, verify the new release and complete its handoff and source-only registration while that exact build is still live.
