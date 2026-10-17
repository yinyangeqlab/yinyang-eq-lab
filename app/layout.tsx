import type { Metadata } from "next";
import "./globals.css";

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
    images: [{ url: "/brand-amoled-aligned.webp", width: 1254, height: 1254, alt: "Neon yin-yang over red and blue waveform waves" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
