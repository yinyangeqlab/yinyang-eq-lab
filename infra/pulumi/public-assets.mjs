// Shared by the access gate and infrastructure so the bypass cannot drift.
// Private audio, worklets, API responses and HTML must always run the Worker.
export const publicAssetPaths = [
  "/brand-landscape.webp", "/brand-landscape-crimson.webp", "/brand-amoled-crimson.webp", "/brand-avatar.webp", "/brand-avatar.png", "/brand-favicon.png",
  "/brand-amoled.webp", "/brand-avatar-aligned.webp", "/brand-avatar-aligned.png",
  "/brand-amoled-aligned.webp", "/social-preview-aligned-v2.png",
  "/brand-yin-yang.png", "/brand-mark.svg", "/brand-header.svg", "/favicon.svg", "/favicon.ico",
  "/welcome-headphone-carpet.webp", "/welcome-iem-carpet.webp",
];
// Link-preview cards (scripts/generate-share-cards.mjs): static JPEGs and their animated companions.
const shareCardPattern = /^\/share\/[a-z0-9-]+(?:\.jpg|-motion\.gif)$/;
export const publicAssetBypassPatterns = ["!/_next/static/*", "!/share/*",...publicAssetPaths.map(path => `!${path}`)];
export function isPublicAsset(path) {
  return path.startsWith("/_next/static/") || shareCardPattern.test(path) || publicAssetPaths.includes(path);
}
