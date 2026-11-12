import EqFittingGuide from "@/components/eq-fitting-guide";
import { shareMetadata } from "@/lib/share-metadata";
import { FITTER_GUIDE_PATH } from "@/lib/share-pages.mjs";
import "../style.css";

export const metadata = shareMetadata(FITTER_GUIDE_PATH);

export default function EqFitterBenchmarkPage() {
  return <main className="terms-page fitter-article">
    <article>
      <header>
        <a href="/glossary">Glossary &amp; Guides</a>
        <h1>EQ fitter benchmark</h1>
      </header>
      <EqFittingGuide showContents />
    </article>
  </main>;
}
