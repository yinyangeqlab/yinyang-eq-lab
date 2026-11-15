# Listening and ranking protocol — matched-passage-v2

This release retains earlier comparisons as legacy-v1 exploratory data. It does not fabricate missing historical provenance, establish unique people from browser IDs, or validate old tests retrospectively. The UI separates current, earlier and combined exploratory cohorts. No automatic statistical archive is enabled by this change.

## New listening tests

The server assigns blind target pairs, randomizes A/B order and owns each trial to an authenticated data-management subject. A ranked listening run requires the same trial, browser, mode, headphone category and A/B order; it must finish within two hours, report at least five elapsed playback seconds per side, and include at least five source seconds heard on both sides. Reported interval time cannot exceed trial wall time by more than one second. Five seconds is an initial product protocol, not a claim of ITU certification or adequate perceptual training.

The client provides Replay same passage and live common-passage progress. Seeking closes the old interval before jumping; skipped source time is not listening. A vote requires a completed owned run with the matching decisive answer. The server derives vote playback fields from that saved run and ignores inflated client timer values. Duplicate trial votes are rejected. Database transaction guards also reject run/vote/Open writes whose parent comparison was erased after the API checked it. Listening telemetry remains client-reported: it cannot prove headphone use, attention or honest software.

Server-issued trials bind the target-curve versions. Completed runs check those versions against the applied client curves and the current server catalog. Technical context includes protocol, measurement local ID/type/rig, fit RMS/filter count/preamp and normalization status. Ordinary listening does not upload raw response files or music files. Site-selected recordings include their catalog URL, file fingerprint and available technical metadata; Bring/Open music metadata and fingerprints respect the existing optional sharing control. Missing historical metadata stays missing.

Playback uses shared gain/headroom for A/B. Source LUFS normalization is not a claim of equal perceived loudness after EQ. Uncontrolled equipment, rig compatibility, measurement fit, hearing, environment and self-selection limit generalisation. Undeclared target categories remain explicitly unspecified; this release does not guess their intended rig/category.

## Exploratory ranking v2

The score is a participant-balanced fractional Bradley–Terry fit with a Gaussian 1500 ±350 SD prior. It is a regularized descriptive score, not a validated population preference estimator. All accepted repeats enter each participant/target-pair average. Ties enter as score one half; this does not model a distinct probability of a draw. Identical-target checks remain diagnostic and do not weight preference answers. Legacy reliability values remain stored as historical data but do not weight this model.

A participant group uses authenticated submission ownership when available and otherwise the historical browser identifier. Shared admin ownership is one shared group. Accounts are not independently verified people. Each group's total likelihood weight is one, split equally across its distinct unordered pairs, preventing repeated participation across many pairs from manufacturing independent evidence. This explicit conservative weighting is a product assumption, not a substitute for a validated listener random-effects analysis. More pair coverage can therefore redistribute a group's contribution.

Targets are ordered by estimated score. The full-Hessian Laplace SD and ±1.96 SD model range are conditional on this scoring method and prior; they are not population confidence intervals or empirical coverage guarantees. The UI calls sparse results exploratory. Regression and synthetic known-preference tests check implementation behavior, not scientific validation.

Rankings exclude removed votes and votes whose matching listening run was removed; deleted source records disappear. Open choices never enter blind rankings. Earlier ties with qualifying recorded playback can contribute to the exploratory cohort, excluding identical targets. Unlinked old records remain unverified and retain deletion-review safeguards.

## Deletion and counters

Explicit comparison-record links require verified common ownership. New Open choices use the exact completed-run ID. Specific independently verified historical links may join different IDs, without claiming an entire browser history. One deletion removes all owned members, associated personal review/verification notes and browser copies identified by the successful server response. Failed server deletion retains browser data. All-data erasure removes the personal links. Browser-only removal leaves server data.

Stored wins/losses rebuild from retained eligible decisive evidence and update on vote, listening-run, moderation and target-status changes. Stored incremental Elo is retired to neutral 1500; read APIs compute current scores from source evidence. Cache keys include a database revision, preventing other cache locations or old in-flight computations from returning pre-erasure rankings on subsequent requests. An already displayed page still needs refresh or its normal refresh event.

All valid retained raw comparisons remain long-term and deletable. No source comparison is removed or moderated during this release. Known operator test submissions remain untouched; their scientific exclusion would require a separately authorized moderation action.

## Research limits

Sparse comparisons, unverified participant independence, unequal opponents, listener/target interactions, target-rig compatibility and uncontrolled listening conditions remain substantive limitations. A connected graph alone does not establish a robust ordering. The conditional score ranges do not establish research-grade inference. Publication should disclose protocol versions, selection/exclusions/withdrawals, participant-group limitations and sensitivity analyses.

General references: https://www.itu.int/rec/R-REC-BS.1284-2-201901-I/en and https://www.jstatsoft.org/article/view/v048i09 . Neither reference validates this project's custom weighting or establishes standards compliance.
