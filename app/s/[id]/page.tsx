import type { Metadata } from "next";
import EmbedShootout from "@/components/embed-shootout";
import { getShootout } from "@/lib/embed-store";
import { requestShareImage } from "@/lib/share-metadata";
import { sharedShootoutCard } from "@/lib/share-pages.mjs";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const shootout = await getShootout(id).catch(() => null);
  if (!shootout) return { title: "Shootout not found | YinYang EQ", robots: { index: false, follow: false } };
  const count = shootout.targetIds.length;
  const description = `A blind A/B shootout of ${count} headphone targets. Put on headphones, pick the one that sounds better, then see which was which. No account needed. Completed runs include your choices, optional setup and whether curves were shown.`;
  const { image, twitterImage } = await requestShareImage(sharedShootoutCard);
  return {
    title: `${shootout.title} | YinYang EQ`,
    description,
    alternates: { canonical: `/s/${id}` },
    robots: { index: false, follow: false },
    openGraph: { type: "website", siteName: "YinYang EQ", title: shootout.title, description, url: `/s/${id}`, images: [image] },
    twitter: { card: "summary_large_image", title: shootout.title, description, images: twitterImage },
    other: { "theme-color": "#58d8c9" },
  };
}

export default async function ShootoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmbedShootout id={id} />;
}
