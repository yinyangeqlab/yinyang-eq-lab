"use client";

import { useId, useState } from "react";
import { parseEqPresetText, validateEqPreset, type EqFilter, type EqPreset } from "@/lib/blind-eq";

type Row = { scope: "both" | "left" | "right"; enabled: boolean; type: EqFilter["type"]; hz: string; gain: string; q: string };
const emptyRow = (): Row => ({ scope: "both", enabled: true, type: "PK", hz: "1000", gain: "0", q: "1" });
const numeric = (value: string) => value.trim() ? Number(value) : NaN;
const filterRows = (preset?: EqPreset | null): Row[] => {
  if (!preset) return [emptyRow()];
  const [left, right] = preset.channels;
  const rows = (filters: EqFilter[], scope: Row["scope"]): Row[] => filters.map(filter => ({ ...filter, hz: String(filter.hz), gain: String(filter.gain), q: String(filter.q), enabled: true, scope }));
  return JSON.stringify(left.filters) === JSON.stringify(right.filters) ? rows(left.filters, "both") : [...rows(left.filters, "left"), ...rows(right.filters, "right")];
};

export default function BlindEqEditor({ title, initialName, initialPreset, onChange }: { title: string; initialName: string; initialPreset?: EqPreset | null; onChange: (preset: EqPreset | null) => void }) {
  const id = useId();
  const [name, setName] = useState(initialPreset?.name ?? initialName), [preamps, setPreamps] = useState<[string, string]>(() => initialPreset ? [String(initialPreset.channels[0].preampDb), String(initialPreset.channels[1].preampDb)] : ["0", "0"]);
  const [separatePreamps, setSeparatePreamps] = useState(() => Boolean(initialPreset && initialPreset.channels[0].preampDb !== initialPreset.channels[1].preampDb));
  const [rows, setRows] = useState<Row[]>(() => filterRows(initialPreset)), [manual, setManual] = useState(false);
  const [message, setMessage] = useState(initialPreset ? "Ready · previous preset restored. Review or edit below." : ""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  function dirty() { onChange(null); setMessage("Not applied yet · choose Use these settings to make this preset ready."); setError(""); }
  function rename(value: string) {
    setName(value); setError("");
    if (!initialPreset) return;
    try { onChange(validateEqPreset({ ...initialPreset, name: value.trim() })); setMessage("Ready · preset name updated."); }
    catch (cause) { onChange(null); setMessage("Not applied yet · enter a valid name and choose Use these settings."); setError(cause instanceof Error ? cause.message : "Check the preset name."); }
  }
  function update(index: number, change: Partial<Row>) { dirty(); setRows(current => current.map((row, i) => i === index ? { ...row, ...change } : row)); }
  async function upload(file?: File) {
    if (!file) return;
    dirty(); setBusy(true);
    try {
      if (file.size > 200_000) throw Error("Choose an EQ TXT file under 200 KB.");
      const preset = parseEqPresetText(await file.text(), name.trim());
      const [left, right] = preset.channels;
      const same = JSON.stringify(left.filters) === JSON.stringify(right.filters);
      const toRows = (filters: EqFilter[], scope: Row["scope"]): Row[] => filters.map(filter => ({ ...filter, hz: String(filter.hz), gain: String(filter.gain), q: String(filter.q), enabled: true, scope }));
      setRows(same ? toRows(left.filters, "both") : [...toRows(left.filters, "left"), ...toRows(right.filters, "right")]);
      setPreamps([String(left.preampDb), String(right.preampDb)]);
      setSeparatePreamps(left.preampDb !== right.preampDb);
      onChange(preset); setMessage(`Ready · Left ${left.filters.length} / Right ${right.filters.length} filters. You can review or edit below.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not read this preset."); }
    finally { setBusy(false); }
  }
  function save() {
    setError("");
    try {
      const channels = ([0, 1] as const).map(channel => ({ preampDb: numeric(preamps[channel]), filters: rows.filter(row => row.enabled && (row.scope === "both" || row.scope === (channel === 0 ? "left" : "right"))).map(row => ({ type: row.type, hz: numeric(row.hz), gain: numeric(row.gain), q: numeric(row.q) })) })) as EqPreset["channels"];
      const preset = validateEqPreset({ name: name.trim(), channels });
      onChange(preset); setMessage(`Ready · Left ${channels[0].filters.length} / Right ${channels[1].filters.length} filters.`);
    } catch (cause) { onChange(null); setError(cause instanceof Error ? cause.message : "Check the preset values."); }
  }
  return <section className="eq-card eq-editor" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>{title}</h2>
    <label htmlFor={`${id}-name`}>Name to reveal at the end</label>
    <input id={`${id}-name`} maxLength={100} value={name} disabled={busy} onChange={event => rename(event.target.value)} />
    <label className="eq-upload">{busy ? "Reading preset…" : "Upload preset TXT"}<input type="file" accept=".txt,text/plain" disabled={busy} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label>
    <details open={manual} onToggle={event => setManual(event.currentTarget.open)}>
      <summary>Manual entry / review imported filters</summary>
      {separatePreamps ? <div className="eq-preamps">{(["Left", "Right"] as const).map((channel, index) => <label key={channel}>{channel} preamp (dB)<input type="number" min={-40} max={40} step="any" value={preamps[index]} disabled={busy} onChange={event => { dirty(); const next: [string, string] = [...preamps]; next[index] = event.target.value; setPreamps(next); }} /></label>)}</div> : <label className="eq-shared-preamp">Preamp (dB)<input type="number" min={-40} max={40} step="any" value={preamps[0]} disabled={busy} onChange={event => { dirty(); setPreamps([event.target.value, event.target.value]); }} /></label>}
      <label className="eq-check"><input type="checkbox" checked={separatePreamps} disabled={busy} onChange={event => { dirty(); setSeparatePreamps(event.target.checked); if (!event.target.checked) setPreamps([preamps[0], preamps[0]]); }} />Separate Left / Right preamps</label>
      <p className="eq-muted">{separatePreamps ? "Turn this off to use the Left value as one shared preamp." : "One preamp applies to both channels."}</p>
      <p className="eq-muted">Peak (PK), low shelf (LSC) or high shelf (HSC). Shelf frequency is the center; Q controls the slope. No enabled filters means a flat reference.</p>
      <div className="eq-filter-rows">{rows.map((row, index) => <fieldset className="eq-filter-row" key={index} disabled={busy}>
        <legend>Filter {index + 1}</legend>
        <label className="eq-check"><input type="checkbox" checked={row.enabled} onChange={event => update(index, { enabled: event.target.checked })} />Enabled</label>
        <label>Channel<select value={row.scope} onChange={event => update(index, { scope: event.target.value as Row["scope"] })}><option value="both">Both</option><option value="left">Left</option><option value="right">Right</option></select></label>
        <label>Type<select value={row.type} onChange={event => update(index, { type: event.target.value as Row["type"] })}><option value="PK">Peak · PK</option><option value="LSC">Low shelf · LSC</option><option value="HSC">High shelf · HSC</option></select></label>
        <label>Frequency (Hz)<input type="number" min={10} max={24000} step="any" value={row.hz} disabled={!row.enabled} onChange={event => update(index, { hz: event.target.value })} /></label>
        <label>Gain (dB)<input type="number" min={-30} max={30} step="any" value={row.gain} disabled={!row.enabled} onChange={event => update(index, { gain: event.target.value })} /></label>
        <label>Q<input type="number" min={.1} max={20} step="any" value={row.q} disabled={!row.enabled} onChange={event => update(index, { q: event.target.value })} /></label>
        <button type="button" className="eq-remove" aria-label={`Remove filter ${index + 1}`} onClick={() => { dirty(); setRows(current => current.filter((_, i) => i !== index)); }}>Remove</button>
      </fieldset>)}</div>
      <div className="eq-actions"><button type="button" disabled={busy || rows.length >= 64} onClick={() => { dirty(); setRows(current => [...current, emptyRow()]); }}>Add filter</button></div>
    </details>
    <button type="button" disabled={busy} onClick={save}>Use these settings</button>
    {message && <p className="eq-success" role="status">{message}</p>}
    {error && <p className="eq-error" role="alert">{error}</p>}
  </section>;
}
