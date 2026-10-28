import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { isPublicAsset, publicAssetBypassPatterns } from '../infra/pulumi/public-assets.mjs';
import { sharePages, sharePageFor, shareHtml, shareMetadataFields, isUnfurlCrawler, previewTitle, SITE_ORIGIN } from '../lib/share-pages.mjs';

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
for (const page of sharePages) {
  if (page.image) continue;
  assert.ok(existsSync(new URL(`../public/share/${page.slug}.jpg`, import.meta.url)), `missing card ${page.slug}`);
  assert.ok(isPublicAsset(`/share/${page.slug}.jpg`));
  assert.ok(page.description.length <= 200, `${page.path} description too long for a preview`);
}
for (const slug of ['blind-research', 'open-comparison', 'rankings']) assert.ok(existsSync(new URL(`../public/share/${slug}.jpg`, import.meta.url)));
assert.equal(isPublicAsset('/share/../api/x.jpg'), false);
assert.equal(isPublicAsset('/share/a/b.jpg'), false);
assert.equal(isPublicAsset('/share/card.png'), false);
assert.ok(publicAssetBypassPatterns.includes('!/share/*'));

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
assert.equal(shareMetadataFields('/preference-tuning').openGraph.images[0].url, `${SITE_ORIGIN}/share/preference-tuning.jpg`);
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
for (const path of ['/preference-tuning', '/shootout/personal', '/owner-research', '/my-data', '/personal-tuning']) {
  const response = await run(path, { headers: discord });
  assert.equal(response.status, 200, path); assert.equal(forwarded, null, 'crawler preview must not reach the app'); assert.match(response.headers.get('Content-Type'), /text\/html/);
  assert.match(await response.text(), /property="og:image" content="https:\/\/yinyangeq\.com\/share\/[a-z-]+\.jpg"/);
}
assert.match(await (await run('/shootout?tab=rankings', { headers: discord })).text(), /Research Rankings/);
assert.equal((await run('/preference-tuning', { method: 'HEAD', headers: discord })).status, 200);
assert.equal(await run('/preference-tuning', { method: 'POST', headers: discord }), null, 'crawler shortcut is read-only');
assert.equal(await run('/preference-tuning'), null, 'ordinary visitors still hit the gate');
assert.equal(await run('/api/my-data', { headers: discord }), null, 'API routes are never answered as previews');
assert.equal(await run('/music/private.mp3', { headers: discord }), null);

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

assert.equal(sharePageFor('/eq-compare').private,true);
assert.match(shareHtml(sharePageFor('/eq-compare')),/noindex,nofollow/);
console.log('PASS private EQ metadata remains noindex.');
