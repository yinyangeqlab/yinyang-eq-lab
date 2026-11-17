import type { Metadata } from "next";
import { shareMetadata } from "@/lib/share-metadata";
import type { ReactNode } from "react";
export const metadata: Metadata = shareMetadata("/community-preferences");
export default function CommunityLayout({ children }: { children: ReactNode }) { return <>{children}</>; }
