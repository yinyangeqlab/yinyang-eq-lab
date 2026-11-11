"use client";

import AutoEqCurveStatus from "@/components/autoeq-curve-status";
import { useAutoEqSourceCurves } from "@/lib/use-autoeq-source-curves";
import { autoEqPickerTargets, isSourceAutoEqTarget } from "@/lib/autoeq-target-sources";
import { useAutoEqLocalTargets } from "@/lib/use-autoeq-local-targets";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Point } from "@/lib/curves";
import type { HeadphoneMeasurement } from "@/lib/measurement";
import HeadphonePicker, { type CatalogMeasurement } from "@/components/headphone-picker";
import SoundSetup, { type SoundMode } from "@/components/sound-setup";
import { importCatalogEntry } from "@/lib/public-measurements";
import { fitAutoEqAsync } from "@/lib/autoeq-client";
import { useFitterSettings } from "@/lib/use-fitter-settings";
import FitterControls from "@/components/fitter-controls";
import { fitterLabel } from "@/lib/fitter-settings";
import { measurementChannelMatch, removeLibraryEq, parseLibraryEq, readLibraryEqs, saveLibraryEq, type LibraryEq } from "@/lib/music-library-eq";

type Target = { id: string; name: string; creator: string; points: Point[] };
const flat: Target = { id: "flat", name: "Flat reference", creator: "Reference", points: [[20, 0], [20000, 0]] };

export default function LibraryEqPanel({ onChange }: { onChange: (eq: LibraryEq | null) => void }) {
  const [enabled, setEnabled] = useState(true);
  const [matchEnabled, setMatchEnabled] = useState(true);
  const [presets, setPresets] = useState<LibraryEq[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [soundMode, setSoundMode] = useState<SoundMode>("target");
  const [generated, setGenerated] = useState<{ key: string; eq: LibraryEq } | null>(null);
  const [headphoneType, setHeadphoneType] = useState<"ie" | "oe" | null>(null);
  const {fitter,setFitter,defaultFitter,saveDefault,notice:fitterNotice}=useFitterSettings();
  const [measurements, setMeasurements] = useState<HeadphoneMeasurement[]>([]);
  const [measurementId, setMeasurementId] = useState("");
  const [targets, setTargets] = useState<Target[]>([flat]);
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fitRequest = useRef<AbortController | null>(null);
  const savedSelection = presets.find(row => row.id === selectedId);
  const headphone = measurements.find(row => row.id === (soundMode === "saved" ? savedSelection?.measurementId : measurementId));
  const autoEqTargets = useAutoEqLocalTargets();
  const availableTargets = [...targets, ...autoEqPickerTargets, ...autoEqTargets];
  const selectedTarget = availableTargets.find(row => row.id === targetId);
  const sourceCurves = useAutoEqSourceCurves(soundMode === "target" ? [targetId] : []);
  const target = selectedTarget && sourceCurves.resolve(selectedTarget);
  const fitKey = useMemo(() => JSON.stringify([measurementId, targetId, headphone?.points, headphone?.type, target?.points, fitter]), [measurementId, targetId, headphone?.points, headphone?.type, target?.points, fitter]);
  useEffect(() => () => { fitRequest.current?.abort(); }, [fitKey, soundMode]);

  useEffect(() => {
    const refresh = () => {
      const next = readLibraryEqs(); setPresets(next); setSelectedId(id => next.some(eq => eq.id === id) ? id : "");
      try { const rows = JSON.parse(localStorage.getItem("target-lab-measurements") || "[]"); if (Array.isArray(rows)) setMeasurements(rows); } catch {}
    };
    refresh();
    window.addEventListener("library-eqs-changed", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("yinyang-data-changed", refresh);
    void fetch("/api/targets").then(async response => {
      if (!response.ok) throw new Error();
      const rows = await response.json() as Target[];
      let privateRows: Target[] = [];
      try { privateRows = JSON.parse(localStorage.getItem("target-lab-private-targets") || "[]"); } catch {}
      setTargets([flat, ...rows, ...privateRows].filter(row => Array.isArray(row.points) && row.points.length >= 2));
    }).catch(() => setMessage("Shared targets are unavailable; saved EQs and the flat reference still work."));
    return () => { window.removeEventListener("library-eqs-changed", refresh); window.removeEventListener("storage", refresh); window.removeEventListener("yinyang-data-changed", refresh); };
  }, []);
  const activeEq = useMemo(() => soundMode === "target" ? generated?.key === fitKey ? presets.find(item => item.id === generated.eq.id) : undefined : presets.find(item => item.id === selectedId), [soundMode, generated, fitKey, presets, selectedId]);
  useEffect(() => { onChange(activeEq ? { ...activeEq, filters: enabled ? activeEq.filters : [], channelMatch: matchEnabled ? activeEq.channelMatch : undefined } : null); }, [enabled, matchEnabled, activeEq, onChange]);

  function chooseHeadphone(id: string) {
    setMeasurementId(id);
    const row = measurements.find(item => item.id === id);
    if (row) setHeadphoneType(row.type);
  }
  async function importHeadphone(entry: CatalogMeasurement) {
    setBusy(true); setMessage("Importing headphone measurement…");
    try {
      const row = await importCatalogEntry(entry);
      const next = [...measurements, row];
      localStorage.setItem("target-lab-measurements", JSON.stringify(next));
      setMeasurements(next); setMeasurementId(row.id); setHeadphoneType(row.type); setMessage(`${row.name} is ready.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not import this measurement."); }
    finally { setBusy(false); }
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 100_000) throw new Error("Choose an EQ TXT file under 100 KB.");
      const eq = parseLibraryEq(await file.text(), file.name.replace(/\.txt$/i, ""));
      saveLibraryEq(eq); setSelectedId(eq.id); setSoundMode("saved"); setEnabled(true);
      setMessage(`Saved ${eq.name}. Starting volume adjustment: ${eq.preamp.toFixed(1)} dB.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not read this EQ file."); }
    finally { setBusy(false); }
  }
  async function generate() {
    if (!sourceCurves.ready || !headphone?.points?.length || !target?.points?.length) { setMessage("Choose a headphone measurement and target first."); return; }
    fitRequest.current?.abort(); const request = new AbortController(); fitRequest.current = request;
    setBusy(true); setMessage("Preparing headphone EQ…");
    try {
      const [result] = await fitAutoEqAsync({raw:headphone.points,targets:[target.points],kind:"export",...fitter,headphoneType:headphone.type,sampleRate:48000},request.signal);
      if (request.signal.aborted || fitRequest.current !== request) return;
      const eq: LibraryEq = { id: crypto.randomUUID(), name: `${headphone.device || headphone.name} → ${target.name}`, engine: result.engine, engineVersion: result.engineVersion, fitter, source: `${fitterLabel(fitter)}${result.fallbackReason ? " · fallback" : ""}`, filters: result.filters, preamp: result.preamp, measurementId: headphone.id, headphone: headphone.device || headphone.name, channelMatch: measurementChannelMatch(headphone), target: isSourceAutoEqTarget(target.id) ? undefined : { id: target.id, name: target.name, points: target.points } };
      saveLibraryEq(eq); setSelectedId(eq.id); setGenerated({ key: fitKey, eq }); setEnabled(true);
      setMessage(`${result.fallbackReason ? "Original fitter used. " : ""}EQ ready · ${result.rms.toFixed(2)} dB fit error · ${readLibraryEqs()[0]?.preamp.toFixed(1)} dB starting volume adjustment.`);
    } catch (error) { if (request.signal.aborted) return; setMessage(error instanceof Error ? error.message : "EQ fitting failed."); }
    finally { if (fitRequest.current === request) { setBusy(false); if (request.signal.aborted) setMessage("Headphone or target changed. Create EQ again for the current selection."); } }
  }
  const selected = activeEq;
  return <SoundSetup mode={soundMode} onMode={mode => { setSoundMode(mode); setEnabled(true); }} presets={presets} presetId={selectedId} onPreset={id => {
    setSelectedId(id); setEnabled(true);
    const eq = presets.find(row => row.id === id);
    if (eq?.measurementId && measurements.some(row => row.id === eq.measurementId)) chooseHeadphone(eq.measurementId);
  }}
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Full navigation runs access checks and unsaved-listening guards.
    headphones={<div className="shootout-content"><HeadphonePicker rows={measurements} selectedId={measurementId} headphoneType={headphoneType} onType={type => { setHeadphoneType(type); setMeasurementId(""); }} onSelect={chooseHeadphone} onClear={() => setMeasurementId("")} onImport={importHeadphone} onUpload={() => { window.location.href = "/shootout?tab=measurements"; }} onEdit={() => { window.location.href = "/shootout?tab=measurements"; }} onDelete={id => { const rows = measurements.filter(row => row.id !== id); try { localStorage.setItem("target-lab-measurements", JSON.stringify(rows)); setMeasurements(rows); if (measurementId === id) setMeasurementId(""); } catch { setMessage("Could not remove this measurement."); } }}/></div>}
    target={<><label htmlFor="library-target">Target curve<select id="library-target" value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">Choose a target</option>{availableTargets.map(row => <option key={row.id} value={row.id}>{row.name} · {row.creator}</option>)}</select></label><AutoEqCurveStatus {...sourceCurves}/><FitterControls value={fitter} defaultValue={defaultFitter} onChange={setFitter} onDefault={saveDefault} notice={fitterNotice}/><button type="button" className="library-eq-generate" disabled={busy || !measurementId || !targetId || !sourceCurves.ready} onClick={() => void generate()}>{busy ? "Preparing EQ…" : "Create EQ"}</button><p>{selected ? "Target EQ ready for the selected headphones." : "Choose headphones and a target, then create their EQ."}</p></>}
    savedExtra={<details className="sound-import-eq"><summary>Import an EQ file</summary><label>EQ settings TXT<input type="file" accept=".txt,text/plain" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }}/></label></details>}>
      {soundMode === "saved" && selected && !headphone && <p>{selected.measurementId ? "The linked measurement is unavailable here. The saved filters and channel correction still work." : "This EQ has no linked headphone measurement. It plays the saved filters directly."}</p>}
      <div className="sound-playback-options"><label><input type="checkbox" aria-label="Enable EQ" checked={enabled && !!selected} disabled={!selected} onChange={event => setEnabled(event.target.checked)}/>EQ {enabled && selected ? "on" : "off"}</label><label><input type="checkbox" aria-label="Enable channel match" checked={matchEnabled && !!selected?.channelMatch} disabled={!selected?.channelMatch} onChange={event => setMatchEnabled(event.target.checked)}/>Channel match {matchEnabled && selected?.channelMatch ? "on" : "off"}</label><span className="sound-state">{enabled && selected ? `EQ: ${selected.name}` : "EQ off · original sound"}{matchEnabled && selected?.channelMatch ? " · channel match on" : ""}</span></div>
      <p>{selected?.channelMatch ? "Channel match uses the Left/Right correction saved with this EQ." : "Channel matching needs paired headphone responses or a saved two-channel correction."} Turn off other EQ on your device before listening.</p>
      {selected && soundMode === "saved" && <p>Stored base EQ: {selected.fitter ? fitterLabel(selected.fitter) : "fitter unrecorded"} · {selected.filters.length} stored filters</p>}
      {selected && soundMode === "saved" && <button type="button" className="library-eq-remove" onClick={() => { try { removeLibraryEq(selected.id); setSelectedId(""); setEnabled(false); setMessage("EQ removed from My space, Tuning and Music library."); } catch { setMessage("Could not remove this EQ. Browser storage may be unavailable."); } }}>Remove selected EQ</button>}
      {message && <p role="status">{message}</p>}
  </SoundSetup>;
}
