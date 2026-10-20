# Prospective Community Preferences pilot — version 1

Registered locally before any production collection. No production collection or numerical release is authorized by this document. Implementation: `uniform-reference-fixed10-v1`; purpose notice: `community-preferences-2026-10-19-v1`. No historical private-only contributions are reused.

## Estimand and design

For each frozen monthly headphone-category and declared-reference-system catalog, estimate each target's average participating account preference against a uniform mix of its other targets, under randomized display side and assigned Listening Pool recordings. Each variant is a separate item; many variants give a family more reference mass. New targets wait until the next monthly catalog. Reference-system labels must match the selected measurement; Unknown targets are excluded from this reference stream, with no automatic conversion between rigs. Label matching does not verify calibration. A family-balanced alternative must be declared prospectively, not chosen after results.

The server assigns all ten pairs, display sides and songs before any answer. Pair probability is `1 / choose(K,2)`; side probability is0.5; songs are uniform in the frozen music list. Pair/song probabilities, source-song versions and target context versions are immutable. Catalogs retain target IDs/context hashes, not copies of uploaded raw measurements or creator names. Target response, category, reference-system or recording changes invalidate affected reference evidence. One active block per linked account/catalog; devices do not create independent accounts.

For each complete ten-answer block, a trial involving target i contributes `(K/2)*s/10` to its score, where s=1,0 or0.5. Average the block vectors equally across linked accounts. Scores are not silently clipped. Independent-account bounded-vector Hoeffding intervals use a union bound over K targets at nominal95%; these are conditional, conservative diagnostics under the independence, fixed-horizon and nonselective-completion assumptions. Wide/overlapping bands and cycles do not create an ordinal winner.

Users may skip, stop or delete. Primary complete-block analysis excludes blocks with any skip/missing answer; private diagnostics report assigned, complete/incomplete blocks, skips, ties, pair coverage and cycles. Complete-case selection may be biased. Deletion/re-enrolment and renewed permissions can also select which blocks remain; the implementation does not claim those biases are solved. Never reinterpret an unanswered comparison as a loss. No completeness-based access restriction or forced listening.

Adaptive Personal choices are a separate supporting dataset. Collapse repeats within account/pair and stratify by headphone category, protocol, scheduler, month, source type, loudness and channel correction. Report observed pair means, not a corrected global ranking. Account balance cannot identify missing comparisons or remove preference-dependent exposure. No guessed selection probabilities or retrospective correction for v1 records.

## Validation completed in synthetic data

- Exact-expectation checks and240 seeded heterogeneous/adaptive simulations in the offline general-probability prototype.
- Fixed-stream calibration uses two predeclared disjoint seed ranges (1–100 and1001–1100),100 accounts and10 assignments each, with differing tastes plus track and display-side effects. The second range was not used to change the estimator. Conservative simultaneous coverage and RMSE checks pass for these specified populations. This is held-out synthetic testing, not independent listener validation or empirical population coverage.
- Real handler/SQLite tests cover positive assignment support, immutable assignments, fixed horizon/resume, timing, ties/cycles/missingness, account duplication rejection, opt-in/withdrawal races, moderation, erasure and test-account isolation.

## Required before any public numerical release

1. Independent held-out human listening study with preregistered hypotheses, recruitment, measurement/reference compatibility, target catalog and recording set. Include repeated fits, different tracks, near ties, preference cycles and documented attrition.
2. Compare complete-case results with independently randomized validation and predeclared missingness/sensitivity bounds; investigate permission renewal, deleted blocks/re-enrolment, repeated accounts, setup changes and time effects. Increase horizon or revise sampling if coverage/variance is inadequate; version changes require a fresh analysis plan.
3. Calibrate simultaneous uncertainty, stability and coarse ordering on held-out responses; choose exposure/coverage criteria from validation, not a universal magic vote count.
4. Review public output privacy, small groups, differencing after deletion and repeated releases. No minimum group size alone establishes anonymity. No public account IDs, setup hashes, precise counts, exact deletion events, raw pair tables or participant-level rows. No new dataset enters the existing permanent statistical archive.
5. Independently review consent, deletion/moderation exclusions, account/Sync identity and rate/media/cost controls. Review an actual proposed public response before enabling release. The shipped public endpoint currently returns status/method only with `publicReady:false`; there is no hidden switch that declares these prerequisites complete.

## Sources and scope

- https://www.itu.int/rec/R-REC-BS.1284-2-201901-I/en — controlled subjective listening principles, not validation of five seconds.
- https://proceedings.neurips.cc/paper/2019/hash/65b1e92c585fd4c2159d5f33b5030ff2-Abstract.html — sampling, stopping and choosing cause distinct biases under stated models.
- https://proceedings.mlr.press/v161/haddenhorst21a.html — checking the existence of a Condorcet winner rather than always forcing one.
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/how-do-we-ensure-anonymisation-is-effective/ — contextual disclosure/reidentification assessment; no legal certification for this pilot.
