> Current workflow: canonical workspace and external recovery are documented in [RECOVERY.md](RECOVERY.md), with results in [RECOVERY_TESTS.md](RECOVERY_TESTS.md). Live remains update81; recovery infrastructure/tooling changes are not deployed.

# Source and live release alignment — update81

The checked-in runtime source matches verified live update81 (October18,2026), including the gold Continue button, upload/session fixes, fixed five-second matched passages, refined vote styling, curve credits, browser sync, consent and Welcome tagline. The current implementation commit is08f166f1a542a0ed6aeadd1a37c489d08ae9a8c6; later commits record verification and rebuild support.

Start at [HANDOFF.md](HANDOFF.md) and [REBUILD.md](REBUILD.md). `docs/rebuild-manifest.json` lists clone-safe input hashes. `LIVE_RELEASE.json` additionally identifies private owner-workspace build snapshots; those paths are not part of the clone. Full runtime parity does not imply that production data or protected recordings are published.

Audited credential-free deployment code is tracked under infra/pulumi; account-specific stack config/state remains excluded. Cost-guard source and thresholds are tracked separately. Restore the existing authorized private inputs only as described in REBUILD.md. No numerical curve seeds, recordings, participant records or credentials were added. Three portable test-only adjustments differ from their historical snapshot versions; runtime files are unchanged. No redeployment was performed by this audit.
