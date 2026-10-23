## Deployment completion — October 23, 2026

Update117 is deployed and verified with one matching encrypted off-device recovery point, full reconstruction and active daily scheduling. See docs/releases/update117-verification.json. The preparation record below preserves its original scope and scientific limits.

# Jason J. Chevallier music import — October 23, 2026

Prepared locally from fetched scrubbed GitHub main `b22885f` (live update116). Existing workspace drafts and historical releases are preserved. The release is prepared on an isolated lab branch; deployment and recovery receipts record actual completion. No production database mutation or schema change is part of this import.

## Corrected source selection

The owner requested all 24 existing AAC-LC M4A files from their music folder, unchanged. The current candidate contains exactly those files, totaling 98,252,313 bytes (93.70 MiB; 98.25 decimal MB). They are 44.1 kHz AAC-LC, approximately 131–197 kbps audio streams. Embedded metadata/artwork in each M4A is preserved. No re-encoding, trimming, loudness normalization or retagging was performed. SHA-256 comparison verifies the original files against the reassembled protected assets. The separate artwork files in the music folder are not imported.

The earlier mixed-format 279 MiB candidate was superseded before any deployment. Its downloaded FLAC/MP3 sources and old measurements remain private for provenance; they are not part of this release package. Superseded generated chunks were removed from the candidate and local public source directory. The library grows from 200 to 224 recordings (193 to 217 song families).

Credits: Music by Jason J. Chevallier. Used on YinYang EQ with the artist’s permission. All rights reserved. This permission does not grant visitors a license to reuse or redistribute the music. The permission screenshot and source-location records remain private. No Creative Commons license or automatic entitlement to future releases is claimed.

## Fresh analysis of the exact AAC files

All loudness measurements, true peaks, LRA, dynamics screens and stereo waveforms were regenerated from these exact files, using a separate cache from the prior sources. Measurements describe decoded AAC playback, not a hypothetical original lossless master.

The peak-contrast-screen-v2 method uses loud-passage 400 ms crest, rolling true-peak/3 s short-term loudness contrast (PSR), consistency and gain-relative repeated plateaus. LUFS, LRA and true peak remain separate descriptors. Measurements apply no EQ or dynamics processing to the imported files. See `jason-music-analysis.json` for the full method and numerical evidence bound to each source SHA-256.

Results: 20 preserved-peaks candidates; 4 unassigned; no exceptional-dynamics or dense/flattened candidates. Storm and Harken are shorter than 60 seconds; Whore of Babylon and 0x303_HUNTER_SEEKER (Reprise) have borderline/conflicting measures. All 24 remain eligible. The category counts match the earlier sources, but that does not establish waveform identity, perceptual equivalence or identical masters. Across the paired source files, rounded R128 integrated loudness changes range from -0.7 to 0.0 LU, true-peak changes from -0.3 to +1.5 dB, and LRA changes from -0.1 to +0.5 LU. This is a comparison of supplied versions, not a controlled experiment isolating codec effects. AAC/MP3 decoding can change fine peak/plateau evidence; no audible quality verdict is claimed.

| Recording | LUFS | LRA (LU) | Loud 400 ms crest (dB) | Loud 3 s PSR (dB) | Screen |
| --- | ---: | ---: | ---: | ---: | --- |
| From the Lap of Luxury | -18.01 | 8.8 | 12.16 | 11.20 | Preserved peaks |
| Storm | -19.02 | 16.6 | 11.80 | 12.10 | Review |
| Apocrypha | -16.29 | 17.2 | 11.88 | 12.40 | Preserved peaks |
| Archdeacon | -15.59 | 10.5 | 12.68 | 12.20 | Preserved peaks |
| Ablution | -16.78 | 12.0 | 12.20 | 11.80 | Preserved peaks |
| Abstersion | -17.16 | 10.4 | 12.92 | 12.40 | Preserved peaks |
| Heathens | -16.18 | 12.3 | 13.33 | 12.90 | Preserved peaks |
| Harken | -17.99 | 9.3 | 11.02 | 12.00 | Review |
| Lacerate | -15.64 | 5.4 | 12.34 | 11.40 | Preserved peaks |
| Nihil | -17.79 | 12.8 | 11.11 | 10.10 | Preserved peaks |
| Whore of Babylon | -13.22 | 8.4 | 8.72 | 11.00 | Review |
| 0x101_FIND_ME | -14.22 | 6.4 | 10.03 | 10.80 | Preserved peaks |
| 0x202_SIGNAL_LOST | -13.93 | 9.1 | 11.65 | 11.30 | Preserved peaks |
| 0x303_HUNTER_SEEKER | -15.87 | 6.2 | 10.29 | 11.10 | Preserved peaks |
| 0x404_NULL_VOID | -14.63 | 10.3 | 10.99 | 10.60 | Preserved peaks |
| 0x303_HUNTER_SEEKER (Reprise) | -15.60 | 6.3 | 8.87 | 11.20 | Review |
| VICTORS | -13.46 | 5.5 | 11.87 | 10.40 | Preserved peaks |
| TYRANTS | -15.40 | 9.1 | 12.81 | 11.70 | Preserved peaks |
| AGITATORS | -13.51 | 7.6 | 11.83 | 9.90 | Preserved peaks |
| BTFO | -15.01 | 2.5 | 12.07 | 12.20 | Preserved peaks |
| BOHICA | -15.37 | 4.2 | 11.00 | 11.80 | Preserved peaks |
| SNAFU | -15.20 | 6.5 | 9.08 | 12.30 | Preserved peaks |
| FUBAR | -14.32 | 7.6 | 9.77 | 10.50 | Preserved peaks |
| FUBAR (K/D Version) | -14.04 | 7.7 | 10.93 | 9.10 | Preserved peaks |

## Scientific interpretation

Using the same source bytes and matched passages across target/EQ conditions keeps the source constant. Findings then concern target preferences with those AAC recordings; they do not establish equivalence with lossless playback. Lossless originals are preferable as reference/archive material when the question concerns subtle impairments, codec transparency or original-master peak behavior. A lossy codec may interact with later processing, so a source held constant is not proof of codec irrelevance. No blind AAC/lossless listening comparison was performed.

## Verification and release boundary

The corrected import is checked directly against all 24 owner source files. Waveform hashes and protected manifest entries match the new AAC sources. Production build, full protected-media packaging, source-byte integrity, streaming/range checks and catalog rating/rotation regressions are checked again for this candidate. The previous local desktop/390 px/320 px credit review remains applicable; no UI control changes were made during source replacement. Physical audio, devices and Safari/iOS are untested.

Prepared local candidate: `work/jason-aac-release-20261023`. The verified update116 recovery point is retained. Deployment and changed-media backup decisions remain separate until recorded by the release verification receipt. New music adds 93.7 MiB before archive/encryption overhead; existing immutable media must be reused rather than duplicated.
