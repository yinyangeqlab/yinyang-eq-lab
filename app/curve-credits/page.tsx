"use client";

import { useMemo, useState } from "react";
import credits from "@/data/curve-credits.json";
import "./style.css";

export default function CurveCreditsPage() {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => credits.targets.filter(target =>
    `${target.name} ${target.credit} ${target.license} ${target.sourceNote} ${target.basis}`.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  const credited = credits.targets.length;
  const licensed = credits.targets.filter(target => target.status === "licensed").length;
  const sourced = credits.targets.filter(target => target.sourceUrl).length;

  return <main className="curve-credits">
    <header className="credits-header">
      <a href="/" className="credits-brand"><img src="/brand-avatar-aligned.webp" alt="" /><span>YinYang <em>EQ</em></span></a>
      <nav aria-label="Credits navigation"><a href="/shootout">Tournament</a><a href="/music-library">Listening pool</a></nav>
    </header>
    <section className="credits-intro">
      <span className="credits-eyebrow">THE PEOPLE BEHIND THE CURVES</span>
      <h1>Good listening starts<br />with giving credit.</h1>
      <p>Target curves reflect the work of researchers, reviewers and the audio community. This page credits curve creators and explains how curves were imported or reproduced. Every built-in curve is included, whether or not a reuse license has been identified. Each entry separates attribution, source, changes and our basis for use.</p>
      <div className="credits-stats" aria-label="Curve attribution summary">
        <div><strong>{credited}</strong><span>credited curves</span></div><div><strong>{sourced}</strong><span>source references</span></div><div><strong>{licensed}</strong><span>stated licenses</span></div>
      </div>
    </section>
    <aside className="credits-note"><span aria-hidden="true">↗</span><div><strong>Sources first. Licenses where documented.</strong><p>Attribution remains useful even when reuse terms are unknown. We show a license only where documented, retain required notices, and identify gaps in upstream authorship or construction. A source link or public download is not itself a permission grant.</p></div></aside>
    <section className="credits-rationale" aria-labelledby="credits-rationale-title"><h2 id="credits-rationale-title">Why we use these curves</h2><p>We use numerical frequency-response targets for comparative listening, technical evaluation and commentary. For curves without documented reuse terms, our rationale considers their functional acoustic information and the additional comparison purpose. We retain creator credit and source links so readers can find the original work.</p><p>Most curves were imported and normalized, not independently recreated. Where we reconstructed a published graph, the entry describes that process and its limits. Normalizing, tracing or resampling a curve does not by itself establish permission or fair use.</p><p>Where applicable, our fair-use rationale must weigh purpose and character, the nature of the source, the amount used and the effect on its market. A usable response can require the whole curve; that extent of copying and potential substitution remain relevant. Research or commentary does not automatically establish fair use, and our rationale is not a legal determination or a license for visitors to redistribute the material. <a href="https://www.copyright.gov/fair-use/" target="_blank" rel="noreferrer">Fair-use factors ↗</a></p></section>
    <section className="credits-inventory" aria-labelledby="credits-pool-title">
      <div className="credits-section-head"><div><span className="credits-eyebrow">CREATORS & SOURCES</span><h2 id="credits-pool-title">Curve credits</h2></div><span>Reviewed {credits.updated}</span></div>
      <label className="credits-search"><span>Find a curve or creator</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Harman, PEQdB, AutoEq, Sodium…" /></label>

      <p className="credits-result-count" role="status">{shown.length} {shown.length === 1 ? "curve" : "curves"} shown</p>
      <div className="credits-list">{shown.map(target => <details key={target.id} className="credits-row">
        <summary><span className="credits-row-title"><strong>{target.name}</strong><small>{target.credit}</small></span><span className={`credits-badge ${target.status === "licensed" ? "badge-licensed" : "badge-credited"}`}>{target.license || "Source credited"}</span><span className="credits-expand" aria-hidden="true">+</span></summary>
        <div className="credits-row-detail"><dl><div><dt>Attribution</dt><dd>{target.credit}</dd></div>{target.license && <div><dt>Documented terms</dt><dd>{target.license}</dd></div>}{target.sourceNote && <div><dt>Provenance</dt><dd>{target.sourceNote}</dd></div>}<div><dt>Use basis</dt><dd>{target.basis}</dd></div><div><dt>Import / recreation</dt><dd>{target.changes}</dd></div></dl><div className="credits-source-links">{target.sourceUrl ? <a href={target.sourceUrl} target="_blank" rel="noreferrer">{target.sourceLabel} ↗</a> : <span>Created by YinYang EQ Lab.</span>}{"licenseUrl" in target && target.licenseUrl && <a href={target.licenseUrl} target="_blank" rel="noreferrer">License terms ↗</a>}</div>{target.notice && <div className="credits-license-notice"><strong>{target.status === "licensed" ? "License notice" : "Attribution note"}</strong><pre>{target.notice}</pre></div>}{target.name.startsWith("MrChillStorm") && <p className="credits-experiment">Experimental 85-phon design. Playback is not calibrated to that level; no independently validated superiority is claimed.</p>}</div>
      </details>)}</div>
      {!shown.length && <p className="credits-empty">No curves match this search. Try another curve, creator or source.</p>}
    </section>

    <footer className="credits-footer"><div><strong>Are you a curve creator?</strong><p>For a correction, a preferred credit, a source clarification, a reuse concern or a removal request, contact <a href={`mailto:${credits.contact}`}>{credits.contact}</a>.</p></div><p>Creator names and links identify sources. They do not imply endorsement of YinYang EQ.</p></footer>
  </main>;
}
