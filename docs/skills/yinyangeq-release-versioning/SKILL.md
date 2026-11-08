---
name: yinyangeq-release-versioning
description: Track YinYang EQ build versions, public changelog entries, GitHub source links, and handoff evidence when preparing or reviewing a project update.
---

Read [AGENTS.md](../../../AGENTS.md), [Engineering](../../ENGINEERING.md) and the [current handoff](../../HANDOFF.md) first.

- Use the recorded update number in `LIVE_RELEASE.json` as the deployment baseline. Label the next reviewable build `updateN-preview.K` in `lib/release-info.ts` and increment the preview number when issuing another review build for the same update. Preserve the separate beta version.
- Record the user-facing changes for that build in `lib/release-history.ts`. Verify the sidebar, version page, and issue templates show the same build ID. Link GitHub commits, pull requests, or comparisons only after verifying the matching public source. Keep earlier entries and source provenance intact.
- When refreshing the public README, verify its live build label on the version page and check the GitHub release link. The README describes the live service. Generated release records describe the deployment captured by the source snapshot.
- Put the candidate build ID, baseline, exact source or report, test results, known gaps, and publication, deployment and recovery status in the handoff. Use `updateN` for a build prepared for an authorized deployment. After verifying deployment, update the live record and matching handoffs together using the project release commands. A deployment does not authorize a GitHub publication or fresh data export.
