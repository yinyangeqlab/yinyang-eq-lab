import type { Metadata } from "next";
import EmbedShootout from "@/components/embed-shootout";
import { getShootout } from "@/lib/embed-store";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const shootout = await getShootout(id).catch(() => null);
  if (!shootout) return { title: "Shootout not found | YinYang EQ", robots: { index: false, follow: false } };
  const count = shootout.targetIds.length;
  const description = `A blind A/B shootout of ${count} headphone targets. Put on headphones, pick the one that sounds better, then see which was which. Anonymous: only your picks are sent.`;
  const image = { url: `/s/${id}/card.png`, width: 1200, height: 630, alt: "A and B waveforms around a yin-yang" };
  return {
    title: `${shootout.title} | YinYang EQ`,
    description,
    alternates: { canonical: `/s/${id}` },
    robots: { index: false, follow: false },
    openGraph: { type: "website", siteName: "YinYang EQ", title: shootout.title, description, url: `/s/${id}`, images: [image] },
    twitter: { card: "summary_large_image", title: shootout.title, description, images: [image.url] },
    other: { "theme-color": "#58d8c9" },
  };
}

export default async function ShootoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmbedShootout id={id} />;
}
