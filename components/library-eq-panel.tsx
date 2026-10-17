"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Point } from "@/lib/curves";
import type { HeadphoneMeasurement } from "@/lib/measurement";
import { importCatalogEntry, type CatalogMeasurement } from "@/lib/public-measurements";
import { finalizeVariant } from "@/lib/preference-finalize";
import { LIBRARY_EQ_KEY, parseLibraryEq, readLibraryEqs, saveLibraryEq, type LibraryEq } from "@/lib/music-library-eq";

type Target = { id: string; name: string; creator: string; points: Point[] };
const flat: Target = { id: "flat", name: "Flat reference", creator: "Reference", points: [[20, 0], [20000, 0]] };

export default function LibraryEqPanel({ onChange }: { onChange: (eq: LibraryEq | null) => void }) {
  const [enabled, setEnabled] = useState(false);
  const [presets, setPresets] = useState<LibraryEq[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [presetSearch, setPresetSearch] = useState("");
  const [measurements, setMeasurements] = useState<HeadphoneMeasurement[]>([]);
  const [measurementId, setMeasurementId] = useState("");
  const [targets, setTargets] = useState<Target[]>([flat]);
  const [targetId, setTargetId] = useState("flat");
  const [targetSearch, setTargetSearch] = useState("");
  const [catalog, setCatalog] = useState<CatalogMeasurement[]>([]);
  const [headphoneSearch, setHeadphoneSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const refresh = () => {
      setPresets(readLibraryEqs());
      try { const rows = JSON.parse(localStorage.getItem("target-lab-measurements") || "[]"); if (Array.isArray(rows)) setMeasurements(rows); } catch {}
    };
    refresh();
    window.addEventListener("library-eqs-changed", refresh);
    window.addEventListener("storage", refresh);
    void fetch("/api/targets").then(async response => {
      if (!response.ok) throw new Error();
      const rows = await response.json() as Target[];
      let privateRows: Target[] = [];
      try { privateRows = JSON.parse(localStorage.getItem("target-lab-private-targets") || "[]"); } catch {}
      setTargets([flat, ...rows, ...privateRows].filter(row => Array.isArray(row.points) && row.points.length >= 2));
    }).catch(() => setMessage("Shared targets are unavailable; saved presets and the flat reference still work."));
    return () => { window.removeEventListener("library-eqs-changed", refresh); window.removeEventListener("storage", refresh); };
  }, []);
  useEffect(() => { onChange(enabled ? presets.find(item => item.id === selectedId) || null : null); }, [enabled, presets, selectedId, onChange]);

  async function loadCatalog() {
    if (catalog.length) return;
    try {
      const response = await fetch("/api/headphone-catalog");
      if (!response.ok) throw new Error();
      const data = await response.json() as { entries: CatalogMeasurement[] };
      setCatalog(data.entries);
    } catch { setMessage("The public headphone index is unavailable. Saved measurements still work."); }
  }
  async function importHeadphone(entry: CatalogMeasurement) {
    setBusy(true); setMessage("Importing headphone measurement…");
    try {
      const row = await importCatalogEntry(entry);
      const next = [...measurements, row];
      localStorage.setItem("target-lab-measurements", JSON.stringify(next));
      setMeasurements(next); setMeasurementId(row.id); setHeadphoneSearch(""); setMessage(`${row.name} is ready.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not import this measurement."); }
    finally { setBusy(false); }
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 100_000) throw new Error("Choose an EQ TXT file under 100 KB.");
      const eq = parseLibraryEq(await file.text(), file.name.replace(/\.txt$/i, ""));
      saveLibraryEq(eq); setSelectedId(eq.id); setEnabled(true);
      setMessage(`Saved ${eq.name}. Safe playback preamp: ${eq.preamp.toFixed(1)} dB.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not read this EQ file."); }
    finally { setBusy(false); }
  }
  async function generate() {
    const headphone = measurements.find(row => row.id === measurementId);
    const target = targets.find(row => row.id === targetId);
    if (!headphone?.points?.length || !target?.points?.length) { setMessage("Choose a headphone measurement and target first."); return; }
    setBusy(true); setMessage("Fitting a smooth, precise EQ…");
    try {
      await new Promise(resolve => setTimeout(resolve, 0));
      const result = finalizeVariant(headphone.points, target.points, 15, "precise", "smooth");
      const eq: LibraryEq = { id: crypto.randomUUID(), name: `${headphone.device || headphone.name} → ${target.name}`, source: "Smooth precise fit · 15 bands", filters: result.filters, preamp: result.preamp };
      saveLibraryEq(eq); setSelectedId(eq.id); setEnabled(true);
      setMessage(`EQ ready · ${result.rms.toFixed(2)} dB fit error · ${readLibraryEqs()[0]?.preamp.toFixed(1)} dB safe preamp.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "EQ fitting failed."); }
    finally { setBusy(false); }
  }
  const matches = headphoneSearch.trim().toLowerCase();
  const catalogMatches = matches.length >= 2 ? catalog.filter(row => `${row.name} ${row.source}`.toLowerCase().includes(matches)).slice(0, 8) : [];
  const selected = presets.find(item => item.id === selectedId);
  const shownPresets = presets.filter(item => item.id === selectedId || `${item.name} ${item.source}`.toLowerCase().includes(presetSearch.trim().toLowerCase()));
  const shownTargets = targets.filter(row => row.id === targetId || `${row.name} ${row.creator}`.toLowerCase().includes(targetSearch.trim().toLowerCase()));
  return <section className="library-eq" aria-labelledby="library-eq-title">
    <div className="library-eq-heading"><div><span className="library-section-label">OPTIONAL LISTENING EQ</span><h2 id="library-eq-title">Hear it through your headphones.</h2><p>Apply one EQ to site-hosted track previews. EQ starts off. Turn off any EQ on your device before listening here.</p></div><label className={`library-eq-switch${enabled ? " is-on" : ""}${!selected ? " is-unavailable" : ""}`}><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} disabled={!selected} /><span className="library-eq-switch-copy"><strong>Use EQ</strong><small>{enabled ? "ON · processing previews" : selected ? "OFF · original audio" : "Choose an EQ first"}</small></span></label></div>
    <div className="library-eq-grid"><div><label htmlFor="library-eq-preset">Saved EQs</label><select id="library-eq-preset" value={selectedId} onChange={event => setSelectedId(event.target.value)}><option value="">No EQ selected</option>{shownPresets.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select><input type="search" aria-label="Search saved EQs" placeholder="Search saved EQs" value={presetSearch} onChange={event => setPresetSearch(event.target.value)} /><small>{selected ? `${selected.source} · preamp ${selected.preamp.toFixed(1)} dB · ${selected.filters.length} bands` : presets.length && !shownPresets.length ? "No saved EQs match this search." : "Presets saved in this browser appear here."}</small>{selected && <button type="button" className="library-eq-remove" onClick={() => { const next = presets.filter(item => item.id !== selected.id); localStorage.setItem(LIBRARY_EQ_KEY, JSON.stringify(next)); setPresets(next); setSelectedId(""); setEnabled(false); setMessage("Saved EQ removed from this browser."); }}>Remove selected EQ</button>}<label className="library-eq-upload">Upload a downloaded EQ TXT<input type="file" accept=".txt,text/plain" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label></div>
    <div><label htmlFor="library-headphone">Choose a headphone measurement</label><select id="library-headphone" value={measurementId} onChange={event => setMeasurementId(event.target.value)}><option value="">Select saved measurement</option>{measurements.map(row => <option value={row.id} key={row.id}>{row.name}</option>)}</select><input type="search" aria-label="Search public headphones" placeholder="Search public headphones" value={headphoneSearch} onFocus={() => void loadCatalog()} onChange={event => { setHeadphoneSearch(event.target.value); void loadCatalog(); }} />{catalogMatches.length > 0 && <div className="library-eq-catalog">{catalogMatches.map(row => <button type="button" disabled={busy} key={row.path} onClick={() => void importHeadphone(row)}>{row.name} <small>{row.source}</small></button>)}</div>}<small>For your own raw measurement, <Link href="/preference-tuning">upload it in Preference Tuning</Link>, then return here.</small></div>
    <div><label htmlFor="library-target">Choose a target</label><select id="library-target" value={targetId} onChange={event => setTargetId(event.target.value)}>{shownTargets.map(row => <option value={row.id} key={row.id}>{row.name} · {row.creator}</option>)}</select><input type="search" aria-label="Search targets" placeholder="Search targets" value={targetSearch} onChange={event => setTargetSearch(event.target.value)} /><button type="button" className="library-eq-generate" onClick={() => void generate()} disabled={busy || !measurementId}>{busy ? "Working…" : "Create smooth EQ"}</button><small>Uses Preference Tuning’s precise smooth fit and lowers preamp for headroom. Audio is processed only in this browser.</small></div></div>
    <p className="library-eq-note">{enabled && selected ? `EQ on: ${selected.name}.` : "EQ off: original preview audio."} EQ works on all site-hosted previews, including the Shantae soundtrack. EQ approximates the selected measurement and target; fit, seal and device processing still affect what you hear.</p>{message && <p className="library-eq-message" role="status">{message}</p>}
  </section>;
}
