"use client";

import { useMemo, useState } from "react";
import credits from "@/data/curve-credits.json";
import "./style.css";

export default function CurveCreditsPage() {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => credits.targets.filter(target =>
    `${target.name} ${target.credit} ${target.license}`.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  const credited = credits.targets.length;
  const cc = credits.targets.filter(target => target.license === "CC BY 4.0").length;
  const mit = credits.targets.filter(target => target.license === "MIT").length;

  return <main className="curve-credits">
    <header className="credits-header">
      <a href="/" className="credits-brand"><img src="/brand-avatar-aligned.webp" alt="" /><span>YinYang <em>EQ League</em></span></a>
      <nav aria-label="Credits navigation"><a href="/shootout">Shootout</a><a href="/music-library">Listening pool</a></nav>
    </header>
    <section className="credits-intro">
      <span className="credits-eyebrow">THE PEOPLE BEHIND THE CURVES</span>
      <h1>Good listening starts<br />with giving credit.</h1>
      <p>Target curves reflect the work of researchers, reviewers and the audio community. This page credits curve creators and explains how curves were imported or reproduced. Each entry lists the available reuse terms and any changes made.</p>
      <div className="credits-stats" aria-label="Credit verification summary">
        <div><strong>{credited}</strong><span>credited curves</span></div><div><strong>{cc}</strong><span>CC BY 4.0 curves</span></div><div><strong>{mit}</strong><span>MIT-licensed curves</span></div>
      </div>
    </section>
    <aside className="credits-note"><span aria-hidden="true">↗</span><div><strong>Credit the work. Follow the terms.</strong><p>Each entry includes its creator credit, import or reconstruction details, and available reuse terms. Where a license is provided, follow its linked terms.</p></div></aside>
    <section className="credits-inventory" aria-labelledby="credits-pool-title">
      <div className="credits-section-head"><div><span className="credits-eyebrow">CREATORS & SOURCES</span><h2 id="credits-pool-title">Curve credits</h2></div><span>Reviewed {credits.updated}</span></div>
      <label className="credits-search"><span>Find a curve or creator</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search YinYang, MrChillStorm, CC BY, MIT…" /></label>

      <p className="credits-result-count" role="status">{shown.length} {shown.length === 1 ? "curve" : "curves"} shown</p>
      <div className="credits-list">{shown.map(target => <details key={target.id} className="credits-row">
        <summary><span className="credits-row-title"><strong>{target.name}</strong><small>{target.credit}</small></span><span className={`credits-badge ${target.status === "licensed" ? "badge-licensed" : "badge-credited"}`}>{target.license}</span><span className="credits-expand" aria-hidden="true">+</span></summary>
        <div className="credits-row-detail"><dl><div><dt>Reuse terms</dt><dd>{target.license}</dd></div><div><dt>Import changes</dt><dd>{target.changes}</dd></div></dl><div className="credits-source-links">{target.sourceUrl ? <a href={target.sourceUrl} target="_blank" rel="noreferrer">{target.status === "licensed" ? "Original source ↗" : "Video reference ↗"}</a> : <span>Created by YinYang EQ Lab.</span>}{"licenseUrl" in target && target.licenseUrl && <a href={target.licenseUrl} target="_blank" rel="noreferrer">License terms ↗</a>}</div>{target.notice && <div className="credits-license-notice"><strong>{target.status === "licensed" ? "License notice" : "Attribution note"}</strong><pre>{target.notice}</pre></div>}{target.name.startsWith("MrChillStorm") && <p className="credits-experiment">Experimental 85-phon design. Playback is not calibrated to that level; no independently validated superiority is claimed.</p>}</div>
      </details>)}</div>
      {!shown.length && <p className="credits-empty">No curves match this search. Try another name or license.</p>}
    </section>

    <footer className="credits-footer"><div><strong>Are you a curve creator?</strong><p>For a correction, a preferred credit, or a license question, contact <a href={`mailto:${credits.contact}`}>{credits.contact}</a>.</p></div><p>Creator names and links identify sources. They do not imply endorsement of YinYang EQ League.</p></footer>
  </main>;
}
