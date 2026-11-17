import type { Metadata } from "next";
import { shareMetadata } from "@/lib/share-metadata";
export const metadata: Metadata = shareMetadata("/owner-research");
export default function Layout({children}:{children:React.ReactNode}){return children;}
