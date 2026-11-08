"use client";

import { useEffect, useMemo, useState } from "react";
import { measurementChannelMatch, readLibraryEqs, removeLibraryEq, removeLibraryEqs, saveLibraryEq, type LibraryEq } from "@/lib/music-library-eq";
import { channelMatchText, channelMatchWav, downloadLocalFile, autoMatchFilename } from "@/lib/channel-match-export";
import { parseChannelMatchPreset } from "@/lib/peq-preset";
import type { ChannelMatch } from "@/lib/channel-balance";
import type { HeadphoneMeasurement } from "@/lib/measurement";
import "./saved-eq-collection.css";

function SavedDate({ value, label }: { value?: number; label: string }) {
  return value ? <span>{label} <time dateTime={new Date(value).toISOString()}>{new Date(value).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time></span> : <span>Saved date unavailable</span>;
}

export default function SavedEqCollection({ measurements, onUpdate }: { measurements: HeadphoneMeasurement[]; onUpdate: (row: HeadphoneMeasurement) => void }) {
  const [eqs, setEqs] = useState<LibraryEq[]>([]), [message, setMessage] = useState("");
  const [modelId, setModelId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteRequest, setDeleteRequest] = useState<string[] | null>(null);
  const [eqModels, setEqModels] = useState<Record<string, string>>({});
  useEffect(() => {
    const refresh = () => {
      const next = readLibraryEqs(); setEqs(next);
      setSelectedIds(ids => ids.filter(id => next.some(eq => eq.id === id)));
    };
    refresh();
    window.addEventListener("library-eqs-changed", refresh); window.addEventListener("storage", refresh); window.addEventListener("yinyang-data-changed", refresh);
    return () => { window.removeEventListener("library-eqs-changed", refresh); window.removeEventListener("storage", refresh); window.removeEventListener("yinyang-data-changed", refresh); };
  }, []);
  const model = measurements.find(row => row.id === modelId);
  const matches = useMemo(() => new Map(measurements.map(row => [row.id, measurementChannelMatch(row)])), [measurements]);
  const pendingIds = deleteRequest?.filter(id => eqs.some(eq => eq.id === id)) ?? [];
  function act(action: () => void, success: string) { try { action(); setMessage(success); return true; } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save this change."); return false; } }
  function downloadMatch(match: ChannelMatch, name: string, custom = false) {
    const filename = name.replace(/[^a-z0-9_-]/gi, "-").slice(0, 80) || "headphones";
    act(() => downloadLocalFile(custom ? `${filename}-uploaded-channel-match.txt` : autoMatchFilename(name, match.channelMatchMode === "custom"), custom ? channelMatchText(match) : channelMatchWav(match), custom ? "text/plain" : "audio/wav"), "Channel match downloaded.");
  }
  async function upload(file: File | undefined) {
    if (!file || !model) return;
    try {
      if (file.size > 200_000) throw new Error("Choose a preset under 200 KB.");
      const channelMatchPreset = parseChannelMatchPreset(await file.text());
      onUpdate({ ...model, channelMatchPreset, channelMatchMode: "custom", channelMatchFileName: file.name });
      setMessage(`Correction saved for ${model.name}. Open Channel correction on an EQ to use it.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not read this preset."); }
  }
  return <section className="saved-eq-collection" aria-labelledby="saved-eq-title">
    <h2 id="saved-eq-title">Saved EQs &amp; channel matches</h2>
    <p>EQs saved from Tuning and Music library share this collection. Listen in either area, download settings, or delete EQs here. These copies stay in this browser unless you use account Sync.</p>
    <div className="saved-eq-links"><a href="/preference-tuning#saved-eq-listening">Listen in Tuning</a><a href="/music-library">Listen in Music library</a></div>
    {eqs.length ? <>
      <div className="saved-eq-selection" role="group" aria-label="Select saved EQs">
        <strong>{selectedIds.length} of {eqs.length} selected</strong>
        <button type="button" disabled={selectedIds.length === eqs.length} onClick={() => { setSelectedIds(eqs.map(eq => eq.id)); setDeleteRequest(null); }}>Select all</button>
        <button type="button" disabled={!selectedIds.length} onClick={() => { setSelectedIds([]); setDeleteRequest(null); }}>Clear selection</button>
        <button type="button" disabled={!selectedIds.length} onClick={() => setDeleteRequest([...selectedIds])}>Delete selected ({selectedIds.length})</button>
      </div>
      {deleteRequest && pendingIds.length > 0 && <div className="saved-eq-confirm" role="group" aria-label="Confirm bulk EQ deletion"><p>Delete {pendingIds.length} selected {pendingIds.length === 1 ? "EQ" : "EQs"}? They will also disappear from Tuning and Music library. This cannot be undone.</p><button type="button" onClick={() => { if (act(() => removeLibraryEqs(pendingIds), `${pendingIds.length} ${pendingIds.length === 1 ? "EQ deleted" : "EQs deleted"} from My space, Tuning and Music library.`)) { setSelectedIds([]); setDeleteRequest(null); } }}>Delete {pendingIds.length} {pendingIds.length === 1 ? "EQ" : "EQs"}</button><button type="button" onClick={() => setDeleteRequest(null)}>Cancel</button></div>}
      <ul className="saved-eq-list">{eqs.map(eq => {
        const chosenId = eqModels[eq.id] ?? eq.measurementId ?? "";
        const chosen = measurements.find(row => row.id === chosenId);
        const match = matches.get(chosenId);
        return <li key={eq.id} className={selectedIds.includes(eq.id) ? "is-selected" : undefined}>
          <div className="saved-eq-row-heading"><label className="saved-eq-check"><input type="checkbox" aria-label={`Select ${eq.name}`} checked={selectedIds.includes(eq.id)} onChange={event => { const checked = event.target.checked; setSelectedIds(ids => checked ? [...ids, eq.id] : ids.filter(id => id !== eq.id)); setDeleteRequest(null); }}/><span className="sr-only">Select EQ</span></label><div><h3>{eq.name}</h3><div className="saved-eq-dates"><SavedDate value={eq.createdAt} label="Saved"/>{eq.updatedAt && eq.updatedAt !== eq.createdAt && <SavedDate value={eq.updatedAt} label="Updated"/>}</div></div></div>
          <p>{eq.headphone && `${eq.headphone} · `}{eq.source} · {eq.filters.length} filters · {eq.preamp.toFixed(1)} dB preamp</p><small>{eq.channelMatch ? "Left/Right correction saved. Channel match is on by default while listening." : "No Left/Right channel correction saved."}</small>
          <div className="saved-eq-actions">
            <button type="button" onClick={() => act(() => downloadLocalFile("saved-eq.txt", `# ${eq.name.replace(/[\r\n]/g, " ")}\n# EQ only; channel match is a separate download.\nPreamp: ${eq.preamp} dB\n${eq.filters.map((f, i) => `Filter ${i + 1}: ON ${f.type || "PK"} Fc ${f.hz} Hz Gain ${f.gain} dB Q ${f.q}`).join("\n")}\n`, "text/plain"), "EQ settings downloaded.")}>Download EQ TXT</button>
            {eq.channelMatch && <button type="button" onClick={() => downloadMatch(eq.channelMatch!, eq.name)}>Download channel match WAV</button>}
            <button type="button" onClick={() => act(() => removeLibraryEq(eq.id), "EQ deleted from My space, Tuning and Music library.")}>Delete EQ</button>
          </div>
          <details className="saved-eq-correction"><summary>Channel correction</summary><p>This balances differences between your headphones’ Left and Right earpieces. Choose the same headphones this EQ was made for, then copy their correction into this EQ. Your EQ filters stay the same.</p>
            <label>Headphones for this EQ<select value={chosen?.id ?? ""} onChange={event => setEqModels(ids => ({ ...ids, [eq.id]: event.target.value }))}><option value="">Choose headphones</option>{measurements.map(row => <option key={row.id} value={row.id}>{row.name} · {row.device}</option>)}</select></label>
            <p>{match ? `A Left/Right correction is available for ${chosen?.name}.` : chosen ? "Add Left and Right responses or a two-channel preset in Headphones to enable correction." : "Choose a saved headphone measurement first."} Channel match starts on when a correction is available; you can turn it off while listening.</p>
            <div className="saved-eq-actions"><button type="button" disabled={!chosen || !match} onClick={() => act(() => saveLibraryEq({ ...eq, measurementId: chosen!.id, headphone: chosen!.device || chosen!.name, channelMatch: match }), `Left/Right correction for ${chosen!.name} saved with this EQ.`)}>Use this headphone’s correction</button>{eq.channelMatch && <button type="button" onClick={() => act(() => saveLibraryEq({ ...eq, channelMatch: undefined }), "Left/Right correction removed from this EQ in all three areas.")}>Remove channel correction</button>}</div>
          </details>
        </li>;
      })}</ul>
    </> : <p>No saved EQs yet. Finalize an EQ in Tuning and choose <b>Save EQ to My space</b>.</p>}
    <section id="channel-matches" className="saved-channel-models" aria-labelledby="saved-channel-models-title"><h3 id="saved-channel-models-title">Channel matches by headphone model</h3>
      <div className="automatch-files" aria-label="Saved automatic channel matches">{measurements.filter(row=>row.leftPoints?.length && row.rightPoints?.length).map(row=><article key={row.id}><div><strong>YinYang AutoMatch · {row.device || row.name}</strong><small>{autoMatchFilename(row.device || row.name)}</small><p>{row.channelMatchPreset ? "Automatic correction and uploaded preset are both available." : "No uploaded file needed. Generated from your saved Left/Right responses."}</p></div><button type="button" onClick={()=>downloadMatch({...row,channelMatchMode:"auto"},row.device || row.name)}>Download WAV</button></article>)}</div>
      <label>Choose a saved headphone measurement<select value={modelId} onChange={event => setModelId(event.target.value)}><option value="">Choose headphones</option>{measurements.map(row => <option key={row.id} value={row.id}>{row.name} · {row.device}</option>)}</select></label>
      <p>Download this headphone’s Left/Right correction or add your own preset. To use it with a saved EQ, open Channel correction on that EQ above.</p>
      {model && <><p>{model.leftPoints && model.rightPoints ? "Automatic matching is available from this model’s Left and Right responses." : "Add Left and Right responses in Headphones to enable automatic matching."}</p>
        <div className="saved-eq-actions">{model.leftPoints && model.rightPoints && <button type="button" onClick={() => downloadMatch({ ...model, channelMatchMode: "auto" }, model.name)}>Download YinYang AutoMatch WAV</button>}{model.channelMatchPreset && <button type="button" onClick={() => downloadMatch(model, model.name, true)}>Download uploaded match TXT</button>}</div>
        <label>Attach or replace this model’s channel-match preset<input type="file" accept=".txt,text/plain" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }}/></label><a href="/shootout?tab=measurements#saved-measurements">Edit headphone responses and match mode</a></>}
      <details><summary>Using channel-match downloads</summary><p>Auto Match WAV is a stereo 48 kHz convolution impulse, with Left then Right channels and protective headroom. Use it in a stereo convolution processor (for example, Equalizer APO’s Convolution command); it adds about 85 ms delay. It is not a music recording or a parametric EQ TXT. Use the same sample rate or a processor that resamples impulses. Turn off other channel matching before listening.</p></details>
    </section>
    {message && <p role="status">{message}</p>}
  </section>;
}
