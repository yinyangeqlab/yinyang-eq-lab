import type { Metadata } from "next";
import { shareMetadata } from "@/lib/share-metadata";
export const metadata: Metadata = shareMetadata("/privacy");
export default function Layout({children}:{children:React.ReactNode}){return children;}
