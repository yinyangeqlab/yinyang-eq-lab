// One table of link-preview copy for every page. The Next layouts and the edge
// gate both read it, so a shared URL previews the page it points to (Discord,
// Slack, iMessage, social sites) whether or not the visitor can open it.
// Everything here is public marketing copy; private pages get a neutral card.

export const SITE_ORIGIN = "https://yinyangeq.com";
export const SITE_NAME = "YinYang EQ";
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };

const WELCOME_IMAGE = { path: "/social-preview-aligned-v2.png", width: 1254, height: 1254, alt: "Neon yin-yang over red and blue waveform waves" };

/** kind drives the artwork in scripts/generate-share-cards.mjs. */
export const sharePages = [
  { path: "/eq-compare", slug: "eq-compare", title: "Private Blind EQ Comparison | YinYang EQ", description: "Compare two EQ presets across your music, choose blind, then reveal the presets. Presets and choices stay in your tab.", image: WELCOME_IMAGE },
  { path: "/", slug: "welcome", title: "YinYang EQ", description: "Compare headphone target curves in blind listening tests, explore the listening pool, and tune your preferred sound.", image: WELCOME_IMAGE },
  { path: "/shootout", slug: "shootout", kind: "blind", kicker: "BLIND LISTENING", title: "Listen & results | YinYang EQ", ogTitle: "Hear hidden targets, side by side", description: "Hear two hidden headphone targets on the same music, pick the one you prefer, and see how listeners rank them.", tagline: "Hear two hidden targets on the same music." },
  { path: "/shootout/personal", slug: "personal", kind: "bracket", kicker: "YOUR EARS. YOUR FAVORITES.", title: "Personal Tournament | YinYang EQ", description: "Find your favorite headphone target with a blind tournament that adapts to your choices. Choices stay local by default.", tagline: "A blind bracket that adapts to your choices." },
  { path: "/preference-tuning", slug: "preference-tuning", kind: "tuning", kicker: "PREFERENCE TUNING LAB", title: "Preference Tuning Lab | YinYang EQ", ogTitle: "Shape the sound you want", description: "Choose a target, drag its curve, and hear your changes with your own music.", tagline: "Drag the curve. Hear it on your own music." },
  { path: "/community-preferences", slug: "community", kind: "community", kicker: "PROSPECTIVE RESEARCH PILOT", title: "Community Preferences | YinYang EQ", description: "Patterns from Personal Tournaments, checked against a separate randomized reference sample.", tagline: "What do listeners prefer? A careful pilot." },
  { path: "/music-library", slug: "music-library", kind: "library", kicker: "MUSIC FOR COMPARISONS", title: "Music library | YinYang EQ", description: "Explore music used under open licenses or with artist permission, find recordings, or suggest a song.", tagline: "The music behind every comparison." },
  { path: "/curve-credits", slug: "curve-credits", kind: "credits", kicker: "ATTRIBUTION", title: "Curve credits | YinYang EQ", ogTitle: "Good listening starts with giving credit", description: "Creators, sources and reuse notes for every built-in target curve.", tagline: "Creators, sources and reuse notes." },
  { path: "/discover", slug: "discover", kind: "discover", kicker: "FOLLOW YOUR CURIOSITY", title: "Discover | YinYang EQ", description: "Meet the targets, understand the research, and see what others prefer.", tagline: "Meet the targets. See what others prefer." },
  { path: "/privacy", slug: "privacy", kind: "privacy", kicker: "PRIVACY & PARTICIPATION", title: "Privacy notice | YinYang EQ", description: "How YinYang EQ handles comparison data, what you can choose to share, and how to withdraw or delete it.", tagline: "What is kept, what is shared, your choices." },
  { path: "/shortcuts", slug: "shortcuts", kind: "keys", kicker: "HELP & SHORTCUTS", title: "Help & shortcuts | YinYang EQ", ogTitle: "Keep your hands on the music", description: "Playback shortcuts and display preferences for comparisons.", tagline: "Playback shortcuts for every comparison." },
  { path: "/version", slug: "version", kind: "version", kicker: "OPEN SOURCE", title: "About this version | YinYang EQ", description: "Release information, source code and bug reporting for YinYang EQ.", tagline: "Release notes, source and bug reports." },
  { path: "/listeners/yinyangeq", slug: "journal", kind: "journal", kicker: "PUBLIC LISTENING JOURNAL", title: "YinYangEQ listening journal | YinYang EQ", description: "Tests, listening notes and gear the account owner chose to publish.", tagline: "Tests, notes and gear, published by choice." },
  { path: "/share-shootout", slug: "share-shootout", kind: "embed", kicker: "SHAREABLE SHOOTOUT", title: "Create a shareable shootout | YinYang EQ", ogTitle: "Create a shareable blind shootout", description: "Pick two to four targets, share one link, and collect anonymous blind A/B votes. You decide whether to share the results.", tagline: "One link. Anonymous blind votes. Your data." },
  { path: "/my-data", slug: "private", title: "My data | YinYang EQ", description: "Review, export or delete the data saved for this browser.", private: true },
  { path: "/participation", slug: "private", title: "Participation choices | YinYang EQ", description: "Review and change how your comparison data is used.", private: true },
  { path: "/account-sync", slug: "private", title: "Sync & devices | YinYang EQ", description: "Private account page.", private: true },
  { path: "/my-profile", slug: "private", title: "Profile | YinYang EQ", description: "Private account page.", private: true },
  { path: "/profile-access", slug: "private", title: "Approved device access | YinYang EQ", description: "Private account page.", private: true },
  { path: "/sync", slug: "private", title: "Link a browser | YinYang EQ", description: "Private account page.", private: true },
  { path: "/pair", slug: "private", title: "Link a browser | YinYang EQ", description: "Private account page.", private: true },
  { path: "/devices", slug: "private", title: "Devices | YinYang EQ", description: "Private account page.", private: true },
  { path: "/access", slug: "private", title: "Sign in | YinYang EQ", description: "Private page.", private: true },
  { path: "/test-history", slug: "private", title: "Private page | YinYang EQ", description: "Private page.", private: true },
  { path: "/owner-research", slug: "private", title: "Private research admin | YinYang EQ", ogTitle: "Private page | YinYang EQ", description: "Private page.", private: true },
  { path: "/admin-login", slug: "private", title: "Private page | YinYang EQ", description: "Private page.", private: true },
  { path: "/owner-login", slug: "private", title: "Private page | YinYang EQ", description: "Private page.", private: true },
];

// Paths that only redirect elsewhere share the destination's card.
const aliases = { "/personal-tuning": "/preference-tuning", "/home": "/" };

// Shootout tabs and modes are query parameters on one route.
const shootoutVariants = [
  { query: ["mode", "blind"], slug: "blind-research", kind: "blind", kicker: "BLIND RESEARCH", title: "Blind Research | YinYang EQ", description: "Compare hidden targets across a broad, non-elimination pool. Eligible comparisons contribute to Research Rankings.", tagline: "Hidden targets. A broad, fair pool." },
  { query: ["mode", "open"], slug: "open-comparison", kind: "blind", kicker: "OPEN COMPARISON", title: "Open Comparison | YinYang EQ", description: "Choose two named targets yourself, revisit a favorite, or explore your own private curves.", tagline: "Pick two named targets and compare." },
  { query: ["tab", "rankings"], slug: "rankings", kind: "ranking", kicker: "RESEARCH RANKINGS", title: "Research Rankings | YinYang EQ", description: "View eligible blind-comparison results and how the scores work. Rankings describe target preferences; no listener skill score is inferred.", tagline: "Preferences for target curves, not listener scores." },
];

const privateFallback = { slug: "private", title: "Private page | YinYang EQ", description: "Private page.", private: true };

function normalize(pathname) {
  let path = String(pathname || "/");
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return aliases[path] ?? path;
}

/** Returns the preview entry for a pathname (+ optional search string), or null when the path has none. */
export function sharePageFor(pathname, search = "") {
  const path = normalize(pathname);
  const base = sharePages.find(page => page.path === path);
  if (!base) return null;
  if (path === "/shootout" && search) {
    const params = new URLSearchParams(search);
    const variant = shootoutVariants.find(({ query: [key, value] }) => params.get(key) === value);
    if (variant) return { ...base, ogTitle: undefined, ...variant, path: "/shootout", canonicalSearch: `?${variant.query[0]}=${variant.query[1]}` };
  }
  return base;
}

/** Preview title: Discord and others already show the site name above it. */
export function previewTitle(page) {
  return page.ogTitle ?? page.title.replace(/\s*[|·]\s*YinYang EQ$/, "");
}

export function shareImageUrl(page) {
  const image = page.image ?? { path: `/share/${page.slug}.jpg`, ...SHARE_IMAGE_SIZE, alt: previewTitle(page) };
  return { url: SITE_ORIGIN + image.path, width: image.width, height: image.height, alt: image.alt };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

/** Metadata-only page for link-preview crawlers. Contains no app content. */
export function shareHtml(page, { origin = SITE_ORIGIN, pathname = page.path } = {}) {
  const image = shareImageUrl(page);
  const canonical = origin + pathname + (page.canonicalSearch ?? "");
  const title = previewTitle(page);
  const description = page.description;
  const meta = [
    ["og:type", "website"], ["og:site_name", SITE_NAME], ["og:title", title], ["og:description", description], ["og:url", canonical],
    ["og:image", image.url], ["og:image:width", image.width], ["og:image:height", image.height], ["og:image:alt", image.alt],
    ["twitter:card", "summary_large_image"], ["twitter:title", title], ["twitter:description", description], ["twitter:image", image.url],
  ];
  const attr = ([key, value]) => `<meta ${key.startsWith("og:") ? "property" : "name"}="${key}" content="${escapeHtml(value)}">`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<title>${escapeHtml(page.private ? title : page.title)}</title><meta name="description" content="${escapeHtml(description)}">`
    + (page.private ? `<meta name="robots" content="noindex,nofollow">` : "")
    + `<link rel="canonical" href="${escapeHtml(canonical)}">${meta.map(attr).join("")}<meta name="theme-color" content="#58d8c9"></head>`
    + `<body style="background:#000;color:#edf3f7;font-family:Arial,sans-serif;padding:24px"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>`
    + `<p><a style="color:#58d8c9" href="${escapeHtml(canonical)}">Open ${SITE_NAME}</a></p></body></html>`;
}

/** Fields for Next's Metadata export; mirrors shareHtml so both paths agree. */
export function shareMetadataFields(path) {
  const page = sharePageFor(path) ?? { ...privateFallback, path };
  const image = shareImageUrl(page);
  const title = previewTitle(page);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.path },
    ...(page.private ? { robots: { index: false, follow: false } } : {}),
    openGraph: { type: "website", siteName: SITE_NAME, title, description: page.description, url: page.path, images: [{ url: image.url, width: image.width, height: image.height, alt: image.alt }] },
    twitter: { card: "summary_large_image", title, description: page.description, images: [image.url] },
  };
}

// Crawlers that unfurl links. A spoofed User-Agent only ever receives the
// public copy above, so this is a routing convenience, not an access control.
const unfurlAgents = /(discordbot|twitterbot|slackbot|slack-imgproxy|facebookexternalhit|facebot|linkedinbot|whatsapp|telegrambot|mastodon|skypeuripreview|embedly|redditbot|pinterest|bluesky|cardyb|viber|vkshare|iframely)/i;
export function isUnfurlCrawler(userAgent) {
  return typeof userAgent === "string" && userAgent.length < 600 && unfurlAgents.test(userAgent);
}
