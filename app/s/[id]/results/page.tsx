import type { Metadata } from "next";
import EmbedResultsView from "@/components/embed-results";

// Private to whoever holds the manage key, which lives in the link fragment and is never sent to the page request.
export const metadata: Metadata = {
  title: "Private shootout results | YinYang EQ",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  openGraph: { title: "Private page", description: "Private page." },
  twitter: { card: "summary", title: "Private page", description: "Private page." },
};

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmbedResultsView id={id} />;
}
