import type { Metadata } from "next";
import { shareMetadata } from "@/lib/share-metadata";

export const metadata: Metadata = shareMetadata("/eq-compare");

export default function EqCompareLayout({ children }: { children: React.ReactNode }) { return children; }
