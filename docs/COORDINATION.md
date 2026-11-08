# Codex and Claude coordination

Codex owns implementation. Claude is review-only unless explicitly assigned implementation by the owner, using a separate assigned worktree. Never edit another agent's claimed files concurrently. Do not contact another agent/service without authorization. Both follow [AGENTS.md](../AGENTS.md) and [ENGINEERING.md](ENGINEERING.md); deployment/publication/recovery facts come only from [LIVE_STATE.md](../LIVE_STATE.md).

Before a task, fetch the lab origin, inspect status/divergence and record HEAD/dirty files. Name the assigned branch/worktree and file scope here. Preserve originals and identity guards. Reviews identify exact source, files read, dirty state and limits. The implementation owner verifies each finding against that source and records accepted, rejected with evidence, narrowed or deferred decisions. A review becomes stale when its evidence changes.

| Owner | Claim | Branch / baseline | Status |
| --- | --- | --- | --- |
| Codex | Peak & Dip Finder interface, listening safety, tutorial, generated audio and frequency navigator, plus preview version metadata | `work/peak-dip-finder-20261107` from deployed update133 `3bed26e06939de3f4b91d53fa5a289dc571ff057` | Owner-authorized local `update134-preview.1` commit and separate owner package preparation. Production and earlier drafts are separate. |
| Codex | Listening controls, fitter provenance and ranking cohorts, continuous Tuning playback, mobile interaction, Dynamics verification, generated EQ results and blind comparisons, Personal Tournament pairing, Tune by ear, and version history | `work/listening-controls-20261104` from reviewed foundation `28291111370bd035dfd0d0f29e73cd123bd8a654`, carrying deployed source `08ede015c438` | Committed preview. The owner authorized the `update132` build and deployment after existing-stack plan review, with source-only recovery if compatible. GitHub publication is separate. The canonical and historical design drafts remain separate. |
| Codex | Foundation: shared docs, release views, verification registry/runner and regression coverage | `work/engineering-foundation-20261031` from `08ede015c438e743f371fcf679058b5c27dcb3a1`; isolated `work/engineering-foundation-20261031` | Claude review and Codex follow-up fixes prepared locally; no commit, push or deploy authorized |

The canonical worktree and previous claims are preserved. Prior claims and findings remain in [the historical coordination file](history/foundation-20261031/docs/COORDINATION.md), with their original dates and scope. Local permission settings and session-specific preview instructions remain in their original locations.

Independent review and finding dispositions: [2026-10-31 engineering foundation review](reviews/2026-10-31-engineering-foundation-review.md). The original canonical drafts and sealed release remain outside this work claim.
