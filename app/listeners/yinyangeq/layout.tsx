import type { Metadata } from "next";
import { shareMetadata } from "@/lib/share-metadata";
export const metadata: Metadata = shareMetadata("/listeners/yinyangeq");
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
