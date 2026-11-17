import type { Metadata } from "next";
import EmbedShootout from "@/components/embed-shootout";
import { requestShareImage } from "@/lib/share-metadata";
import { previewTitle, sharedShootoutCard } from "@/lib/share-pages.mjs";

// The frameable version of /s/[id]: no site chrome, never indexed.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const url = `/embed/${encodeURIComponent(id)}`;
  const { title, description } = sharedShootoutCard;
  const socialTitle = previewTitle(sharedShootoutCard);
  const { image, twitterImage } = await requestShareImage(sharedShootoutCard);
  return {
    title, description, alternates: { canonical: url }, robots: { index: false, follow: false },
    openGraph: { type: "website", siteName: "YinYang EQ", title: socialTitle, description, url, images: [image] },
    twitter: { card: "summary_large_image", title: socialTitle, description, images: twitterImage },
  };
}

export default async function EmbeddedShootout({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmbedShootout id={id} embed />;
}
