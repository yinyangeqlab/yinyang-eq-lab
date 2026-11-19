import { audioFactSitemapPaths, sitemapResponse } from "@/lib/search-sitemap";

export function GET() {
  return sitemapResponse(audioFactSitemapPaths);
}
