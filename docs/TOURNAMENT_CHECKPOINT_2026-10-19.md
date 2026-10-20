# Tournament work checkpoint — October 19, 2026

**Historical WIP checkpoint. The owner resumed work later on October 19; see TOURNAMENT_REVIEW_2026-10-19.md for the current local implementation and verification. No push or deployment is authorized.** Read this document before older chronological notes in PERSONAL_SHOOTOUT.md and ADMIN_TEST_ISOLATION.md; some older statements describe superseded behavior.

## Baseline, scope and instructions

Canonical development is `workspace/`. Current live baseline is update93, implementation `4dbba07333b0755a1ffbd5dc2ce0416b936c6249`, immutable source `work/maintenance-ui-release-20261018`. Owner-root snapshot verification passed for all1,128 files during this checkpoint. Fetched origin and inspected divergence before edits: local/remote were equal before the checkpoint commit. The live mirror is not a development checkout.

No application deployment, production migration, account provisioning, Brave history transfer, public journal publication, maintenance notice or GitHub push occurred in this feature work. Separate backup/recovery scheduling changes already present in the dirty checkout are not this task and are excluded from this checkpoint commit. Live release records and existing handoff/backup edits are preserved unstaged; they must not be used as evidence this preview is deployed.

Only use the dedicated hidden test identity for browser review, including future browsers. Do not use admin even for admin UI review without a new explicit owner exception. The current review is `http://localhost:5175/shootout?mode=open`. The older127.0.0.1 admin session is separate; do not resume testing there. The localhost bootstrap exists only in ignored loopback assembly and is not deployed application source. Local preview targets/measurements are synthetic; no production participant records were copied for testing. See ADMIN_TEST_ISOLATION.md for entry and local history.

The owner wants review before release. Publish an informational update notice only when an authorized deployment actually starts, let ongoing tests continue, and end it after verification. Do not start a notice for this checkpoint. Migration operations must be planned to avoid interrupting active tests. Do not activate the old expired maintenance notice.

## Decisions and implementation to date

### Personal discovery versus public research

- Keep the existing research comparison workflow and add Personal Tournament first, with softer Suggested wording. Personal uses adaptive discovery, saved progress, reversible exclusions and a finalist check rather than forcing a one-loss elimination winner. Repeated unfavored variants motivated broader family coverage, underheard exploration and fewer wasted comparisons.
- Personal candidate scheduling covers unseen/underheard families, then balances promising contenders and continued exploration. Conservative automatic benching can be reversed and includes rescue opportunities. Ties/skips, undo and unresolved/cyclic preferences remain visible; the software does not promise a statistically proven best curve.
- Existing research ranking evidence stays separate from adaptive Personal observations. Optional Personal research collection has its own consent and dataset. A broader community-preference analysis remains a design proposal; a complete new aggregate/community-ranking product and bias correction have not been implemented or validated.
- ITU listening-test guidance and primary pairwise-discovery papers are linked in the explanation UI/docs. Their principles motivate familiarization, matched passages, repetition, randomized presentation and breaks. The exact scheduling thresholds and five-second rule are product choices, not validated scientific constants or full ITU compliance. Human accuracy has not been demonstrated.

### Tournament UI and playback

- Personal shares the other Tournament setup/player/curves, has saved runs, checkpoints, export/Sync integration and provisional winners/history. Mode labels use capitals; site-facing wording broadly changed from Shootout to Tournament while `/shootout` routes and internal identifiers remain stable.
- Personal-only themed results include athletic Field Day, original Retro Arcade high-score styling and Low-Poly Grove. Gold/silver/bronze, ordered winners, runner-ups and the longer list appear through the actual result component. Example results are explicitly synthetic and do not insert research records.
- Fine-tuning links select a result curve, with a compact yellow invitation below winners and above the long list, revised bass/mids/treble explanation and animated/hover treatment. Themes, flags/curve-name overlap, spacing and mobile states still require final visual sign-off.
- Blind Research combines Listening Pool and brought-music entry while retaining source distinctions in the player. Shared source controls include Listening Pool/Use Your Music; Personal supports its own music controls/upload. Song upvote/downvote controls are restored; community position is distinct from random playback order and never determines random selection.
- Shared button hover/typography work, Before You Listen safety guidance, mobile popup sizing, auto-hide explanation, spacing and centered decisions were implemented iteratively. Final exhaustive responsive coverage has not been established for the current combined revision.
- LUFS controls can be unlocked as in Open, channel matching supports Auto/Uploaded/Off, and segment selection can stretch above a hard five-second minimum. Seeking/dragging and duration labels were revised. Source normalization is not a guarantee of perceptual loudness matching between EQ curves.
- Most recent local changes thin the passage toolbar, make the empty segment text a label, soften the Require control and place Switch A/B between the two listening timers below the curves. **The requested final independent centering of Local Playback transport and lower controls across every breakpoint is still unfinished.** Do not claim the current Play button is always geometrically centered.

### Research toggle — latest policy supersedes earlier notes

The Require five-second checkbox controls whether voting waits for matching listening evidence; it does not control research collection. Timing remains measured when unchecked. Collect new eligible comparisons when the relevant consent permits, preserving the real intervals and ON/OFF status. Distinguish free-listening evidence from controlled ranked evidence. Never invent listening time or silently relabel free choices as controlled.

Current source introduces `free-listening-v1`, records flag/timing context, and accepts consented free-listening runs and opted-in Personal choices separately from official controlled ranking inputs. Private targets, explicitly unscored practice and admin/private-test activity retain their stated privacy/test boundaries. Optional Personal sharing remains explicit and off by default; there is no historical backfill. Free comparison feedback now checks an owned saved run and its mode/pair/category before linking descriptions.

**This newest collection change is not ready for release.** Older tests and some result labels still assume unchecked means local-only. Dedicated free-listening API, consent-race, ownership and UI verification must be completed. In particular, review/reset `researchComparisonId` on every new pair, distinguish collected research from official `recorded` ranking votes, revise result/export labels, and verify target/category compatibility and boolean/interval validation. Existing practice/private-target promises must remain explicit. Opening a consent UI must never accept an agreement for the owner.

### Admin isolation and the separate YinYangEQ participant

- Admin contributions are blocked server-side before official writes across trials, votes, runs, choices, descriptions, measurements, exports, target/song suggestions, song votes, Personal research and profile publication. Admin-owned historical public evidence is quarantined. Browser test actions remain local and flagged, excluded from participant Sync and official public counts.
- The separate hidden layout-test identity also has no admin privileges, public profile or research consent. The gate denies its mutation requests, including Sync/publication, with independent handler checks and defensive ranking/target exclusion. Its local history can be reviewed/cleared at `/test-history` without entering admin.
- Welcome/Tournament/Personal admin links glow blue only with a validated active admin cookie. Ordinary users, the layout-test identity and YinYangEQ participant retain normal links. Nickname rules reserve brand names and suspicious close variants; server validation and accessible forms explain flags and owner contact. This is not an automatic owner-notification or general nickname-approval workflow.
- A unique ordinary YinYangEQ participant/profile foundation now exists: admin-approved single-use device sign-ins, private device history/recovery snapshots, revoke/replace controls and private-by-default journal entries with reviewed Publish/Hide. Only the owner uses the admin password; no additional management key was chosen. Admin cannot publish as the participant. Public payloads are allowlisted; public files are explicitly enabled sanitized numerical exports, never raw token/browser/device identifiers or unreviewed original uploads.
- Brave ownership capture and exact reviewed historical transfer APIs/UI are implemented with linked-graph validation, conflict checks, consent requirements and preserved original scientific fields. The owner confirmed the original Brave session remains available. **No real Brave capture, historical admin-vote attribution, transfer or live YinYangEQ account activation has been performed.** Only verified owner records can move; ambiguous/unowned data needs separate evidence. Never reconstruct erased records or automatically publish migrated history.
- Additive migrations0033 and0034 exist and were applied only to the synthetic local preview DB. Production remains unchanged. Recovery sanitization changes revoke device/grant credentials and reset recovered publications for fresh review; these profile-related recovery changes are included in the checkpoint. Independent hosted backup work is excluded.

### Maintenance dependency

Pausing Tournaments derives a checked, disabled Shared Uploads & Suggestions card, with explanation and muted appearance. Its independently saved preference is preserved, restored when Tournaments reopen, and not silently overwritten in the publication payload. The effective lock also blocks contribution APIs while Tournaments are paused; drafts/live summaries count the dependent feature. Existing notice timing/expiry remains unchanged. This has synthetic UI/API coverage; no admin browser review was done after the test-account-only instruction.

## Checkpoint evidence

The latest application build and source-only TypeScript check passed. The temporary TypeScript configuration excludes ignored historical audit/infrastructure copies with unrelated missing Pulumi packages; it is not a claim the unfiltered discovery config passes. Full protected-media packaging passed. The gated local preview was refreshed; browser inspection visibly confirmed Private Test Mode, normal non-glowing admin link, local-only song ratings and a working `/test-history` link without admin access.

The checkpoint batch ran30 relevant suites: **26 passed,4 failed**. Machine-readable results and full synthetic logs are ignored local evidence at `artifacts/tournament-checkpoint-20261019/checks.json` and adjacent logs. Do not commit generated build/media, local DB/session files, keys, grants, private config or these logs.

Passing coverage includes Personal scheduling/storage/playback/research, reserved-account/device/history/public-file/replacement/gate APIs, account/nickname indicator and forms, privacy/measurement/Sync, music preferences/rank refresh/source UI, reminders/auto-hide, ranking API and maintenance/duration checks. Admin/private-test handler tests pass48 actual denial cases with zero application writes; gate tests additionally pass24 mutation denials. Ranking tests exclude both decisive and tied synthetic layout-test evidence. Maintenance checks pass448 route/method combinations, preserve raw lock storage/timer behavior and test restored independent selections. The separate profile-related recovery suite passes18 synthetic checks.

Failing suites, preserved without weakening tests during the pause:

1. `scripts/check_blind_completion.mjs`: recorded-success assertion fails at line69. The handler gained `setResearchComparisonId`; inspect missing harness state and actual completion semantics. Later expectations also assume free comparisons make zero requests. Do not call this only an obsolete assertion until investigated.
2. `scripts/check_passage_ranking.mjs`: VM fixture lacks `@/lib/admin-contributions`. Supply the real relevant policy dependency and then test free-protocol exclusion, not a permissive bypass.
3. `scripts/check_personal_passage_optout.mjs`: expects zero posts for unchecked requirement, receives one. Rewrite around the latest consented-collection policy, and independently assert permission-off/admin/test/private exceptions and accurate telemetry.
4. `scripts/check_research_source.mjs`: VM fixture lacks `sharedAdmin` state. Update the real harness and preserve ordinary participant/source-transition checks.

These failures and the unfinished collection/centering work block deployment. Earlier documents contain successful historical test reports; they do not certify the latest source.

## Remaining work after owner resumes

1. Resolve the four suite failures by validating behavior and repairing fixtures/implementation as appropriate. Add complete consented free-listening regression cases; no fabricated timing, no accidental official vote, stale feedback ID, cross-user run linking or private-target leak.
2. Finish player/lower-controls centering; test narrow/mobile/tablet,4:3/laptop,1080p/2K/4K and ultrawide browser sizes plus zoom. Verify touch targets, hover speed, popup bounds, vote alignment, source controls and disabled/done states with synthetic fixtures in the test account only. Physical TV/CRT hardware and universal layouts are not certified.
3. Reconcile explanatory/help/results/export/privacy copy with the latest collection policy. Review all claim wording; do not describe optional sharing as unconditional collection. Validate the actual completed-result user flow, bronze/long list, themes and tuning preview after final CSS.
4. Finish product/research design for community preference aggregation, if still desired. Personal observations may be retained for analysis without pooling raw adaptive win rates into the existing controlled ranking. No public scoring change should be implied by adding journal publication.
5. Obtain owner acceptance of the preview. Separately plan/provision the live test identity if wanted; the current account bootstrap is local only. Real YinYangEQ enrollment, original Brave capture and reviewed historical ownership migration require explicit execution decisions and exact previews; keep all entries private until published.
6. Follow DEPLOYMENT_STAGE_2026-10-19.md before any authorized release. This checkpoint is not deploy-ready.
