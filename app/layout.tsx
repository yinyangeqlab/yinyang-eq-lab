import "./alpha.css";
import { env } from "cloudflare:workers";
import { invitesEnabled } from "@/lib/invite-settings.mjs";
import { InviteModeProvider } from "@/components/invite-mode";
import type { Metadata } from "next";
import "./globals.css";
import "./site-light.css";
import "@/components/action-hover.css";
import SiteChrome from "@/components/site-chrome";
import { buildLabel } from "@/lib/release-info";
import { shareMetadata } from "@/lib/share-metadata";

const welcomeMetadata = shareMetadata("/");

export const metadata: Metadata = {
  metadataBase: new URL("https://yinyangeq.com"),
  title: welcomeMetadata.title,
  description: welcomeMetadata.description,
  openGraph: welcomeMetadata.openGraph,
  twitter: welcomeMetadata.twitter,
  icons: {
    icon: { url: `/favicon.svg?v=${buildLabel}`, type: "image/svg+xml", sizes: "any" },
    apple: { url: `/brand-yin-yang.png?v=${buildLabel}`, sizes: "180x180" },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const enabled = env.DB ? await invitesEnabled(env.DB) : false;
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased"><InviteModeProvider enabled={enabled}><SiteChrome>{children}</SiteChrome></InviteModeProvider></body>
    </html>
  );
}
