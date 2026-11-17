import type { Metadata } from "next";
import { headers } from "next/headers";
import { prefersAnimatedShare, shareAnimationUrl, shareImageUrl, shareMetadataFields, type SharePage } from "./share-pages.mjs";

/** Link-preview metadata for a route, from the table the edge gate also uses. */
export function shareMetadata(path: string): Metadata {
  return shareMetadataFields(path) as Metadata;
}

/** Dynamic shootout routes still pass through the guard before rendering metadata. */
export async function requestShareImage(page: SharePage) {
  const motion = prefersAnimatedShare((await headers()).get("user-agent")) ? shareAnimationUrl(page) : null;
  const image = motion ?? shareImageUrl(page);
  return { image, twitterImage: motion ? [] : [image.url] };
}
