import AccountAutoSync from "@/components/account-auto-sync";
import { env } from "cloudflare:workers";
import { invitesEnabled } from "@/lib/invite-settings.mjs";
import { InviteModeProvider } from "@/components/invite-mode";
import type { Metadata } from "next";
import "./globals.css";
import "@/components/action-hover.css";
import PrivacyEvents from "@/components/privacy-events";
import ServiceWarningPopup from "@/components/service-warning";
import SiteDataFooter from "@/components/site-data-footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://yinyangeq.com"),
  title: "YinYang EQ League",
  description: "Compare headphone target curves in blind listening tests, explore the listening pool, and tune your preferred sound.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/brand-avatar-aligned.png",
  },
  openGraph: {
    title: "YinYang EQ League",
    description: "Compare headphone target curves in blind listening tests, explore the listening pool, and tune your preferred sound.",
    images: [{ url: "/social-preview-aligned-v2.png", width: 1254, height: 1254, alt: "Neon yin-yang over red and blue waveform waves" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/social-preview-aligned-v2.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const enabled = env.DB ? await invitesEnabled(env.DB) : false;
  return (
    <html lang="en">
      <body className="antialiased"><InviteModeProvider enabled={enabled}><ServiceWarningPopup /><PrivacyEvents /><AccountAutoSync />{children}<SiteDataFooter /></InviteModeProvider></body>
    </html>
  );
}
