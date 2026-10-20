# Source handoff — October 17, 2026

## Live measurement migration and verification — October 17, 2026

Migration `0016_measurement_file_chunks.sql` was applied to the existing live D1 database and its columns, composite primary key and cascading foreign key were verified. Existing target, vote, listening-run and measurement counts were preserved. No initializer or historical migration replay was used.

The corrected application was deployed to [yinyangeq.com](https://yinyangeq.com) in Cloudflare release 39. Deployment used the current public application sources with the live soundtrack mapping, waveform cache and all 32 owner-supplied Shantae assets restored to an isolated build. The unpublished credits draft remained excluded. Only the existing Worker changed; three other infrastructure resources and the access configuration were unchanged.

Live verification used a temporary approved-listener invitation and clearly labeled synthetic CSV/TXT responses. The listener uploaded single, left and right attachments; the single response spanned multiple storage chunks and included a UTF-8 BOM, accented text and CRLF line endings. Owner downloads of all three files matched the originals byte for byte and by SHA-256. The private owner API listed the contribution. Missing rights confirmation was rejected, and both anonymous visitors and approved non-owner listeners were denied owner downloads. The synthetic contribution, its chunks and the temporary invitation were removed after verification; no synthetic votes or listening runs were submitted.

The four main pages loaded successfully. All 32 live soundtrack URLs remained available, the library retained its hosted-audio EQ wording and waveform controls, and the live stylesheets and measurement-client asset matched the verified build exactly. TypeScript, the production build and all twelve regression checks passed before deployment. The README now explicitly distinguishes hosted FLAC/AAC playback from the asset-free GitHub fallback. Git commits and pushes for this follow-up use `yinyangeqlab` only.

This completes the migration/deployment and original-file workflow follow-up recorded later in this document; those earlier pending statements describe their historical checkpoints.

## Approved navigation treatment — October 17, 2026

Welcome, Preference Tuning, and Music Library now have distinct icons, soft hover glows, floating musical notes, sound ripples, and small animated equalizer bars in the Shootout header. Owner view is a separate, smaller utility button on the far right, with a muted shield icon and no glow or animation. Keyboard focus is supported, and reduced-motion preferences suppress the moving decorations.

The owner approved this design after reviewing its local preview and specifically requested the separate static Owner view treatment. Changes are limited to the Shootout header, a reusable navigation component, and its stylesheet. Existing spacing, routing, data collection, and vote calculations are preserved. The unpublished credits draft remains excluded.

Deployed to yinyangeq.com in Cloudflare release 38. Only the existing Worker changed; three other infrastructure resources were unchanged, and no database migration or test votes were submitted. Both the isolated production build and public-source build passed, and public TypeScript passed. Authenticated live checks covered the four top-level pages and six Shootout tabs at five widths (320, 390, 768, 1440, and 1920 px): 50 checks passed without page-level horizontal overflow. All five live stylesheets matched the release build. Live checks also confirmed the hover animations, reduced-motion behavior, smaller right-aligned static Owner control, and existing private-access protection. The credits draft still returns authenticated 404. The staged public release-file scan passed before commit.

## Responsive spacing fixes — October 17, 2026

The site uses tighter spacing above page headings and between sections. Ranking filters sit side by side when they fit, and the shared navigation wraps within the viewport. Music Library has a compact introduction so listening controls appear sooner; the welcome page has smaller gaps between sections. Long catalog names in Preference Tuning and long song-filter options in Owner view now shrink inside their containers instead of widening the page.

These five application files match the deployed spacing source. Cloudflare releases 36 and 37 deployed the changes to yinyangeq.com; release 37 includes the populated-data width corrections. Authenticated live browser checks covered Welcome, Preference Tuning, Music Library, Owner view, and all six Shootout tabs at 320, 390, 768, 1440, and 1920 pixels: 50 checks passed with no page-level horizontal overflow. All four live stylesheets matched the release build byte for byte, and the existing private-access smoke check passed. The unpublished credits draft remains excluded from this source update and deployment.

The production build and TypeScript check passed for the isolated deployed source, and private-gate tests passed. The public checkout also passed TypeScript and the production build; its staged release-file scan passed before commit. This update contains styling and ranking-filter markup only; it does not apply database migrations or establish live verification of the measurement upload/download workflow discussed later in this handoff.

The earlier checkpoint below brought the public application sources up to the live cooldown policy and recorded the target-pool changes without distributing target data. Website deployment, live database updates, and GitHub publication are separate operations.

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

### Published accuracy checkpoint and live workflow follow-up

These corrections were pushed to `main` as [f6c493c](https://github.com/yinyangeqlab/yinyang-eq-league/commit/f6c493c7ffa4c6867bbb7f49e867972d03232f6e). The push used the `yinyangeqlab` account, and GitHub confirmed `yinyangeqlab` as both author and committer. Continue using the repository identity `Yin Yang EQ Lab <343846436+yinyangeqlab@users.noreply.github.com>` and the `yinyangeqlab` GitHub account for subsequent commits and pushes.

At the time of that source publication, the functional fixes had not been deployed. The later spacing release 37 rebuilt the Worker from the primary workspace; source comparisons confirm that its measurement contribution/download routes, helper modules, schema declarations, and measurement manager match this corrected checkout. That deployment did not apply migration `0016_measurement_file_chunks.sql`, and this spacing pass did not establish whether it was already present in the live database or verify the live original-file round trip. Confirm the additive migration state before testing that workflow. Preserve existing data and access controls; do not run the fresh-local-database initializer against production. The twelve regression checks and upload/download round trip above remain local verification.
