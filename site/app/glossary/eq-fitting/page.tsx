import EqFittingGuide from "@/components/eq-fitting-guide";
import { shareMetadata } from "@/lib/share-metadata";
import { FITTER_GUIDE_PATH } from "@/lib/share-pages.mjs";
import "../style.css";

export const metadata = shareMetadata(FITTER_GUIDE_PATH);

export default function EqFitterBenchmarkPage() {
  return <main className="terms-page fitter-article">
    <article>
      <header>
        <h1>EQ Fitter Benchmark</h1>
        <p>Rank Auto EQ fitters at 10, 15, 20 and 30 bands using the same headphone measurements and targets.</p>
      </header>
      <EqFittingGuide showContents />
    </article>
  </main>;
}
