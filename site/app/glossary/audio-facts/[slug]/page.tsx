import { notFound } from "next/navigation";
import { AUDIO_FACTS_PATH, audioFacts, audioFactPath, audioFactSources, audioFactSourceIds, findAudioFact } from "@/lib/audio-facts.mjs";
import { formatAudioFactForDiscord } from "@/lib/audio-fact-tools.mjs";
import { shareMetadata } from "@/lib/share-metadata";
import { SITE_ORIGIN } from "@/lib/share-pages.mjs";
import FactShare from "../share";
import "../../style.css";
import "../fact-checks.css";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return audioFacts.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const fact = findAudioFact((await params).slug);
  if (!fact) notFound();
  return shareMetadata(audioFactPath(fact.slug));
}

export default async function AudioFactPage({ params }: Props) {
  const fact = findAudioFact((await params).slug);
  if (!fact) notFound();

  const ids = audioFactSourceIds(fact);
  const url = SITE_ORIGIN + audioFactPath(fact.slug);
  return (
    <main className="terms-page audio-facts audio-facts-detail">
      <nav className="audio-facts-crumbs" aria-label="Breadcrumb">
        <a href="/glossary">Glossary &amp; Guides</a><span aria-hidden="true">/</span>
        <a href={AUDIO_FACTS_PATH}>Audio Fact Checks</a>
      </nav>
      <article>
        <header>
          <span>{fact.topic}</span>
          <h1>{fact.title}</h1>
        </header>
        <section className="audio-facts-claim" aria-label="Claim and verdict">
          <span className="audio-facts-verdict">{fact.verdict}</span>
          <p><strong>The claim:</strong> {fact.claim}</p>
          <p className="audio-facts-answer">{fact.answer}</p>
        </section>
        <FactShare url={url} message={formatAudioFactForDiscord(fact, url)} />
        <section className="audio-facts-section" aria-labelledby="evidence">
          <h2 id="evidence">What the evidence says</h2>
          {fact.evidence.map(item => <p key={item.text}>{item.text}{" "}
            {item.sources.map(id => {
              const number = ids.indexOf(id) + 1;
              return <sup key={id}><a href={`#source-${number}`} aria-label={`Source ${number}: ${audioFactSources[id].label}`}>[{number}]</a></sup>;
            })}
          </p>)}
          <p><strong>Takeaway:</strong> {fact.takeaway}</p>
        </section>
        <section className="audio-facts-section" aria-labelledby="sources">
          <h2 id="sources">Sources</h2>
          <ol className="audio-facts-sources">
            {ids.map((id, index) => {
              const source = audioFactSources[id];
              return <li key={id} id={`source-${index + 1}`}><a href={source.url}>{source.title}</a>
                <span>{source.label} · {source.kind}</span>
              </li>;
            })}
          </ol>
        </section>
        <section className="audio-facts-section" aria-labelledby="related">
          <h2 id="related">Related fact checks</h2>
          <ul className="audio-facts-related">
            {fact.related.map(slug => {
              const related = findAudioFact(slug);
              return related ? <li key={slug}><a href={audioFactPath(slug)}>{related.title}</a></li> : null;
            })}
          </ul>
        </section>
      </article>
    </main>
  );
}
