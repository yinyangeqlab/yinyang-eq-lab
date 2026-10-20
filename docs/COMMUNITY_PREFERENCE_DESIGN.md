# Personal contributions and broader rankings

## Current local review status — October 19, 2026

The prospective Community Preferences pilot is now implemented locally: separate purpose consent, future adaptive observations, immutable randomized ten-assignment reference blocks, private account-balanced diagnostics, owned erasure/moderation and a status-only public endpoint. The name Community Preferences supersedes the earlier Community Discovery proposal below. Public numerical release remains deliberately unimplemented until independent human validation and output-privacy review establish a release design. See LOCAL_IMPLEMENTATION_CHECKLIST_2026-10-19.md and COMMUNITY_VALIDATION_PROTOCOL_2026-10-19.md. Earlier sections preserve the update94 boundary and estimator rationale; they are not a claim that the new local pilot is deployed.


Reviewed October 19, 2026. This is the resolved design boundary for this candidate, not an implemented new public leaderboard.

## What ships in this candidate

Retain opted-in Personal comparisons in their owned, deletable private research dataset. Preserve actual intervals, requirement ON/OFF, matched completion, candidate pool/exclusions, round, phase, setup and scheduler version. Keep controlled Blind Research ranking inputs, free listening and adaptive Personal observations distinguishable. A published YinYangEQ journal entry discloses an existing result; it must never create a second vote.

Personal helps a listener find a suitable curve. Blind Research covers comparisons under a more consistent protocol. Welcome and method explanations ask listeners to contribute to both. These are complementary sources of evidence; neither provides a universal best target or represents a random sample of all listeners.

## Recommended next public analysis, separately approved

Use the name **Community Discovery** with the subtitle **Patterns from opted-in Personal Tournaments**. Keep **Research Rankings** for the existing controlled comparison display. Never call a Personal winner an official community winner.

Start with a private pilot of pair-level summaries, stratified by headphone category, setup/protocol, scheduler version and time period. Collapse repeat observations to an account-and-pair summary before comparing accounts; report exposure and coverage alongside preferences. Do not treat prolific accounts, multiple devices or repeated finalist matches as independent listeners. Missing comparisons are missing, not losses. Allow ties, disconnected groups, cycles and an inconclusive result.

Before public scoring, preregister the analysis and validate it using synthetic populations with known preferences, uneven exposure, repeated participation, withdrawal/deletion, side effects, track dependence and preference cycles. Compare estimates against an independently randomized validation sample. Resample accounts, not individual clicks, for a descriptive uncertainty assessment; its assumptions and selection limits must be explicit. Agree on privacy/small-group disclosure rules before publishing any aggregate. Recompute ordinary summaries after deletion/moderation. The existing protected archive program must not automatically inherit this new dataset.

The current saved selection context does **not** include validated sampling probabilities. Do not add inverse-probability weighting with invented propensities or claim it corrects every selection bias. A future scheduler revision would need the actual randomized selection probabilities, eligibility set and policy version, validated on simulated and held-out data. A separate randomly sampled evaluation stream is an alternative; it requires its own product/consent review and must not silently change personal sessions.

## Research support and limits

- [ITU-R BS.1284-2](https://www.itu.int/rec/R-REC-BS.1284-2-201901-I/en) gives general guidance for subjective sound-quality assessment. It supports careful listening-test design, not this site's exact five-second threshold or community estimator.
- [Jamieson et al., Sparse Dueling Bandits, 2015](https://proceedings.mlr.press/v38/jamieson15.html) studies adaptive pairwise discovery under explicit assumptions. Our scheduler is a product heuristic, not the paper's algorithm or inherited guarantee.
- [Haddenhorst et al., Testification of Condorcet Winners, 2021](https://proceedings.mlr.press/v161/haddenhorst21a.html) addresses testing whether a uniformly preferred option exists. This motivates allowing unresolved/cyclic results rather than forcing a winner.
- [Nie et al., Why Adaptively Collected Data Have Negative Bias and How to Correct for It, 2018](https://proceedings.mlr.press/v84/nie18a.html) shows estimation bias under specified adaptive-collection conditions and studies corrections. Applying that warning to our differing exposure and stopping rules is a design inference; the paper does not prove a particular bias direction or validate an estimator for this site.

A scientifically defensible public aggregate needs an approved estimand, tested estimator and disclosure policy. Retaining consented evidence now enables that future work without falsely presenting raw adaptive wins as controlled rankings.


## October 19 follow-up: audited implementation gap and tested estimator

The owner expected the community-ranking method to be implemented. Update94 shipped collection under the private-research-only v1 notice, but no Personal public leaderboard. The unconditional “They never enter public rankings” banner described that implementation boundary without checking consent and was poor status feedback. A local follow-up replaces it with confirmed On/Off/checking/unavailable/test/practice states and rejects stale permission responses. It does not silently broaden any participant's consent or announce a public ranking that does not exist.

### A concrete primary estimand

For a versioned headphone category, reference catalog and listening context, estimate the average participating listener's preference for each curve against a predefined opponent mix. Equal linked accounts get equal overall weight; uploaded-music and unmatched-listening contexts retain separate labels. A tie contributes 0.5 only as a declared score convention, with actual tie rates reported separately. This quantity does not require a universal true order. It is not the probability that every listener will prefer the curve, nor a performance/accuracy score for the listener.

Prefer coarse uncertainty groups over a falsely precise 1–100 ranking when evidence overlaps. Preserve pairwise summaries and cycle diagnostics next to any ordering. Freeze the reference catalog for a reporting period; show new targets as provisional rather than comparing incompatible historical scores. Compare uniform-target and declared family-balanced opponent mixes as a sensitivity check. Never merge variant IDs or learn convenient family definitions after looking at who wins.

### Why raw wins and equal-account weighting alone are insufficient

Personal matching deliberately gives listeners different pairs after different preferences. Pooling wins overweights prolific listeners and changes opponent difficulty. Equal-account weighting fixes the first problem, but cannot alone fix preference-dependent exposure. A Bradley–Terry strength adjustment still assumes a model of how choices relate; it is not a universal correction for different tastes or missing observations.

An identifiability counterexample: suppose only A-versus-B is observed, with A chosen 60%. An unobserved C could lose to both 90% of the time, or beat both 90% of the time. The same saved observations then support opposite best curves. No estimator can discover which world occurred without more evidence or explicit assumptions. Even a connected comparison graph does not identify arbitrary missing pair probabilities without model assumptions.

Stopping is a separate issue. For a fair coin, stop after one result if it is 1; otherwise take a second result. The expected reported sample mean is 0.625 although the underlying probability is 0.5. Logging sampling probabilities alone does not make outcome-dependent stopping, dropout or selective publication disappear.

### Validated offline prototype and required future collection

`scripts/research/community-ranking-pilot.mjs` implements a design-based, equal-account generalized Borda estimator. For a selected pair(i,j) with known probability p and score s for i, the per-trial contribution to i is:

`I(pair contains i) * s * q(j) / ((1 - q(i)) * p)`

Here q is the declared reference-opponent distribution. Average over a fixed, preassigned number of trials within an account, then average those account estimates. No item-strength/transitivity assumption is needed for the expectation calculation under the documented stationary-response and sampling assumptions. Estimates outside [0,1] are left visible as a variance diagnostic; clipping would hide a design problem.

The prototype requires a complete positive sampling distribution and fixed-horizon blocks, rejects unknown/zero propensities, duplicate accounts/results and incomplete blocks, and does not expose a production endpoint. Its input checks cannot establish that a horizon was assigned before outcomes or that probability logs are truthful: production would require server-issued, immutable assignments and sampling logs. Current v1 rows have no validated probabilities. Do not backfill them with guessed values, claim they passed this estimator, or delete them merely because their supported use is different.

The next collection protocol should retain adaptive Personal comparisons while adding a plainly explained, opt-in randomized validation component with known positive pair/side probabilities, versioned eligible catalog and server-recorded assignment/nonresponse. Fix reporting windows and primary analysis before looking at results. Users may skip or leave; measure missingness and report sensitivity bounds rather than assuming these completers represent all site visitors. A first version can use an independent random stream as the public reference and adaptive data as separately labelled supporting/model evidence. Expanding the estimator to all adaptive data requires validated support, sequential sampling/stopping treatment and calibration against that independent stream.

Historical v1 contributions were explicitly authorized for private research. Keep those private. Public aggregation needs a new, explicit purpose/notice and row-level eligibility for contributions covered by that permission. Do not auto-enable it through an agreement already accepted under the older promise. Withdrawal/deletion must invalidate public summaries and caches, with disclosure controls against differencing and small groups. No raw IDs, setup fingerprints or account rows belong in the public response.

### What was actually tested

`scripts/check_community_ranking_pilot.mjs` checks the exact expectation to 1e-12 for uniform and nonuniform reference mixes.240 seeded simulations use120 synthetic listeners with conflicting tastes, preference-dependent exposure, a 10% tie rate and equal/unequal activity, including a history-adaptive randomized policy. Root-mean-square score error was0.0205 versus 0.1153 for raw pooling with equal activity, and0.0279 versus 0.1654 with unequal activity. In the history-adaptive policy, error was0.0140 versus 0.0213. These are deliberately specified counterexamples showing that the correction works under its assumptions—not a prediction of real-site accuracy or a guarantee against voluntary dropout. Unknown selection probabilities, absent pair support and incomplete blocks fail closed. A strong three-way preference cycle has equal Borda scores, so an ordinal display must not claim a universally dominant winner.

Before launch, add preregistered held-out human validation, prospective assignment/attrition checks, simulated side/track/time/context effects, near-ties and sparse catalog coverage, simultaneous ranking uncertainty/coverage tests, account-level resampling, moderation/withdrawal/cache invalidation and private aggregate disclosure review. Select and validate uncertainty methods and minimum exposure from these studies; do not invent a universal “N votes is accurate” threshold. The current pilot is not a public ranking implementation or a certified inference system.

### Primary research, and what it does not establish for us

- [Shin, Ramdas and Rinaldo, NeurIPS 2019](https://proceedings.neurips.cc/paper/2019/hash/65b1e92c585fd4c2159d5f33b5030ff2-Abstract.html) separately analyzes adaptive sampling, stopping and choosing. This supports treating them as different bias mechanisms; it does not validate this site's estimator or a numerical correction for v1 rows.
- [Shah et al., JMLR 2016](https://www.jmlr.org/papers/v17/15-189.html) establishes topology-dependent estimation bounds for specified ordinal models. It supports inspecting comparison coverage; it does not make an unobserved arbitrary comparison identifiable.
- [Katariya et al., AISTATS 2018](https://proceedings.mlr.press/v84/katariya18a.html) studies coarse ranking with explicit sample-complexity assumptions. It motivates uncertainty groups; we are not implementing LUCBRank or inheriting its guarantees.
- [Haddenhorst et al., UAI 2021](https://proceedings.mlr.press/v161/haddenhorst21a.html) explicitly tests the existence of a Condorcet winner. It supports allowing no universal winner rather than forcing a favorite from cyclic evidence.
- [Wu et al., AISTATS 2022](https://proceedings.mlr.press/v151/wu22f.html) concerns users of differing accuracy relative to a shared ranking. That is not the same as sincere differences in listening preference. Do not eliminate or downweight dissenting tastes on the premise that these listeners are less accurate.

The estimator formula above is our design derivation under its stated probability model. The cited papers motivate constraints and checks, not an endorsement or validation of the site's algorithm.
