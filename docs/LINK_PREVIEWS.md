# Per-page link previews

Shared page URLs (Discord, Slack, iMessage, social sites) now preview the page they point to instead of Welcome. Source-only change on top of live update113: no migration, no data change, no new bindings.

Why it was wrong: the root layout set Open Graph data (Welcome title and image) and child layouts overrode only `title`; and the edge gate redirected link-preview crawlers from gated pages to sign-in/consent pages, which carry the generic preview.

## What changed
- `lib/share-pages.mjs`: one table of preview copy for every page route (plus `/shootout` tab and mode variants). Private and account pages share one neutral card and are `noindex`.
- Route layouts call `shareMetadata(path)` (`lib/share-metadata.ts`) so the app emits full Open Graph/Twitter metadata per page. Existing tab titles are unchanged.
- `infra/pulumi/private-gate.mjs`: GET/HEAD from known unfurl crawlers on a listed path is answered at the edge with a metadata-only page. No session, database or app content is used, so crawlers no longer create open-tester rows. A spoofed User-Agent only ever receives public copy. All other requests follow the existing gate path unchanged. `infra/pulumi/index.ts` registers the new module.
- `public/share/*.jpg`: generated 1200x630 cards. `infra/pulumi/public-assets.mjs` serves `/share/<slug>.jpg` as static assets (route pattern `!/share/*`).
- Regenerate cards after editing copy: `node scripts/generate-share-cards.mjs`. Check: `node scripts/check_share_previews.mjs`.

## Deploying
Application build plus the infrastructure update (the gate Worker code and the `/share/*` static-asset route pattern). Confirm in the Pulumi plan that `!/share/*` is accepted, and that nothing else changes. After a verified deployment, update `LIVE_RELEASE.json`, `LIVE_STATE.md`, `HANDOFF.md` and `HOSTING_HANDOFF.md` together. No data export is needed (source-only), per the backup-scope owner preference.

Verify: `curl -A "Discordbot/2.0" https://yinyangeq.com/preference-tuning` shows that page's `og:title`/`og:image`; then paste a link in a private Discord channel (Discord caches, so add `?v=2` when retesting).
