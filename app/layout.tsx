import { env } from "cloudflare:workers";
import { invitesEnabled } from "@/lib/invite-settings.mjs";
import { InviteModeProvider } from "@/components/invite-mode";
import type { Metadata } from "next";
import "./globals.css";
import PrivacyEvents from "@/components/privacy-events";
import ServiceWarningPopup from "@/components/service-warning";

export const metadata: Metadata = {
  metadataBase: new URL("https://yinyangeq.com"),
  title: "YinYang EQ League",
  description: "Upload frequency response targets, compare curves, and discover the community favorites.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/brand-avatar-aligned.png",
  },
  openGraph: {
    title: "YinYang EQ League",
    description: "Upload frequency response targets, compare curves, and discover the community favorites.",
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
      <body className="antialiased"><InviteModeProvider enabled={enabled}><ServiceWarningPopup /><PrivacyEvents />{children}<footer style={{textAlign:"center",padding:"16px",fontSize:"13px"}}><a href="/my-data" style={{color:"#9dbcc5"}}>My data · sharing &amp; deletion</a></footer></InviteModeProvider></body>
    </html>
  );
}
