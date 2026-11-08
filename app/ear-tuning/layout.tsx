import type { Metadata } from "next";
import { shareMetadata } from "@/lib/share-metadata";

export const metadata: Metadata = shareMetadata("/ear-tuning");

export default function EarTuningLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
