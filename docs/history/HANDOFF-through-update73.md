# Archived handoff — historical statements only

Superseded by ../HANDOFF.md and ../../LIVE_STATE.md. Old deployment and unpublished-status statements below are historical.

# Browser sync, Settings and optional activity monitoring

Deployed and verified as update73 on October 18, 2026, preserving live update72. The source commit contains the reviewed Sync browsers flow, top-right Welcome Settings disclosure, existing-browser hero entry, and separate explicit activity-monitoring opt-in. Live checks verified11 exact JS/CSS assets, original private audio, consent, handshake, shared identity and revocation. All disposable verification records were erased; no comparisons were submitted. Final infrastructure preview: four unchanged.

Both browsers open /sync. A ten-minute one-use code and matching confirmation require original-browser approval. The receiving browser separately accepts replacement and finishes copying saved results, measurements, private targets, EQs, tuning/display choices and voter ID. Music files, unfinished tests, cookies and cached consent do not transfer. Both browsers use one verified tester identity afterward; later local edits are not continuously mirrored. Four additional browsers maximum. Disconnect revokes access and data-management credentials. Temporary payloads clear on completion/cancellation; expired transfers purge on the next code creation. Client rollback and idempotent completion cover failure/retry.

Activity monitoring is separate and off by default. Current explicit consent permits route, Shootout tab/mode, active-state and event-time logging for the private admin timeline, with thirty-day retention and deletion on opt-out. Atomic consent rechecking prevents an in-flight event from recreating withdrawn logs. No typed contents, keystrokes, audio, raw IP or device fingerprints enter activity records.

Apply additive migrations0028–0030 before deploying these APIs. The generic Worker modules are lib/browser-pairing.mjs and lib/browser-sync.mjs; a deployment-specific private gate mounts them before normal tester admission and supplies authenticated tester context, D1 and origin/cookie protections. Private deployment configuration/credentials and production content are excluded from this public source checkout. Existing service-notice UI/logic from live update72 is preserved; its operational configuration table is in db/service-status.sql.

Checks: TypeScript, full production build and340-asset/200-recording packaging in the private release; all31 migration/schema checks; actual-route SQLite consent, activity, pairing and sync suites; browser walkthrough of replacement and same identity. The release preserves private audio, current rankings, required comparison participation, cost controls and current service notices. Separate passage/upload/ranking drafts are excluded. The live deployment is verified. GitHub has not been pushed.

---

## Earlier source handoffs

# Current source handoff — live update70, October 18, 2026

The application source now matches the verified live update70 runtime. Commit `f9d150f` brings the previously deployed agreement controls and navigation into Git; `b3b0f9e` adds the deployed Sodium credits entry. This source sync excludes unpublished privacy/activity/browser-pairing, passage/upload, welcome and ranking drafts in the owner workspace.

The target is named **Sodium** and credited to **Sodium (Discord)**. Its entry on [Curve credits](https://yinyangeq.com/curve-credits) explains pixel extraction from the supplied screenshot, interpolation, estimates where the line is obscured, normalization at 1 kHz, and approximate values. The existing target ID and all162 points are preserved. It remains available in both in-ear and over-ear comparison pools. Production curve values and the publisher remain outside this public source package; source checkout migrations do not populate the production catalog.

Live update70 changed only the existing application Worker. Production build, TypeScript, complete static/media packaging, live credits inspection and final infrastructure preview passed. Packaging retained340 public assets and200 protected recordings; the final preview showed four unchanged resources. The database rename verified all other target fields and rows unchanged. Access controls, protected media, CPU/cost guard and edge protections remain in place. No votes or completed comparisons were created during verification.

These commits are local until explicitly pushed. Future deployment must use the exact verified release and documented packaging process, excluding unrelated drafts. Public source excludes credentials, private deployment configuration, recordings, curve seeds and personal submissions.

---

## Music voting and centered playback published — October 17, 2026

Owner-approved music voting, preference-ranked rotation, Upvote/Downvote labels, compact ballot, centered responsive Play control and inline blue volume slider were published in aa2c984. Cloudflare update 48 updated only the existing Worker. Build, TypeScript, music preference regression, public source release scan, exact live playback asset hashes, authenticated pages/API, private-access smoke checks and 128 selective-routing checks passed. Existing public-asset bypass savings and private audio/access protections were preserved. No database migration, synthetic votes or category changes. Prior local desktop/tablet/mobile checks cover both volume states. Separate unpublished admin work remains outside this release.

## Exact playback centering — October 17, 2026 (local preview)

Replaced desktop-only pixel offsets with a symmetric three-column grid anchored on Play. Play now stays at the music-panel midpoint at desktop, tablet and phone widths, regardless of volume visibility or the presence of Open-mode dynamics controls. Grouped the two dynamics buttons for the left grid cell. At <=600 px volume uses a centered second row, with its slider still directly to the right; reserved slider width prevents toggle movement. Desktop header stays top-left within its own available width; tablet/mobile transport stays below the readout. Blue slider and compact vote below waveform/source controls retained.

Browser verification of the active Open comparison covered 320, 390, 600, 601, 768, 1023, 1024, 1440 and 1920 CSS px, each with volume open and closed: Play midpoint error <0.001 px, no heading overlap, all controls within panel, no page overflow, open slider right of and level with volume button. Results and six screenshots: artifacts/playback-centering/. desktop-proof.png is an uncropped viewport screenshot. A fresh blind test was blocked by automatic approval review to preserve the active comparison, so mode switching was restored to Open and fresh blind sessions were not tested. Original comparison, paused state and closed volume restored; viewport reset. TypeScript, production build and whitespace validation passed. CSS/component mirrored to github-ready. Local only, no publication/commit/push. Primary dist still contains unrelated drafts and must not be directly deployed.

## Blue volume slider — October 17, 2026 (local preview)

Owner replaced the green/yellow/red volume color preference with blue. Updated the inline slider gradient, thumb and soft glow to muted blue tones matching the playback controls. Geometry and toggle behavior unchanged. Root and github-ready CSS match; whitespace checks pass. Unpublished.

## Music vote wording — October 17, 2026 (local preview)

Renamed user-facing Keep/Pass to Upvote/Downvote throughout the React shootout player, Music Library buttons/counts/filters/explanations and owner vote table/search. Saved-choice status also uses the new names. Internal keep/pass values, saved votes and ranking calculations are unchanged; no migration or submission. Updated files mirrored to github-ready, preserving existing owner edits. TypeScript and whitespace checks pass; browser confirms Upvote/Downvote labels. Unpublished.

## Playback readout and centering correction — October 17, 2026

Local preview moves music feedback beneath the waveform and source controls, reduces playback readout fonts and top spacing, and centers the actual Play button on desktop. Tablet/phone transport goes below the heading. Existing inline gradient volume is preserved. TypeScript/build/whitespace checks pass. Browser checks at 320–1920 px confirm placement, centering and no header overlap or horizontal overflow. Unpublished; existing service-availability and development audio-refresh limitations remain.

## Compact playback revision — October 17, 2026

Local preview reduces music feedback to compact inline Keep/Pass controls, centers playback transport on wide panels and reflows it rightward/below the heading as space decreases. The volume slider reserves inline space directly to the button's right and uses a soft green/yellow/red gradient. Fixed the inherited phone rule that hid the open slider. Browser checks covered 320–1920 px plus floating playback; slider placement, visibility, toggle and keyboard value changes passed. Production build and whitespace validation passed. Unpublished; existing local vote-service issue remains.

## Playback layout and music-vote prominence preview — October 17, 2026

The React player now uses a wrapping title/time/transport row instead of overlaying controls on the playback caption. The full transport moves beneath the heading when space runs out. Zoom remains functional through the waveform component's controlled API. Music Keep/Pass feedback moves above the waveform with clearer text, larger buttons and a subtle highlighted strip.

TypeScript, production build and whitespace checks passed. Browser checks covered 320–1920 px without header overlap or horizontal overflow, plus zoom, volume and the collapsed/expanded floating player. The local vote API remains unavailable; save behavior was not retested. These changes are local and unpublished.


## Music voting preview — October 17, 2026

Local React preview adds a compact Keep/Pass/Undo prompt across the three shootout modes, sharing Music Library account choices. Uploaded files can be explicitly matched to existing library candidates. Random rotation uses the current top 10 dynamic and top 10 compressed measured tracks plus one challenger per group each cycle. The rank score is (Keep + 1) / (Keep + Pass + 2), followed by Keep count and stable track order. Unmeasured tracks stay outside random rotation. Library cards show aggregate rankings and counts.

TypeScript, production build, whitespace checks and isolated music preference tests pass. Responsive browser checks observed no page-level overflow at 320–1920 px. The local vote service was unavailable, so browser persistence and a populated ranked listening session remain unverified. This source is uncommitted and unpublished; no migration or production votes. Existing publication holds remain in force.

# Source handoff — October 17, 2026

## Compact header spacing — prepared October 17, 2026

The approved setup toggle is one centered, 26 px high pill with a 20 px arrow and a single-line label: “Hide test options” when expanded and “Show test options” when collapsed. Hover/accessibility help identifies comparison choices, headphones and loudness controls. This replaces the earlier larger button and separate explanation. TypeScript and browser hide/restore checks passed, including a 320 px viewport without horizontal overflow.

The Shootout header now groups Welcome, Preference Tuning, Music Library and the data notice next to the brand with consistent gaps. Its six section tabs use content-sized buttons instead of stretching across the viewport. Owner view remains a separate small static utility at the far right. Narrow layouts retain grouped controls and wrapping tabs; the smallest header also places Owner view beside the brand.

The local browser preview was inspected at 320, 390, 768, 1440 and 2519 px without horizontal overflow; the final smallest layout was checked after aligning Owner view beside the brand. TypeScript and the production build passed. The working application and isolated release snapshot contain the same two changed application files. A screenshot is retained privately as `artifacts/compact-navigation-preview.png` outside this public checkout.

The owner explicitly approved pushing and deploying this compact layout on October 17. Publication uses only the yinyangeqlab GitHub account and repository identity. The isolated deployment build preserves the hosted audio assets and excludes the unpublished credits draft. A concurrent release 40 published the independent owner-results wording update; the compact-layout build preserves that live update. That page remains outside this layout commit.

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

## Approved full-width Welcome background — October 17, 2026

The owner approved publishing this preview to GitHub and the live site using only yinyangeqlab. The Welcome hero now uses edge-to-edge artwork: the existing landscape ocean image on wider screens and the square AMOLED artwork on mobile. Cover sizing fills the background without distortion; the previous extra zoom and scroll parallax are removed. The separate artwork panel and blurred background extension were rejected and are not included. Browser previews verified desktop and mobile; mobile artwork spans the viewport without horizontal overflow. The isolated production build preserves the already-live owner-results wording, compact controls, hosted soundtrack mapping and all 32 audio assets. The unrelated owner-results working edit remains outside this Welcome commit.

Publication follow-up: release 42 had independently published the approved nine-entry curve-credits page, so this Welcome build preserves it and the associated data, alongside the live owner-results wording. A separate in-progress infrastructure edit used an asset-routing array unsupported by the installed provider. This deployment uses an isolated copy matching the live boolean asset policy and existing access gate; only /brand-landscape.webp is added as a public Welcome image. The separate infrastructure edits remain intact.

Deployed successfully as Cloudflare release 44. Only the existing Worker changed; three infrastructure resources were unchanged. Release 43’s shared asset gate and observability were preserved, with the public landscape artwork included. Authenticated HTTP checks confirmed all four primary pages, the compact Test options control, exact live stylesheet/artwork hashes, all 32 hosted audio assets, continued anonymous Shootout sign-in enforcement, and the published credits page. Live browser checks confirmed loaded landscape/AMOLED backgrounds and no horizontal overflow on desktop and mobile. No database migration, measurement upload, or research vote mutation was needed for this layout release. Evidence is retained privately in artifacts/welcome-background-live-verification.json and artifacts/welcome-live-desktop.png / welcome-live-mobile.png. GitHub publication used yinyangeqlab as author and committer.
