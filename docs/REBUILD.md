# Rebuild and source verification

<!-- release-state:start -->
Recorded deployment: **update186**, source `54ce48fdd2bbc9984d599df74c75b826014dcbb0`.
Current maintenance, publication and recovery status: [LIVE_STATE.md](deployment/LIVE_STATE.md).
<!-- release-state:end -->

## Update186 homepage artwork

The homepage fits the entire panorama on phone, tablet and ultrawide screens. Motion and carpet controls share the page background. Carpets start hidden and the browser saves the visitor’s choice. Local browser checks covered twelve viewport sizes from 320 to 5120 px. Production delivered the matching homepage, artwork and client assets.

The encrypted off-device recovery baseline passed reconstruction and hosted validation. Existing data recovery points retain their original timestamps.

[Deployment verification](releases/update186-verification.json) · [Recovery verification](releases/update186-recovery-verification.json) · [Publication verification](releases/update186-publication.json)


## Update185 portrait trailer sharing

The Android page includes the 58-second Companion walkthrough below the screenshot gallery. Its player has native playback controls and English captions. The [trailer share page](https://yinyangeq.com/q5k4android/trailer/portrait) supplies the video and poster to Discord. Production checks verified the public MP4 hash, browser playback and crawler metadata. The media endpoint supports byte-range playback and seeking.

The encrypted off-device recovery baseline passed reconstruction and hosted validation. Existing data recovery points retain their original timestamps.

[Deployment verification](releases/update185-verification.json) · [Recovery verification](releases/update185-recovery-verification.json) · [Publication verification](releases/update185-publication.json)


## Update184 Companion walkthrough

The Android page includes the 58-second Companion walkthrough below the screenshot gallery. Its player has native playback controls and English captions. The [trailer share page](https://yinyangeq.com/q5k4android/trailer) supplies the video and poster to Discord. Production checks verified the public MP4 hash, browser playback and crawler metadata. The media endpoint returned the full MP4 for a Range request.

The encrypted off-device recovery baseline passed reconstruction and hosted validation. Existing data recovery points retain their original timestamps.

[Deployment verification](releases/update184-verification.json) · [Recovery verification](releases/update184-recovery-verification.json) · [Publication verification](releases/update184-publication.json)


## Update183 Qudelix 5K Android gallery

The Android Companion page at /q5k4android shows ten screens in four themes. The gallery supports white arrows, page dots, touch swipes and keyboard navigation. The App Manager download opens the Lab’s signed GitHub release. The former /android URL redirects to the new page. The Discord card shows the original 5K and both apps. Production checks covered the Manager APK, 40 gallery screenshots and 397 Worker modules.

The matching encrypted off-device source-only recovery passed independent reconstruction and hosted validation. Existing data snapshots retain their original timestamps.

[Deployment verification](releases/update183-verification.json) · [Recovery verification](releases/update183-recovery-verification.json) · [Publication verification](releases/update183-publication.json)


## Update181 Listening Homepage and Guides

The homepage offers an immediate A/B listening preview. Personal Tournament opens its data choices at Start. The IEM Measurement Guide and other guides share the desktop and mobile navigation. Production verification covered 391 Worker modules and the nine homepage assets. The encrypted off-device backup passed reconstruction and hosted validation using the existing data recovery point.

[Deployment verification](releases/update181-verification.json) · [Recovery verification](releases/update181-recovery-verification.json) · [GitHub publication](releases/update181-publication.json)

The homepage audio generator requires Python with NumPy and FFmpeg. The four illustrations use ImageMagick 7. Running `node scripts/package-static-assets.mjs` after building restores the Barlow font files and license from their pinned revision and generates missing previews. For an offline build, supply the verified Barlow files in `public/sample-assets/` before packaging. The synthetic preview audio is separate from the protected music catalog.


## Update179 repository layout and restore

Build from the repository root. The app lives in `site/`, and the published source manifest tracks the 16-entry layout. The application and AutoEQ checks passed for the deployed revision.

[Deployment verification](releases/update179-verification.json) · [Recovery verification](releases/update179-recovery-verification.json)

## Update178 Version page and mobile Help refresh

The Version page includes searchable release notes, direct links to all 76 updates, and nine restored GitHub links. Ask for help has its own row above the blind comparison controls on phones.

[Deployment verification](releases/update178-mobile-compare-help-verification.json) · [Version page verification](releases/update178-version-page-fixes-verification.json)


## Update175 Arya Stealth preset and Version history

Research Rankings adds an approved Arya Stealth preset entry. The Version page keeps both update174 refresh links and discovers the current GitHub release after publication. The deployed source matches the verified encrypted source-only recovery baseline.

[Update175 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update175) · [Deployment verification](releases/update175-wallpaper-and-tuning-links-verification.json) · [Recovery verification](releases/update175-wallpaper-and-tuning-links-recovery-verification.json)

## Update171 Wallpapers and Version history

The wallpaper gallery adds portrait phone, portrait and landscape tablet, and ultrawide downloads. The live gallery provides the wallpaper files and their personal-use terms. Version history links to the update169 Rankings release, and update171 uses automatic release discovery.

The deployment checks covered desktop, tablet, and phone layouts, wallpaper downloads and animation playback, and the linked releases. The encrypted source-only recovery passed hosted validation.

The isolated restore for `d28f1735ada00e926b27610d06a44579061d8c6a` matched all 1,187 source files and 4,228 build files against the original release ledger.

[Deployment verification](releases/update171-verification.json) · [Recovery verification](releases/update171-recovery-verification.json) · [Isolated recovery verification](releases/update171-wallpapers-isolated-recovery-verification.json)

## Update170 IEM PDF link title

The isolated restore for `cdf527117bb3d3d349eebb7b96e81d9b8d330c40` matched all 1,184 source files and 4,110 build files against the original release record. [Isolated recovery verification](releases/update170-iem-guide-pdf-label-isolated-recovery-verification.json)

## Update170 IEM measurement guide

Glossary & Guides includes a beginner guide to measuring IEMs with a 711 coupler. The live guide includes annotated REW screenshots, two AKG comparison plots, and a technical PDF.

Desktop and phone browser checks passed, and production served all 14 verified guide assets. The matching encrypted source-only recovery passed independent reconstruction and hosted validation.

[Live guide](https://yinyangeq.com/glossary/iem-measurement) · [Deployment verification](../docs/releases/update170-verification.json) · [Recovery verification](../docs/releases/update170-recovery-verification.json)

## Update170 IEM measurement guide

The isolated restore for `3ee4b03e8e07e45af6e9ed362a15f8edc8a8a005` matched all 1,184 source files and 4,094 build files against the original release record. [Isolated recovery verification](releases/update170-iem-guide-isolated-recovery-verification.json)

## Update169 Version history refresh

The update168 history entry on the Version page links to the original EQ preset import release and its direct-link refresh.

Desktop and phone browser checks and live link verification passed. The matching encrypted source-only recovery passed independent reconstruction and hosted validation.

[Deployment verification](../docs/releases/update169-version-history-refresh-verification.json) · [Recovery verification](../docs/releases/update169-version-history-refresh-recovery-verification.json)

## Update169 sidebar refresh

The Home icon is larger. The strip that extends from the fully closed sidebar is teal in both themes. The production refresh was deployed on top of the Rankings release.

All 126 selected deployment checks passed. Brave verified the packaged sidebar at desktop, tablet and phone widths. The matching encrypted off-device source-only recovery passed hosted validation.

[Deployment verification](../docs/releases/update169-sidebar-rollout-verification.json) · [Recovery verification](../docs/releases/update169-sidebar-rollout-recovery-verification.json)

## Update169 Rankings and preset reactions

The isolated restore for `b382bec78f9ecccfb821a8119a7be697ea9cbf44` matched all 1,179 source files and 4,015 build files against the original release record. [Isolated recovery verification](releases/update169-isolated-recovery-verification.json)

All 126 selected suites passed for the deployed application source. A matching encrypted off-device backup passed full reconstruction and hosted validation.

[Update169 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update169) · [Deployment verification](releases/update169-verification.json) · [Recovery verification](releases/update169-recovery-verification.json)

## Update168 Direct GitHub release links

The isolated restore for `020a77ee343860bfdb74b70dbb58daf5cbb53079` matched all 3,990 build files and 1,170 source files against the original release record. [Isolated recovery verification](releases/update168-direct-release-link-isolated-recovery-verification.json)

## Update168 EQ preset imports

EQ preset imports accept Q from 0.01 to 20. Blind EQ Comparison and saved EQs preserve wide filter settings and their precision.

The isolated restore for `210500eb9f6de865b286111f9ec5639955483df4` matched all 1,170 source files and 3,958 build files against the original release record.

[Update168 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update168) · [Deployment verification](releases/update168-verification.json) · [Isolated recovery verification](releases/update168-eq-import-isolated-recovery-verification.json)

## Update168 Version page refresh

The isolated restore for `3a421c972c81f197719b879a0ae52784b598684c` recovered the original build and matched all 3,974 build files against its release record. [Isolated recovery verification](releases/update168-version-link-refresh-isolated-recovery-verification.json)

## Update167 sidebar controls

The full and icon-only sidebars use a silver arrow that grows in place on hover and presses inward when held. The collapsed arrow reveals green-tinted glass near the left edge.

All 125 selected release checks passed. Brave verified all three sidebar states, keyboard focus, reduced motion and the phone menu. The live sidebar assets matched the verified package. Encrypted source-only recovery and hosted validation passed.

The isolated restore for `dc69875afb2bd197ead726458039d51108760099` matched all 1,168 source files and 3,924 build files against the original release record.

[Update167 source release](https://github.com/yinyangeqlab/yinyang-eq-lab/releases/tag/update167) · [Deployment verification](releases/update167-verification.json) · [Recovery verification](releases/update167-recovery-verification.json) · [Isolated recovery verification](releases/update167-sidebar-isolated-recovery-verification.json)

## Update166 Peak & Dip Finder

Peak & Dip Finder accepts a saved EQ or target fit as its reference and plays boosts and cuts as they are edited. Update167 carries forward this deployed source.

The isolated restore for `8c4a50bb2da689a3947d84240b47b9128dc67863` matched all 1,163 source files and 3,904 build files against the original release record.

[Deployment verification](releases/update166-verification.json) · [Recovery verification](releases/update166-recovery-verification.json) · [Isolated recovery verification](releases/update166-finder-isolated-recovery-verification.json)

## Update165 Preference Tuning target match

The isolated restore for `658403035df3bcd207f5297517368419de898917` matched all 1,159 source files and 3,869 compiled files against the original release ledger.

[Deployment verification](releases/update165-verification.json) · [Recovery verification](releases/update165-recovery-verification.json) · [Isolated recovery verification](releases/update165-tuning-target-match-isolated-recovery-verification.json)

## Update164 Version page refresh

The original compiled package was unavailable. The rebuild from `069253c28566b1a1b0c726ae4ca8913dcabd108d` used 1,159 source files whose checksums matched the original release. The isolated restore verified all 1,670 compiled files in the rebuilt package.

[Verified deployment](releases/update164-version-link-refresh-verification.json) · [Verified source-only backup](releases/update164-version-link-refresh-recovery-verification.json) · [Isolated recovery verification](releases/update164-version-link-refresh-isolated-recovery-verification.json)

Use the exact `.nvmrc` and package manager in `package.json`. Validate with `npm run recovery:environment`. Install the committed lock with `npm ci`; retain optional/native dependencies. Do not share a mutable dependency directory with a sealed release.

```sh
npm run recovery:environment
npm ci
node scripts/check-live-source.mjs --source-only
npm run verify
node node_modules/typescript/bin/tsc --project site/tsconfig.json --noEmit
npm run lint
```

The source-only command checks candidate inputs in `docs/rebuild-manifest.json`, not deployment parity. After an intentional reviewed source edit, run `npm run source:refresh` and review that manifest diff, then verify. New untracked inputs require explicit per-path approval; see [manifest approval](ENGINEERING.md#manifest-approval-and-snapshot-drift). A Git checkout is required; source inventory checks do not support ZIP exports. The generated release view is separately checked with `npm run release:check`. Never change historical deployment hashes to make a candidate pass.

A clone contains application code, schema/migrations, locked dependencies, reviewed credential-free infra source and permitted static assets. It excludes recordings, numerical target seeds, participant records, credentials, stack state and generated artifacts. It can run public synthetic checks without production access. Python suites require Python 3 and NumPy. Native Worker checks use `npm run verify -- --profile worker` and need local process/socket capability.

A build also needs the explicitly prepared PEQdB engine/source/license package described in [PEQDB_AUTOEQ.md](PEQDB_AUTOEQ.md). New untracked source must be reviewed under that package's existing source allowlist before preparation; verification does not silently approve or stage it. Restore the pinned Public Sans font through `scripts/prepare-vote-font.mjs` with authorized inputs. Full private-media builds need the original verified media and `scripts/prepare-waveform-peaks.py` (Python/NumPy and FFmpeg/FFprobe). Keep external inputs and generated output ignored and outside publication.

For the optional on-device help matcher, save `model.safetensors` and `tokenizer.json` from [Potion 2M at the pinned revision](https://huggingface.co/minishlab/potion-base-2M/tree/389b9f64be5aa4ae7a6bc6fe95ef20ce485ae5da) to an external folder. Run `python3 scripts/prepare-site-help-model.py --inputs /path/to/folder` with NumPy installed. This checks both source hashes and prepares a static model and MIT notice under ignored `public/vendor/site-help/`. Package that asset alongside the site to enable semantic matching. Run `node scripts/train-site-help.mjs` to rebuild the small classifier from the synthetic questions in `scripts/site-help-training.json` and the approved guide. The text guide works when the model is unavailable.

Once inputs are prepared, `npm run build` followed by `node scripts/package-static-assets.mjs --public-only` makes a **nondeployable public preview**. A full owner package omits that flag and must verify the complete inputs against its exact manifest. Build alone is not a complete package. Do not use fixed counts from older handoffs to approve today's assets.

For a fresh disposable local database only, follow [LOCAL_SETUP.md](LOCAL_SETUP.md) and `npm run setup:local`; never initialize over a restored or existing database. Synthetic browser review follows [ADMIN_TEST_ISOLATION.md](ADMIN_TEST_ISOLATION.md). A renderer preview does not prove the production gate or Worker behavior.

Owner snapshot verification: run `node scripts/check-live-source.mjs --snapshot` in the owner root with its current release record and private immutable paths (`--assets` adds asset coverage). Exit 2 reports working-documentation drift alone and is not a full pass; exit 1 includes runtime/infra/build/configuration errors. Expected foundation documentation differences and immutable owner evidence are explained in [ENGINEERING.md](ENGINEERING.md#manifest-approval-and-snapshot-drift). Do not copy private inputs into Git or edit sealed snapshots/deployment hashes to make this check pass. Exact rollback uses recorded immutable output; a fresh build is not assumed byte-identical.

For a separately authorized release, use the existing infra backend/stack, its own lock and `npm run check`, explicit `DEPLOY_BUILD_ROOT`, and the reviewed resource plan. Apply through the [guarded rollout command](deployment/HOSTING_HANDOFF.md) after the current live release's handoff and source-only recovery pass verification. Preserve all access/media/abuse/CPU/edge/cost controls. Never initialize a replacement production stack, replay migrations blindly or deploy a public-only package. See [RECOVERY.md](RECOVERY.md). The [historical source inventory](history/foundation-20261031/README.md) records earlier source inputs.
