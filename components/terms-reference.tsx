"use client";

import { useRef, useState } from "react";
import { glossaryTerms, searchGlossary, relatedGlossaryWords, type GlossaryTerm } from "@/lib/glossary";

export default function TermsReference() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = searchGlossary(query);
  const expanded = open && results.length > 0;
  const activeIndex = results.findIndex(term => term.id === activeId);

  function choose(term: GlossaryTerm) {
    setQuery(term.title);
    setOpen(false);
    setActiveId(null);
    inputRef.current?.focus();
  }
  function move(direction: number) {
    if (!results.length) return;
    const next = activeIndex < 0 ? direction > 0 ? 0 : results.length - 1 : (activeIndex + direction + results.length) % results.length;
    setOpen(true);
    setActiveId(results[next].id);
    window.requestAnimationFrame(() => document.getElementById(`term-option-${results[next].id}`)?.scrollIntoView({ block: "nearest" }));
  }

  return <>
    <div className="terms-search" role="search" aria-label="Terms and definitions" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setOpen(false); setActiveId(null); } }}>
      <label htmlFor="terms-query">Find a term</label>
      <div className="terms-search-control"><input ref={inputRef} id="terms-query" type="search" role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={expanded} aria-controls="terms-suggestions" aria-activedescendant={expanded && activeIndex >= 0 ? `term-option-${activeId}` : undefined} aria-describedby="terms-search-help terms-result-count" placeholder="Search a term or idea, e.g. bass or volume" value={query} onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); setActiveId(null); }} onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); move(event.key === "ArrowDown" ? 1 : -1); }
        else if (event.key === "Enter" && expanded && activeIndex >= 0) { event.preventDefault(); choose(results[activeIndex]); }
        else if (event.key === "Escape") { event.preventDefault(); setOpen(false); setActiveId(null); }
      }} />{query && <button type="button" className="terms-clear" onClick={() => { setQuery(""); setOpen(false); setActiveId(null); inputRef.current?.focus(); }}>Clear search</button>}</div>
      <p id="terms-search-help">Search names, definitions and related words. All matching terms appear below.</p>
      <div id="terms-suggestions" className="terms-suggestions" role="listbox" aria-label="Matching terms" hidden={!expanded}>{results.map(term => <div key={term.id} id={`term-option-${term.id}`} role="option" aria-selected={activeId === term.id} onMouseDown={event => event.preventDefault()} onClick={() => choose(term)}><strong>{term.title}</strong><span>{relatedGlossaryWords(term, query).join(" · ")}</span></div>)}</div>
    </div>
    <p id="terms-result-count" className="terms-result-count" role="status">{query.trim() ? `${results.length} matching ${results.length === 1 ? "term" : "terms"}` : `All ${glossaryTerms.length} terms`} · A–Z</p>
    {results.length ? <dl>{results.map(term => <div key={term.id} id={term.id}><dt>{term.title}</dt><dd>{term.text}</dd></div>)}</dl> : <div className="terms-no-results"><h2>No matching terms</h2><p>Try a shorter word or another way to describe it, such as bass, volume or audio file.</p><button type="button" onClick={() => { setQuery(""); setOpen(false); inputRef.current?.focus(); }}>Show all terms</button></div>}
  </>;
}
