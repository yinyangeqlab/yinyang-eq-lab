# Staged deployment plan — blocked, not executed

This is a preparation document for the local Tournament checkpoint. It does not authorize deployment or GitHub publication. Current live release is update93; no new release number is assigned. Do not deploy the current dirty checkout or the local preview assembly.

## Release blockers

- Four regression suites fail; see TOURNAMENT_CHECKPOINT_2026-10-19.md.
- Consented free-listening collection, feedback linking, result/export labels and policy copy need final verification.
- Requested playback centering and current-revision responsive review remain unfinished.
- Owner has not approved the finished feature preview or deployment.
- Migrations0033/0034 have not run in production. No production unique-participant or dedicated review account exists from this work; no real Brave ownership capture/transfer has occurred.
- Local `/__local/layout-account` bootstrap must never be in deployment output. Private configuration/media/records remain outside Git.

## Prepare only after resumption

1. Fetch/reconcile canonical Git state, read current live release and independently verify its immutable source snapshot. Review the complete intended candidate diff against that live baseline, including migrations and private gate. Exclude unrelated backup work and local fixtures. Do not assume a WIP checkpoint is a clean release.
2. Resolve blockers, pass meaningful regressions, typecheck/build/full asset packaging and owner UI review. Preserve all approved media/admission, schema ownership/consent/erasure rules, CPU5000ms, six abuse bindings, disabled public Worker URLs, edge limits and independent cost guard.
3. Prepare a clean isolated candidate and exact migration/provider plan without applying it. Verify backwards-compatible client/API rollout and ongoing test completion; do not force refresh or stop playback. Ensure controlled/free/Personal research and public rankings cannot be accidentally mixed. Verify admin and test identities cannot contribute through any official route.
4. Prepare a current encrypted off-device recovery point matching the actual release revision/schema under the existing private backup process. Never use an old bundle with rewritten fingerprints, restore erased records, or put service details/keys/receipts in Git.
5. Present the exact release candidate, tests, migration scope and rollback/data-compatibility limits for owner approval. Device enrollment, historical transfer and profile publication are separate user decisions, not automatic deployment side effects.

## Only when deployment is explicitly authorized and actually begins

- Publish the informational update notice at deployment start, leaving current tests/submissions open as the owner requested. Do not start it while merely preparing or reviewing. If a migration genuinely requires a pause, stop and explain the concrete conflict before changing availability.
- Execute only the reviewed additive migration/release sequence with retained earlier client assets. Observe private access, representative ongoing-test compatibility, research separation, account restrictions and matching data/schema behavior. Do not cast official live test votes to check layout.
- Verify the deployed release, then end the informational notice. Update LIVE_RELEASE.json, LIVE_STATE.md, docs/HANDOFF.md and HOSTING_HANDOFF.md together only after a verified deployment. Keep private state/credentials outside those records.
- GitHub push/publication remains a separate action; no push is authorized by this staging document.
