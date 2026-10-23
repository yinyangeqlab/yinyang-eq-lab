# Update114 deployed — October 22, 2026

Release `12c6b88` with additive migration 0040; see docs/HANDOFF.md. Rebuild inputs: `node scripts/check-live-source.mjs --source-only` verifies the files in docs/rebuild-manifest.json (live update 114). A fresh database now uses all 41 migrations plus db/service-status.sql (216 definitions). Recovery handover registration is pending (docs/HANDOFF.md).

## Earlier rebuild notes (historical)

# Update113 deployed — October 22, 2026

Code-only release `5ff9a79`; see docs/HANDOFF.md and docs/releases/update113-verification.json. Rebuild inputs: `node scripts/check-live-source.mjs --source-only` verifies 624+ files against docs/rebuild-manifest.json (live update 113). A fresh database still uses all 40 migrations plus db/service-status.sql (213 definitions); no migration was added. Recovery handover registration is pending (see HANDOFF.md).

## Earlier rebuild notes (historical)

# Update112 recovery registration verified — October 22, 2026

Matching source-only recovery metadata and hosted validation passed after preserving and revalidating the two exact empty validation proofs in private durable evidence. Prior data snapshots and timestamps remain unchanged. No deployment, data export, migration or new data recovery point was performed by the repair. Daily scheduling remains active; today’s earlier failed export is not replaced by metadata registration. See docs/releases/update112-verification.json.

## Earlier rebuild notes (historical)

Current live baseline is 0.2.0-beta.1 / update111, implementation `9d896daacb7a28702fecae2ab9352e1cfe125005`. Source/build `work/reconciled-drafts-release-20261022`; infrastructure `work/reconciled-drafts-infra-20261022`. Selected-passage timing, measurement entry and account Sync activity are deployed on the current layout. Research notes remain proposals. TypeScript, production build, full protected-media packaging, infrastructure checks and eleven synthetic regression suites passed. One existing app Worker code/assets update only; schema213, all40 migrations and existing protections remain. Matching source-only recovery metadata and hosted validation passed with all prior encrypted off-device data snapshots/timestamps unchanged and no export. Physical devices/audio, Safari/iOS and whole-application acceptance remain outside the component review. Reviewed deployed source and verified release records are included in this lab-attributed publication. See docs/releases/update111-verification.json.

## Earlier rebuild and recovery notes (historical)

Current live baseline is 0.2.0-beta.1 / update110, implementation `a8030b0f156bb56926b83d479f875b10ea34305e`. Source/build `work/css-cleanup-release-20261021`; reviewed infrastructure `work/css-cleanup-infra-20261021`. The approved cleanup removes 99 superseded CSS declarations; all 12 stylesheet cleanup checks pass. Twelve player, Library and consent state/viewport pairs have zero computed-style/geometry differences; interactions, native dropdowns and keyboard focus passed synthetic review. The already-published repository rename/source links are included. TypeScript, production build, full protected-media packaging and five relevant regression suites passed. One app Worker code/assets update only; schema 213, all 40 migrations and existing protections remain. Source-only metadata handover and hosted validation passed with all prior encrypted off-device data snapshots/timestamps unchanged and no export. Legacy0.1/update103 remains retained. Physical audio/devices, Safari/iOS and assistive-technology user testing remain unverified. See docs/releases/update110-verification.json.

## Earlier rebuild and recovery notes (historical)

Current live baseline is 0.2.0-beta.1 / update109, implementation `69289ddfc819b443c9b6e2a882c74699d4ef65ea`. Source/build `work/mobile-readability-release-20261021`; reviewed infrastructure `work/mobile-readability-infra-20261021`. Owner-approved mobile Welcome readability keeps the yin-yang/waveform artwork above an opaque reading surface with larger text and controls, quieter Sync and two landmark corrections. One app Worker code/assets update only; schema213, all40 migrations, protected media and existing protections remain. Local axe, mobile gradient contrast, keyboard/text-spacing checks, TypeScript, production build and full protected-media packaging passed; public live appearance was verified. The CSS cleanup check has the same99 pre-existing duplicate declarations on baseline and updated source. Source-only metadata handover and hosted validation passed with prior encrypted off-device data snapshots/timestamps unchanged and zero data exports. Legacy0.1/update103 remains retained. Physical devices/Safari and whole-application accessibility certification remain outside this review. See docs/releases/update109-verification.json.

## Earlier rebuild and recovery notes (historical)

Current live baseline is 0.2.0-beta.1 / update108, implementation `165cf688e75c2be2062414c6fe87bb0b561a85c1`. Source/build `work/sidebar-motion-release-20261021`; reviewed infrastructure `work/sidebar-motion-infra-20261021`. The sidebar hover ring is removed and full/icon/hidden movement is synchronized. One app Worker code/assets update only; schema213, all40 migrations, protected media and existing protections remain. TypeScript, production build, full protected-media packaging, infrastructure checks and synthetic desktop/mobile/narrow browser checks passed; the public live homepage cycle also passed. Source-only metadata handover and matching hosted validation passed with prior encrypted off-device data snapshots/timestamps unchanged and zero data exports. Legacy0.1/update103 remains retained. Physical devices and Safari/iOS remain unverified under the owner's accepted coverage gaps. See docs/releases/update108-verification.json.

## Earlier rebuild and recovery notes (historical)

Current live baseline remains 0.2.0-beta.1 / update107, implementation `eab9029ee22f582c04deff46a65936fb9db7a24a`. Source/build is `work/sidebar-divider-release-20261021`; reviewed infrastructure is `work/sidebar-divider-infra-20261021`. Recovery maintenance registered matching source-only metadata and passed hosted validation without a new data export, data snapshot or website deployment. All prior encrypted off-device recovery points and Legacy0.1/update103 remain retained. Daily scheduling is active; single-writer, schema, media and deployment safeguards remain. Two empty host validation records remain visible but are strictly identified as no-export readers. Physical audio and Safari/iOS remain unverified and owner-accepted. See docs/releases/update107-recovery-verification.json.

## Earlier recovery handover notes

Current live baseline is 0.2.0-beta.1 / update107, implementation `eab9029ee22f582c04deff46a65936fb9db7a24a`. Source/build is `work/sidebar-divider-release-20261021`; reviewed infrastructure is `work/sidebar-divider-infra-20261021`. The single three-state divider, compact dismissible healthy sync status and data-choice colors are deployed. All40 migrations plus db/service-status.sql still produce213 definitions; no new migration, protected-media change or participant-data import occurred. Existing encrypted off-device recovery and Legacy0.1/update103 remain. Source-only metadata handover is pending because the prior unstarted hosted validation is stuck and cancellation is rejected; the daily workflow is active but may refuse the source baseline mismatch. No data export or successful current-release recovery registration is claimed. Physical audio and Safari/iOS remain unverified and owner-accepted. See docs/releases/update107-verification.json.

## Earlier rebuild notes (historical)

Current live baseline is 0.2.0-beta.1 / update106, implementation `87077e897a16b33c00c1528d5f32e430410b617b`. Source/build is `work/nickname-layout-release-20261021`; reviewed infrastructure is `work/nickname-layout-infra-20261021`. The optional nickname placement and focus-clipping correction are deployed. All40 migrations plus db/service-status.sql still produce213 definitions; no new migration, protected-media change or participant-data import occurred. Existing encrypted off-device recovery and Legacy0.1/update103 source/build/media are retained. Source-only metadata handover passed without a new data export; hosted validation remains queued, with no success claimed. Physical audio and Safari/iOS remain unverified and owner-accepted. See docs/releases/update106-verification.json.

## Earlier rebuild notes (historical)

Current live baseline is 0.2.0-beta.1 / update105, implementation `f030b2900c2553645f2a5ef9ef70cb61d8aab1a9`. Source/build is `work/beta-info-release-20261021`; reviewed infrastructure is `work/beta-info-infra-20261021`. The beta UI and public version/help correction are deployed. All40 migrations plus db/service-status.sql still produce213 definitions; no new migration, protected-media change or participant-data import occurred. Existing encrypted off-device recovery and Legacy0.1/update103 source/build/media are retained. Source-only metadata handover and hosted validation passed without a new data export. Physical audio and Safari/iOS remain unverified and owner-accepted. See docs/releases/update105-verification.json.

## Earlier rebuild notes (historical)

Current live baseline is update103, implementation `dae6526b753309c9837c6ff2fc8f2b2ad772b059`. Source/build is `work/consent-isolation-release-20261020`; reviewed infrastructure is `work/consent-isolation-infra-20261020`. Consent/footer update102 and consent-only saving for the fixed hidden test account are deployed and verified. Research, rankings, votes, monitoring, historical sharing and Sync remain blocked for that identity. Desktop/mobile browser checks passed; see CONSENT_BROWSER_REVIEW_2026-10-20.md. No schema or media change occurred in updates102–103. Fresh databases still require all40 migrations plus db/service-status.sql (213 definitions).

Source-only backup metadata handover and hosted validation passed for update103; the existing encrypted off-device data recovery point is retained with its original timestamp. Metadata registration is not a new data snapshot. This source/release-record publication performs no deployment or data export. Public clones use `node scripts/check-live-source.mjs --source-only`; full owner checks require the private immutable release inputs. Preserve local unrelated work and never deploy public-only packages.

## Earlier rebuild notes (historical)

Current live baseline is update101. Segmented automatic account sync removes the aggregate 512 KB cap while excluding actual music/audio files. Migration0039 is additive; fresh databases require 40 migrations plus db/service-status.sql (213 definitions). Verified update96 encrypted recovery is retained; no new export authorized and matching current schema/source baseline remains pending. Read LIVE_RELEASE.json and current handoff.

Current live baseline is update100. Optional participant automatic sync and approved device controls are deployed. Migration0038 is additive; fresh databases require39 migrations plus db/service-status.sql (209 definitions). Verified update96 encrypted recovery is retained; no new export authorized and matching current schema/source baseline remains pending. Read LIVE_RELEASE.json and current handoff.

Current live baseline is update99. Category sharing, consolidated ongoing/historical/file consent and clearer sync controls are deployed; schema unchanged from update98. Existing encrypted update96 recovery remains retained and matching hosted baseline refresh pending. Read LIVE_RELEASE.json and current handoff.

Current live baseline is update98, implementation aca250b79a5b. Historical review uses bounded D1-compatible queries. Schema is unchanged from update97; existing encrypted update96 recovery is retained and matching hosted baseline refresh remains pending. Read LIVE_RELEASE.json and the current handoff.

Current live baseline is update97, implementation4d09994a48dc. Automatic reserved-account sync and protected indefinite retention are deployed; migration0037 is additive. A fresh database uses all38 migrations plus operational db/service-status.sql. Existing update96 encrypted recovery is retained; no update97 backup export was authorized and the hosted baseline refresh remains pending. Read LIVE_RELEASE.json and the current handoff.

## Historical rebuild notes

Current live baseline is update96, implementation89dc69e1bfc1. Immutable source/build: work/consent-release-20261019; infra: work/consent-infra-20261019. Consent dialog shows three choices and draft-only all/required presets. No policy/backend/schema change; all37 migrations plus operational db/service-status.sql remain required for a fresh database. See LIVE_STATE.md and docs/CONSENT_UI_REVIEW_2026-10-19.md.

## Historical rebuild notes

Current live baseline is update95, implementation0ef217b90019. Immutable source/build: work/community-release-20261019; infra: work/community-infra-20261019. Community consent/reference pilot and reviewed audit fixes are deployed; public Community numbers remain withheld. Existing production received0035/0036; a fresh database requires all37 migrations plus operational db/service-status.sql. Read LIVE_STATE.md and DEPENDENCY_SECURITY_REVIEW_2026-10-19.md.

Current live baseline is update94, implementation3762ff728bd545f92530eccbe7a40dcf56658251. Source/build: work/tournament-release-20261019; infra: work/tournament-infra-20261019. Reviewed Personal Tournament/shared controls and contribution isolation;0033/0034 applied. A fresh database uses all35 migrations. See LIVE_RELEASE.json and docs/TOURNAMENT_REVIEW_2026-10-19.md.

## Historical rebuild notes

Current live baseline is update93, implementation 4dbba07333b0755a1ffbd5dc2ce0416b936c6249. Source/build: work/maintenance-ui-release-20261018; infra: work/maintenance-ui-infra-20261018. Reviewed maintenance-control UI only; no backend or schema change. A fresh database uses all33 migrations. Pending personal-shootout work excluded. See LIVE_RELEASE.json.

## Historical rebuild notes

Current live baseline is update92, implementation 8eb2789dd805fd5d1534659c147cc10ec61a6c06. Source/build: work/maintenance-controls-consent-release-20261018; infra: work/maintenance-controls-consent-infra-20261018. Per-feature maintenance, independent participation entry and Tuning layout/ranking fixes; no migration. A fresh database uses all33 migrations. Pending personal-shootout work excluded. See LIVE_RELEASE.json.

## Historical rebuild notes

Current live baseline is update91, implementation 44a63aea01da8c85cf045fdd00fc5614e254b4e2. Source/build: work/maintenance-freeze-release-20261018; infra: work/maintenance-freeze-infra-20261018. Selective timed Shootout maintenance; no migration, scoring-model or listening-protocol change. A fresh database still uses all33 migrations. Pending personal-shootout work is excluded. See LIVE_RELEASE.json.

## Historical rebuild notes

Current live baseline is update90, implementation 5b4cd5867f9a96aca9f8f7778abf95d90259308d. Source/build: work/file-matching-fix-release-20261018; infra: work/file-matching-fix-infra-20261018. SHA-256 file identity and retained tie hashes; no migration, write-API, scoring-model or listening-protocol change. A fresh database still uses all33 migrations. Pending personal-shootout work is excluded. See LIVE_RELEASE.json.

## Historical rebuild notes

Current live baseline is update89, implementation bc806a513bccee93b158199f93b5e9f29b821dc8. Source/build: work/rankings-fix-release-20261018; infra: work/rankings-fix-infra-20261018. Rankings display fixes only; no migration, API or scoring change. A fresh database still uses all33 migrations. Pending personal-shootout work is excluded. See LIVE_RELEASE.json.

## Historical rebuild notes

Current live baseline is update88, implementation a80e13a5505d7de79b374d5c15c0c0ce86016d74. Source/build: work/consent-compact-final-release-20261018; infra: work/consent-compact-final-infra-20261018. No migration for this update. A fresh database still uses all33 migrations. Separate uncommitted personal-shootout changes are not deployed. See LIVE_RELEASE.json.

## Historical rebuild notes

Current live baseline is update87, implementation 158e059965976b49d1763124d72081fd9f940477. Source/build: work/consent-release-20261018; infra: work/consent-infra-20261018. No migration for this update. A fresh database still uses all33 migrations. Separate uncommitted personal-shootout changes are not deployed. See LIVE_RELEASE.json.

## Historical rebuild notes

Current live baseline is update86. Approved nickname and audit corrections are deployed. Verified source/build: work/site-audit-fixes-release-20261018; infrastructure: work/site-audit-fixes-infra-20261018; implementation fb30ec5dc40d813a4a031d3e2e60150892d68a5e. Only additive migration0032_listener_nicknames.sql was applied to the existing database. New databases need all33 migrations. No pending preview or deployment approval. See LIVE_RELEASE.json and HANDOFF.md.

## Historical rebuild notes

Current live baseline is update85. Updates83–85 contain approved display, notice-duration and cited ranking-view changes. The canonical optional nickname preview atae7c196 is not deployed and requires owner approval before migration0032 or its code is published live. Use the immutable matched-ranking release for the verified live source; see LIVE_RELEASE.json.

# Rebuild the current application — live update82

Update82 is deployed with invites off. The implementation is `3565e5b803330e716a881f72e562c24e4211bd68`. Read HANDOFF.md and INVITE_SYSTEM.md first. Build only in workspace/. Full owner snapshots are work/invite-release-20261018 and work/invite-infra-20261018. A new database requires all32 migrations; the existing live database received only0031_site_access_settings.sql. The control table must exist before the new app/gate runs. The missing-row default is off. Consent, media, privacy and deployment protections remain enforced.

Git source includes the deployed canonical-origin binding. Recovery tooling is not a production data restore; the previously verified update81 bundle remains tied to its matching source revision. The clone/build commands and private deployment boundaries below still apply; update81-specific audit statements are historical.

## Historical update81 rebuild audit

# Rebuild the current application — live update81

For complete external-data recovery and canonical workspace layout, start at [RECOVERY.md](RECOVERY.md). It supersedes the earlier root-difference notes; the owner mirror config/licenses have now been reconciled. Recovery tools and domain configuration additions are not deployed.

As of October18,2026, the current live application is update81. Its implementation commit is `08f166f1a542a0ed6aeadd1a37c489d08ae9a8c6`; subsequent commits contain release records and this rebuild audit. `LIVE_RELEASE.json` identifies the immutable owner-workspace snapshot. `docs/rebuild-manifest.json` verifies the public rebuild inputs in this repository. Runtime application files match the verified live snapshot; recovery tooling and undeployed infrastructure portability improvements are separately recorded.

## Fresh clone: build without production access

Use the pinned Node26.12.0/npm12.2.1 toolchain for recovery. Ordinary preview builds declare Node.js22.13+ support; Node22.18+ or24+ is needed for the optional TypeScript/SQLite regression scripts. Python3 is used by the publication and migration checks.

```sh
git clone https://github.com/yinyangeqlab/yinyang-eq-lab.git
cd yinyang-eq-lab
npm ci
node scripts/check-live-source.mjs --source-only
npm run build
node scripts/package-static-assets.mjs --public-only
```

`npm ci` uses the committed package-lock.json, including dev/optional build dependencies. `.npmrc`, `.openai/hosting.json`, Vite plugins, build adapters, public branding/worklet assets and vendor license/CSS files are tracked. Packaging copies public assets because Vite disables automatic public copying, then checks emitted client imports and removes stale redundant preloads. A public clone has no protected recordings, so --public-only explicitly creates a preview package that the deployment code rejects. An owner release must restore the private inputs below and run packaging without that flag. `npm run build` alone does not create a complete asset package.

For a local functional preview, run `npm run setup:local` once against a fresh local database, then `npm run dev`. The initializer applies all SQL migrations in filename order and creates ignored development-only secrets. It does not seed approved target curves or touch production. See [LOCAL_SETUP.md](LOCAL_SETUP.md). Do not run the initializer against an existing database. No deployment is part of these commands.

## What GitHub can and cannot reproduce

GitHub contains all application code, migration/schema files, dependency locks, public static assets and the credential-free app deployment/gate code. It can rebuild the application bundle. A clone alone cannot reproduce live media availability, numerical target records, participant state or production authentication credentials. Those are intentionally not published.

| Owner-only input | Restore from | Verification / constraint |
| --- | --- | --- |
|200 protected recordings under public/music | Owner's existing authorized media package | `LIVE_RELEASE.json` assetFiles and data/listening-pool-audio-manifest.json; run packaging, expect340 total public assets/200 recordings. Keep the gate in front of music and audio APIs. |
|Approved numerical target records | Existing live D1 / authorized current curve source | No target seeds in GitHub. For disaster recovery use only owner-authorized current data respecting deletion records; never restore erased participant records from old recovery material. |
|Pulumi stack configuration/state and Cloudflare account/route identities | Existing owner Pulumi backend and secret manager | Select existing staging stack, whose Worker serves yinyangeq.com. Do not create a replacement stack/database or overwrite bindings. |
|ABUSE_RATE_SECRET, OWNER_ANALYTICS_TOKEN, PRIVATE_ACCESS_PASSWORD | Existing encrypted Pulumi secret config | Required secret values at least32 characters. Never put values in source, logs, screenshots or shell arguments. |
|Cloudflare deployment credentials | Existing authorized credential store | Supply through the normal provider/Pulumi mechanism. Do not commit tokens or encrypted stack exports. |
|Cost-guard bindings and narrow API credential | Existing scheduled guard Worker / secret manager | Preserve separate guard cron, WAF rule, IDs and COST_GUARD_API_TOKEN. Source is infra/cost-guard/{worker,policy}.mjs; account-specific config is excluded. |
|Edge/WAF/domain configuration | Existing Cloudflare account | Separate from app Pulumi. Preserve edge burst120 requests/10s/IP,10s block; static-only exclusions, never music. |

Git source hashes prove input alignment, not byte-for-byte deterministic output across OS/Node/compiler environments. The public TypeScript config excludes the separately managed infra project; check that project after its own npm ci with npm run check. Runtime application code is unchanged. For exact rollback use the recorded immutable owner build and its hashes, not a new build assumed identical.

## Owner deployment rebuild — documentation only

No deployment was performed by the rebuild audit. For a later authorized release:

1. In the owner workspace read LIVE_STATE.md and LIVE_RELEASE.json, run `node scripts/check-live-source.mjs --snapshot`, and review intentional root differences. Old work/, github-ready and local Python previews are not a baseline.
2. Make an isolated release checkout from the verified source. Restore authorized media without publishing it; retain package locks and exact runtime configuration. Build and package; validate all required media and assets before deployment.
3. The tracked `infra/pulumi` code is the verified app deployment source; it includes the private gate, media routing and six abuse bindings. It imports runtime modules from the explicit `DEPLOY_BUILD_ROOT`. From infra/pulumi install its locked dependencies with `npm ci`, authenticate to the existing backend/account and inspect existing `staging` state/config through authorized tooling. Do not run `pulumi stack init` or replace missing existing state with new resources.
4. Set `DEPLOY_BUILD_ROOT` to the absolute intended build directory for preview/up. The app resource retains CPU5000ms, protected D1, private/media admission, disabled workers.dev/preview URLs and existing static routing. A normal app release changes one Worker and leaves the other resources unchanged. Review any different resource plan before proceeding.
5. Keep the independent once-per-minute cost guard, its current thresholds/manual-reset budget rule and edge burst protection. They are separate from this app stack. Never disable them to get a build or rollout through.
6. Deploy only with user authorization. Verify live assets, admission/media and relevant UI flows; erase only disposable fixtures. Update LIVE_RELEASE.json, LIVE_STATE.md, HANDOFF.md and HOSTING_HANDOFF.md together, then commit/push separately as authorized.

No database migrations are needed to rebuild update81 on its already-current live database. A fresh local database uses every checked-in migration, including both distinct0012 files and0028–0030. Existing production migration history must be inspected; never replay the chain blindly.

## Verification commands

```sh
node scripts/check-live-source.mjs --source-only
npx tsc --noEmit
node scripts/check_target_upload.mjs
node scripts/check_comparison_passage.mjs
node scripts/check_browser_pairing.mjs
python3 scripts/check_migration_chain.py
```

The source-only check is clone-safe. Full `--snapshot` verification requires the owner-only build snapshots and configuration identified by LIVE_RELEASE.json. Its absence in a clone is expected; copying private stack files into GitHub is not a fix.
