# Owner-only site maintenance

Status: prepared and locally verified; not deployed. This change starts directly
from verified scrubbed main `787bf67d4dfa286202cd7694a87449f4e6085c08` and excludes
the separate blind EQ feature. The owner's original dirty checkout is preserved.

## Behavior

Enable the existing staging stack's `ownerOnlyMaintenance` configuration to close
all site routes before crawler previews, public profiles, shareable shootouts,
listener/account sessions, media or API handlers. Only `/admin-login` (and its
legacy `/owner-login` alias) and the existing cryptographically signed, unexpired
host-only admin cookie bypass the closure. The login page remains rate limited.
No new password, credential, account, role, data migration or authentication
exception is introduced. Admin sign-in: https://yinyangeq.com/admin-login.

Visitors receive a self-contained full-viewport, responsive maintenance page:

> We’re testing updates to YinYang EQ. The site is temporarily unavailable while
> we check that everything works as intended. Thank you for your patience.

Pages and API/media requests return 503 with no-store and Retry-After. The only
public operational read is `/api/maintenance`, which returns the maintenance
notice and no application data. Updated open pages reload on this status. Older
already-loaded pages can retain cached content or audio; the server refuses
subsequent requests. No remote operation can recall bytes already downloaded.

While locked, asset routing is worker-first for every path, so static exclusions
cannot bypass the signed-session check. Normal selective static routing is
restored only when this explicit setting is disabled and redeployed. There is
no automatic reopening timer. Per-feature notices remain separate; clearing one
does not reopen the site. Keep `maintenanceMode` at its inspected existing value
so authenticated admin testing is not blocked by the older all-mutations switch.

## Deployment and verification

Use the existing authenticated staging stack, never a replacement. Set
`ownerOnlyMaintenance=true` and optionally `ownerOnlyMaintenanceMessage` (1–500
characters). Preserve CPU5000ms, the six abuse bindings, D1/media controls,
disabled public Worker URLs, independent cost guard and edge rules. A plan must
update exactly the existing app Worker; reject creation, replacement or deletion.
Expected changes are the gate/modules/assets, new plain-text lock binding and
worker-first asset routing. Preserve all previous versioned browser assets.

No schema/media/recovery-code change or fresh data export is required. Retain the
verified update117 encrypted recovery point and normal daily coverage. Perform
source-only recovery registration only after exact deployment verification; it
is not a new data snapshot. Do not relabel the existing recovery point.

Before declaring the site closed, independently verify:

- Anonymous root, deep routes, shared shootouts, protected media, APIs and direct
  versioned assets refuse access with the maintenance marker and no session.
- Forged identity headers, bearer values and listener/test sessions do not bypass
  the lock. A real admin sign-in succeeds and can open the app.
- Live gate/helper source matches the reviewed source; bindings/routing and the
  retained security controls match the approved plan. Record actual Worker
  version and final no-drift preview.
- Update LIVE_RELEASE.json, LIVE_STATE.md, HANDOFF.md, HOSTING_HANDOFF.md and the
  current docs/HANDOFF.md together only after verification. Record any dashboard
  changes as configuration drift until reconciled with the existing stack.

The public source defaults the new lock off. Merging source alone does not close
production. Never report closure until the enabled live deployment is verified.

## Checks and current access limitation

672 route/method/identity denial cases exercise the real gate with actual signed
HMAC fixture cookies, including forged, expired and future cookies; zero DB/app
calls occur before anonymous denial. Admin/login access, HTML escaping, HEAD,
static-first override and unlocked behavior pass. Existing per-feature scope,
security-header, share-preview and reserved-profile gate suites pass. App and
infrastructure TypeScript, targeted lint and production build pass; full packaging
contains 224 protected recordings and retains prior browser assets.

The CLI could not contact Pulumi: the session denies network socket creation.
The owner signed into the lab Cloudflare account in Brave so dashboard deployment
can be inspected as an alternative. This document does not claim a deployment.
