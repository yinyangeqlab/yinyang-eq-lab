# Local changes captured October 17, 2026

Compared with public commit `ad581f0`, this snapshot includes the working application's listening, ranking, cooldown and navigation updates. It is a source checkpoint, not a deployment.

## Listening completion and repeated choices

A completed comparison is saved in this browser and its targets are revealed before research or ranking requests finish. A failed request leaves the personal answer available and explains that the shared write failed. A successful vote upgrades the same personal row rather than appending a duplicate. Finish & see results works after two completed trials, including from the next unanswered pairing, and waits for pending submissions.

New server-issued trials may submit a repeated target pairing, including a changed preference. The old six-votes-per-ten-minutes and fifty-per-day browser quotas, repeated-pair veto, research-run hourly quota, and Open comparison quotas are removed. Shared per-IP write limits, minimum listening times, trial expiry and replay protection remain. Listening runs now store a unique trial ID; an identical-target check cannot be replayed to inflate calibration.

## Rankings and check reliability

The research ranking API now fits an experimental weighted Bradley–Terry model with a Gaussian 1500 ± 350 SD prior and a full-Hessian Laplace uncertainty estimate. The UI shows rating SD, comparison counts and browser counts, and orders targets by the lower approximate 95% interval bound. Each ranking subset fits its own selected votes.

Every accepted decisive repeat enters its browser/pair preference average. Combined evidence from that cluster saturates so repeated answers from one browser do not count as independent listeners. Same-filter checks estimate reliability with a Beta(2, 2) prior. The estimate is frozen on each new decisive vote; later checks affect future votes. Unknown/tie answers and identical-target checks do not directly change target ratings or SD. Browser IDs are not verified people, and the model's priors and weights are assumptions, not validated hearing scores.

## Cooldowns and navigation

Shared write throttling now keeps penalty state and escalates persistent requests during an active cooldown, up to 24 hours, with guards against concurrent escalation and expiry cleanup. New trial requests stop retrying automatically after a 429.

The app mounts one global notice that observes same-origin API failures, including private administration requests. A 429 thanks the listener, says the request was rejected, and displays a wait derived from Retry-After; 5xx responses show a temporary service notice.

The page headers add consistent Welcome, Shootout, Preference Tuning and Music library links. The brand links to `/home`, which sends signed-in users to the shootout and other users to the welcome page. Normal page navigation also crosses the server access boundary.

## Database requirement

Apply `drizzle/0015_ranked_repeats_uncertainty.sql` after the existing migrations before running these APIs against an existing database. It adds vote reliability weights (historical default 0.5), unique listening-run trial IDs, and `public_write_penalties`. Existing votes, runs and pair claims are preserved. Committing these files does not apply a migration or deploy anything.

## Release boundaries

The working project's README, package identity, Sites project ID and sample development email differ intentionally from the public release. Dependencies are unchanged; the working lockfile differs in root package metadata. Its waveform prebuild hooks depend on installed audio, so they are not enabled in this source release.

The public checkout keeps its existing README, licensing, demo files, sanitized hosting config, empty soundtrack mapping and empty waveform cache. Target inserts in the working `0001` migration remain excluded. Audio, target seeds, waveform/hash caches, credentials, owner tokens, databases, deployment configuration, local Python/HTML preview, design drafts and recording tools are outside this public snapshot. Those files have not been committed by this sync. Existing public assets and dependency files were reviewed separately and need no update for these application changes.

## Verification

The prepared public checkout passed TypeScript (`tsc --noEmit`), the production build (`npm run build`), and the blind-completion, vote-limit, preference-ranking, service-warning, bounded-JSON, cooldown-SQL and public-write-counter checks in `scripts/`. These cover failed writes retaining personal results, repeated and reversed preferences, replay rejection, frozen check weights, sparse ranking uncertainty, cooldown escalation, and the additive migration preserving historical rows. Dependencies were reused from the parent working project's installation for local validation; they are not committed. The sync helper was applied and a subsequent dry run reported zero eligible differences. The release check scans the Git index before commit. No production database writes, deployment, or live browser playback tests were performed for this checkpoint.

## Keeping future edits traceable

From this Git checkout, compare the working project:

```sh
python3 scripts/sync-workspace.py --source ..
```

Review the list, then copy eligible application sources and regression checks:

```sh
python3 scripts/sync-workspace.py --source .. --apply
git diff
git status --short
```

The helper never stages, commits, deletes or pushes files. New files appear in `git status`; review them along with the diff. It preserves release-owned material and reports missing source paths for manual deletion review. Package/lockfile, assets, data, and files outside its supported source directories require separate review.

Run the relevant regression checks and TypeScript/build checks, stage the reviewed files, then run `npm run check:release` before committing. A local commit records the checkpoint; pushing it to GitHub is a separate step.
