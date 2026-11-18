import TermsReference from "@/components/terms-reference";
import { shareMetadata } from "@/lib/share-metadata";
import "./style.css";

export const metadata = shareMetadata("/glossary");

export default function GlossaryPage() {
  return <main className="terms-page glossary-index">
    <header>
      <h1>Glossary</h1>
      <p>Look up the words you’ll see when comparing headphones and adjusting EQ.</p>
    </header>
    <div id="glossary-terms"><TermsReference /></div>
    <footer><p>Technical references: <a href="https://webaudio.github.io/web-audio-api/">Web Audio specification</a> · <a href="https://tech.ebu.ch/publications/r128">EBU loudness terminology</a>.</p><p>The site uses its own comparison rules; these links do not imply that it implements a complete laboratory or broadcast standard.</p></footer>
  </main>;
}
