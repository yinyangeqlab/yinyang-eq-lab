export type SharePage = {
  path: string; slug: string; title: string; description: string;
  ogTitle?: string; kind?: string; kicker?: string; tagline?: string; private?: boolean;
  image?: { path: string; width: number; height: number; alt: string };
  canonicalSearch?: string;
};
export const SITE_ORIGIN: string;
export const SITE_NAME: string;
export const SHARE_IMAGE_SIZE: { width: number; height: number };
export const sharePages: SharePage[];
export function sharePageFor(pathname: string, search?: string): SharePage | null;
export function previewTitle(page: SharePage): string;
export function shareImageUrl(page: SharePage): { url: string; width: number; height: number; alt: string };
export function shareHtml(page: SharePage, options?: { origin?: string; pathname?: string }): string;
export function shareMetadataFields(path: string): Record<string, unknown>;
export function isUnfurlCrawler(userAgent: string | null | undefined): boolean;
