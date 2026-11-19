import { searchSitemapPaths, sitemapResponse } from "@/lib/search-sitemap";

export function GET() {
  return sitemapResponse(searchSitemapPaths);
}
