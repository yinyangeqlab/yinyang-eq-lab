import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { isPublicAsset, publicAssetBypassPatterns } from '../infra/pulumi/public-assets.mjs';
import { SHARE_MOTION_FPS, sharePages, sharePreviewCards, sharePageFor, shareHtml, shareImageUrl, shareAnimationUrl, shareMetadataFields, isUnfurlCrawler, previewTitle } from '../lib/share-pages.mjs';

// Every page route in app/ has its own preview entry (or is a documented alias / dynamic route).
const routes = [];
const walk = (dir, base = '') => { for (const e of readdirSync(dir, { withFileTypes: true })) {
  if (e.name === 'api') continue;
  if (e.isDirectory()) walk(`${dir}/${e.name}`, `${base}/${e.name}`);
  else if (e.name === 'page.tsx') routes.push(base || '/'); } };
walk(fileURLToPath(new URL('../app', import.meta.url)));
const exempt = new Set(['/personal-tuning', '/home']);
for (const route of routes) {
  if (exempt.has(route) || route.includes('[')) continue;
  assert.ok(sharePageFor(route), `no share preview for ${route}`);
}
assert.equal(sharePageFor('/personal-tuning').path, '/preference-tuning');
assert.equal(sharePageFor('/preference-tuning/').path, '/preference-tuning');
assert.equal(sharePageFor('/nope'), null);

// Cards exist, are the documented size class, and stay within public asset rules.
const publicImages = sharePages.filter(page => !page.private && !page.artworkSlug).map(page => shareImageUrl(page).url);
for (const page of sharePages.filter(page => page.artworkSlug)) {
  const artwork = sharePreviewCards.find(card => card.slug === page.artworkSlug);
  assert.ok(artwork, `Unrecognized shared artwork for ${page.path}`);
  assert.deepEqual(shareImageUrl(page), shareImageUrl(artwork));
  assert.deepEqual(shareAnimationUrl(page), shareAnimationUrl(artwork));
}
assert.equal(new Set(publicImages).size, publicImages.length, 'Each shareable page has its own preview image');
for (const page of sharePages) {
  if (page.image) {
    assert.ok(existsSync(new URL(`../public${page.image.path}`, import.meta.url)), `missing still card for ${page.slug}`);
    assert.ok(isPublicAsset(page.image.path));
    continue;
  }
  assert.ok(existsSync(new URL(`../public/share/${page.slug}.jpg`, import.meta.url)), `missing card ${page.slug}`);
  assert.ok(isPublicAsset(`/share/${page.slug}.jpg`));
  assert.ok(page.description.length <= 200, `${page.path} description too long for a preview`);
}
for (const slug of ['blind-research', 'open-comparison', 'rankings']) assert.ok(existsSync(new URL(`../public/share/${slug}.jpg`, import.meta.url)));
assert.equal(isPublicAsset('/share/../api/x.jpg'), false);
assert.equal(isPublicAsset('/share/a/b.jpg'), false);
assert.equal(isPublicAsset('/share/card.png'), false);
assert.ok(publicAssetBypassPatterns.includes('!/share/*'));
for (const path of ['/brand-mark.svg', '/brand-header.svg', '/favicon.svg', '/brand-favicon.png', '/brand-yin-yang.png', '/welcome-headphone-carpet.webp', '/welcome-iem-carpet.webp']) {
  assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)), `missing public brand asset ${path}`);
  assert.ok(isPublicAsset(path));
  assert.ok(publicAssetBypassPatterns.includes(`!${path}`));
}
assert.equal(isPublicAsset('/private/brand-mark.svg'), false);
const brand = name => readFileSync(new URL(`../public/${name}`, import.meta.url), 'utf8');
assert.equal(brand('favicon.svg'), brand('brand-mark.svg'));
for (const color of ['#db4b5c', '#3f6ac0']) {
  assert.ok(brand('brand-mark.svg').includes(color) && brand('brand-header.svg').includes(color), 'Brand marks share the red and cobalt palette');
}
for (const [name, size] of [['brand-favicon.png', 64], ['brand-yin-yang.png', 180]]) {
  const { width, height, hasAlpha } = await sharp(fileURLToPath(new URL(`../public/${name}`, import.meta.url))).metadata();
  assert.deepEqual([width, height, hasAlpha], [size, size, true]);
}

// Variants and private pages.
assert.equal(sharePageFor('/shootout', '?tab=rankings').slug, 'rankings');
assert.equal(sharePageFor('/shootout', '?mode=open').slug, 'open-comparison');
assert.equal(previewTitle(sharePageFor('/shootout', '?tab=rankings')), 'Research Rankings');
assert.equal(sharePageFor('/shootout', '?tab=other').slug, 'shootout');
assert.notEqual(previewTitle(sharePageFor('/shootout', '?tab=rankings')), previewTitle(sharePageFor('/shootout')));
const priv = shareHtml(sharePageFor('/owner-research'));
assert.match(priv, /noindex/);
assert.doesNotMatch(priv, /admin/i, 'private pages must not name themselves');
assert.equal(shareMetadataFields('/owner-research').robots.index, false);
const tuningStill = shareImageUrl(sharePageFor('/preference-tuning'));
assert.deepEqual(shareMetadataFields('/preference-tuning').openGraph.images, [tuningStill]);
assert.deepEqual(shareMetadataFields('/preference-tuning').twitter.images, [tuningStill.url]);
assert.match(shareAnimationUrl(sharePageFor('/owner-research')).url, /private-motion\.webp\?v=/);
assert.equal(shareAnimationUrl(sharePageFor('/owner-research')).url, shareAnimationUrl(sharePageFor('/my-data')).url);
assert.doesNotMatch(priv, /-motion\./);
assert.equal(isPublicAsset('/share/a/b-motion.webp'), false);
assert.equal(isPublicAsset('/share/card.gif'), false);
assert.equal(isPublicAsset('/share/card.webp'), false);
assert.equal(isPublicAsset('/share/../private-motion.avif'), false);

function avifTrack(bytes) {
  // Read the generated AVIF's timed image track. The bundled Sharp decoder
  // only supports still AVIFs.
  function box(type, start = 0, end = bytes.length) {
    for (let offset = start; offset + 8 <= end;) {
      const length = bytes.readUInt32BE(offset);
      assert.ok(length >= 8 && offset + length <= end, 'Invalid AVIF box');
      if (bytes.toString('ascii', offset + 4, offset + 8) === type) return [offset + 8, offset + length];
      offset += length;
    }
    throw Error(`Missing AVIF box ${type}`);
  }
  const [brand, brandEnd] = box('ftyp');
  assert.equal(bytes.toString('ascii', brand, brandEnd).includes('avis'), true);
  const track = box('trak', ...box('moov'));
  const [, trackHeaderEnd] = box('tkhd', ...track);
  const width = bytes.readUInt32BE(trackHeaderEnd - 8) / 65536;
  const height = bytes.readUInt32BE(trackHeaderEnd - 4) / 65536;
  const media = box('mdia', ...track);
  const [header] = box('mdhd', ...media);
  const timescale = bytes.readUInt32BE(header + (bytes[header] === 1 ? 20 : 12));
  const sampleTable = box('stbl', ...box('minf', ...media));
  const [sampleDescription, sampleDescriptionEnd] = box('stsd', ...sampleTable);
  const [sampleEntry, sampleEntryEnd] = box('av01', sampleDescription + 8, sampleDescriptionEnd);
  const [configuration] = box('av1C', sampleEntry + 78, sampleEntryEnd);
  const depthFlags = bytes[configuration + 2];
  const bitDepth = depthFlags & 0x40 ? (depthFlags & 0x20 ? 12 : 10) : 8;
  const [timing, timingEnd] = box('stts', ...sampleTable);
  let frames = 0, duration = 0;
  for (let offset = timing + 8; offset + 8 <= timingEnd; offset += 8) {
    const count = bytes.readUInt32BE(offset);
    frames += count;
    duration += count * bytes.readUInt32BE(offset + 4);
  }
  return { width, height, bitDepth, frames, fps: frames * timescale / duration };
}

const openGraphImages = html => [...html.matchAll(/property="og:image" content="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(sharePreviewCards.map(page => page.slug)).size, sharePreviewCards.length);
for (const page of sharePreviewCards) {
  const motion = shareAnimationUrl(page);
  assert.ok(motion, `missing motion metadata for ${page.slug}`);
  const path = new URL(motion.url).pathname;
  assert.ok(isPublicAsset(path));
  const card = new URL(`../public${path}`, import.meta.url);
  assert.ok(statSync(card).size < 5 * 1024 * 1024, `${page.slug} exceeds the share-card size budget`);
  if (motion.type === 'image/avif') {
    const { width, height, bitDepth, frames, fps } = avifTrack(readFileSync(card));
    assert.deepEqual([width, height, bitDepth], [motion.width, motion.height, 10]);
    assert.ok(frames > SHARE_MOTION_FPS);
    assert.ok(Math.abs(fps - SHARE_MOTION_FPS) < 0.1, `${page.slug} is ${fps} fps`);
  } else {
    const metadata = await sharp(fileURLToPath(card)).metadata();
    assert.deepEqual([metadata.format, metadata.width, metadata.height], ['webp', motion.width, motion.height]);
    assert.ok(metadata.pages > 1 && metadata.loop === 0, `${page.slug} must loop multiple frames`);
    assert.ok(metadata.delay.length === metadata.pages && metadata.delay.every(delay => delay >= 16), `${page.slug} must time every frame`);
    const duration = metadata.delay.reduce((sum, delay) => sum + delay, 0);
    const fps = metadata.pages * 1000 / duration;
    assert.ok(Math.abs(fps - SHARE_MOTION_FPS) < 0.1, `${page.slug} is ${fps.toFixed(2)} fps`);
    const firstFrame = await sharp(fileURLToPath(card), { page: 0 }).resize(128, 68).raw().toBuffer();
    const otherFrame = await sharp(fileURLToPath(card), { page: Math.floor(metadata.pages * .45) }).resize(128, 68).raw().toBuffer();
    assert.ok(!firstFrame.equals(otherFrame), `${page.slug} frames must visibly change`);
  }
  const still = shareImageUrl(page);
  const stillMetadata = await sharp(fileURLToPath(new URL('../public' + new URL(still.url).pathname, import.meta.url))).metadata();
  assert.deepEqual([stillMetadata.format, stillMetadata.width, stillMetadata.height], ['jpeg', still.width, still.height]);
  assert.equal(stillMetadata.chromaSubsampling, '4:4:4');
  assert.equal(new URL(motion.url).search, new URL(still.url).search);
  assert.ok(new URL(motion.url).searchParams.get('v'), 'New artwork has a distinct cache key');
  assert.deepEqual(openGraphImages(shareHtml(page)), [still.url], `${page.slug} must offer a single still card`);
  const html = shareHtml(page, { animated: true });
  assert.deepEqual(openGraphImages(html), [motion.url], `${page.slug} must offer a single motion card`);
  assert.ok(html.includes(`property="og:image:type" content="${motion.type}"`));
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.doesNotMatch(html, /twitter:image/, 'Discord receives only one image URL');
}
assert.doesNotMatch(previewTitle(sharePageFor('/privacy')), /YinYang EQ$/, 'site name is already shown by og:site_name');

// Escaping: copy is escaped even if it ever contains markup.
const html = shareHtml({ path: '/x', slug: 'x', title: 'A "quoted" <b>', description: "it's <script>" });
assert.doesNotMatch(html, /<script>/); assert.match(html, /&quot;quoted&quot;/);

// Crawler detection.
for (const ua of ['Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)', 'Twitterbot/1.0', 'Slackbot-LinkExpanding 1.0', 'facebookexternalhit/1.1', 'TelegramBot (like TwitterBot)', 'WhatsApp/2.23', 'LinkedInBot/1.0'])
  assert.ok(isUnfurlCrawler(ua), ua);
for (const ua of ['Mozilla/5.0 (X11; Linux x86_64) Firefox/130.0', 'Googlebot/2.1', '', null, undefined, 'x'.repeat(700) + 'Discordbot'])
  assert.equal(isUnfurlCrawler(ua), false, String(ua).slice(0, 30));

// The real gate fragments: crawler unfurl, then public shootout routing.
const source = readFileSync(new URL('../infra/pulumi/private-gate.mjs', import.meta.url), 'utf8');
const start = source.indexOf('    // Link-preview crawlers'), end = source.indexOf('    const publicLandingAsset =');
assert.ok(start > 0 && end > start);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const gate = new AsyncFunction('request', 'env', 'context', 'app', 'preDatabaseGuard', 'boundedBody', 'sharePageFor', 'shareHtml', 'isUnfurlCrawler',
  `const url=new URL(request.url),path=url.pathname;${source.slice(start, end)}return null;`);
let forwarded = null;
const app = { fetch: async request => { forwarded = request; return new Response('app'); } };
const run = (path, init = {}, guard = async () => null) => { forwarded = null; return gate(new Request('https://fixture.invalid' + path, init), {}, {}, app, guard, async r => r, sharePageFor, shareHtml, isUnfurlCrawler); };

const discord = { 'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' };
for (const path of [...sharePages.map(page => page.path), '/personal-tuning', '/shootout?mode=blind', '/shootout?mode=open', '/shootout?tab=rankings']) {
  const response = await run(path, { headers: discord });
  assert.equal(response.status, 200, path); assert.equal(forwarded, null, 'crawler preview must not reach the app'); assert.match(response.headers.get('Content-Type'), /text\/html/);
  assert.equal(response.headers.get('Vary'), 'User-Agent');
  assert.match(response.headers.get('Cache-Control'), /\bprivate\b/, 'Shared HTTP caches must not mix crawler variants');
  const url = new URL(path, 'https://fixture.invalid');
  const page = sharePageFor(url.pathname, url.search);
  assert.deepEqual(openGraphImages(await response.text()), [(shareAnimationUrl(page) ?? shareImageUrl(page)).url]);
}
for (const agent of ['Slackbot-LinkExpanding 1.0', 'Twitterbot/1.0', 'facebookexternalhit/1.1']) {
  const response = await run('/ear-tuning', { headers: { 'User-Agent': agent } });
  assert.deepEqual(openGraphImages(await response.text()), [shareImageUrl(sharePageFor('/ear-tuning')).url]);
}
assert.match(await (await run('/shootout?tab=rankings', { headers: discord })).text(), /rankings-motion\.webp/);
assert.match(await (await run('/', { headers: discord })).text(), /welcome-motion\.avif/);
assert.equal((await run('/preference-tuning', { method: 'HEAD', headers: discord })).status, 200);
assert.equal(await run('/preference-tuning', { method: 'POST', headers: discord }), null, 'crawler shortcut is read-only');
assert.equal(await run('/preference-tuning'), null, 'ordinary visitors still hit the gate');
assert.equal(await run('/api/my-data', { headers: discord }), null, 'API routes are never answered as previews');
assert.equal(await run('/music/private.mp3', { headers: discord }), null);
assert.equal(isPublicAsset('/wallpapers/yinyang-eq-landscape-4k.mp4'), false, 'wallpaper downloads follow normal site access');
assert.equal(await run('/wallpapers/files.json', { headers: discord }), null, 'wallpaper downloads do not use crawler admission');

// Shootout routes: public, guarded, identity stripped, and nothing broader.
const dirty = { Cookie: '__Host-yinyangeq_owner=forged', Authorization: 'Bearer owner', 'oai-authenticated-user-id': 'owner', 'x-yinyang-data-session': 'forged' };
for (const [path, method] of [['/s/k7m2q9xwab', 'GET'], ['/s/k7m2q9xwab/card.png', 'GET'], ['/s/k7m2q9xwab/results', 'GET'], ['/embed/k7m2q9xwab', 'GET'], ['/share-shootout', 'GET'], ['/api/embed-shootouts', 'POST'], ['/api/embed-shootouts/k7m2q9xwab', 'GET'], ['/api/embed-shootouts/k7m2q9xwab/votes', 'POST']]) {
  const response = await run(path, { method, headers: dirty, body: method === 'POST' ? '{}' : undefined });
  assert.equal(response?.status, 200, `${method} ${path}`);
  for (const name of ['cookie', 'authorization', 'oai-authenticated-user-id', 'x-yinyang-data-session']) assert.equal(forwarded.headers.get(name), null, `${name} stripped on ${path}`);
}
const managing = await run('/api/embed-shootouts/k7m2q9xwab/results', { method: 'GET', headers: { ...dirty, Authorization: 'Bearer ' + 'A'.repeat(43) } });
assert.equal(managing.status, 200);
assert.equal(forwarded.headers.get('authorization'), 'Bearer ' + 'A'.repeat(43), 'manage key reaches only the results endpoint');
assert.equal(forwarded.headers.get('cookie'), null);
assert.equal((await run('/s/k7m2q9xwab', { method: 'POST', body: '{}' })), null, 'shootout pages are read-only');
for (const path of ['/s/short', '/s/k7m2q9xwab/extra', '/embed/k7m2q9xwab/card.png.x', '/api/embed-shootouts/k7m2q9xwab/other', '/api/embed-shootouts/../my-data', '/s/K7M2Q9XWAB'])
  assert.equal(await run(path), null, `${path} must stay gated`);
const limitedResponse = new Response('slow down', { status: 429 });
assert.equal(await run('/api/embed-shootouts', { method: 'POST', body: '{}' }, async () => limitedResponse), limitedResponse, 'edge burst protection runs before the app');
assert.equal(forwarded, null);
console.log('PASS share previews: every page route has a preview, cards exist, crawlers get public copy only, shootout routes are public yet guarded and stripped of identity, and other routes stay gated.');

const eq = shareMetadataFields('/eq-compare');
assert.equal(eq.openGraph.title, 'Blind EQ Comparison');
assert.deepEqual(eq.robots, { index: false, follow: false });
for (const [agent, artwork] of [[discord['User-Agent'], 'eq-compare-motion.webp'], ['Slackbot-LinkExpanding 1.0', 'eq-compare.jpg']]) {
  const response = await run('/eq-compare', { headers: { 'User-Agent': agent } });
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  const body = await response.text();
  assert.match(body, /property="og:title" content="Blind EQ Comparison"/);
  assert.match(body, /noindex,nofollow/);
  assert.equal(new URL(openGraphImages(body)[0]).pathname, `/share/${artwork}`);
}
console.log('PASS Blind EQ Comparison has dedicated previews and remains noindex.');
