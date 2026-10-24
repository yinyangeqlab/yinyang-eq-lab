# Codex continuation — close the site first

## Owner's immediate goal and authorization

Close **all of yinyangeq.com** because the owner considers deployed updates
unstable and wants to test them privately. Visitors should see a full-screen
maintenance message explaining that updates are being tested and thanking them
for their patience. Only the existing admin sign-in and a valid authenticated
admin session may access the app. Admin sign-in is:

https://yinyangeq.com/admin-login

The owner explicitly authorized commit, publication, PR merge, deployment and
handoff. Do not ask for those permissions again. Prioritize the maintenance-only
release; do not deploy the separate blind EQ feature before closure is verified.
Keep the site closed until the owner explicitly requests reopening it. No fresh
backup data export was requested or needed for this code/config-only change.

**Current production status: NOT CLOSED BY THIS SESSION. No deployment was
attempted. No publication, PR or merge was performed. Do not imply otherwise.**

## Correct environment

The owner uses **Kitty with zsh**, not Konsole. They realized this chat was in a
non-project session and want to continue in the actual Codex project session.
Do not assume that explanation has already restored network access; test it.

Open the existing Target Shootout Project, then use its canonical `workspace/`
checkout and the worktrees below. Read AGENTS.md, current LIVE_STATE.md,
LIVE_RELEASE.json, docs/HANDOFF.md, docs/RECOVERY.md and docs/REBUILD.md before
acting. The parent source mirror is historical; do not edit it.

The CLI in this session could not create network sockets. Git fetch failed DNS
resolution; `pulumi whoami` failed contacting its
backend with `socket: operation not permitted`. The owner ran Pulumi from their
normal terminal and reported `yinyangeqlab-gmail-com`, confirming normal-terminal
access. They also updated Pulumi. This was not evidence of a broken password,
DNS configuration or Cloudflare token. Do not reinstall or rotate credentials.

In the new project session, test `pulumi whoami` (using the owner's existing
installation if not on PATH), GitHub fetch and normal provider access. If those
work, continue the already-authorized work autonomously.

Brave is signed into the lab Cloudflare account. Its dashboard showed the
existing `yinyangeq-staging` app Worker, the protected D1 binding, all six abuse
bindings and disabled workers.dev. The dashboard code editor remained stuck
loading, including after one reload; nothing was edited or deployed there.
Prefer the standard existing Pulumi stack over an improvised dashboard upload.

## Identity and baseline — mandatory

Use only the yinyangeqlab GitHub connection. Every actual Git author AND
committer must be:

`Yin Yang EQ Lab <343846436+yinyangeqlab@users.noreply.github.com>`

Verify effective identities before each commit/publication and stored identities
afterward. Preserve local hooks. Never use inherited personal Git credentials,
AI co-author trailers, retired history or historical release SHAs as a new
publication baseline. The Pulumi account name is separate from Git attribution.

Last freshly connector-verified scrubbed GitHub main:
`787bf67d4dfa286202cd7694a87449f4e6085c08`.
All 200 baseline ancestors had the exact lab author and committer and none were
on the retired-publication list. Fetch and inspect current divergence again;
never blindly pull/reset over drafts. Recorded live release is update117.

## Preserved original checkout

The original canonical checkout remains untouched on its original HEAD with
its dirty index/worktree preserved. An ignored preservation bundle is at:

`artifacts/reconcile-preservation-20261023/`

It contains staged/unstaged binary patches, original status and 88 file-content
copies with hashes. A subsequent check verified the original HEAD, status,
patches and all captured hashes unchanged. Nested Claude worktrees remain.
Do not commit these artifacts or any private recovery scripts/inputs.

The canonical full `check-live-source.mjs --snapshot` check reported only its
existing AGENTS.md documentation mismatch; this owner guidance was preserved.
Do not overwrite it merely to make the check green.

## Maintenance-only branch — deploy this first

Worktree: `work/owner-only-maintenance-20261023/`
Branch: `fix/owner-only-maintenance-20261023`
Implementation commit:
`f67511ce7a57e8a8df6714402ff23c570cc7c79d`

This branch starts directly on verified scrubbed main and contains **none of the
blind EQ feature**. A later documentation-only continuation commit may be at its
head; inspect `git log` rather than discarding it.

Implemented behavior:

- New `ownerOnlyMaintenance` Pulumi config, default false in public source.
  The private deployment must explicitly set it true. It does not auto-expire.
- Whole-site gate runs before public/crawler/shared-shootout/static/media/API
  routing. Ordinary listener credentials, forged headers/bearers and forged,
  expired or future admin cookies cannot bypass it.
- Existing `/admin-login` and legacy `/owner-login` remain available and retain
  their sign-in throttling. Only the real signed host-only admin cookie bypasses
  the closure. No new password, account or authentication mechanism.
- Responsive self-contained full-viewport maintenance HTML, escaped message,
  503, no-store, Retry-After and anti-framing. APIs/media are blocked too.
- `/api/maintenance` exposes only the operational notice. Updated clients reload
  into the locked page. Already-downloaded content/audio cannot be recalled.
- Assets are worker-first for every path while locked, preventing public asset
  exclusions from bypassing the gate. Restore normal asset routing only during
  an explicitly authorized reopening.
- Keep the older `maintenanceMode` setting at its inspected existing value;
  it is a separate mutation-blocking setting and is not the new owner-only lock.

Checks completed:

- 672 real-gate route/method/identity denial cases with real synthetic HMAC
  cookies; admin/login availability and fail-closed missing configuration.
- 544 existing per-feature maintenance cases, security headers, share previews
  and reserved-profile gate checks.
- App and infrastructure TypeScript, targeted lint and production build.
- Full media packaging: 380 public static inputs and 224 protected recordings;
  747 prior versioned browser files retained without overwriting new files.
- Clone-safe source manifest and staged path/credential checks.
- No fresh browser acceptance or real authenticated production session test.
  Available Node was 26.12.1/npm12.2.1; recovery pin 26.12.0 remains unchanged.

Read `docs/OWNER_ONLY_MAINTENANCE.md` for the complete behavior and safeguards.

## Prepared deployment runner — inspect, then use with network access

Within the maintenance worktree:

```sh
python3 artifacts/owner-only-maintenance/deploy.py --check-only
python3 artifacts/owner-only-maintenance/deploy.py --deploy
```

The first command passed locally. The second was **never run**. The ignored
runner is prepared for this exact sealed maintenance build. Before executing,
review it and confirm current source, config and deployed baseline still match.
It is not a substitute for inspecting the approved plan or actual receipts.

Separate infrastructure copy:
`work/owner-only-maintenance-infra-20261023/`

It contains the reviewed infra source, the owner's copied existing encrypted
staging configuration and a dependency symlink. It must use the existing staging
stack, not initialize anything new. The runner sets the new lock in this isolated
config, saves encrypted stack state privately and requires exactly one app Worker
update, with no resource creation/replacement/deletion. It preserves CPU5000ms,
six abuse bindings, private media/D1, disabled public Worker URLs, independent
edge burst protection and cost guard. No migrations or participant-data exports.

It checks the currently deployed update117 Worker version prefix `3ea77997`,
schema220 and unchanged resources before applying. It then verifies anonymous
page/API/media/asset denial, sign-in availability, authenticated read-only admin
access, exact authenticated JS/CSS bytes, exact deployed gate/helper modules and
unchanged controls/schema. Secrets are only used in memory; do not print them.

On success it keeps the lock in the canonical **private** stack configuration,
so the next deployment cannot silently reopen the site. Local private receipt:

`artifacts/owner-only-maintenance/live-verification.json`

No `attempt.json` or live receipt existed when this handoff was written. If an
attempt appears, inspect its logs/state before retrying. The runner deliberately
refuses blind repeat deployments. Do not use the old deployment scripts that
hardcode update101/102 or different manifests.

After a successful verified deployment, finalize LIVE_RELEASE.json,
LIVE_STATE.md, HANDOFF.md, HOSTING_HANDOFF.md and docs/HANDOFF.md together on the
reviewed branch. Preserve all original deployment/recovery provenance. Perform
only the ordinary **source-only** recovery metadata registration and validation,
retaining existing encrypted off-device snapshots/timestamps and the normal
schedule; do not make or claim a fresh data snapshot. The runner does not yet
perform this release-record/recovery closeout automatically.

## Separate reconciled blind EQ branch — retained, not deployed

Worktree: `work/reconcile-blind-eq-ui-20261023/`
Branch: `reconcile/blind-eq-ui-20261023`

Local commits, all exact lab author/committer:

- `143334273c243aee964bd208879c11312029c806` — private blind EQ feature;
  includes a fix restoring actual saved presets after starting a new session.
- `5d182065f4eed0b2dda7b701cce3b104db793aef` — navigation link retaining the
  current three illustrated Tournament cards.
- `64cc00717c6fa0b1eff735b6e94b2d1955438e92` — reconciliation note and README
  update117 correction; clearly marks the feature as not deployed.

73 EQ checks, relevant regressions, TypeScript, targeted lint, source manifest
and production build passed. Fresh browser review was blocked: shell socket/
Chromium creation was prohibited and the connected browser disallowed file URLs.
Do not claim production/Safari/iOS/headphone validation. Older timing, measurement,
Sync feedback and music changes were already published. The old Personal/player
reorganization was superseded by the newer UI and was not reapplied.

Once maintenance is verified live, continue review/testing privately and carry
forward only justified changes. Reconcile both branches onto freshly fetched
scrubbed main, preserving their separate commits and manifests. Publication and
PR merge are authorized, but verify exact identities and public path/credential
checks first. Do not reopen the site as an automatic deployment-closeout step.
