# Per-page link previews and shareable shootouts

Status: **deployed as update116 on October 23, 2026** (additive migration 0041, schema 216 to 220; branch `shareable-shootout`, PR #4). See docs/HANDOFF.md for the verification record and the pending Codex backup baseline.

## 1. Per-page link previews

Cause of the old behaviour: the root layout set `openGraph` (Welcome title and image) and child layouts overrode only `title`, and the edge gate redirected link-preview crawlers (Discordbot etc.) from gated pages to sign-in or consent pages, which carry the generic preview.

- `lib/share-pages.mjs` is the single table of preview copy for every page route (query variants of `/shootout` included). Private and account pages share one neutral card and are `noindex`.
- Next layouts use `shareMetadata(path)` (`lib/share-metadata.ts`), so the app emits full Open Graph/Twitter data per route.
- `infra/pulumi/private-gate.mjs`: for GET/HEAD from known unfurl crawlers on a listed path, the gate answers directly with a metadata-only page (no session, no database, no app content, so crawlers no longer create open-tester rows either). The module is registered in `infra/pulumi/index.ts`.
- Cards: `node scripts/generate-share-cards.mjs` writes `public/share/*.jpg` (1200x630). `infra/pulumi/public-assets.mjs` serves `/share/*.jpg` statically (route pattern `!/share/*`).
- To change copy: edit `lib/share-pages.mjs`, rerun the generator, run `node scripts/check_share_previews.mjs`.

## 2. Shareable anonymous shootouts

Pages: `/share-shootout` (create), `/s/<id>` (listen, Open Graph card), `/embed/<id>` (chrome-less, frameable), `/s/<id>/results` (private to the manage key), `/s/<id>/card.png` (generated preview).

- Sharer picks 2-4 targets and gets a public link, an iframe snippet and a private results link whose manage key lives in the URL fragment (only its hash is stored). Results are never visible to the owner unless the sharer switches on sharing (`owner_share`, notice `embed-share-v1`); it is reversible and the shootout can be deleted.
- Listener flow: loudness-matched blind A/B with Web Audio (pink noise, synthesized pad, synthesized beat, or a local file that never leaves the browser), live spectrum, sides and round order shuffled, names revealed only after submission. Peeking at curves is allowed and recorded as `sighted`; sighted runs are excluded from every score.
- Stored per run: hour bucket, picks, optional setup, sighted flag, sound used. No IP, cookie, account or exact time. Cap 2000 runs per shootout; 180-day retention, extended when the sharer opens results.
- Owner read endpoint: `GET /api/owner-research/embed-shootouts` (list) and `?id=` (with anonymous run rows). Returns only shootouts currently shared. No admin UI panel was added.
- Privacy notice has a new "Shareable shootouts" section.

### Licensing restriction (owner decision)
The embed sends curve numbers to any visitor, so `EMBED_ALLOWED_LICENSES` in `lib/embed-store.ts` limits selectable targets to built-ins whose `data/curve-credits.json` license is MIT or CC BY 4.0 (nine targets: six ISO 226 variants and three YinYang EQ Preference Targets). The other 34 built-ins have no documented reuse license. Widening the list is a deliberate owner decision. Curves are sent as 28 one-third-octave band gains, names withheld until a run is submitted.

### Discord and iframes
- Discord cannot run interactive embeds from arbitrary sites. Pasting `/s/<id>` gives a preview card (title, description, generated image) that opens the shootout in the browser. The card art is seeded from the id and does not plot real curves, so it cannot give away the blind comparison.
- The iframe snippet only works on sites that allow iframes. The gate removes `X-Frame-Options`/`frame-ancestors 'none'` for `GET /embed/<10-char id>` only; every other response keeps them.

## 3. Deployment checklist (separate operations; each needs owner authorization)
1. **Schema change**: `drizzle/0041_embed_shootouts.sql` (2 tables, 2 indexes; operational schema count 216 -> 220, `check_migration_chain.py` updated and fingerprinted). AGENTS.md requires an explicit backup decision for schema changes before applying it to production D1. Additive only.
2. **Gate/infrastructure**: `private-gate.mjs` (crawler unfurl, public shootout routes behind `preDatabaseGuard`/`boundedBody` with cookies and identity headers stripped, framing exception), `public-assets.mjs`, `index.ts` module list. Requires the Pulumi plan to update the existing Worker/route patterns; confirm that `!/share/*` is accepted as a route pattern in the plan.
3. **App build**: includes the new `public/share` cards.
4. After deploying, verify with `curl -A "Discordbot/2.0" https://yinyangeq.com/preference-tuning` and a real shootout link in Discord. Discord caches previews, so use a fresh URL when re-testing.

## 4. Checks
`node scripts/check_share_previews.mjs`, `node --experimental-strip-types scripts/check_embed_shootout.mjs`, `node scripts/check_security_response_headers.mjs`, `node scripts/check_yinyangeq_gate.mjs`, `python3 scripts/check_migration_chain.py`, `tsc --noEmit`, `npm run build`.
Browser checks were run against the local dev server with a headless browser and synthetic seed curves only (no accounts, no production data).
