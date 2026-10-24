"use client";

import { useEffect, useRef, useState } from "react";
import { isImportedMeasurement, type HeadphoneMeasurement } from "@/lib/measurement";
import type { CatalogMeasurement } from "@/lib/public-measurements";
import "./shootout-organization.css";

export type { CatalogMeasurement } from "@/lib/public-measurements";

export function MeasurementEntryActions({onBrowse,onSaved,onUpload}:{onBrowse:()=>void;onSaved:()=>void;onUpload:()=>void}) {
  return <div className="measurement-entry-actions"><button type="button" className="primary" onClick={onBrowse}>Browse measurement database</button><button type="button" onClick={onSaved}>Use saved measurement</button><button type="button" onClick={onUpload}>Upload measurement</button></div>;
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editingQuery, setEditingQuery] = useState(false);
  const [catalog, setCatalog] = useState<CatalogMeasurement[]>([]);
  const [status, setStatus] = useState("");
  const [busyPath, setBusyPath] = useState("");
  const host = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [databaseOnly,setDatabaseOnly] = useState(false);
  function browseDatabase() {
    input.current?.focus();
    setOpen(true); setEditingQuery(true); setQuery(""); setDatabaseOnly(true); void load(); input.current?.scrollIntoView({block:"center",behavior:"smooth"});
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
    setStatus("Loading public index…");
    try {
      const response = await fetch("/api/headphone-catalog");
      if (!response.ok) throw new Error("Public index unavailable.");
      const data = await response.json() as { entries: CatalogMeasurement[] };
      setCatalog(data.entries);
      setStatus(`${data.entries.length.toLocaleString()} public measurements indexed.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Public index unavailable."); }
    finally { catalogRequest.current = false; }
  }
  const needle = (editingQuery ? query : "").trim().toLowerCase();
  const matches = (name: string, source: string) => !needle || `${name} ${source}`.toLowerCase().includes(needle);
  const own = rows.filter(row => matches(row.name, `${row.device} ${row.source} ${row.rig}`));
  const uploaded = own.filter(row => !isImportedMeasurement(row));
  const imported = own.filter(isImportedMeasurement);
  const sourceLabel = (row: HeadphoneMeasurement) => {
    if (!isImportedMeasurement(row)) return row.source || "Your upload";
    try { return `Imported from ${new URL(row.source).hostname}`; } catch { return "Imported measurement"; }
  };
  const publicRows = catalog.filter(row => matches(row.name, `${row.source} ${row.rig ?? ""}`)).slice(0, 30);
  function savedSection(rowsForSection: HeadphoneMeasurement[], sectionLabel: "uploaded" | "imported") {
    return rowsForSection.length ? rowsForSection.map(row => <div className="saved-search-row" key={row.id}><button type="button" role="option" aria-selected={row.id === selectedId} onClick={() => { onSelect(row.id); setOpen(false); setEditingQuery(false); setQuery(""); }}><b>{row.name}</b><small>{row.type === "ie" ? "In-Ear" : "Over-Ear"} · {sourceLabel(row)} · {row.rig}</small></button><button type="button" className="search-row-action" aria-label={`Edit ${row.name}`} title="Edit measurement" onClick={() => { setOpen(false); onEdit(row.id); }}>✎</button><button type="button" className="search-row-action" aria-label={`Delete ${row.name}`} title="Delete measurement" onClick={() => { if (window.confirm(`Delete ${row.name} from this browser?`)) onDelete(row.id); }}>×</button></div>) : <p>No {sectionLabel} measurements match.</p>;
  }
  async function importRow(entry: CatalogMeasurement) {
    setBusyPath(entry.path);
    try { await onImport(entry); setOpen(false); setQuery(""); setStatus(`${entry.name} imported from ${entry.source}.`); }
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
      <input ref={input} type="search" role="combobox" title={selected?.name} aria-label="Search headphone measurements" aria-expanded={open} aria-controls="headphone-search-results" aria-autocomplete="list" autoComplete="off" spellCheck={false} placeholder="Search model or measurement source" value={open && editingQuery ? query : selected?.name ?? ""} onFocus={event => { setOpen(true); setEditingQuery(false); setQuery(""); if (selected) event.currentTarget.select(); void load(); }} onChange={event => { setEditingQuery(true); setQuery(event.target.value); }} onKeyDown={event => { if (event.key === "Escape") { setOpen(false); setEditingQuery(false); } if(event.key==="ArrowDown"){event.preventDefault();host.current?.querySelector<HTMLButtonElement>('[role="option"]')?.focus();} }} />
      {selected && <details className="measurement-management"><summary>Manage</summary><div><strong>{selected.name}</strong><button type="button" onClick={()=>onEdit(selected.id)}>Edit measurement</button><button type="button" onClick={()=>{setOpen(false);setEditingQuery(false);setQuery("");onClear();}}>Remove selection</button><button type="button" onClick={()=>{if(window.confirm(`Delete ${selected.name} from this browser?`))onDelete(selected.id);}}>Delete measurement</button></div></details>}

      {open && <div id="headphone-search-results" className="headphone-search-results" role="listbox">
        {databaseOnly&&<button type="button" className="measurement-show-all" onClick={()=>setDatabaseOnly(false)}>Include my saved measurements</button>}
        {!databaseOnly&&<><strong>Your uploaded measurements</strong>
        {savedSection(uploaded, "uploaded")}
        <strong>Imported measurements</strong>
        {savedSection(imported, "imported")}</>}
        <strong>Public measurement index · creator sources</strong>
        {publicRows.length ? publicRows.map(row => <button type="button" role="option" aria-selected={false} disabled={!!busyPath} key={row.path} onClick={() => void importRow(row)}><b>{row.name}</b><small>{row.type === "ie" ? "In-Ear" : "Over-Ear"} · {row.source}{row.rig ? ` · Rig: ${row.rig}` : " · Rig not listed"}</small></button>) : <p>{catalog.length ? "No public measurements match." : status || "Loading…"}</p>}
        {catalog.length > 0 && <p>{status} Showing the first {publicRows.length} matching public results.</p>}
      </div>}
    </div>
    <button type="button" className="browse-measurement-button" onClick={browseDatabase}>Browse database</button>
    <button type="button" className="add-measurement-button" onClick={onUpload}><span className="upload-plus" aria-hidden="true">+</span><span className={responsiveUploadLabel ? "pt-upload-long" : undefined}>Upload measurement</span>{responsiveUploadLabel && <span className="pt-upload-short">Upload headphone</span>}</button>
  </div>;
}
