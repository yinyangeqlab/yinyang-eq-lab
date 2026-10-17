# Target Shootout research protocol (draft)

## Measurement and personal trial context

A listener may select a browser-saved raw headphone measurement. The browser fits up to ten peaking filters between that response and each target before playback. Target submissions include the source measurement, its in ear/over ear type, rig, fit setup, and notes. The user may name the target independently of the headphone model. The listener's selected measurement and individual trial log remain in that browser; they are not included in shared votes. **My results** includes private and recorded answers, EQ fit RMS, playback times, and descriptive repeated-pair consistency. Browser storage is not an authenticated cross-device profile.

In-Ear and Over-Ear public ranking views fit the experimental reliability-weighted Bradley–Terry model to votes according to the listener's selected headphone category. A target's declared category controls which listening pool it can enter; targets without a declared category can enter both. The shared vote record does not include a specific headphone model. My results can show a browser-private preference tally by model from locally saved trials, but that tally is not a public or cross-listener ranking. A target curve and raw response measured on incompatible rigs may produce a misleading EQ fit, so source rig compatibility needs owner review before relying on the ranking.

## What is collected per vote

- Chosen target, rejected target, anonymous browser ID, vote time.
- User-entered song title, artist, album, and recording ID / ISRC.
- SHA-256 of the complete selected audio file when browser hashing succeeds.
- File format label, source sample rate when read from a WAV, FLAC, or MP3 header, bitrate (exact for WAV or estimated from file size and duration otherwise), and duration.
- Playback intervals in seconds for A and B, including playback rate. Intervals close on pause, seek, buffering, target switch, or vote.

The audio file and filename stay in the listener's browser. A file hash is a fingerprint: someone who has a candidate file can test whether it matches. Make that clear to participants before public collection.

Listeners opt in to sending the song and playback context with a vote. A vote without this opt-in still contributes to the exploratory all-votes ranking, but cannot qualify for either research ranking.

## Ranking inclusion

Both research rankings use the standard blind-vote requirement: at least 5 seconds heard under A and at least 5 seconds heard under B.

**Curated songs metadata subset:** This optional research subset includes only votes whose normalized title, artist, and album match an owner-approved metadata entry; an entry may also require a recording ID. It is distinct from the local server’s Curated music source, which randomly selects files from the owner-controlled Music Library. Public suggestions never join either source automatically. The metadata lists are `local/curated.js` and `lib/curated-tracks.ts`; both are currently empty, so the subset is hidden until configured.

**Exact sample:** Only votes with a full-file SHA-256 plus title, artist, album, and recording ID are included. The five fields must match across at least two distinct browser IDs. Identical hashes indicate identical file bytes. Different encodings or tags can produce different hashes even when the audible content is the same.

Each ranking fits the experimental reliability-weighted Bradley–Terry model to only its qualified votes. Accepted decisive repeats contribute to a browser/pair preference average with bounded combined evidence. Same-filter check reliability is frozen on each decisive vote; later checks affect future votes. Unknown/tie answers and identical-target checks do not directly change ratings or uncertainty. Ratings use a 1500 ± 350 SD Gaussian prior and a full-Hessian Laplace SD estimate, and are ordered by the lower approximate 95% interval bound. These weights and priors are assumptions; uncertainty is conditional on the model and estimated reliability. The general all-votes ranking remains exploratory. See [the change notes](docs/LOCAL_CHANGES.md) for migration and validation details.

## Limits before publication as research

- Browser playback events report media positions, not proof that a person actually listened or heard the sound. The interval data and file hash are reported by the client and can be falsified. The hash establishes byte identity for honest submissions, not independent server verification.
- An anonymous browser ID is not a person. One person can use multiple browsers, and clearing storage creates a new ID.
- Current audio processing is an approximate relative EQ between curves. Controlled target evaluation needs the listener's device measurement, accurate EQ fitting, level matching, and an audio quality check.
- The local file preview stores everything in that browser only. To pool participants, use the server version and add consent text, abuse controls, backups, and a documented export process.

## Listening mode cohorts

Blind votes record whether the song came from the Curated music test on the local server (`testMode=blind`, labeled Random music in browser-only and hosted versions) or Bring your music (`testMode=bring`). Each has a separate ranking, and All blind votes combines them. Open comparisons are personal records only. Each vote requires five seconds of playback on both sides.

Hosted ranked trials also require a server-issued trial ID tied to the voter ID, mode, and assigned pair. The server rejects a vote before ten seconds have passed, after two hours, for a different pair, or after the trial ID has already been used. These checks do not independently prove that the listener heard the audio. The named target catalog and browser-side EQ remain inspectable, so blind identities are hidden from the ordinary interface rather than cryptographically concealed.
