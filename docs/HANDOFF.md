# Source handoff — October 17, 2026

This checkpoint brings the public application sources up to the live cooldown policy and records the target-pool changes without distributing target data. Website deployment, live database updates, and GitHub publication are separate operations.

## Changes included

- Narrow-screen voting controls and welcome navigation, plus the reviewed Unknown / Tie guidance.
- Current curated ranks for every target in the Preference Tuning selector.
- No shared daily testing quota. The shared 30-writes/minute hashed-IP protection remains. A finished cooldown resets the next incident to the normal one-minute wait; continued requests during an active block are the only escalation trigger.
- Regression checks for the write policy, ranking API privacy/filters, server listening runs, cooldown SQL, and the existing listening/ranking behavior.
- Updated research-method documentation and the [names-only target inventory](TARGET_INVENTORY.md).

The remote mobile-demo documentation and media added on `main` were preserved when integrating the two previously unpushed UI commits. No forced history rewrite is required.

## Live targets and license rule

The live pool has 41 approved targets: the earlier 22, SEAP and SEAP Bass Boost, eleven further named references, and six explicitly MIT-licensed MrChillStorm experimental variants. The inventory lists every name and its app category. No target seed, sampled response, source curve, or preset is part of this GitHub update.

New targets require a clear license permitting redistribution of the curve data. Thirty-one unclear-license candidates from the obscure-target research were withheld; a read-only live check confirmed the interrupted broader publish had not added them. The earlier 35-target pool has not had a complete license audit, so this checkpoint does not assert that all existing live curves are cleared for redistribution.

Target additions were database operations and needed no Worker deployment. Existing target content and vote records were preserved. The six MIT imports were checked against their original files, normalized at 1 kHz, and resampled where necessary; creator/source credits and full MIT notices are retained with the live records and private working source archive.

## Public release boundaries

The public checkout owns its README, package identity, licensing, sanitized hosting config, demo documentation and media. Its empty soundtrack map and waveform cache remain intentional. Credentials, databases, invitations, infrastructure state, local-only preview, recordings, target data and import research archives remain outside GitHub. The release guard checks the Git index for these exclusions.

Application directories were compared with the working project using `scripts/sync-workspace.py`; the remaining data/config/package differences were reviewed individually. The working protocol's outdated Elo wording was corrected to match the actual experimental Bradley–Terry ranking implementation, and its current cooldown explanation was copied here.

## Verification

TypeScript (`tsc --noEmit`), the production build, and all ten public listening/ranking/write-policy regression scripts passed for this checkout. The source sync reported zero remaining eligible differences. The final Git index is checked with `npm run check:release` before commit. Target publication checks additionally verified the final six live rows, approved count 41, and unchanged prior target content. No synthetic production votes were submitted for this release verification.

## Next owner tasks

Audit redistribution terms for the earlier live target pool before any future distribution of its curve files. Continue to keep raw target data out of this source release unless both the owner's publication scope and the curve's actual license permit it. Measurement-rig compatibility remains an owner review concern.
