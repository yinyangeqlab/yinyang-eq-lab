# Hosting handoff

<!-- release-state:start -->
Recorded deployment: **update163**, source `b7aca62fa3bd8c1d7776eb82f30c76eadebc9ef7`.
Current maintenance, publication and recovery status: [LIVE_STATE.md](LIVE_STATE.md).
<!-- release-state:end -->

Use the [release versioning skill](docs/skills/yinyangeq-release-versioning/SKILL.md) for candidate build IDs and changelog entries. This generated release block records the last verified live update.


Deployment, GitHub publication and recovery registration are separate actions. Follow [the engineering process](docs/ENGINEERING.md) and [rebuild guide](docs/REBUILD.md). Preserve private admission/media, CPU5000ms, six abuse bindings, disabled public Worker URLs, edge burst protection and the independent cost guard. Keep stack configuration/state, secrets and private receipts outside Git.

Use the existing owner stack and exact prepared build; never initialize replacement resources to work around missing state. Inspect the resource plan and recovery coverage before any authorized rollout. A public-only preview package cannot deploy. Verify actual modules/assets and gate behavior, then update the authoritative release record and regenerate/check all views with `npm run release:refresh` and `npm run release:check`. Review the diff, explicitly approve new source paths, then run `npm run source:refresh` and `npm run verify`. Do not deploy for a documentation audit. Original resource/deployment evidence remains in the release receipts and [historical source inventory](docs/history/foundation-20261031/README.md).

Before applying the next production release, finish the **currently live** release's handoff and verify its encrypted source-only backup and hosted validation. From the existing Pulumi stack directory, first check the baseline and stack target without applying a plan.

```sh
bash "$release/scripts/deploy-reviewed.sh" --check "$workspace"
```

Apply the reviewed candidate and saved plan from that same stack directory.

```sh
DEPLOY_BUILD_ROOT="$release" bash "$release/scripts/deploy-reviewed.sh" "$workspace" "$plan"
```

`workspace` is the canonical owner checkout, `release` is the absolute path to the prepared candidate, and `plan` is the absolute path to its reviewed plan. Use the guarded command with older local infrastructure snapshots too. The check verifies the handoff views, public and private recovery receipts, and active Worker version under the same lock as recovery registration. When it blocks, resolve the mismatch or wait for hosted validation and update the owner records before retrying. After the rollout, verify the new release and complete its handoff and source-only registration while that exact build is still live.
