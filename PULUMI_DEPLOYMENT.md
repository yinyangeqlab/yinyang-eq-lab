# Rebuilding and deploying the existing live application

Current live release: update81. Read LIVE_STATE.md, LIVE_RELEASE.json, docs/HANDOFF.md and docs/REBUILD.md first. The rebuild audit does not deploy anything.

For a public clone, install with `npm ci`, verify `node scripts/check-live-source.mjs --source-only`, build with `npm run build`, then package preview assets with `node scripts/package-static-assets.mjs --public-only`. This preview package must not be deployed.

An authorized owner deployment requires the existing private media package, live stack state/config and secret manager. No credentials, stack exports, numerical seeds or participant data belong in GitHub. In the owner workspace, run the full snapshot check and create an isolated release from the recorded source; do not infer a baseline from historical drafts. Restore authorized media, build, and run full packaging without --public-only; expect340 assets and200 recordings.

The tracked infra/pulumi deployment source wraps the app with the private gate. Install its locked dependencies, select the existing staging stack and set DEPLOY_BUILD_ROOT to the absolute intended build directory for preview/up. That stack serves yinyangeq.com. Do not initialize a replacement stack/database. A UI-only release normally changes one Worker, with three resources unchanged. Inspect deviations before applying.

Keep CPU5000ms, all six abuse bindings, private access/media, protected D1, disabled workers.dev and preview URLs, existing static exclusions, separate edge burst protection and independent scheduled cost guard. The guard's source is tracked, but its account bindings and narrow credential remain in the owner's secure configuration. Missing credentials or state must not be worked around by disabling protections.

Deploy only when authorized. Verify the live assets and relevant flows/protections, check final infrastructure drift, erase only disposable fixtures, and update LIVE_RELEASE.json, LIVE_STATE.md, HANDOFF.md and HOSTING_HANDOFF.md together. Commit/push is separate. Never replay migrations on an existing database blindly or restore erased user data.
