import { AUDIO_FACTS_PATH, audioFactPath, audioFacts } from "@/lib/audio-facts.mjs";
import { SITE_ORIGIN } from "@/lib/share-pages.mjs";

export function GET() {
  const paths = [AUDIO_FACTS_PATH, ...audioFacts.map(fact => audioFactPath(fact.slug))];
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
      + paths.map(path => `  <url><loc>${SITE_ORIGIN}${path}</loc></url>`).join("\n")
      + "\n</urlset>\n",
    { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } },
  );
}
