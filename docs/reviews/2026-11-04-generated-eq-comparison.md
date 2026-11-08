# Compare selected generated EQ results

November 4, 2026. This review covers the generated EQ comparison workflow.

## Scope and wording

The blind audition compares the generated EQ results selected for the session. Entry: **Compare12 generated EQ results** (actual count is dynamic). Setup: **EQ results to include**, selectable checkboxes, and **Hide names & compare N selected results**. Every screen names the headphones, target and compared-set size. Results say **Leading result from these N compared EQs**, or **No confirmed leading result within this set**. The supported set size is2–20; the current generator produces12. The comparison is available in Tuning and the shared post-shootout results panel.

The result belongs to this exact generated set and subset. It does not alter target rankings, numerical recommendation badges, fitting engines, generated filters, permissions or independent Community reference protocols. Choosing a revealed result selects that generated EQ in the existing graph/export panel; saving/downloading the EQ retains the existing consent behavior.

## Listening and selection

The existing blind-EQ player renders the exact generated filters, including shelf Q, rather than refitting the target for the audition. Both candidates share the same playback sample rate, passage and channel correction. Dynamics are off. Their rendered stereo RMS is matched with common sample-peak headroom. This is an approximation to equal perceived loudness, not an acoustic loudness calibration or measurement at the ears. A/B branches share a running playhead and switch by gain crossfade. The parent player is stopped when opening the comparison to prevent simultaneous streams. First preparation and playback remain explicit gestures; later pairs can prepare from a single decoded-source cache without autoplay. The chosen passage is retained while that source stays cached. New pairs/songs/passages start with fresh listening evidence. Hidden or muted playback does not earn credit.

Each selected result receives at least two non-skipped comparisons before finalist checks become available. The existing versioned personal-v2 contender scheduler follows balanced introductions. The shortlist also needs repeated leader exposure, distinct opponents and a separated third/fourth boundary. No one-loss elimination or one-win favorite is introduced. Ties can leave the set unresolved.

Each finalist pair is then checked on two recording identities. Known song-family versions share an identity, and identical local file bytes share a SHA-256 identity, including recognized Listening Pool copies. This does not promise to recognize all remasters/encodings of arbitrary local files. Only direct, positive confirmation margins against every other finalist can produce the scoped leading-result label. Repeated recordings, incomplete checks, ties and cycles do not manufacture a winner. Early reveal ends that blind run and preserves its incomplete scope. This is a practical personal discovery procedure, not a calibrated confidence estimate or proof of a universal preference.

## Persistence and privacy

Progress is stored only under a dedicated browser-local key, derived from the exact context, source/target responses, channel correction and generated coefficient/provenance set. Resume validates selected candidate IDs, the run and playback sample rate. Changed sets cannot inherit old answers. A different device sample rate requires a new comparison. Local audio needs to be reattached; at most one decoded source is cached and it is released when closing. Local content hashes, choices and candidate coefficients are not posted to any endpoint. The new key is outside the explicit Account Sync allowlist; generic site-data replacement/clearing can still clear local progress. JSON result download is local and includes exact candidates, context, choices and matching policy. Starting another run for the same set asks before replacing saved progress.

## Evidence and limits

Synthetic regressions cover12/15-result exposure, both A/B orientations, insufficient listening, skips, no early winner, two-recording confirmation, ties, exact-set restore, foreign-candidate refusal, independent channel coefficient copies, Account Sync exclusion, shared FIR routing, RMS/peak invariants and decoded-source reuse. The real existing browser renderer was also exercised on an18-second synthetic stereo signal, with the same channel correction on both candidates. This verifies the UI/audio path, not physical headphone output or a listener preference.

The isolated hidden-test preview blocked all API writes and replaced protected recordings with synthetic audio. Browser review observed subset selection, blinded labels, rendering/playback, continuous A/B switching, fresh evidence after a choice, automatic cached preparation, saved progress after close/reopen, an inconclusive early reveal, and keyboard/Escape operation. Desktop and390px narrow checks showed no dialog horizontal overflow. Source-selection uses the existing dark searchable list, with no new native select popup. Physical iPhone/Safari behavior remains unverified. The actual music labels in synthetic screenshots identify UI fixture selections, not recordings used for listening evaluation.

App types, lint, build and selected regression results are recorded separately in ignored verification reports. Public-only packaging remains nondeployable and excludes protected recordings. Live release records and recovery evidence are unchanged.
