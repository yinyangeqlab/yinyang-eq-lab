import type { Metadata } from "next";
import EmbedResultsView from "@/components/embed-results";
import { requestShareImage } from "@/lib/share-metadata";
import { privateShareCard } from "@/lib/share-pages.mjs";

// Private to whoever holds the manage key, which lives in the link fragment and is never sent to the page request.
export async function generateMetadata(): Promise<Metadata> {
  const { image, twitterImage } = await requestShareImage(privateShareCard);
  const preview = { title: "Private page", description: privateShareCard.description };
  return {
    title: "Private shootout results | YinYang EQ",
    robots: { index: false, follow: false },
    referrer: "no-referrer",
    openGraph: { ...preview, images: [image] },
    twitter: { ...preview, card: "summary_large_image", images: twitterImage },
  };
}

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmbedResultsView id={id} />;
}
