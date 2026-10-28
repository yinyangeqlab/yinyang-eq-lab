# Design and accessibility release candidate — October 26, 2026

Readiness checkpoint, October 26: prepared locally for proposed update124.
At this checkpoint no commit, push, merge, deployment or recovery registration
had been performed. Verified live update123 remained unchanged under
non-expiring owner-only maintenance. The owner authorized commit, publication,
deployment and handoff on October 27. Maintenance must remain enabled through
release and handoff; exact execution results belong in the release records.

## Selected scope

The candidate starts at scrubbed public main
`a8858862cc9177a845e61e5d129185de36ab3679`. It includes the accepted final
implementation from the isolated design workspace, rather than the unrelated
drafts in the canonical checkout or intermediate artwork experiments.

- Responsive player and music picker, including short-height layouts, source
  selection, readable native select styling and passage controls.
- Keyboard scope descriptions, focus restoration, visible labels and first-time
  user accessibility corrections across listening, uploads and target selection.
- Consistent visible-target search, explicit shared/left/right upload handling,
  sample-rate-aware preset validation, release availability and version links.
- Final owner-selected animated artwork: the existing landscape on desktop and
  the smooth monochrome AMOLED moon on mobile, with a remembered Pause control
  and a reduced-motion fallback. The earlier fast sweep has a 1.5-second gap;
  rejected wind and water-distortion experiments are excluded.
- Concrete release notes, relevant documentation and regression checks. Raw
  local review transcripts and temporary preview infrastructure are excluded.

EQ formulas, listening eligibility and minimum listening requirements are
unchanged. Device sample-rate validation improves preset error handling; it
does not change the filter calculations. No schema, participant data, numerical
target seeds, private media or recovery implementation is part of this release.

## Verification

The clean candidate passed all 98 regression suites, full source ESLint with
zero warnings, application and infrastructure TypeScript checks, and the pinned
Node 26.12.0 / npm 12.2.1 production build. Four stale test fixtures were updated
to match existing component state; two test-only variable names were corrected
for lint. These adjustments did not change application behavior.

The full production package validates all 224 protected recordings and 381
static assets. All 347 protected asset files, totaling 2,131,063,903 bytes,
match the verified live hashes. The package retains 896 previous client files
for open clients and passes its 3,942 dependency-import checks. No public-only
package marker is present.

Prior preview reviews of the same final application source covered desktop,
narrow and short-height layouts, keyboard operation, native select interaction,
mobile artwork selection, animated frames and stationary paused frames. There
was no new production participant activity. Physical audio output and real
Safari/iOS remain unverified; Linux WebKit results do not certify those devices.
Native popup pixel rendering is not certified across operating systems.

A read-only deployment preview shows one existing app Worker update and no
resource creation or deletion. It retains owner-only maintenance, the gate on
all paths, CPU5000ms, six rate-limit bindings and disabled public Worker URLs.
Private configuration and infrastructure source match the verified baseline;
edge burst controls and the independent cost guard are unchanged. Anonymous
live checks still receive maintenance responses and live remains update123.

## Release and handoff conditions

Commit, publication and deployment remain separate operations. Every commit
must have both author and committer set to
`Yin Yang EQ Lab <343846436+yinyangeqlab@users.noreply.github.com>` and retain
the existing identity guards. Both the connected GitHub lab account and the
separate lab-only GitHub CLI profile are verified. The latter was authorized
on October 27 for publication. The connector's commit method cannot explicitly
supply the required author and committer; its defaults must not be assumed to
satisfy that requirement. Commits therefore use the verified local identity.

Before deployment, recheck source/build fingerprints and live state. Apply only
the reviewed existing Worker change, then verify maintenance denials and exact
deployed code/assets. Keep maintenance enabled without expiry.

After a successful deployment, update LIVE_RELEASE.json, LIVE_STATE.md,
docs/HANDOFF.md and HOSTING_HANDOFF.md together with exact source/build and
verification receipts. Register the matching encrypted off-device source/build
metadata through the existing guarded workflow, with no fresh participant-data
export or duplicate immutable media. Measure the additional release archive
before any upload approval. Preserve the prior data snapshots and timestamps;
source metadata registration is not a new data recovery point.

The prepared rebuild-input manifest describes candidate files while retaining
update123 as the current live baseline. It is not evidence of a deployment or
of a completed recovery handoff. Final release records must only be written
after the corresponding operations have succeeded.
