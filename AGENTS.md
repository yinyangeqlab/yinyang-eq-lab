# Canonical development and recovery workspace

This checkout is the active source. In the owner container it is workspace/. Do not edit the parent live mirror or archived previews. Read docs/HANDOFF.md and docs/RECOVERY.md; fetch and inspect status/divergence before editing. Use the pinned recovery toolchain and keep all external inputs outside Git.

# Current release and rebuild instructions

Read LIVE_STATE.md, LIVE_RELEASE.json, docs/HANDOFF.md and docs/REBUILD.md before selecting a baseline. Fetch GitHub and inspect local divergence/changes first. Current baseline is live update94. Per-feature timed maintenance, independent consent entry and Tuning fixes are deployed; read the active notice and audit limits in HANDOFF.md. Preserve and exclude separate uncommitted personal-shootout work when selecting a baseline. Historical handoffs are not deployment instructions.

In a public clone run `node scripts/check-live-source.mjs --source-only`. Full `--snapshot` mode requires the owner's private immutable snapshots and stack configuration; do not publish those to make it pass. In the owner project use its current LIVE_RELEASE.json and full snapshot check. Preserve intentional root changes.

GitHub contains application and reviewed credential-free deployment source, but excludes credentials, recordings, numerical target seeds, participant records, stack configuration/state and generated output. Never restore erased user records. Keep private access/media controls, CPU5000ms, six abuse bindings, disabled public Worker URLs, edge burst protection and independent cost guard.

Build, commit, push and deploy are separate operations. Do not redeploy for documentation/rebuild audits. After a verified deployment update LIVE_RELEASE.json, LIVE_STATE.md, HANDOFF.md and HOSTING_HANDOFF.md together; publish separately when authorized. Public-only packages are for clone previews and must not be deployed.

# Private recovery storage

Read docs/ENCRYPTED_BACKUP.md before backup work. Keep the storage service/account, destination, private receipt and recovery key outside Git and public handoffs. Public status may say only encrypted off-device backup. Never upload the recovery key alongside its archive or claim password-manager custody without owner confirmation.

# Browser review identity

Use only the dedicated hidden, non-contributing layout test account for browser reviews. Do not use an admin session, including for admin UI reviews, unless the owner explicitly authorizes an exception. Keep test credentials, fixture provisioning and local state out of Git. The local workflow is documented in docs/ADMIN_TEST_ISOLATION.md. Test activity must never enter research, public rankings, community song votes or participant Sync.

Latest feature review (deployed as update94 with explicit owner authorization; account activation/history transfer/publication remain separate): read docs/TOURNAMENT_REVIEW_2026-10-19.md and docs/DEPLOYMENT_STAGE_2026-10-19.md. The earlier WIP checkpoint is historical; its four failing suites were resolved. Owner review, live account/history execution and any push/deployment remain separate.
