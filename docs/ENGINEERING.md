# Engineering guidelines

Read [AGENTS.md](../AGENTS.md) for permanent project constraints and [LIVE_STATE.md](../LIVE_STATE.md) for the recorded deployment. Verify review findings against the source and existing authorization.

## Work from an identified source

1. Define the observable outcome, affected workflows, and data, consent, audio or protocol impact.
2. Read the handoff, fetch the lab origin, and inspect status and divergence. Record the actual HEAD and unrelated changes. Report a failed fetch rather than claiming current remote state.
3. Use an assigned worktree from the current development branch on scrubbed public history. Preserve the canonical drafts, parent mirror, sealed releases and hooks. Never reset, clean, stash or rebase someone else's work for convenience.
4. Choose checks from `scripts/verification-registry.json`; name any missing evidence before implementation. Make a focused change, with regression coverage for plausible failures. Avoid mixing a feature with broad formatting, dependency replacement or a protocol redesign.
5. Verify with the pinned environment. Review the actual diff and reconcile each independent finding as accepted, rejected with evidence, narrowed or deferred. Rerun affected checks after a fix.
6. Finish with changed behavior, exact-source results, gaps and next actions. Commit, publication, merge and deployment each require their own existing authorization. A successful test or source-manifest refresh grants none of them.

## Boundaries to preserve

- Consent: distinguish dismissing an unsaved draft from saving an opt-out. Cancellation must not overwrite previously saved choices. Saving opt-out persists that choice without contributing research/activity data. Use synthetic fixtures to verify persisted state, reload behavior and the actual gate/route contract.
- Audio and experiments: retain passage/timing, randomization, eligibility, provenance and exclusion rules unless explicitly assigned a change. Common master gain does not establish equal post-EQ loudness. Browser evidence cannot certify actual listening, attention or physical device output. Declare numeric tolerances and source/protocol versions; avoid unseeded statistical pass/fail tests.
- Blinding: inspect unintended pre-reveal cues and equal interaction treatment. Browser-side processing does not promise secrecy against deliberate inspection. Changes to the intended study or threat model need owner requirements and methodological review.
- Interface: extend existing styles/components first. Preserve the owner's visual distinctions. Review desktop/narrow layout, keyboard/focus, reduced motion, and closed **and expanded** native selects with selected/disabled contrast. Distinguish CSS inspection from native popup pixels actually observed.
- Data and access: synthetic fixtures stay out of research, public rankings, song votes and participant Sync. Production records and credentials are never test fixtures. `/api/feedback` handles comparison feedback; it is not the GitHub bug-report link.
- Architecture: keep UI orchestration, signal processing, persistence and policy boundaries explicit. Extract a component/module when it reduces an observed maintenance problem; do not impose a replacement framework or dependency purge as housekeeping.

## Verification and ownership

The implementation owner selects and runs checks. The named domain in each registry entry owns its assertions and prerequisite description; a reviewer verifies coverage for the changed boundary. All top-level `scripts/check*` files must have an explicit registry entry, including manual exclusions. New checks without an entry fail registry validation. Enumeration validates inventory; execution uses only literal registered commands, never a filename glob or shell evaluation.

| Profile | Evidence | Inputs / limits |
| --- | --- | --- |
| `public` (default) | Source/receipt consistency and existing synthetic regressions | Pinned Node/npm, locked dependencies, Python 3 + NumPy; no production account or data |
| `worker` | Native Worker behavior with disposable synthetic fixtures | Locked Miniflare/workerd dependencies, local process/socket capability |
| `prepared` | PEQdB engine regressions | Separately prepared ignored WASM inputs; no automatic download/preparation |
| `built` | Client imports and source/binary/license package binding | Own matching prepared package and build; tests can temporarily alter generated fixtures |
| `manual` | Browser, staged publication scanner, owner snapshots | Explicit runbook/identity review; runner records these as outside its coverage |

```sh
npm ci
npm run verify:list
npm run verify
npm run verify -- --profile worker
npm run verify -- --suite consent-choices --suite browser-pairing
npm run release:check
```

Each run creates a unique ignored `artifacts/verification/` directory with a JSON report and per-suite logs. It records HEAD, tracked and nonignored untracked file hashes, dirty status, registry hash, actual tool versions, commands, timings and exit status. Missing prerequisites, timeouts, failures or source changes fail the selected run; excluded/unselected checks are never counted as passed. Do not publish raw reports/logs without privacy review. The runner is orchestration, not a sandbox for arbitrary test code. It does not run browsers, refresh manifests, install inputs, stage files, commit or deploy.

`--list` is read-only. Select profiles or suite IDs explicitly; no `all` shortcut includes owner actions. A `passed` report applies only to the selected suites and recorded source. Full release readiness additionally requires the checks below; do not extrapolate a public-profile pass into release approval.

| Change / decision | Additional evidence |
| --- | --- |
| Foundation docs/tooling | Negative tests for drift/failure handling, source check, preserved history and unrelated-work hashes |
| UI/workflow | App typecheck/lint, relevant regression suites, isolated desktop/narrow/browser checks |
| Audio/protocol/ranking | Relevant engine/Worker suites, numeric/behavioral invariants, explicit hardware/methodology limitations |
| Gate/API/consent | Actual gate and route contracts, denial/opt-out/erasure cases, synthetic storage tests |
| Release candidate | App + infra typechecks/lint, own pinned build/full package, exact-source and asset alignment, authorized browser review, resource plan and recovery decision |
| Publication | Reviewed staged scanner, exact lab author/committer, actual lab connection, scrubbed ancestry, separate approval |

Run app types with `node node_modules/typescript/bin/tsc --noEmit` and lint with `npm run lint`. The separate infra project uses its own lock and `npm run check`. These are not silently claimed by the regression runner. Optional browser fixture branches within individual tests remain optional; read their output and record the gap.

## Release state and manifests

Use the [release versioning skill](skills/yinyangeq-release-versioning/SKILL.md) for every review build and handoff. Keep the build ID visible in the app, group changes by update on the version page, and verify GitHub links against the published source. Record the exact build ID and deployment baseline separately.

`LIVE_RELEASE.json` and its exact `evidence` receipt record the deployment captured by the source snapshot. `npm run release:check` validates the current fields and the generated `LIVE_STATE.md` plus handoff blocks. `npm run release:refresh` regenerates those views only after deliberately updating and verifying authoritative records. It never changes receipts, snapshots or recovery state. A pending recovery handover stays pending until that separate process supplies evidence. The public README links to the live version page independently of these records.

`docs/rebuild-manifest.json` describes **candidate source inputs**, independently of production. After reviewing an intentional source change, run `npm run source:refresh`, then `node scripts/check-live-source.mjs --source-only`. Refreshing hashes is bookkeeping, not regression or deployment verification. The checker also rejects unlisted/deleted nonignored source files. Recovery bundles bind the exact manifest hash; existing bundles must be verified in their matching source checkout, never relabeled to match this candidate. Old manifests and handoffs remain under `docs/history/foundation-20261031`; their commands are historical. Full owner snapshot verification must run in the owner root with its original private paths.

Keep project guidance in these references and the versioning skill, with deterministic checks in scripts. Do not install skills, copy local `.claude` sessions/worktrees or add ignored `.agents` symlinks as part of routine implementation.

## Identity guard follow-up

The permanent policy requires the exact lab author **and** committer, plus the actual lab connection for publication. Current local guards are preserved. A separate guard-hardening task should test exact identity matching and rejection of personal/global fallback, alternate lab addresses and unauthorized co-authors before changing those hooks; this foundation does not claim the existing hooks enforce every part of the policy.

## Manifest approval and snapshot drift

`source:refresh` refuses new nonignored untracked inputs before changing the manifest. After inspecting each intended file, approve exact repository paths with `npm run source:refresh -- --include-untracked path` (repeatable), or `--include-untracked-from /absolute/path/to/reviewed-paths.json` containing a JSON array of exact paths. It prints newly approved paths and records `reviewedUntrackedFiles`; prior approvals persist for those paths until they become tracked. This is source bookkeeping, not permission to commit/private-data disclosure. Do not approve scratch notes or external/private inputs. Every manifest input must eventually accompany a published source tree; uncommitted files do not appear magically in a clone. Git and a Git checkout are required for source inventory checks; ZIP/git-archive exports lack that inventory.

After release-record/view changes, review the changes, refresh the source manifest, and run verification in that order. `release:refresh` prints this reminder but never changes source approvals automatically.

An owner `--snapshot` result is strict: exit **0** means all selected groups match; exit **2** means only working documentation differs; exit **1** means application/infra/build/configuration or other verification errors (possibly also documentation drift). Exit 2 is not a full snapshot pass. Documentation is intentionally checked at the working root, while application/infra use sealed paths. Foundation adoption therefore creates expected documentation differences; compare them with the preserved owner update131 evidence. The source manifest will continue to change with intentional candidate edits. Never change deployment hashes or redeploy merely to get exit 0. The previously recorded 3,421-file success applies to the unchanged canonical owner root, not to this candidate or a future merged root.

The recovery view recognizes the recorded pending/current source-only form, the completed update127 form, `dataExport`/`databaseExport` aliases in completed source-only records, and an explicitly revision-bound `releaseMetadataHandover` that includes a data export. Conflicting aliases, stale baselines and unrecognized shapes fail. Completed source-only metadata and hosted validation must both be recorded for the same update; exported-data coverage and capture time remain distinct. The owner handover writer produces private receipts, not these public status fields. Adapt the public record only from verified evidence; do not reshape historical records to appease the view.
