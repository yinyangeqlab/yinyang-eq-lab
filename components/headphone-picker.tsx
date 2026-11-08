"use client";

import { useEffect, useId, useRef, useState } from "react";
import { isImportedMeasurement, type HeadphoneMeasurement } from "@/lib/measurement";
import type { CatalogMeasurement } from "@/lib/public-measurements";
import { searchRows } from "@/lib/search";
import "./shootout-organization.css";

export type { CatalogMeasurement } from "@/lib/public-measurements";

export function MeasurementEntryActions({onBrowse,onSaved,onUpload}:{onBrowse:()=>void;onSaved:()=>void;onUpload:()=>void}) {
  return <div className="measurement-entry-actions"><button type="button" className="primary" onClick={onBrowse}>Find my headphones</button><button type="button" onClick={onSaved}>Use a saved measurement</button><button type="button" onClick={onUpload}>Use my measurement file</button></div>;
}

export default function HeadphonePicker({ rows, selectedId, headphoneType, onType, onSelect, onClear, onImport, onUpload, onEdit, onDelete, browseRequest = 0, responsiveUploadLabel = false }: {
  rows: HeadphoneMeasurement[];
  selectedId: string;
  headphoneType: "ie" | "oe" | null;
  onType: (type: "ie" | "oe") => void;
  onSelect: (id: string) => void;
  onClear: () => void;
  onImport: (entry: CatalogMeasurement) => Promise<void>;
  onUpload: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  responsiveUploadLabel?: boolean;
  browseRequest?: number;
}) {
  const resultsId = useId();
  const [limit, setLimit] = useState(30);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editingQuery, setEditingQuery] = useState(false);
  const [catalog, setCatalog] = useState<CatalogMeasurement[]>([]);
  const [status, setStatus] = useState("");
  const [busyPath, setBusyPath] = useState("");
  const host = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  function browseDatabase() {
    input.current?.focus();
    setOpen(true); setEditingQuery(true); setQuery(""); void load(); input.current?.scrollIntoView({block:"center",behavior:"smooth"});
  }
  const browseLatest=useRef(browseDatabase);
  useEffect(()=>{browseLatest.current=browseDatabase;});
  useEffect(() => {
    if (!browseRequest) return;
    const frame=requestAnimationFrame(()=>browseLatest.current());
    return () => cancelAnimationFrame(frame);
  }, [browseRequest]);
  const selected = rows.find(row => row.id === selectedId);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (host.current && !host.current.contains(event.target as Node)) { setOpen(false); setEditingQuery(false); } };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  const catalogRequest = useRef(false);
  async function load() {
    if (catalog.length || catalogRequest.current) return;
    catalogRequest.current = true;
    setStatus("Loading available headphones…");
    try {
      const response = await fetch("/api/headphone-catalog");
      if (!response.ok) throw new Error("We couldn’t load the headphone list. Try again, or use a measurement saved in this browser.");
      const data = await response.json() as { entries: CatalogMeasurement[] };
      setCatalog(data.entries);
      setStatus(`${data.entries.length.toLocaleString()} measurements available.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "We couldn’t load the headphone list. Try again, or use a measurement saved in this browser."); }
    finally { catalogRequest.current = false; }
  }
  const needle = editingQuery ? query : "";
  const own = searchRows(rows, needle, row => [row.name, row.device, row.source, row.rig]);
  const uploaded = own.filter(row => !isImportedMeasurement(row));
  const imported = own.filter(isImportedMeasurement);
  const sourceLabel = (row: HeadphoneMeasurement) => {
    if (!isImportedMeasurement(row)) return row.source || "Your upload";
    try { return `Imported from ${new URL(row.source).hostname}`; } catch { return "Imported measurement"; }
  };
  const eligibleCatalog = catalog.filter(row => !headphoneType || row.type === headphoneType);
  const publicMatches = searchRows(eligibleCatalog, needle, row => [row.name, row.source, row.rig ?? ""]);
  const publicRows = publicMatches.slice(0, limit);
  function closeResults(restoreFocus = true) {
    // Focus first: onFocus opens search, so close it afterward in the same update.
    if (restoreFocus) input.current?.focus();
    setOpen(false); setEditingQuery(false); setQuery("");
  }
  function savedSection(rowsForSection: HeadphoneMeasurement[], sectionLabel: "uploaded" | "imported") {
    return rowsForSection.length ? rowsForSection.map(row => <div className="saved-search-row" key={row.id}><button type="button" data-measurement-option aria-pressed={row.id === selectedId} onClick={() => { onSelect(row.id); closeResults(); }}><b>{row.name}</b><small>{row.type === "ie" ? "In-Ear" : "Over-Ear"} · {sourceLabel(row)} · {row.rig}</small></button><button type="button" className="search-row-action" aria-label={`Edit ${row.name}`} title="Edit measurement" onClick={() => { setOpen(false); onEdit(row.id); }}>✎</button><button type="button" className="search-row-action" aria-label={`Delete ${row.name}`} title="Delete measurement" onClick={() => { if (window.confirm(`Delete ${row.name} from this browser?`)) onDelete(row.id); }}>×</button></div>) : <p>No {sectionLabel} measurements match.</p>;
  }
  async function importRow(entry: CatalogMeasurement) {
    setBusyPath(entry.path);
    try { await onImport(entry); closeResults(host.current?.contains(document.activeElement) || document.activeElement === document.body); setStatus(`${entry.name} imported from ${entry.source}.`); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Could not import measurement."); }
    finally { setBusyPath(""); }
  }
  return <div className="measurement-picker">
    <span className="headphone-mark" role="img" aria-label="Headphones"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 17v-2a11 11 0 0 1 22 0v2"/><path d="M7 16.5h1a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3Z"/><path d="M25 16.5h-1a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3v-4a3 3 0 0 0-3-3Z"/><path d="M7.5 19.5v4m17-4v4"/></svg></span>
    <div className="headphone-type-switch" role="group" aria-label="Your headphone type">
      <svg className="headphone-type-active-shape" viewBox="0 0 210 46" preserveAspectRatio="none" aria-hidden="true"><path d={headphoneType === "oe" ? "M105 2H187A21 21 0 0 1 208 23A21 21 0 0 1 187 44H105C117 44 117 23 105 23C93 23 93 2 105 2Z" : "M23 2H105C93 2 93 23 105 23C117 23 117 44 105 44H23A21 21 0 0 1 2 23A21 21 0 0 1 23 2Z"} fill={headphoneType === "oe" ? "#123d47" : "#164653"} stroke="#4db8c4" strokeWidth="1.5" strokeLinejoin="round" /></svg>
      <button type="button" data-headphone-type="ie" className={headphoneType === "ie" ? "active" : ""} aria-pressed={headphoneType === "ie"} onClick={() => onType("ie")} aria-label="In-Ear"><span>In-</span><span>Ear</span></button>
      <button type="button" data-headphone-type="oe" className={headphoneType === "oe" ? "active" : ""} aria-pressed={headphoneType === "oe"} onClick={() => onType("oe")} aria-label="Over-Ear"><span>Over-</span><span>Ear</span></button>
    </div>
    <div className="headphone-search" ref={host}>
      <input ref={input} type="search" title={selected?.name} aria-label="Find your headphone model" aria-controls={open ? resultsId : undefined} aria-describedby={`${resultsId}-help`} autoComplete="off" spellCheck={false} placeholder="Search headphone brand or model" value={open && editingQuery ? query : selected?.name ?? ""} onFocus={event => { setOpen(true); setEditingQuery(false); setQuery(""); if (selected) event.currentTarget.select(); void load(); }} onChange={event => { setEditingQuery(true); setQuery(event.target.value); setLimit(30); setOpen(true); }} onKeyDown={event => { if (event.key === "Escape") { setOpen(false); setEditingQuery(false); } if(event.key==="ArrowDown"){event.preventDefault();if(open)host.current?.querySelector<HTMLButtonElement>('[data-measurement-option]')?.focus();else{setOpen(true);requestAnimationFrame(()=>{if(document.activeElement===input.current)host.current?.querySelector<HTMLButtonElement>('[data-measurement-option]')?.focus();});}} }} />


      <span id={`${resultsId}-help`} className="sr-only">Press Down to enter measurement results, Tab to move through their actions, and Escape to close results.</span>
      {selected && <button type="button" className="measurement-clear-selection" aria-label="Clear selected headphones" title="Clear selection" onClick={()=>{onClear();closeResults();}}>×</button>}
      {open && <div id={resultsId} className="headphone-search-results" role="region" aria-label="Measurement search results" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); input.current?.focus(); setOpen(false); setEditingQuery(false); } }}>
        <><strong>Your uploaded measurements · all headphone types</strong>
        {savedSection(uploaded, "uploaded")}
        <strong>Saved headphones · all headphone types</strong>
        {savedSection(imported, "imported")}</>
        <strong>Available headphones · measurement sources</strong><p className="beginner-note">In-ear headphones fit inside the ear canal; over-ear headphones have ear cups. Choose your exact model. Multiple entries may come from different test equipment or sources; do not guess a different model if yours is missing.</p>
        {publicRows.length ? publicRows.map(row => <button type="button" data-measurement-option disabled={!!busyPath} key={row.path} onClick={() => void importRow(row)}><b>{row.name}</b><small>{row.type === "ie" ? "In-Ear" : "Over-Ear"} · {row.source}{row.rig ? ` · Rig: ${row.rig}` : " · Rig not listed"}</small></button>) : <p role={catalog.length ? undefined : "status"}>{catalog.length ? "No matching headphones. Check the model spelling and headphone-type filter. A different model may need different settings." : status || "Loading…"}</p>}
        {!catalog.length&&status&&!status.startsWith("Loading")&&<button type="button" onClick={()=>void load()}>Try loading headphones again</button>}{catalog.length > 0 && <p role="status">{status} {publicMatches.length} of {eligibleCatalog.length} match; {publicRows.length} shown.</p>}
        {publicRows.length < publicMatches.length && <button type="button" onClick={()=>setLimit(value=>value+30)}>Show more measurements</button>}
      </div>}
    </div>
    <button type="button" className="add-measurement-button" onClick={onUpload}><span className="upload-plus" aria-hidden="true">+</span><span className={responsiveUploadLabel ? "pt-upload-long" : undefined}>Use my measurement file</span>{responsiveUploadLabel && <span className="pt-upload-short">Use my file</span>}</button>
    {rows.length>0&&<p className="measurement-saved-note">Your saved measurements stay available in both views. Selecting one switches to its headphone type.</p>}
  </div>;
}
