// One table of link-preview copy for every page. The Next layouts and the edge
// gate both read it, so a shared URL previews the page it points to (Discord,
// Slack, iMessage, social sites) whether or not the visitor can open it.
// Everything here is public marketing copy; private pages get a neutral card.

export const SITE_ORIGIN = "https://yinyangeq.com";
export const SITE_NAME = "YinYang EQ";
export const SHARE_IMAGE_SIZE = { width: 2400, height: 1260 };
export const SHARE_MOTION_SIZE = { width: 1920, height: 1008 };
export const SHARE_MOTION_FPS = 60;
// Bump when the generated artwork changes so unfurlers fetch the new images.
const SHARE_ART_REVISION = "20261110-hd";

const WELCOME_IMAGE = { path: "/share/welcome.jpg", ...SHARE_IMAGE_SIZE, alt: "Red and cobalt yin-yang over red and blue mountain ridges and ocean waves" };

const musicLibraryPage = { path: "/music-library", slug: "music-library", kind: "library", kicker: "MUSIC FOR COMPARISONS", title: "Music library | YinYang EQ", description: "Explore music used under open licenses or with artist permission, find recordings, or suggest a song.", tagline: "The music behind every comparison." };
const songSuggestions = {
  ...musicLibraryPage,
  slug: "song-suggestions",
  kicker: "LISTENING POOL",
  title: "Song suggestions | YinYang EQ",
  description: "Suggest a song for the Listening Pool and explore tracks other listeners have suggested.",
  tagline: "Suggest the next song to compare.",
  canonicalSearch: "?view=suggestions",
};

/** kind drives the artwork in scripts/generate-share-cards.mjs. */
export const sharePages = [
  { path: "/listen", slug: "listen", kind: "modes", kicker: "LISTENING MODES", title: "Listen | YinYang EQ", description: "Choose Personal Tournament, Blind Research or Open Comparison.", tagline: "Three ways to compare headphone targets." },
  { path: "/software-licenses", slug: "software-licenses", kind: "version", kicker: "OPEN SOURCE", title: "Software licenses | YinYang EQ", description: "Open-source software credits, licenses and corresponding source for YinYang EQ.", tagline: "Licenses, credits and source code." },
  { path: "/eq-compare", noIndex: true, slug: "eq-compare", kind: "blind", kicker: "A/B LISTENING", title: "Blind EQ Comparison | YinYang EQ", description: "Compare two EQ presets on the same music before revealing which is which.", tagline: "Two EQ presets. One blind comparison." },
  { path: "/", slug: "welcome", title: "YinYang EQ", description: "Compare headphone target curves in blind listening tests, explore the listening pool, and tune your preferred sound.", image: WELCOME_IMAGE },
  { path: "/shootout", slug: "shootout", kind: "blind", kicker: "BLIND LISTENING", title: "Listen & results | YinYang EQ", ogTitle: "Hear hidden targets, side by side", description: "Hear two hidden headphone targets on the same music, pick the one you prefer, and see how listeners rank them.", tagline: "Hear two hidden targets on the same music." },
  { path: "/shootout/personal", slug: "personal", kind: "bracket", kicker: "YOUR EARS. YOUR FAVORITES.", title: "Personal Tournament | YinYang EQ", description: "Find your favorite headphone target with a blind tournament that adapts to your choices. Choices stay local by default.", tagline: "A blind bracket that adapts to your choices." },
  { path: "/preference-tuning", slug: "preference-tuning", kind: "tuning", kicker: "TUNING LAB", title: "Preference Tuning Lab | YinYang EQ", ogTitle: "Preference Tuning", description: "Choose a target, drag its curve, and hear your changes with your own music.", tagline: "Drag the curve. Hear it on your own music." },
  { path: "/ear-tuning", slug: "ear-tuning", kind: "finder", kicker: "EAR TRAINING & EQ", title: "Peak & Dip Finder | YinYang EQ", description: "Practice hearing peaks and dips, then use tones, pink noise or music to find and adjust them on your headphones.", tagline: "Hear the difference. Find the frequency." },
  { path: "/community-preferences", slug: "community", kind: "community", kicker: "PROSPECTIVE RESEARCH PILOT", title: "Community Preferences | YinYang EQ", description: "Patterns from Personal Tournaments, checked against a separate randomized reference sample.", tagline: "What do listeners prefer? A careful pilot." },
  musicLibraryPage,
  { path: "/curve-credits", slug: "curve-credits", kind: "credits", kicker: "ATTRIBUTION", title: "Targets & credits | YinYang EQ", ogTitle: "Targets & credits", description: "Creators, sources and reuse notes for every built-in target curve.", tagline: "Creators, sources and reuse notes." },
  { path: "/privacy", slug: "privacy", kind: "privacy", kicker: "PRIVACY & PARTICIPATION", title: "Privacy notice | YinYang EQ", description: "How YinYang EQ handles comparison data, what you can choose to share, and how to withdraw or delete it.", tagline: "What is kept, what is shared, your choices." },
  { path: "/terms", slug: "terms", title: "Terms of Use | YinYang EQ", description: "Your rights in what you share, how research choices and rankings work, and how YinYang EQ updates the site.", image: WELCOME_IMAGE, artworkSlug: "welcome" },
  { path: "/glossary", slug: "glossary", kind: "book", kicker: "QUICK REFERENCE", title: "Terms & definitions | YinYang EQ", description: "Definitions of targets, measurements, EQ, presets and the terms used around YinYang EQ.", tagline: "Targets, measurements and EQ. Defined." },
  { path: "/shortcuts", slug: "shortcuts", kind: "keys", kicker: "PLAYBACK CONTROLS", title: "Help & hotkeys | YinYang EQ", description: "Playback hotkeys and display preferences for comparisons.", tagline: "Playback hotkeys for every comparison." },
  { path: "/about", slug: "about", kind: "journal", kicker: "THE LISTENING LAB", title: "About us | YinYang EQ", description: "YinYang EQ is a listening lab for anyone curious about how their headphones sound. Compare, tune and find a sound you enjoy.", tagline: "Find what sounds right to you." },
  { path: "/version", slug: "version", kind: "history", kicker: "RELEASE HISTORY", title: "About this version | YinYang EQ", description: "Release information, source code and bug reporting for YinYang EQ.", tagline: "Release notes, source and bug reports." },
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
  { query: ["mode", "open"], slug: "open-comparison", kind: "open", kicker: "OPEN COMPARISON", title: "Open Comparison | YinYang EQ", description: "Choose two named targets yourself, revisit a favorite, or explore your own private curves.", tagline: "Pick two named targets and compare." },
  { query: ["tab", "rankings"], slug: "rankings", kind: "ranking", kicker: "RESEARCH RANKINGS", title: "Research Rankings | YinYang EQ", description: "View eligible blind-comparison results and how the scores work. Rankings describe target preferences; no listener skill score is inferred.", tagline: "Preferences for target curves, not listener scores." },
];
const privateShootoutTabs = new Set(["measurements", "profile", "eqs", "upload"]);

export const privateShareCard = { path: "/my-data", slug: "private", kind: "privacy", title: "Private page | YinYang EQ", description: "Private page.", private: true };
export const sharedShootoutCard = {
  path: "/share-shootout", slug: "shared-shootout", kind: "embed", kicker: "SHARED LISTENING",
  title: "Blind shootout | YinYang EQ", description: "Compare hidden headphone targets and pick the sound you prefer.",
  tagline: "Same song, two sounds, your choice.",
};

function normalize(pathname) {
  let path = String(pathname || "/");
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return aliases[path] ?? path;
}

/** Returns the preview entry for a pathname (+ optional search string), or null when the path has none. */
export function sharePageFor(pathname, search = "") {
  const path = normalize(pathname);
  if (path === "/discover") return sharePageFor("/shootout", "?tab=rankings");
  const base = sharePages.find(page => page.path === path);
  if (!base || !search) return base ?? null;
  const params = new URLSearchParams(search);
  if (path === "/music-library" && params.get("view") === "suggestions") {
    return songSuggestions;
  }
  if (path === "/shootout") {
    // An explicit listening mode takes precedence over a tab on a fresh visit.
    const variant = shootoutVariants.find(({ query: [key, value] }) => {
      const requested = params.get(key);
      return requested === value || (value === "blind" && requested === "bring");
    });
    if (variant) {
      const { query: [key], ...card } = variant;
      const canonicalSearch = `?${key}=${params.get(key)}`;
      return { ...card, path, canonicalSearch };
    }
    const tab = params.get("tab");
    if (privateShootoutTabs.has(tab)) return { ...privateShareCard, path, canonicalSearch: `?tab=${tab}` };
    if (tab === "music") return { ...songSuggestions, path, canonicalSearch: "?tab=music" };
  }
  return base;
}

/** Unique artwork used by both generators and the review gallery. */
export const sharePreviewCards = [
  ...sharePages.filter(page => !page.private && !page.artworkSlug),
  ...shootoutVariants.map(({ query: [key, value] }) => sharePageFor("/shootout", `?${key}=${value}`)),
  songSuggestions,
  sharedShootoutCard,
  privateShareCard,
];

/** Preview title: Discord and others already show the site name above it. */
export function previewTitle(page) {
  return page.ogTitle ?? page.title.replace(/\s*[|·]\s*YinYang EQ$/, "");
}

export function shareImageUrl(page) {
  const image = page.image ?? { path: `/share/${page.slug}.jpg`, ...SHARE_IMAGE_SIZE, alt: previewTitle(page) };
  return { url: `${SITE_ORIGIN}${image.path}?v=${SHARE_ART_REVISION}`, width: image.width, height: image.height, alt: image.alt };
}

export function shareAnimationUrl(page) {
  const artwork = page.artworkSlug ?? page.slug;
  const welcome = artwork === "welcome";
  if (!page.private && !page.kind && !welcome) return null;
  // The full-scene Welcome loop benefits from AV1 temporal compression.
  const format = welcome ? "avif" : "webp";
  return {
    url: `${SITE_ORIGIN}/share/${artwork}-motion.${format}?v=${SHARE_ART_REVISION}`,
    ...SHARE_MOTION_SIZE,
    type: `image/${format}`, alt: shareImageUrl(page).alt,
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

/** Metadata-only page for link-preview crawlers. Contains no app content. */
export function shareHtml(page, { origin = SITE_ORIGIN, pathname = page.path, animated = false } = {}) {
  const motion = animated ? shareAnimationUrl(page) : null;
  const image = motion ?? shareImageUrl(page);
  const canonical = origin + pathname + (page.canonicalSearch ?? "");
  const title = previewTitle(page);
  const description = page.description;
  const meta = [
    ["og:type", "website"], ["og:site_name", SITE_NAME], ["og:title", title], ["og:description", description], ["og:url", canonical],
    ["og:image", image.url], ["og:image:type", motion?.type ?? "image/jpeg"],
    ["og:image:width", image.width], ["og:image:height", image.height], ["og:image:alt", image.alt],
    ["twitter:card", "summary_large_image"], ["twitter:title", title], ["twitter:description", description],
    ...(animated ? [] : [["twitter:image", image.url]]),
  ];
  const attr = ([key, value]) => `<meta ${key.startsWith("og:") ? "property" : "name"}="${key}" content="${escapeHtml(value)}">`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<title>${escapeHtml(page.private ? title : page.title)}</title><meta name="description" content="${escapeHtml(description)}">`
    + (page.private || page.noIndex ? `<meta name="robots" content="noindex,nofollow">` : "")
    + `<link rel="canonical" href="${escapeHtml(canonical)}">${meta.map(attr).join("")}<meta name="theme-color" content="#58d8c9"></head>`
    + `<body style="background:#000;color:#edf3f7;font-family:Arial,sans-serif;padding:24px"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>`
    + `<p><a style="color:#58d8c9" href="${escapeHtml(canonical)}">Open ${SITE_NAME}</a></p></body></html>`;
}

/** Fields for Next's Metadata export; ordinary clients get the still card. */
export function shareMetadataFields(path) {
  const page = sharePageFor(path) ?? { ...privateShareCard, path };
  const image = shareImageUrl(page);
  const title = previewTitle(page);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.path },
    ...(page.private || page.noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: { type: "website", siteName: SITE_NAME, title, description: page.description, url: page.path, images: [image] },
    twitter: { card: "summary_large_image", title, description: page.description, images: [image.url] },
  };
}

// Crawlers that unfurl links. A spoofed User-Agent only ever receives the
// public copy above, so this is a routing convenience, not an access control.
const unfurlAgents = /(discordbot|twitterbot|slackbot|slack-imgproxy|facebookexternalhit|facebot|linkedinbot|whatsapp|telegrambot|mastodon|skypeuripreview|embedly|redditbot|pinterest|bluesky|cardyb|viber|vkshare|iframely)/i;
export function prefersAnimatedShare(userAgent) {
  return /discordbot/i.test(userAgent ?? "");
}
export function isUnfurlCrawler(userAgent) {
  return typeof userAgent === "string" && userAgent.length < 600 && unfurlAgents.test(userAgent);
}
