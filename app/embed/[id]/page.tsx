import type { Metadata } from "next";
import EmbedShootout from "@/components/embed-shootout";

// The frameable version of /s/[id]: no site chrome, never indexed.
export const metadata: Metadata = { title: "Blind shootout | YinYang EQ", robots: { index: false, follow: false } };

export default async function EmbeddedShootout({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmbedShootout id={id} embed />;
}
