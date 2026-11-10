import type { Metadata } from "next";
import EmbedShootout from "@/components/embed-shootout";
import { requestShareImage } from "@/lib/share-metadata";
import { previewTitle, sharedShootoutCard } from "@/lib/share-pages.mjs";

// The frameable version of /s/[id]: no site chrome, never indexed.
export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = sharedShootoutCard;
  const { image, twitterImage } = await requestShareImage(sharedShootoutCard);
  return {
    title, description, robots: { index: false, follow: false },
    openGraph: { title: previewTitle(sharedShootoutCard), description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: twitterImage },
  };
}

export default async function EmbeddedShootout({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmbedShootout id={id} embed />;
}
