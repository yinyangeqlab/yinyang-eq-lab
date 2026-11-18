"use client";

import { useEffect, useRef, useState } from "react";
import { FileUp, Search, X } from "lucide-react";
import { searchRows } from "@/lib/search";
import { importCatalogEntry, type CatalogMeasurement } from "@/lib/public-measurements";
import { measurementChannelMatch, type LibraryEq } from "@/lib/music-library-eq";
import { parseEqPresetText, savedEqToBlindPreset, type EqPreset } from "@/lib/blind-eq";
import type { ChannelMatch } from "@/lib/channel-balance";
import { musicDisplayTitle } from "@/lib/music-display";
import { original, type Side, type Song } from "./audio";

export type Device = { id: string; name: string; match?: ChannelMatch; detail?: string };
export type Loaded = { preset: EqPreset; eq?: LibraryEq };
export type Picker = { kind: "headphones" | "song" } | { kind: "eq"; side: Side };
let catalogCache: CatalogMeasurement[] | undefined;

export default function ComparePicker({ picker, saved, devices, songs, onDevice, onEq, onSong, onClose }: {
  picker: Picker; saved: LibraryEq[]; devices: Device[]; songs: Song[];
  onDevice: (value: Device) => void; onEq: (value: Loaded) => void; onSong: (value: Song) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const alive = useRef(false);
  const [query, setQuery] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(30), [catalog, setCatalog] = useState(catalogCache ?? []);
  const [loading, setLoading] = useState(picker.kind === "headphones" && !catalogCache);
  useEffect(() => {
    const node = dialog.current!;
    alive.current = true;
    node.showModal();
    node.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
    return () => { alive.current = false; node.close(); };
  }, []);
  useEffect(() => {
    if (picker.kind !== "headphones" || catalogCache) return;
    const request = new AbortController();
    void fetch("/api/headphone-catalog", { signal: request.signal }).then(async response => {
      if (!response.ok) throw Error();
      const data = await response.json() as { entries?: CatalogMeasurement[] };
      if (!Array.isArray(data.entries)) throw Error();
      catalogCache = data.entries;
      setCatalog(data.entries);
    }).catch(() => { if (!request.signal.aborted) setError("Catalog unavailable. Use a saved model or type your headphone name."); })
      .finally(() => { if (!request.signal.aborted) setLoading(false); });
    return () => request.abort();
  }, [picker.kind]);

  async function chooseCatalog(row: CatalogMeasurement) {
    setError(""); setBusy(true);
    try {
      const measured = row.leftPath && row.rightPath ? await importCatalogEntry(row) : undefined;
      if (alive.current) onDevice({ id: row.path, name: row.name, match: measured && measurementChannelMatch(measured) });
    } catch { if (alive.current) setError("Couldn’t load this measurement. Try again or use the model name below for preset filters only."); }
    finally { if (alive.current) setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    try {
      if (picker.kind === "song") {
        if (file.size > 100_000_000) throw Error("Choose an audio file under 100 MB.");
        onSong({ title: file.name.replace(/\.[^.]+$/, ""), artist: "Local audio", duration: 0, file });
      } else {
        if (file.size > 200_000) throw Error("Choose an EQ TXT under 200 KB.");
        setBusy(true);
        const preset = parseEqPresetText(await file.text(), file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "Uploaded EQ");
        if (alive.current) onEq({ preset });
      }
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : "Couldn’t open this file."); }
    finally { if (alive.current) setBusy(false); }
  }
  const options: { id: string; title: string; detail?: string; choose: () => void }[] = [];
  if (picker.kind === "eq") {
    options.push({ id: "original", title: original.name, detail: "Bypass preset filters", choose: () => onEq({ preset: original }) });
    for (const eq of saved) options.push({ id: eq.id, title: eq.name, detail: eq.headphone || eq.source, choose: () => {
      try { onEq({ preset: savedEqToBlindPreset(eq), eq }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn’t load this EQ."); }
    } });
  } else if (picker.kind === "song") {
    songs.forEach((song, i) => options.push({ id: String(i), title: musicDisplayTitle(song.title), detail: song.artist, choose: () => onSong(song) }));
  } else {
    for (const device of devices) options.push({ id: device.id, title: device.name, detail: device.detail || "Saved headphones", choose: () => onDevice(device) });
  }
  const filtered = searchRows(options, query, row => [row.title, row.detail ?? ""]);
  const models = picker.kind === "headphones" ? searchRows(catalog, query, row => [row.name, row.source, row.rig ?? ""]) : [];
  const title = picker.kind === "eq" ? `Load EQ on ${picker.side === 0 ? "A" : "B"}` : picker.kind === "song" ? "Choose a song" : "Your headphones";
  return <dialog className="quick-picker" ref={dialog} aria-labelledby="quick-picker-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === dialog.current) { const r = dialog.current.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose(); } }}>
    <header><h2 id="quick-picker-title">{title}</h2><button type="button" onClick={onClose} aria-label="Close picker"><X size={20}/></button></header>
    <label className="quick-search"><Search size={17}/><input type="search" aria-label={title} placeholder={picker.kind === "headphones" ? "Search brand or model" : picker.kind === "song" ? "Search song or artist" : "Search Saved EQs"} maxLength={120} value={query} onChange={event => { setQuery(event.target.value); setLimit(30); }}/></label>
    {picker.kind !== "headphones" && <label className="quick-file"><FileUp size={17}/>{picker.kind === "eq" ? "Open EQ settings TXT" : "Open local audio"}<input disabled={busy} type="file" accept={picker.kind === "eq" ? ".txt,text/plain" : "audio/*,.flac,.wav,.mp3,.aac,.m4a,.ogg"} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }}/></label>}
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Loading…</p>}
    <div className="quick-options">
      {filtered.slice(0,limit).map(row => <button type="button" disabled={busy} key={row.id} onClick={row.choose}><strong>{row.title}</strong><small>{row.detail}</small></button>)}
      {picker.kind === "headphones" && query.trim() && <button type="button" disabled={busy} onClick={() => onDevice({ id: "named-" + query.trim(), name: query.trim() })}><strong>Use “{query.trim()}”</strong><small>Preset filters only</small></button>}
      {models.slice(0,Math.max(0,limit-filtered.length)).map(row => <button type="button" disabled={busy} key={row.path} onClick={() => void chooseCatalog(row)}><strong>{row.name}</strong><small>{row.source}{row.rig && ` · ${row.rig}`}</small></button>)}
      {filtered.length + models.length > limit && <button type="button" onClick={() => setLimit(value => value + 30)}>Show more</button>}
      {loading && <p role="status">Loading headphones…</p>}
      {!loading && !filtered.length && !models.length && <p>{picker.kind === "headphones" ? "No matching measurements." : "No matches."}</p>}
    </div>
  </dialog>;
}
