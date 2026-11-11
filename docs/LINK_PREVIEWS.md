# Link previews

`lib/share-pages.mjs` defines the card, copy and canonical destination for each route. Redirect aliases use the destination card. Recognized listening modes, Research Rankings and Song suggestions retain the query that selects the view. Account pages, saved collections and private shootout results use neutral artwork and `noindex` metadata.

Known unfurl crawlers get metadata-only HTML from the edge for registered routes. Shared shootout and iframe pages supply metadata through their app routes. Discord crawlers receive the animation URL. Slack and other recognized preview crawlers receive a matching still. Preview clients control their own display size, animation playback and cache lifetime.

- The 24 stills are 2400 × 1260 JPEGs with full-resolution chroma.
- Motion files are 1920 × 1008 at a nominal 60 fps. Illustrated cards use lossless WebP and Welcome uses 10-bit AVIF.
- Image URLs carry an artwork revision so clients can request refreshed media. Previously cached cards can still load their GIF URLs.

## Generate and check

Install the locked project dependencies and use FFmpeg with `libwebp_anim` and `libsvtav1`. Welcome capture uses Chromium and Playwright. `CHROMIUM_PATH` selects an installed Chromium executable, and `--browser-module=/path/to/playwright-core/index.mjs` selects an external Playwright installation.

```sh
node scripts/generate-share-cards.mjs
CHROMIUM_PATH=/path/to/chromium node scripts/generate-share-motion.mjs \
  --browser-module=/path/to/playwright-core/index.mjs
node scripts/check_share_previews.mjs
node scripts/check_share_preview_routes.mjs
```

Use `--slug=<slug>` to regenerate a single card. The motion generator handles Welcome, with `--still-only` to render just its still. Use `--cards-only` to regenerate illustrated motion files without Chromium. Update the artwork revision when publishing regenerated files.

After an authorized deployment, verify the canonical URL, title, MIME type, dimensions and actual image response for the Discord and static crawler user agents. Check the corresponding browser destinations. A fresh page URL can help with testing a new Discord unfurl when the earlier card is cached.
