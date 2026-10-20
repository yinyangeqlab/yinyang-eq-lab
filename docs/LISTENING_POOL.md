# Listening pool

The Listening pool contains 200 recording versions grouped into 193 songs: the original 94 recordings plus 106 openly licensed source recordings. Alternate mastering versions of Dreams are the same performance; Josh Woodward vocal/instrumental pairs change arrangement and are labeled accordingly. Each card links the recording source and its license, credits its creator, and identifies the version. NC and SA conditions remain applicable. No new processed mastering variants were generated.

Random playback shuffles songs once per cycle and chooses one version uniformly within each song. Votes, preference ranks and review marks never affect this scheduling. Bring your music plays the chosen file; music voting requires an explicit match to the same recording version. Account choices replace or undo one current rating per version. Top 10 scores use (upvotes + 1)/(all ratings + 2), then upvotes. Review marks require at least 50 distinct accounts and a 95% Wilson upper approval bound below 40%; they never remove or reduce playback.

Loudness matching targets -16 LUFS integrated with fixed gain. A song family's common target can be lower to preserve 1 dB true-peak headroom. Pool normalization uses native-source R128 measurements; browser estimates are descriptive. The library bypasses protective compression when EQ is off. Dynamics classifications are provisional peak-contrast screens, not sound-quality certifications or claims of verified zero limiting.

## Media delivery

Private source media is excluded from Git. The deployment manifest lists byte sizes, hashes and 8 MiB pieces. The protected /api/listening-audio/[id] route supports HEAD, ETag and single byte ranges, including suffix and cross-piece requests, and streams unchanged bytes with bounded memory. Pieces are private assets covered by the existing access and participation gate; no new public asset bypass is allowed. Existing Shantae URLs remain protected. No codec conversion or dynamic processing is used for packaging.

The source inventory and license evidence are recorded in data/listening-pool-license-evidence.json; audio hashes and piece layout are in data/listening-pool-audio-manifest.json. scripts/package-listening-pool.py creates deployment assets from the verified acquisition/measurement archive. Keep that original archive alongside the private deployment workspace; media is intentionally not distributed through this source repository.

Run node scripts/check_music_preferences.cjs and node scripts/check_listening_audio.cjs, then the production build. Deployment uses the current live Cloudflare/Pulumi baseline to preserve privacy controls. Do not publish unrelated workspace drafts or private acquisition evidence pages/database backups.
