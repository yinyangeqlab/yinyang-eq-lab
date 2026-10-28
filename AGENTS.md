# MANDATORY: PROJECT GITHUB IDENTITY — LAB ACCOUNT ONLY

Owner requirement: use ONLY the `yinyangeqlab` GitHub account for all project contributions, commits, pushes, pull requests, and publication. NEVER use a personal GitHub account, personal email, or the inherited global Git identity. Set Git author AND committer to `Yin Yang EQ Lab <343846436+yinyangeqlab@users.noreply.github.com>`; GitHub connector commits must use the yinyangeqlab connection. Verify both actual identities before every commit/publication, including in temporary clones, worktrees, scripts, and tools. Repository ownership alone does not control attribution. Preserve local identity guards and never bypass them. Never republish pre-scrub history: use the scrubbed main history for publication, while preserving original historical release provenance. Stop if the lab identity cannot be verified. This is a permanent owner instruction for every future session.

# Canonical GitHub repository — renamed October 21, 2026

Use ONLY `yinyangeqlab/yinyang-eq-lab` for future application work: https://github.com/yinyangeqlab/yinyang-eq-lab (origin: https://github.com/yinyangeqlab/yinyang-eq-lab.git). The former `yinyang-eq-league` name redirects to the same repository; do not recreate it or treat it as another app. The separate `yinyangeqlab.github.io` repository hosts public demo videos and credits, not application source; preserve its short video URLs. Read docs/REPOSITORY_RENAME.md and the current handover. Preserve immutable historical provenance, old backups and lab identity hooks. Renaming/publication does not authorize a deployment.

# Canonical development and recovery workspace

This checkout is the active source. In the owner container it is workspace/. Do not edit the parent live mirror or archived previews. Read docs/HANDOFF.md and docs/RECOVERY.md; fetch and inspect status/divergence before editing. Use the pinned recovery toolchain and keep all external inputs outside Git.

# Current release and rebuild instructions

Read LIVE_STATE.md, LIVE_RELEASE.json, docs/HANDOFF.md and docs/REBUILD.md before selecting a baseline. Fetch GitHub and inspect local divergence/changes first. Current deployed baseline is 0.2.0-beta.1 / update124, source 8c36be0aa4352f668f6cfbb351bc187713042191. Owner-only maintenance remains enabled without expiry. Read the active notice and audit limits in docs/HANDOFF.md and docs/releases/update124-verification.json. Preserve separate original drafts when selecting a baseline. Historical handoffs are not deployment instructions.

In a public clone run `node scripts/check-live-source.mjs --source-only`. Full `--snapshot` mode requires the owner's private immutable snapshots and stack configuration; do not publish those to make it pass. In the owner project use its current LIVE_RELEASE.json and full snapshot check. Preserve intentional root changes.

GitHub contains application and reviewed credential-free deployment source, but excludes credentials, recordings, numerical target seeds, participant records, stack configuration/state and generated output. Never restore erased user records. Keep private access/media controls, CPU5000ms, six abuse bindings, disabled public Worker URLs, edge burst protection and independent cost guard.

Build, commit, push and deploy are separate operations. Do not redeploy for documentation/rebuild audits. After a verified deployment update LIVE_RELEASE.json, LIVE_STATE.md, HANDOFF.md and HOSTING_HANDOFF.md together; publish separately when authorized. Public-only packages are for clone previews and must not be deployed.

# Private recovery storage

Read docs/ENCRYPTED_BACKUP.md before backup work. Keep the storage service/account, destination, private receipt and recovery key outside Git and public handoffs. Public status may say only encrypted off-device backup. Never upload the recovery key alongside its archive or claim password-manager custody without owner confirmation.

# Browser review identity

Use only the dedicated hidden, non-contributing layout test account for browser reviews. Do not use an admin session, including for admin UI reviews, unless the owner explicitly authorizes an exception. Keep test credentials, fixture provisioning and local state out of Git. The local workflow is documented in docs/ADMIN_TEST_ISOLATION.md. Test activity must never enter research, public rankings, community song votes or participant Sync.

Latest feature review (deployed as update94 with explicit owner authorization; account activation/history transfer/publication remain separate): read docs/TOURNAMENT_REVIEW_2026-10-19.md and docs/DEPLOYMENT_STAGE_2026-10-19.md. The earlier WIP checkpoint is historical; its four failing suites were resolved. Owner review, live account/history execution and any push/deployment remain separate.

# Dropdown review

For UI changes, check both closed native selects and their expanded option menus. Preserve dark, readable surfaces with explicit option/optgroup backgrounds and an appropriate color-scheme; a gradient on the closed control alone does not style its popup. Include desktop and narrow viewport checks, keyboard focus, and selected/disabled readability.

## Deployment backup scope — owner preference, October 19, 2026

Commits and local previews do not trigger production backup exports. Distinguish source/build baseline maintenance from a fresh data export, and explain actual additional quota use before requesting approval. Prefer the existing verified recovery point and regular daily coverage for low-risk UI-only releases; avoid redundant exports and duplicate immutable media. Database/schema changes, destructive operations and risky imports require an explicit backup decision. One necessary matching release point should serve the release, rather than a point for every commit. Never relabel incompatible source/schema as a valid baseline or claim a declined/unverified export succeeded. If the owner declines an export, preserve existing recovery points, document the precise coverage gap and the scheduled runner's refusal on mismatched baselines. Any future work to separate metadata-only baseline handover from data exports must retain immutable provenance and verification safeguards.


## Daily data backups and source-only handovers — October 20, 2026

Routine data backups run once daily; commits/previews do not trigger exports. Manual hosted runs default to validation only. For an ordinary verified code-only deployment, use scripts/recovery/release_handover.py with the exact release and deployment verification receipt to register source/build metadata without a data export. This preserves the existing data snapshot/timestamp until the next scheduled export. Keep migration, operational schema, live schema, recovery-code, media, deployment and provenance checks; changed schema/media/recovery or risky data operations still need an explicit backup decision. Never claim metadata registration is a new data recovery point. Keep existing retention/shared-media reuse and failure notifications. Resume only an inspected failed handover with --resume-paused-handover; preserve unrelated owner pauses.
