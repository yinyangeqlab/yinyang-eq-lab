import { AUDIO_FACTS_DESCRIPTION, AUDIO_FACTS_PATH, AUDIO_FACTS_TITLE, audioFactTopics } from "@/lib/audio-facts.mjs";
import { audioFactCards } from "@/lib/audio-fact-tools.mjs";
import { shareMetadata } from "@/lib/share-metadata";
import AudioFactSearch from "./search";
import "../style.css";
import "./fact-checks.css";

export const metadata = shareMetadata(AUDIO_FACTS_PATH);

export default function AudioFactsPage() {
  return (
    <main className="terms-page audio-facts">
      <a className="audio-facts-back" href="/glossary">← Glossary &amp; Guides</a>
      <header>
        <span>THE EVIDENCE LIBRARY</span>
        <h1>{AUDIO_FACTS_TITLE}</h1>
        <p>{AUDIO_FACTS_DESCRIPTION} Search a term, a claim you’ve heard, or a question in your own words.</p>
      </header>
      <AudioFactSearch cards={audioFactCards} topics={audioFactTopics} />
      <footer>
        <p>Each answer links directly to its studies, technical standards or platform documentation and explains where the evidence stops. <a href={`${AUDIO_FACTS_PATH}/sitemap.xml`}>Article sitemap</a>.</p>
      </footer>
    </main>
  );
}
