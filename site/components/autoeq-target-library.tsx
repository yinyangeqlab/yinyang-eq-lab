"use client";

import { useState } from "react";
import { autoEqLicenseScope, autoEqSourceName, autoEqSourceRoot, autoEqSources, autoEqSourceUrl, autoEqTargetStorageKey, parseLocalAutoEqFile, readLocalAutoEqTargets, writeLocalAutoEqTargets } from "@/lib/autoeq-target-sources";
import { autoEqLocalTargetsChanged, useAutoEqLocalTargets } from "@/lib/use-autoeq-local-targets";
import { searchRows } from "@/lib/search";

export default function AutoEqTargetLibrary() {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const saved = useAutoEqLocalTargets();
  const shown = searchRows(autoEqSources, query, entry => [autoEqSourceName(entry), entry.file, entry.credit, ...(entry.columns ?? [])]);
  async function add(files: File[]) {
    if (!files.length) return;
    setBusy(true); setNotice(""); setErrors([]);
    try {
      const byName = new Map(files.map(file => [file.name, file]));
      if (byName.size > autoEqSources.length) throw Error("Choose the CSV files inside the AutoEq targets folder.");
      const selected = [...byName.values()];
      const results = await Promise.allSettled(selected.map(parseLocalAutoEqFile));
      const failed = results.flatMap((result, index) => result.status === "rejected" ?
        [`${selected[index].name}: ${result.reason instanceof Error ? result.reason.message : "Could not read file."}`] : []);
      setErrors(failed);
      const parsed = results.flatMap(result => result.status === "fulfilled" ? result.value : []);
      const current = readLocalAutoEqTargets(localStorage.getItem(autoEqTargetStorageKey));
      const next = new Map(current.map(row => [row.id, row]));
      for (const row of parsed) next.set(row.id, row);
      if (parsed.length) {
        writeLocalAutoEqTargets(localStorage, [...next.values()]);
        window.dispatchEvent(new Event(autoEqLocalTargetsChanged));
      }
      const references = results.filter(result => result.status === "fulfilled" && result.value.length === 0).length;
      const added = next.size - current.length;
      setNotice(`Added ${added} ${added === 1 ? "curve" : "curves"}.${parsed.length > added ? ` ${parsed.length - added} already saved.` : ""}${references ? ` ${references} rig-conversion ${references === 1 ? "file was" : "files were"} skipped.` : ""}`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save the curves in this browser."); }
    finally { setBusy(false); }
  }

  return <section className="credits-inventory autoeq-source-library" aria-labelledby="autoeq-library">
    <div className="credits-section-head"><div><span className="credits-eyebrow">SOURCE LIBRARY</span><h2 id="autoeq-library">AutoEq target files</h2></div></div>
    <p>Browse every file from the <a href={autoEqSourceRoot}>AutoEq target directory</a>. Jaakko Pasanen maintains the collection. <a href={autoEqLicenseScope}>AutoEq’s MIT license covers the code only</a>; the curve files come from AutoEq and the sources below.</p>
    <p>Find these curves in <a href="/shootout?mode=open">Shootout</a>, <a href="/shootout/personal">Personal Tournament</a> and <a href="/preference-tuning">Preference Tuning</a>. Your browser loads each curve from its original file when needed. Eligible Blind Research comparisons count toward <a href="/shootout?tab=rankings">target rankings</a>. Check the measurement rig before applying a target.</p>
    <details><summary>Use CSV files from this device</summary><p>You can also add private copies if you already have the source files.</p>
    <label className="credits-search"><span>Add AutoEq CSV files from this device</span><input type="file" accept=".csv,text/csv" multiple disabled={busy} onChange={event => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ""; void add(files); }}/></label>
    <p className="credits-result-count">{saved.length} {saved.length === 1 ? "curve" : "curves"} saved in this browser</p>
    {notice && <p role="status">{notice}</p>}
    {errors.length > 0 && <details><summary>{errors.length} {errors.length === 1 ? "file could" : "files could"} not be added</summary><ul>{errors.map(error => <li key={error}>{error}</li>)}</ul></details>}
    {saved.length > 0 && <details><summary>Manage imported curves</summary><ul>{saved.map(row => <li key={row.id}>{row.name} <button type="button" aria-label={`Remove ${row.name}`} disabled={busy} onClick={() => {
      try {
        writeLocalAutoEqTargets(localStorage, readLocalAutoEqTargets(localStorage.getItem(autoEqTargetStorageKey)).filter(target => target.id !== row.id));
        window.dispatchEvent(new Event(autoEqLocalTargetsChanged)); setNotice(`Removed ${row.name} from this browser.`);
      } catch { setNotice("Could not remove the saved curve."); }
    }}>Remove</button></li>)}</ul></details>}
    </details>
    <label className="credits-search"><span>Search AutoEq target files</span><input type="search" placeholder="Try USOUND1v1, Harman or 5128" value={query} onChange={event => setQuery(event.currentTarget.value)}/></label>
    <p className="credits-result-count" role="status">{shown.length} of {autoEqSources.length} source files</p>
    <div className="credits-list">{shown.map(entry => <details className="credits-row" key={entry.file}>
      <summary><span className="credits-row-title"><strong>{autoEqSourceName(entry)}</strong><small>{entry.credit} · via AutoEq</small></span><span className="credits-badge badge-credited">{entry.kind === "conversion" ? "Rig conversion" : entry.kind === "table" ? "7 curve table" : entry.builtInId ? "Built in" : "Loads from AutoEq"}</span><span className="credits-expand" aria-hidden="true">+</span></summary>
      <div className="credits-row-detail">
        {entry.kind === "conversion" && <p>This file describes a difference between rigs or references. It does not load as a standalone listening target.</p>}
        {entry.columns && <p>The pickers show all seven columns with the label “combined table”.</p>}
        {entry.file === "oratory1990 in-ear.csv" && <p>AutoEq’s approximation. See <a href="https://usound.com/how-headphones-should-sound/">USound’s original reference</a>.</p>}
        <div className="credits-source-links"><a href={autoEqSourceUrl(entry)}>Original CSV on GitHub ↗</a>{(entry.builtInId || entry.shared?.[0] && !entry.columns) && <a href={`/preference-tuning?target=${entry.builtInId ?? entry.shared?.[0].id}`}>Open in Tuning →</a>}</div>
      </div>
    </details>)}</div>
  </section>;
}
