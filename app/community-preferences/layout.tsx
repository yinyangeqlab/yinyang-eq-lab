import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = { title: "Community Preferences | YinYang EQ" };
export default function CommunityLayout({ children }: { children: ReactNode }) { return <>{children}</>; }
