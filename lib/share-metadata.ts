import type { Metadata } from "next";
import { shareMetadataFields } from "./share-pages.mjs";

/** Link-preview metadata for a route, from the table the edge gate also uses. */
export function shareMetadata(path: string): Metadata {
  return shareMetadataFields(path) as Metadata;
}
