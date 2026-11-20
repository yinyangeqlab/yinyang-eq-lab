import "./alpha.css";
import { env } from "cloudflare:workers";
import { invitesEnabled } from "@/lib/invite-settings.mjs";
import { InviteModeProvider } from "@/components/invite-mode";
import type { Metadata } from "next";
import "./globals.css";
import "./site-light.css";
import "@/components/action-hover.css";
import "@/components/first-listen/site-layout.css";
import SiteChrome from "@/components/site-chrome";
import { SiteHelpActionsProvider } from "@/components/site-help-actions";
import { buildLabel } from "@/lib/release-info";
import { shareMetadata } from "@/lib/share-metadata";
import { SITE_NAME, SITE_ORIGIN } from "@/lib/share-pages.mjs";

const welcomeMetadata = shareMetadata("/");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: SITE_NAME,
  description: welcomeMetadata.description,
  openGraph: welcomeMetadata.openGraph,
  twitter: welcomeMetadata.twitter,
  icons: {
    icon: { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
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
      <body className="antialiased"><InviteModeProvider enabled={enabled}><SiteHelpActionsProvider><SiteChrome>{children}</SiteChrome></SiteHelpActionsProvider></InviteModeProvider></body>
    </html>
  );
}
