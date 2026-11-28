import { AUDIO_FACTS_PATH, audioFactPath, audioFacts } from "./audio-facts.mjs";
import { FITTER_GUIDE_PATH, SITE_ORIGIN, LISTENING_METHODOLOGY_PATH } from "./share-pages.mjs";

export const audioFactSitemapPaths = [AUDIO_FACTS_PATH, ...audioFacts.map(fact => audioFactPath(fact.slug))];

// Include canonical pages that provide useful content without an account or an invite.
export const searchSitemapPaths = [
  "/",
  "/listen",
  "/glossary",
  "/glossary/iem-measurement",
  FITTER_GUIDE_PATH,
  LISTENING_METHODOLOGY_PATH,
  ...audioFactSitemapPaths,
  "/android",
  "/android/trailer",
  "/about",
  "/shortcuts",
  "/curve-credits",
  "/version",
];

export function sitemapResponse(paths: readonly string[]) {
  const entries = paths.map(path => {
    const url = new URL(path, SITE_ORIGIN).href.replaceAll("&", "&amp;").replaceAll("'", "&apos;");
    return `  <url><loc>${url}</loc></url>`;
  });

  return new Response(
    ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...entries, "</urlset>", ""].join("\n"),
    { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } },
  );
}
