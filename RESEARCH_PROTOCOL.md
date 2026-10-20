# Target Shootout research protocol (draft)

## Measurement and personal trial context

A listener may select a browser-saved raw headphone measurement. The browser fits up to ten peaking filters between that response and each target before playback. Target submissions include the source measurement, its in ear/over ear type, rig, fit setup, and notes. The user may name the target independently of the headphone model. The listener’s full personal trial history and saved measurements remain in that browser. Completed listening-run records do send the selected measurement’s local ID and playback intervals to private owner research. Uploading a target for review separately includes its associated measurement. An optional, separately consented contribution sends original measurement files and setup metadata to the owner’s private archive; ordinary local saves do not require this. **My results** includes private and recorded answers, EQ fit RMS, playback times, and descriptive repeated-pair consistency. Browser storage is not an authenticated cross-device profile.

In-Ear and Over-Ear public ranking views fit the experimental reliability-weighted Bradley–Terry model to votes according to the listener's selected headphone category. A target's declared category controls which listening pool it can enter; targets without a declared category can enter both. The shared vote record does not include a specific headphone model. My results can show a browser-private preference tally by model from locally saved trials, but that tally is not a public or cross-listener ranking. A target curve and raw response measured on incompatible rigs may produce a misleading EQ fit, so source rig compatibility needs owner review before relying on the ranking.

## What is collected per vote

- Chosen target, rejected target, anonymous browser ID, vote time.
- User-entered song title, artist, album, and recording ID / ISRC.
- SHA-256 of the complete selected audio file when browser hashing succeeds.
- File format label, source sample rate when read from a WAV, FLAC, or MP3 header, bitrate (exact for WAV or estimated from file size and duration otherwise), and duration.
- Playback intervals in seconds for A and B, including playback rate. Intervals close on pause, seek, buffering, target switch, or vote.

The audio file and filename stay in the listener's browser. A file hash is a fingerprint: someone who has a candidate file can test whether it matches. Make that clear to participants before public collection.

Random music comparisons include the curated song’s metadata automatically. For listener-selected music in Bring your music or Open comparison, the listener controls sharing of song details and a file fingerprint with the music consent checkbox. Playback intervals are collected for every completed submitted comparison regardless of that checkbox. A decisive blind vote without optional song details still contributes to its mode and combined blind rankings; the optional metadata/exact-file subsets require their additional matching fields.

## Ranking inclusion

Both research rankings use the standard blind-vote requirement: at least 5 seconds heard under A and at least 5 seconds heard under B.

**Curated songs metadata subset:** This optional research subset includes only votes whose normalized title, artist, and album match an owner-approved metadata entry; an entry may also require a recording ID. It is distinct from the local server’s Curated music source, which randomly selects files from the owner-controlled Music Library. Public suggestions never join either source automatically. In this hosted application, `lib/curated-tracks.ts` derives 20 owner-reviewed metadata entries from `data/open-music.json`. This metadata-matched subset is not the same filter as the Random music cohort: a listener-selected recording can match its tags without proving identical audio bytes. The separate local Python/HTML preview is outside this source release.

**Exact sample:** Only votes with a full-file SHA-256 plus title, artist, album, and recording ID are included. The five fields must match across at least two distinct browser IDs. Identical hashes indicate identical file bytes. Different encodings or tags can produce different hashes even when the audible content is the same.

Each ranking fits the experimental reliability-weighted Bradley–Terry model to only its qualified votes. Accepted decisive repeats contribute to a browser/pair preference average with bounded combined evidence. Same-filter check reliability is frozen on each decisive vote; later checks affect future votes. Unknown/tie answers and identical-target checks do not directly change ratings or uncertainty. Ratings use a 1500 ± 350 SD Gaussian prior and a full-Hessian Laplace SD estimate, and are ordered by the lower approximate 95% interval bound. These weights and priors are assumptions; uncertainty is conditional on the model and estimated reliability. The general all-votes ranking remains exploratory.

## Limits before publication as research

- Browser playback events report media positions, not proof that a person actually listened or heard the sound. The interval data and file hash are reported by the client and can be falsified. The hash establishes byte identity for honest submissions, not independent server verification.
- An anonymous browser ID is not a person. One person can use multiple browsers, and clearing storage creates a new ID.
- Current audio processing is an approximate relative EQ between curves. Controlled target evaluation needs the listener's device measurement, accurate EQ fitting, level matching, and an audio quality check.
- The separate browser-only file preview cannot pool participants. This hosted source includes a data notice, optional music/file-contribution consent and abuse controls. Operating a research deployment still requires configured trusted access, a retention/deletion policy, backups and a documented export process.

## Listening mode cohorts

Blind votes record whether the song came from the Curated music test on the local server (`testMode=blind`, labeled Random music in browser-only and hosted versions) or Bring your music (`testMode=bring`). Each has a separate ranking, and All blind votes combines them. Open comparisons are saved personally; choices between approved targets and their listening runs also enter private owner research, without changing public rankings. Each vote requires five seconds of playback on both sides.

Hosted ranked trials also require a server-issued trial ID tied to the voter ID, mode, and assigned pair. The server rejects a vote before ten seconds have passed, after two hours, for a different pair, or after the trial ID has already been used. These checks do not independently prove that the listener heard the audio. The named target catalog and browser-side EQ remain inspectable, so blind identities are hidden from the ordinary interface rather than cryptographically concealed.

## Repeated comparisons, uncertainty, and cooldowns — October 17, 2026

Every accepted decisive blind comparison is a separate vote, including a repeated pair or a changed preference. The same server-assigned trial remains one-use. The old pair-claim table is retained for rollback but no longer blocks another assigned trial of that pair. Unknown / tie responses and identical-filter checks are stored as listening results and never become target preference observations. Check outcomes affect only the reliability weight of future decisive votes; weights already stored with votes remain fixed, so a check alone cannot move global target ratings or SD.

Rankings use an experimental weighted Bradley–Terry logistic preference model with independent Gaussian priors of 1500 and SD 350 in rating units. Natural log ability is `(rating - 1500) / (400 / ln(10))`. Each server-assigned identical-target check has a tie as its expected answer. Check reliability uses a Beta(2,2) prior: mean `(correct + 2) / (checks + 4)` and SD `sqrt(alpha*beta / ((alpha+beta)^2*(alpha+beta+1)))`. The mean is frozen into each new decisive vote. Historical votes without this calibration receive weight 0.5. Local check reliability is informational; the server computes the weight from its own validated, uniquely linked check runs.

All decisive votes from one browser/target pair enter its reliability-weighted preference average. With n answers and sum of reliability weights W, their combined likelihood weight is `2W / (n+1)`, bounded below two full-strength independent comparisons. This is a declared correlation-handling assumption, not a measured estimate of within-listener correlation. Different modes are clustered together in combined views. Raw comparison counts still include every accepted decisive answer. Browser IDs are not verified independent people. The normal approximation SD comes from the diagonal of the full inverse posterior Hessian, including opponent covariance, conditional on the fixed reliability weights. It does not propagate calibration uncertainty or cover all listener, headphone, song, or population differences. The displayed approximate interval is rating ±1.96 SD; ordering uses its lower end. A smaller SD indicates greater model precision, not objective correctness or universal agreement. Contradictory preferences can produce a precise near-tie estimate. Disconnected comparison groups cannot be reliably compared without further cross-group tests. Prior location uncertainty also creates an SD floor even with many within-group answers.

General model background: [Bayesian paired comparison with the bpcs package](https://doi.org/10.3758/s13428-021-01714-2). The calibration and repeat weights above are this project's experimental choices, not a reproduction or validation of that package.

The six-votes/ten-minutes and 50-votes/day per-browser caps are removed, including the Open-choice versions. Listening research no longer has a separate hourly browser quota. As of update 35, the shared gate has **no daily testing quota**; it allows 30 submission writes per fixed minute per HMAC-hashed client IP across endpoints. A comparison uses multiple writes. Initial over-limit requests receive a normal 60-second wait. Ten blocked attempts during that active wait can extend it through 15 minutes, 1 hour, 6 hours and 24 hours; further active-block escalations are spaced by at least one minute. SQL cannot escalate after a block expires. Once a cooldown ends, the next incident resets level and hit count, even within the retained record's 48-hour storage period. Retired daily counter keys are ignored. IP-based controls may affect shared connections and do not prove a requester is a bot. App clients do not automatically retry trial-issuance 429s.

All same-origin app API 429 responses trigger a dismissible thank-you notice with the server's Retry-After delay, or an invitation to return later when no delay is supplied. This does not promise that a rejected write entered rankings. Completed comparisons remain available in browser-local results even when network submission fails. The temporary UI test routes used for the screenshot are excluded from deployment.

### Why the daily cap was removed (update 35)

Five seconds per side permits approximately six decisive comparisons per minute, or roughly 18 submission writes, ordinarily below the 30/minute allowance. The former 500/day allowance permitted only about 166 comparisons (roughly 28 minutes at minimum pace) and could block legitimate testing. The user requested its removal and asked that respecting a cooldown never increase the next penalty. Update 35 implements both changes. Extra submissions during an active cooldown are the sole trigger for escalation; a later, separate quota incident always starts at the normal one-minute wait. Endpoint-specific feedback/review-queue safeguards remain separate from this shared testing policy.

## Original measurement contributions

`POST /api/research-measurements` accepts an explicit rights confirmation and the current data-notice version, same-origin multipart requests, a random browser contributor ID and setup metadata. It validates each UTF-8 CSV/TXT response and accepts up to three original files, each at most 4,000,000 bytes. The archive retains original bytes in bounded D1 chunks; metadata records each file’s SHA-256, byte size and parsed curve point count (at most 2,000 after parser reduction). These are measurement responses, not music uploads. `GET /api/owner-research-measurement` requires the owner bearer token and returns a checksum-verified original attachment. Both endpoints require the research migrations through `0016`.

The archive uses a pseudonymous browser ID, not an authenticated contributor identity or independent proof of permission. A failed contribution leaves the measurement saved locally and reports that the archive copy failed. Music shortlists use a separate signed-in identity path; owner views can include names/emails associated with those account votes. No production research data is part of the source repository.
