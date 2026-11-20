const companionThemes = ["blue", "amoled", "light", "green"];
const previousCompanionScreens = companionThemes.flatMap(theme =>
  ["presets", "eq", "match", "compare", "audio", "usb", "mixer", "collection", "tuning", "debug"]
    .map(screen => `/android/screens/${theme}/${screen}.webp`));

// Shared by the access gate and infrastructure so the bypass cannot drift.
// Private audio, worklets, API responses and HTML must always run the Worker.
export const publicAssetPaths = [
  "/brand-landscape.webp", "/brand-landscape-crimson.webp", "/brand-amoled-crimson.webp", "/brand-avatar.webp", "/brand-avatar.png", "/brand-favicon.png",
  "/brand-amoled.webp", "/brand-avatar-aligned.webp", "/brand-avatar-aligned.png",
  "/brand-amoled-aligned.webp", "/social-preview-aligned-v2.png",
  "/brand-yin-yang.png", "/brand-mark.svg", "/brand-header.svg", "/favicon.svg", "/favicon.ico",
  "/android/qudelix-5k.png", "/android/companion-tour.mp4", "/android/companion-tour-portrait.mp4", "/android/companion-tour.webp", "/android/companion-tour.vtt",
  ...companionThemes.flatMap(theme =>
    ["eq", "presets", "match", "compare", "output", "audio", "device", "usb", "mixer", "debug"]
      .map(screen => `/android/screens/ui-preview-v4/${theme}/${screen}.webp`)),
  "/android/companion.svg", "/android/manager.svg", "/android/compare.webp",
  // Only the fixed, original instrumental preview is public.
  "/sample-assets/a.flac", "/sample-assets/b.flac",
  "/sample-assets/Barlow-Regular.ttf", "/sample-assets/Barlow-SemiBold.ttf", "/sample-assets/OFL.txt",
  "/sample-assets/destinations/ranking-print.webp", "/sample-assets/destinations/tuning-print.webp",
  "/sample-assets/destinations/comparison-print.webp", "/sample-assets/destinations/contribute-print.webp",
  "/welcome-headphone-carpet.webp", "/welcome-iem-carpet.webp",
  "/vendor/site-help/potion-2m-int4-v1.bin", "/vendor/site-help/LICENSE.txt",
];
// Link-preview cards (scripts/generate-share-cards.mjs): static JPEGs and their animated companions.
const shareCardPattern = /^\/share\/[a-z0-9-]+(?:\.jpg|-motion\.(?:webp|avif|gif))$/;
export const publicAssetBypassPatterns = ["!/_next/static/*", "!/share/*",...publicAssetPaths.filter(path => !isCompanionTrailer(path)).map(path => `!${path}`)];
export function isPublicAsset(path) {
  // Cached gallery pages can still request the previous screens through the Worker.
  return path.startsWith("/_next/static/") || shareCardPattern.test(path)
    || publicAssetPaths.includes(path) || previousCompanionScreens.includes(path);
}

export function isCompanionTrailer(path) {
  return path === "/android/companion-tour.mp4" || path === "/android/companion-tour-portrait.mp4";
}

// The static binding returns the whole public movie even when a client requests a byte range.
export async function serveCompanionTrailer(request, assets) {
  const upstreamHeaders = new Headers(request.headers);
  upstreamHeaders.delete("Range");
  upstreamHeaders.delete("If-Range");
  const response = await assets.fetch(new Request(request, { headers: upstreamHeaders }));
  if (response.status !== 200) return response;
  const headers = new Headers(response.headers);
  headers.set("Accept-Ranges", "bytes");
  const range = /^bytes=(\d*)-(\d*)$/i.exec(request.headers.get("Range") || "");
  const validator = request.headers.get("If-Range");
  if (request.method !== "GET" || !range || (!range[1] && !range[2])
      || (validator && validator !== headers.get("ETag") && validator !== headers.get("Last-Modified"))) {
    return new Response(response.body, { headers });
  }
  const content = await response.arrayBuffer();
  const length = content.byteLength;
  const start = range[1] ? Number(range[1]) : Math.max(0, length - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(Number(range[2]), length - 1) : length - 1;
  if (start > end || start >= length) {
    headers.set("Content-Range", `bytes */${length}`);
    headers.set("Content-Length", "0");
    return new Response(null, { status: 416, headers });
  }
  headers.set("Content-Range", `bytes ${start}-${end}/${length}`);
  headers.set("Content-Length", String(end - start + 1));
  return new Response(new Uint8Array(content, start, end - start + 1), { status: 206, headers });
}
