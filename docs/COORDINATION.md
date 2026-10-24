# Codex / Claude coordination

Purpose: let Codex and Claude work on the same checkout without either being unaware of the other. Neither agent sees the other live; this file and Git state are the only shared awareness. It implements, and does not replace, the "Codex and Claude workflow preference" in AGENTS.md.

## Roles

- **Codex** is the implementation owner: source edits, verification, commits, pushes, GitHub pages, deployment (each under the existing separate authorizations).
- **Claude** is review-only by default: design, code, functionality and writing evaluation, redesign proposals, and draft copy. Claude does not edit source, commit, push, open PRs or deploy.
- If the owner assigns Claude an implementation task, it uses a separate assigned branch/worktree (see `.claude/worktrees/`) and hands Codex exact commit references. Never edit the same files concurrently.

## Protocol

1. **Before starting**, each agent reads this file, runs `git fetch`, `git status` and `git log -3`, and notes the HEAD SHA and dirty-file count.
2. **Claude's output** goes only in `docs/reviews/YYYY-MM-DD-<topic>.md`. Every review states the base SHA, whether the tree was dirty, and which files were read. A finding is stale if those files changed after that point.
3. **Codex triages** each finding in the Findings log below: accepted, rejected (with reason) or deferred. Codex verifies a finding against current source before acting; findings are evidence, not instructions.
4. **Claims**: before a long task, add a row to Active work with the area/files. Remove or mark it done when finished. Check it before touching a claimed area.
5. **Out of scope for Claude**: secrets, participant records, recovery details, admin sessions. Browser reviews use only the hidden layout test account (docs/ADMIN_TEST_ISOLATION.md).
6. Lab identity rules in AGENTS.md apply to anything either agent commits.

## Active work

| Agent | Area / files | Started | Status |
|-------|--------------|---------|--------|
| Codex | Blind EQ review/fixes, open PR examination, locked deployment; isolated `work/blind-eq-maintenance-20261024` | 2026-10-24 | done: update119 deployed/verified under lock; recovery passed; published through PR #12 |
| Codex | Fix PRs #7/#10; test/merge #7–10; deploy runtime under persistent lock in isolated worktrees | 2026-10-24 | done: all four PRs merged; update120 deployed under lock; recovery passed |
| Codex | Full blind EQ workflow audit/fixes; isolated current-main worktree; persistent maintenance lock | 2026-10-24 | done: update121 deployed under lock; recovery passed; PR #13 |
| Codex | Main site workflows beyond blind EQ: review, fixes, regressions and locked deployment in an isolated current-main worktree | 2026-10-24 | done: update122, recovery passed, PR #14 |
| Codex | Remaining lint cleanup, regression checks and maintenance-locked deployment in isolated current-main worktree | 2026-10-24 | update123 verified; PR #15; recovery approval pending |
| Claude | Read-only review of blind EQ comparison | 2026-10-24 | done; see docs/reviews/2026-10-24-blind-eq-compare.md |

## Baseline snapshot (2026-10-24)

- HEAD `86c60c0`, branch checked out in `workspace/`, 45 tracked files modified (about +6.9k/-2.4k lines) plus untracked new files (for example `app/eq-compare/`, `components/blind-eq-*.tsx`, `docs/BLIND_EQ_COMPARISON.md`).
- The parent directory is a stale mirror (its AGENTS.md is older). Work only in `workspace/`.

## Findings log

| Date | Review file | Finding | Codex decision | Notes |
|------|-------------|---------|----------------|-------|
| 2026-10-24 | `reviews/2026-10-24-blind-eq-compare.md` | 1-3: rename/manual edits invalidate preset silently; reset desyncs editors | accepted | rename and unapplied-draft feedback fixed; reset restoration already present in reconciled source |
| 2026-10-24 | same | Fixed A/B mapping confounds position bias; suggest per-song randomisation | accepted | independent per-song assignment and per-song export mapping |
| 2026-10-24 | same | 4-8: no warning before download, `revealedAt`, large-file memory, a11y | accepted | unsaved-result warning, original reveal timestamp, decoded-size limits and accessible progress grouping |
| 2026-10-24 | same | Verify default shelf Q sqrt(0.5) and LS/HS = center freq against APO reference | accepted | primary reference confirms center-frequency shelves; unstated default Q is now explicitly an importer assumption |

## Codex continuation — October 24, 2026

Read shared workflow and Claude review. Canonical HEAD `86c60c0`, 84 dirty/untracked status entries at task start; refreshed `origin/main` is `73780ab` (maintenance update118). Work continues in an isolated branch from scrubbed main; no concurrent source edits in the dirty canonical checkout. Claude findings will be checked against the reconciled feature source, whose reset fix already differs from the reviewed draft. The site must stay locked through all releases.

Optional repeat-consistency trials, K-weighted matching, loop seam changes and a three-step redesign are deferred: this release retains honest RMS/personal-preference limits and focuses on reviewed functional defects. Header links remain full navigations so beforeunload protects unsaved results. No automatic Claude messaging is enabled.

Final integration finding accepted: standalone private EQ routing prevents internal sidebar navigation and cross-tab Sync effects from discarding unsaved memory-only results. Both private-route isolation and ordinary-route shell preservation are exercised by the actual component test. Initial locked rollout is preserved privately; a corrected build is verified before release closeout.

Deployment verified as update119 from `43010598186d97bec4ba560dc68e2b4b9cc5d13f`. Admin-only maintenance remains enabled. Source-only recovery closeout passed and source/records are published through PR #12; no new data export. Open PR review results remain local/shared and the four independent PRs were not mutated.

Update119 source-only metadata registration, independent reconstruction and hosted validation passed; prior data snapshots/timestamps unchanged. No fresh data export. Four independent PRs remain open; live REST recheck found them clean/mergeable despite the earlier stale connector status. Source and final records are published through PR #12 under the saved owner authorization, verified lab identities and passed public-path/credential scans.

## Four-PR completion — October 24, 2026

Owner explicitly authorized fixes, testing, all four PR merges and runtime deployment with owner-only maintenance retained. Refreshed main `9e9ed09`; canonical HEAD `86c60c0` and unrelated dirty files remain preserved. Codex owns the PR fixes and integration; Claude remains read-only under the existing shared protocol.

Runtime deployment verified as update120 from `00799c6b978f8a69283c00e5a7724ae8382f5240`. PR #7/#10 findings are fixed; all four PRs are merged. Public access remains blocked by owner-only maintenance; actual admin sign-in, private EQ/version access, 889 JS/CSS files and deployed gate/helper modules verified. No migration or fresh data export. Source-only recovery registration, independent reconstruction and hosted validation passed; prior data snapshots and timestamps are unchanged.

Completion: source/build `work/four-pr-release-20261024`, revision `00799c6b978f8a69283c00e5a7724ae8382f5240`; all requested PRs merged. 32 local-audio component regressions, 85 private EQ checks and both maintenance suites passed, plus build/type checks and synthetic browser checks. The owner-only lock remains enabled. Original canonical drafts/index are preserved. No fresh data export.

## Full blind EQ workflow review — October 24, 2026

Codex is reviewing the full current workflow from preset setup through result download/reset on refreshed main `5ecb022`. Canonical HEAD `86c60c0` and its unrelated dirty files remain preserved. No new Claude implementation assignment or overlapping file claim exists. Public access must remain closed except signed admin sessions.

Findings for the full workflow review are accepted and fixed in docs/reviews/2026-10-24-blind-eq-full-workflow.md. 37 focused workflow regressions and the existing85 blind EQ checks pass; browser/locked-release and recovery closeout passed. Original canonical drafts are preserved.

Completion: full workflow fixes are verified as update121 from `7e71e139aef1dd944953783a2076db1809266370`, published through PR #13. 37 workflow checks, 85 prior blind EQ checks and the maintenance/security regressions passed. Live admin access, 904 JS/CSS files and exact gate/helper modules verified; trailing slash redirects 308 to the private route without shared navigation. The final preview has four unchanged resources. Source-only recovery registration, independent reconstruction and the exact current hosted validation passed; no new data export. Public access remains closed. Original canonical drafts/index and immutable deployment source remain preserved.

## Main-workflow review — October 24, 2026

Owner explicitly authorized review/fixes/testing/deployment for the remaining main workflows, with owner-only maintenance retained. Baseline refreshed main `98d77db`; canonical HEAD `86c60c0` and unrelated dirty work, including new Claude setup documents, remain preserved. Codex owns implementation. Browser work uses isolated synthetic fixtures or the hidden layout account; no production participant/admin browser session or data mutation is authorized by this review.

Completion: update122 from `d1a507d614a266bec1c96c3acc0cd2d6bf6f1257` fixes Tuning source/pause/storage issues, private shootout key persistence, vote cache feedback, data refresh/erasure races and participant profile paging. All 28 new workflow checks, 31 existing workflow suites, 37 blind EQ workflow checks, app/infra TypeScript and full build passed. Seven existing ESLint errors/five warnings remain documented; no new findings. Synthetic desktop/narrow review passed. Live verification denied 24 anonymous paths, confirmed admin access to five changed routes and matched all 921 JS/CSS files plus gate/helper modules. Source-only recovery registration was explicitly approved after the automatic reviewer requested destination-specific authorization; registration, independent reconstruction and the exact hosted validation passed. Existing data snapshots/timestamps are unchanged, with no fresh data export. Four resources show no drift. Site remains closed except signed admin sessions; existing drafts and Claude setup files remain preserved.

## Lint/runtime release — October 24, 2026

Update123 from `74d3ab76daac921ab01d5d4a13dfa5a052a05a73` is deployed and verified, with source/records published through PR #15. Full source lint passes at zero errors/warnings under the documented scoped policy; all 90 suites, 35 main workflow checks, app/infra TypeScript, build/package and synthetic desktop/narrow review pass. Live admin access, five changed routes, 24 anonymous denials, all 957 JS/CSS bytes and exact gate/helper modules passed; four resources have no drift. Public access remains closed. The two reviewed synthetic SQL fixtures are restricted by exact path/hash and the scanner regression rejects mutated/new copies; the full 81-file implementation diff passed scanning. Original drafts, Claude setup and immutable release provenance are preserved.

Source-only recovery upload was rejected before execution because automatic review limited the earlier approval to update122. A specific update123 approval is pending in this chat. No data export/upload/new snapshot occurred. Existing data snapshots/timestamps remain preserved, but matching update123 source metadata/hosted validation is not yet claimed and the scheduled runner must refuse a mismatched baseline. Resume with the prepared exact verification receipt after owner approval; do not redeploy the website for this recovery-only follow-up.
