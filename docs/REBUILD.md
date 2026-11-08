# Rebuild and source verification

<!-- release-state:start -->
Recorded deployment: **update132**, source `f33b8fb2906e3005a50f06e3fc436b1b145c2e79`.
Current maintenance, publication and recovery status: [LIVE_STATE.md](../LIVE_STATE.md).
<!-- release-state:end -->

Use the exact `.node-version` / `.nvmrc` and package manager in `package.json`. Validate with `npm run recovery:environment`. Install the committed lock with `npm ci`; retain optional/native dependencies. Do not share a mutable dependency directory with a sealed release.

```sh
npm run recovery:environment
npm ci
node scripts/check-live-source.mjs --source-only
npm run verify
node node_modules/typescript/bin/tsc --noEmit
npm run lint
```

The source-only command checks candidate inputs in `docs/rebuild-manifest.json`, not deployment parity. After an intentional reviewed source edit, run `npm run source:refresh` and review that manifest diff, then verify. New untracked inputs require explicit per-path approval; see [manifest approval](ENGINEERING.md#manifest-approval-and-snapshot-drift). A Git checkout is required; source inventory checks do not support ZIP exports. The generated release view is separately checked with `npm run release:check`. Never change historical deployment hashes to make a candidate pass.

A clone contains application code, schema/migrations, locked dependencies, reviewed credential-free infra source and permitted static assets. It excludes recordings, numerical target seeds, participant records, credentials, stack state and generated artifacts. It can run public synthetic checks without production access. Python suites require Python 3 and NumPy. Native Worker checks use `npm run verify -- --profile worker` and need local process/socket capability.

A build also needs the explicitly prepared PEQdB engine/source/license package described in [PEQDB_AUTOEQ.md](PEQDB_AUTOEQ.md). New untracked source must be reviewed under that package's existing source allowlist before preparation; verification does not silently approve or stage it. Restore the pinned Public Sans font through `scripts/prepare-vote-font.mjs` with authorized inputs. Full private-media builds need the original verified media and `scripts/prepare-waveform-peaks.py` (Python/NumPy and FFmpeg/FFprobe). Keep external inputs and generated output ignored and outside publication.

Once inputs are prepared, `npm run build` followed by `node scripts/package-static-assets.mjs --public-only` makes a **nondeployable public preview**. A full owner package omits that flag and must verify the complete inputs against its exact manifest. Build alone is not a complete package. Do not use fixed counts from older handoffs to approve today's assets.

For a fresh disposable local database only, follow [LOCAL_SETUP.md](LOCAL_SETUP.md) and `npm run setup:local`; never initialize over a restored or existing database. Synthetic browser review follows [ADMIN_TEST_ISOLATION.md](ADMIN_TEST_ISOLATION.md). A renderer preview does not prove the production gate or Worker behavior.

Owner snapshot verification: run `node scripts/check-live-source.mjs --snapshot` in the owner root with its current release record and private immutable paths (`--assets` adds asset coverage). Exit 2 reports working-documentation drift alone and is not a full pass; exit 1 includes runtime/infra/build/configuration errors. Expected foundation documentation differences and immutable owner evidence are explained in [ENGINEERING.md](ENGINEERING.md#manifest-approval-and-snapshot-drift). Do not copy private inputs into Git or edit sealed snapshots/deployment hashes to make this check pass. Exact rollback uses recorded immutable output; a fresh build is not assumed byte-identical.

For a separately authorized release, use the existing infra backend/stack, its own lock and `npm run check`, explicit `DEPLOY_BUILD_ROOT`, reviewed resource plan and recovery decision. Preserve all access/media/abuse/CPU/edge/cost controls. Never initialize a replacement production stack, replay migrations blindly or deploy a public-only package. See [HOSTING_HANDOFF.md](../HOSTING_HANDOFF.md) and [RECOVERY.md](RECOVERY.md). [Earlier rebuild procedures](history/foundation-20261031/docs/REBUILD.md) are historical evidence.
