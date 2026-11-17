"use client";

import { useMemo, useRef, useState } from "react";
import { searchAudioFacts } from "@/lib/audio-fact-search.mjs";
import type { audioFactCards } from "@/lib/audio-fact-tools.mjs";

export default function AudioFactSearch({ cards, topics }: { cards: typeof audioFactCards; topics: string[] }) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchAudioFacts(cards, query, topic), [cards, query, topic]);
  return (
    <>
      <div className="audio-facts-tools">
        <div className="terms-search" role="search" aria-label="Search audio fact checks">
          <label htmlFor="audio-fact-query">Search fact checks</label>
          <div className="audio-facts-query">
            <input id="audio-fact-query" ref={input} value={query} onChange={event => setQuery(event.target.value)}
              placeholder="Try “Does a poor seal reduce bass?”" type="search" maxLength={160} autoComplete="off" />
            {query && <button type="button" onClick={() => { setQuery(""); input.current?.focus(); }}>Clear</button>}
          </div>
        </div>
        <div className="audio-facts-filters" role="group" aria-label="Filter by topic">
          {["", ...topics].map(item => (
            <button type="button" key={item} aria-pressed={topic === item} onClick={() => setTopic(item)}>{item || "All topics"}</button>
          ))}
        </div>
      </div>
      <p className="audio-facts-count" role="status">{results.length} {results.length === 1 ? "fact check" : "fact checks"}</p>
      {results.length ? <ul className="audio-facts-grid">
        {results.map(card => <li key={card.slug}>
          <article className="audio-facts-card">
            <div className="audio-facts-labels"><span className="audio-facts-verdict">{card.verdict}</span><span>{card.topic}</span></div>
            <h2><a href={card.href}>{card.title}</a></h2>
            <p>{card.answer}</p>
          </article>
        </li>)}
      </ul> : <div className="terms-no-results">
        <h2>No matching fact checks</h2>
        <p>Try a shorter term such as “ABX”, “bitrate” or “headroom”, or reset the filters.</p>
        <button type="button" onClick={() => { setQuery(""); setTopic(""); input.current?.focus(); }}>Show all fact checks</button>
      </div>}
    </>
  );
}
