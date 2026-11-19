import { SITE_ORIGIN } from "@/lib/share-pages.mjs";

export function GET() {
  return new Response(`Sitemap: ${SITE_ORIGIN}/sitemap.xml\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
