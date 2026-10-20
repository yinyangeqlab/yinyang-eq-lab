# Next-session handoff — current live update82

Start with ../LIVE_STATE.md, ../LIVE_RELEASE.json and REBUILD.md. Canonical development checkout is `workspace/`; owner-root application files mirror verified live source. Fetch and inspect divergence/local changes before editing. Do not use historical previews or recovery bundles as a development baseline.

Live: https://yinyangeq.com. Invites are **off**. The admin-only switch is `/owner-research#tester-access`. “Enter the shootout” guides visitors into Shootout; all existing Welcome navigation remains. No additional Welcome design change was requested for deployment.

Implementation: `3565e5b803330e716a881f72e562c24e4211bd68`. Immutable source/build: `work/invite-release-20261018`; infrastructure: `work/invite-infra-20261018`. Migration0031 adds only the toggle table. Existing schema and participant records were preserved. One Worker updated, three resources unchanged; final preview four unchanged. See INVITE_SYSTEM.md for admission and ownership details.

Both toggle modes were verified on the live site, including open consent/audio access, original single-use invite redemption/48-hour expiry, admin-only controls, rejection of automatic open credentials when invites are enabled, and continued privacy management. The final setting is off. Disposable test accounts were erased and cleanup independently checked. All14 referenced JS/CSS assets match. Build/types,32 migrations, focused regressions and18 recovery safety tests passed. Browser checks used a desktop browser, not physical iOS/Android devices.

Keep private media routing, consent/data management, CPU5000ms, all six abuse bindings, disabled public Worker URLs, edge protection and the separate scheduled cost guard. Edge/budget rules were not changed; fresh zone-rule readback was unavailable to the app token. Never restore erased participant data or commit credentials, recordings, numerical curve seeds, stack state/configuration or private recovery records.

GitHub main publication is verified at `21bcb1d6bcbe84b1d7a978c25cbbfd046f484a50` (implementation and release records). Publication is separate from the live deployment. Unrelated backup-documentation edits were preserved and excluded from this release. The existing update81 recovery bundle requires its matching Git/migration revision and fresh deletion review; no new backup was generated for update82.

For a public clone: npm ci; node scripts/check-live-source.mjs --source-only; npm run build; node scripts/package-static-assets.mjs --public-only. Public-only packages cannot be deployed. Owner snapshot verification runs from the owner root. Use RECOVERY.md for private inputs and REBUILD.md for production deployment boundaries.

## Encrypted recovery snapshot — backup task completion

The update81 recovery bundle passed encrypted off-device verification: remote sizes/checksums and owner-only permissions, independent download, whole-archive SHA-256, decryption and all341 bundle-file checks. Its matching Git revision is `33f80d6bb04d9fa1b66de47368d733c5f41c5eac`. A concurrent session released update82 during transfer; this is an update81 point-in-time snapshot, **not an update82 database backup**. Use matching source/migrations and a fresh deletion review for recovery. The verifier correctly refused the newer source before passing against the recorded revision.

Read ENCRYPTED_BACKUP.md. Storage service/account, destination, receipt and key stay private. The owner confirmed saving the separate key in a password manager; an independent-device key copy has not been confirmed. No recurring backup schedule is configured. The disposable restore rehearsal and transfer/decryption fixtures were removed after verification; canonical workspace/, original private bundle, encrypted local archive and release snapshots remain. This backup task performed no deployment or production data mutation; the separate update82 release is preserved.

The saved project still points at the parent container. Its instructions redirect new work into workspace/; the owner can make workspace/ the primary project folder for direct Git discovery.
