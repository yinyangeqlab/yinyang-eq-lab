# Invite system toggle — live update82

Deployed and verified as update82 with invites off. The canonical workspace and owner live mirror match the recorded release snapshots. Both live modes passed36 assertions; final invites off and disposable fixture cleanup were independently verified. Implementation commit: 3565e5b803330e716a881f72e562c24e4211bd68.

The admin control is at `/owner-research#tester-access`. Invite system defaults to **Off** when no setting has been saved. Only a signed admin session can read or change the private control. Changes require a same-origin PATCH and a boolean value. The gate reads the setting directly on each request; rendered pages read the same setting on navigation, and existing client pages refresh it on focus and once per minute.

With invites off, visitors enter Shootout without a code. Invite wording and sign-in links disappear from Welcome, My data, Privacy, Sync and admin sign-in. `/access` redirects to Shootout without redeeming codes. Invite creation, listing, revocation and deletion endpoints are unavailable until the toggle is enabled; the admin sees the toggle and its status instead of invitation management.

Open navigation creates a secure host-only browser credential automatically. The existing access-metadata table is reused with an `open-` ID and an unusable, expired code hash. Data ownership uses a separate `browser:` subject, so an automatically admitted browser is not treated as a verified invitation account by the protected-statistics archive. Credentials last up to one year. API/media requests cannot create accounts. Participation consent, optional sharing/monitoring, private media routing, admin authorization, six abuse bindings and cost protections remain enforced. Sync keeps the original browser subject and the existing explicit replacement/approval handshake. Erasure removes open access metadata, linked devices, handshakes and data sessions.

Turning invites on restores the existing creation, single-use redemption, 48-hour expiry and revocation process and its visitor-facing links. Stored invitations and original expiry times are preserved. Automatic open credentials, including linked ones, cannot pass invite-only admission. Existing data-management credentials continue to allow privacy controls and erasure. Turning invites off again allows existing unexpired open credentials to work again.

## Release prerequisite

Migration `drizzle/0031_site_access_settings.sql` adds only the persistent toggle table; existing application tables and participant records are unchanged. Apply this migration to an authorized release database before running the new app/gate. The missing-row default is off; a database missing the table is a configuration error, not an implicit bypass. The reviewed additive migration and one existing Worker update were applied to production; three other resources stayed unchanged. Recovery environments containing participant records must still be kept closed pending ownership and erasure review, as required by RECOVERY.md.

Both Pulumi packaging and the local recovery Worker assembler include the shared invite-settings module. Build/package a future authorized release from workspace source, following the current owner workflow and preserving all deployment guards.

## Verification

- App build, app TypeScript and infrastructure TypeScript.
- Real private-gate tests with synthetic in-memory SQLite: default off; admin-only mode changes; CSRF and input validation; no invite redemption while off; restored creation and single-use redemption while on; unchanged invitation expiry; anonymous browser ownership; consent and admin/media guards; open-browser sync and erasure; rejection of direct and linked open credentials when re-enabled; continued data management.
- Existing browser-sync, agreement-preference, activity-monitoring and comparison-passage regressions.
- All 32 SQL migrations and schema snapshot/journal agreement; 18 recovery safety checks.
- Local and live rendered Welcome checked with invites off and on; all14 referenced live JS/CSS assets match the deployed build. No physical-device verification was performed.
