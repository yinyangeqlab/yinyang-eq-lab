import EqFittingGuide from "@/components/eq-fitting-guide";
import TermsReference from "@/components/terms-reference";
import { shareMetadata } from "@/lib/share-metadata";
import { FITTER_GUIDE_PATH } from "@/lib/share-pages.mjs";
import "./style.css";

export const metadata = shareMetadata("/glossary");

export default function GlossaryPage() {
  return <main className="terms-page">
    <header>
      <h1>Glossary &amp; Guides</h1>
      <p>Look up listening and EQ terms, or explore how the fitters compare.</p>
    </header>
    <nav className="guide-jump-links" aria-label="Glossary and guides">
      <a href="#glossary-terms">Find a term</a>
      <a href={FITTER_GUIDE_PATH}>EQ fitter benchmark</a>
    </nav>
    <div id="glossary-terms"><TermsReference /></div>
    <EqFittingGuide />
    <footer><p>Technical references: <a href="https://webaudio.github.io/web-audio-api/">Web Audio specification</a> · <a href="https://tech.ebu.ch/publications/r128">EBU loudness terminology</a>.</p><p>The site uses its own comparison rules; these links do not imply that it implements a complete laboratory or broadcast standard.</p></footer>
  </main>;
}
