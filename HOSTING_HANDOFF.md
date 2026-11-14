# Hosting handoff

<!-- release-state:start -->
Recorded deployment: **update162**, source `2aee7341bedd12d6fd07bb9b41b65f21ab938f04`.
Current maintenance, publication and recovery status: [LIVE_STATE.md](LIVE_STATE.md).
<!-- release-state:end -->

Use the [release versioning skill](docs/skills/yinyangeq-release-versioning/SKILL.md) for candidate build IDs and changelog entries. This generated release block records the last verified live update.


Deployment, GitHub publication and recovery registration are separate actions. Follow [the engineering process](docs/ENGINEERING.md) and [rebuild guide](docs/REBUILD.md). Preserve private admission/media, CPU5000ms, six abuse bindings, disabled public Worker URLs, edge burst protection and the independent cost guard. Keep stack configuration/state, secrets and private receipts outside Git.

Use the existing owner stack and exact prepared build; never initialize replacement resources to work around missing state. Inspect the resource plan and recovery coverage before any authorized rollout. A public-only preview package cannot deploy. Verify actual modules/assets and gate behavior, then update the authoritative release record and regenerate/check all views with `npm run release:refresh` and `npm run release:check`. Review the diff, explicitly approve new source paths, then run `npm run source:refresh` and `npm run verify`. Do not deploy for a documentation audit. Original resource/deployment evidence remains in the release receipts and [historical source inventory](docs/history/foundation-20261031/README.md).
