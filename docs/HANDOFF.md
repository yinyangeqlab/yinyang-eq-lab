# Source handoff — October 17, 2026

This checkpoint brings the public application sources up to the live cooldown policy and records the target-pool changes without distributing target data. Website deployment, live database updates, and GitHub publication are separate operations.

## Changes included

- Narrow-screen voting controls and welcome navigation, plus the reviewed Unknown / Tie guidance.
- Current curated ranks for every target in the Preference Tuning selector.
- No shared daily testing quota. The shared 30-writes/minute hashed-IP protection remains. A finished cooldown resets the next incident to the normal one-minute wait; continued requests during an active block are the only escalation trigger.
- Regression checks for the write policy, ranking API privacy/filters, server listening runs, cooldown SQL, and the existing listening/ranking behavior.
- Updated research-method documentation and the [names-only target inventory](TARGET_INVENTORY.md).

The remote mobile-demo documentation and media added on `main` were preserved when integrating the two previously unpushed UI commits. That integration did not require a history rewrite. A later, separate attribution correction replaced one misattributed commit and its descendants while preserving their file trees.

## Live targets and license rule

The live pool has 41 approved targets: the earlier 22, SEAP and SEAP Bass Boost, eleven further named references, and six explicitly MIT-licensed MrChillStorm experimental variants. The inventory lists every name and its app category. No target seed, sampled response, source curve, or preset is part of this GitHub update.

New targets require a clear license permitting redistribution of the curve data. Thirty-one unclear-license candidates from the obscure-target research were withheld; a read-only live check confirmed the interrupted broader publish had not added them. The earlier 35-target pool has not had a complete license audit, so this checkpoint does not assert that all existing live curves are cleared for redistribution.

Target additions were database operations and needed no Worker deployment. Existing target content and vote records were preserved. The six MIT imports were checked against their original files, normalized at 1 kHz, and resampled where necessary; creator/source credits and full MIT notices are retained with the live records and private working source archive.

## Public release boundaries

The public checkout owns its README, package identity, licensing, sanitized hosting config, demo documentation and media. Its empty soundtrack map and waveform cache remain intentional. Credentials, databases, invitations, infrastructure state, local-only preview, recordings, target data and import research archives remain outside GitHub. The release guard checks the Git index for these exclusions.

Application directories were compared with the working project using `scripts/sync-workspace.py`; the remaining data/config/package differences were reviewed individually. The working protocol's outdated Elo wording was corrected to match the actual experimental Bradley–Terry ranking implementation, and its current cooldown explanation was copied here.

## Verification

TypeScript (`tsc --noEmit`), the production build, and all ten public listening/ranking/write-policy regression scripts passed for this checkout. The source sync reported zero remaining eligible differences at that checkpoint; this is not a claim about later working-folder edits. The final Git index is checked with `npm run check:release` before commit. Target publication checks additionally verified the final six live rows, approved count 41, and unchanged prior target content. No synthetic production votes were submitted for this release verification.

## Next owner tasks

Audit redistribution terms for the earlier live target pool before any future distribution of its curve files. Continue to keep raw target data out of this source release unless both the owner's publication scope and the curve's actual license permit it. Measurement-rig compatibility remains an owner review concern.

## README and source accuracy correction — October 17, 2026

The README now distinguishes the populated live site from this source release, including owner-supplied Shantae album copies, the two excluded tracks, Bandcamp embeds without application EQ, and the omitted waveform cache. Library text follows the configured soundtrack mapping. The research protocol now documents the 20 metadata entries, Open-mode owner records and actual consent boundaries.

The source adds original measurement contribution/download handlers, bounded chunk storage, owner authorization and local-save recovery after failed contributions. Migration `0016_measurement_file_chunks.sql` is additive. Existing SQL filenames are retained, the journal lists every migration in filename order, and a current schema snapshot includes tables also used by raw SQL. `docs/LOCAL_SETUP.md` and `npm run setup:local` cover a fresh local database and ignored development secrets; loopback development emulates the excluded trusted edge only in development builds.

GitHub publication does not deploy this correction or apply migration `0016` to the live database. Independently edited working-folder pages and styles remain separate from this bounded correction. Earlier verification and source-sync statements above describe their original dated checkpoint.

Verification of this correction: TypeScript, the production build and all twelve regression checks passed. The migration chain and current schema snapshot agree, and an isolated Drizzle generation reported no schema changes. A temporary checkout successfully initialized local D1, established a mock sign-in and completed an exact-byte original-file upload/download round trip. Checks used the existing dependency installation with Node 26.11.1; a fresh dependency installation and the minimum supported Node version were not retested.

### Published checkpoint and remaining deployment

These corrections were pushed to `main` as [f6c493c](https://github.com/yinyangeqlab/yinyang-eq-league/commit/f6c493c7ffa4c6867bbb7f49e867972d03232f6e). The push used the `yinyangeqlab` account, and GitHub confirmed `yinyangeqlab` as both author and committer. Continue using the repository identity `Yin Yang EQ Lab <343846436+yinyangeqlab@users.noreply.github.com>` and the `yinyangeqlab` GitHub account for subsequent commits and pushes.

The GitHub source is updated. The live website has not received these functional fixes through this publication: apply the additive `drizzle/0016_measurement_file_chunks.sql` migration to its existing database and deploy the corrected Worker separately. Preserve existing data and access controls; do not run the fresh-local-database initializer against production. After deployment, verify the contribution/download routes with an authorized test and confirm the original file bytes are preserved. The twelve regression checks and upload/download round trip above were local verification, not proof of a live deployment.
