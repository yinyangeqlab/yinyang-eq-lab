import FirstListenHome from "./home-content";
import { shareMetadata } from "@/lib/share-metadata";
import { SITE_NAME, SITE_ORIGIN } from "@/lib/share-pages.mjs";

export const metadata = shareMetadata("/");

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: `${SITE_ORIGIN}/`,
};

export default function HomePage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{
      __html: JSON.stringify(website).replace(/</g, "\\u003c"),
    }} />
    <FirstListenHome />
  </>;
}
