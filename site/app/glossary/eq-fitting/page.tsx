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
        <p>Compare how closely Auto EQ fits the same targets and choose a fit you can use on your device.</p>
      </header>
      <EqFittingGuide />
    </article>
  </main>;
}
