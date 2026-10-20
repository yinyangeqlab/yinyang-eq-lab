# Next-session handoff — current live update81

Start with [../LIVE_STATE.md](../LIVE_STATE.md), [../LIVE_RELEASE.json](../LIVE_RELEASE.json) and [REBUILD.md](REBUILD.md). This page supersedes the archived update73 handoff in history/HANDOFF-through-update73.md.

## Current state

- Live: https://yinyangeq.com, update81. Welcome tagline “Two curves. Your choice.”, gold Continue, fixed five-second matched passages and approved vote styling are deployed.
- Git runtime source matches the verified live snapshot. Implementation08f166f; update81 release records17f8a8c/ad667aa. Later rebuild-audit commits change documentation, validation and rebuild support only.
- `work/tagline-release-20261018` and `work/tagline-infra-20261018` are paths in the owner's workspace, not folders expected in a fresh clone.
- Owner-root config/licenses were reconciled to the verified live mirror after archiving the previous config. Canonical source is workspace/; legacy previews are archived privately.
- No new deployment, data writes, schema migrations or changes to live access/cost protections were performed by the rebuild audit.

## Recovery and workspace cleanup

Use [RECOVERY.md](RECOVERY.md) and [RECOVERY_TESTS.md](RECOVERY_TESTS.md). A tested external bundle/restore workflow is now supplied. Credentials are regenerated; deletion status must be reviewed before restoring participant records. New recovery/infra portability changes are not deployed; live remains update81.

## First actions

1. Fetch GitHub and inspect `git status`/branch divergence before merging or editing. Preserve concurrent intentional changes.
2. Fresh clone: `npm ci`, `node scripts/check-live-source.mjs --source-only`, `npm run build`, then `node scripts/package-static-assets.mjs --public-only`. Run `npm run setup:local` only for a new local DB. Read REBUILD.md for private inputs and production boundaries.
3. Owner workspace: read the current release pointers and run `node scripts/check-live-source.mjs --snapshot`. Never use an older draft or handoff “current” statement as the baseline.
4. Keep credentials, numerical seeds, recordings, DB exports, participant data, Pulumi stack config/state, .dev.vars and .env out of Git. No erased user records may be restored.

## Verified behavior and limitations

Update80 verified actual deployed desktop/mobile responsive passage→vote→Continue flows,0/0 reset, vote locks and320px fit. Update81 verified Welcome assets/layout and unchanged Shootout runtime. Tests used Brave responsive viewports, not physical iOS/Android devices. Native file chooser automation was blocked by browser extension file permissions; synthetic files exercised the deployed real input change handlers. Disposable production test records were erased and independently checked.

Optional activity monitoring remains separate/off by default. Sync is a one-time owner-approved browser transfer, not continuous synchronization. Matched-passage rankings require shared playback intervals; same-recording research can include different passages. Identical-EQ comparisons are consistency checks excluded from target rankings; Unsure/Tie contributes fractional evidence in exploratory rankings.

For future work, the latest user instruction controls whether deployment or GitHub publication is allowed. Building, committing, pushing and deploying are separate actions. The rebuild audit was authorized to push, not redeploy.
