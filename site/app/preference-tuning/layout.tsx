import type { Metadata } from "next";
import { shareMetadata } from "@/lib/share-metadata";
export const metadata: Metadata = shareMetadata("/preference-tuning");
export default function PreferenceTuningLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
