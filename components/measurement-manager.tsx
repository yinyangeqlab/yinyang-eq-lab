"use client";
import { recordAdminTestIfNeeded, saveAdminTestRecord } from "@/lib/admin-test-store";

import { useState } from "react";
import { parseCurve } from "@/lib/curves";
import { isImportedMeasurement, type HeadphoneMeasurement } from "@/lib/measurement";
import { at, averageChannels } from "@/lib/channel-balance";
import { parseChannelMatchPreset } from "@/lib/peq-preset";
import { VOTE_DATA_NOTICE_VERSION } from "@/lib/vote-data-notice";

type Attachment = "single" | "left" | "right" | "preset";

export default function MeasurementManager({ rows, selectedId, editId, onAdd, onUpdate, onDelete, onSelect, adminTestOnly=false }: {
  adminTestOnly?:boolean;rows: HeadphoneMeasurement[]; selectedId: string; editId?: string | null; onAdd: (row: HeadphoneMeasurement) => void; onUpdate: (row: HeadphoneMeasurement) => void; onDelete: (id: string) => void; onSelect: (id: string) => void;
}) {
  const [error, setError] = useState("");
  const [contribute, setContribute] = useState(false);
  const [contributionStatus, setContributionStatus] = useState("");
  const [editing, setEditing] = useState<HeadphoneMeasurement | null>(() => rows.find(row => row.id === editId) ?? null);
  const [removed, setRemoved] = useState<Attachment[]>([]);
  const isRemoved = (kind: Attachment) => removed.includes(kind);
  function beginEdit(row: HeadphoneMeasurement | null) { setEditing(row); setRemoved([]); setError(""); setContribute(false); setContributionStatus(""); }
  async function saveFromForm(form: HTMLFormElement) {
    const data = new FormData(form);
    const file = data.get("file"), leftFile = data.get("leftFile"), rightFile = data.get("rightFile"), presetFile = data.get("channelMatchFile");
    for (const attachment of [file, leftFile, rightFile]) if (attachment instanceof File && attachment.size > 4_000_000) throw new Error("Measurement file exceeds 4 MB.");
    if (presetFile instanceof File && presetFile.size > 200_000) throw new Error("Preset file exceeds 200 KB.");
    const primaryText = file instanceof File && file.size ? await file.text() : undefined;
    const leftText = leftFile instanceof File && leftFile.size ? await leftFile.text() : undefined;
    const rightText = rightFile instanceof File && rightFile.size ? await rightFile.text() : undefined;
    const presetText = presetFile instanceof File && presetFile.size ? await presetFile.text() : undefined;
    const oldSingle = editing?.singlePoints ?? (editing && !editing.leftPoints && !editing.rightPoints ? editing.points : undefined);
    const singlePoints = primaryText ? parseCurve(primaryText) : isRemoved("single") ? undefined : oldSingle;
    const leftPoints = leftText ? parseCurve(leftText) : isRemoved("left") ? undefined : editing?.leftPoints;
    const rightPoints = rightText ? parseCurve(rightText) : isRemoved("right") ? undefined : editing?.rightPoints;
    if (!singlePoints && !leftPoints && !rightPoints) throw new Error("Keep or attach at least one response before saving.");
    const channelMatchPreset = presetText ? parseChannelMatchPreset(presetText) : isRemoved("preset") ? undefined : editing?.channelMatchPreset;
    const requestedMode = data.get("channelMatchMode") === "custom" ? "custom" : "auto";
    if (requestedMode === "custom" && !channelMatchPreset && !isRemoved("preset")) throw new Error("Attach a two-channel CH: 0 / CH: 1 preset or choose automatic matching.");
    const channelMatchMode = requestedMode === "custom" && channelMatchPreset ? "custom" : "auto";
    const row: HeadphoneMeasurement = {
      id: editing && (!adminTestOnly || editing.adminTestOnly) ? editing.id : crypto.randomUUID(), name: String(data.get("name") ?? "").trim(), device: String(data.get("device") ?? "").trim(),
      type: data.get("type") === "oe" ? "oe" : "ie", rig: String(data.get("rig") ?? "").trim(),
      fit: String(data.get("fit") ?? "").trim(), notes: String(data.get("notes") ?? "").trim(),
      source: String(data.get("source") ?? "").trim(),
      origin: editing?.origin ?? (editing && isImportedMeasurement(editing) ? "imported" : "upload"),
      driverType: String(data.get("driverType") ?? "").trim(),
      nozzleDiameterMm: data.get("nozzleDiameterMm") ? Number(data.get("nozzleDiameterMm")) : undefined,
      points: leftPoints && rightPoints ? averageChannels(leftPoints, rightPoints) : singlePoints ?? leftPoints ?? rightPoints!,
      singlePoints, leftPoints, rightPoints,
      responseFileName: primaryText ? (file as File).name : isRemoved("single") ? undefined : editing?.responseFileName,
      leftFileName: leftText ? (leftFile as File).name : isRemoved("left") ? undefined : editing?.leftFileName,
      rightFileName: rightText ? (rightFile as File).name : isRemoved("right") ? undefined : editing?.rightFileName,
      channelMatchFileName: presetText ? (presetFile as File).name : isRemoved("preset") ? undefined : editing?.channelMatchFileName,
      channelMatchMode, channelMatchPreset,
      leftLevelDb: leftText ? at(parseCurve(leftText, false), 1000) : isRemoved("left") ? undefined : editing?.leftLevelDb,
      rightLevelDb: rightText ? at(parseCurve(rightText, false), 1000) : isRemoved("right") ? undefined : editing?.rightLevelDb,
      researchContributionId: editing?.researchContributionId,
      adminTestOnly:adminTestOnly||editing?.adminTestOnly===true,createdAt: editing?.createdAt ?? Date.now(),
    };
    if (!row.name || !row.device || !row.rig) throw new Error("Name, headphone model, and measuring device are required.");
    let contributed = false;
    let contributionError = "";
    if(adminTestOnly){saveAdminTestRecord("measurement",row);contributionError="Admin test measurement saved only in this browser.";}
    if (contribute && !adminTestOnly) {
      try {
        if (![file, leftFile, rightFile].some(value => value instanceof File && value.size > 0)) throw new Error("Reattach the original CSV or TXT file to contribute it to research.");
        if (data.get("rights") !== "yes") throw new Error("Confirm you may contribute these files.");
        let contributorId = localStorage.getItem("target-lab-voter");
        if (!contributorId) { contributorId = crypto.randomUUID(); localStorage.setItem("target-lab-voter", contributorId); }
        const contribution = new FormData();
        for (const key of ["name", "device", "type", "rig", "fit", "notes", "source", "driverType", "nozzleDiameterMm", "rights", "file", "leftFile", "rightFile"]) {
          const value = data.get(key);
          if (value !== null) contribution.set(key, value);
        }
        contribution.set("contributorId", contributorId);
        contribution.set("localId", row.id);
        contribution.set("voteDataNoticeVersion", VOTE_DATA_NOTICE_VERSION);
        if(await recordAdminTestIfNeeded("measurement",row)){contributionError="Private test only: measurement saved locally; no research files were submitted.";}else{
        const response = await fetch("/api/research-measurements", { method: "POST", body: contribution });
        const result = await response.json() as { id?: string; error?: string };
        if (!response.ok || !result.id) throw new Error(result.error || "Measurement contribution failed.");
        row.researchContributionId = result.id;
        contributed = true;
        }
      } catch (cause) {
        contributionError = cause instanceof Error ? cause.message : "Research contribution failed.";
      }
    }
    if (editing && (!adminTestOnly || editing.adminTestOnly)) onUpdate(row); else onAdd(row);
    beginEdit(null); form.reset();
    if (contributed) setContributionStatus("Original measurement files saved for research.");
    if (contributionError) setContributionStatus(`Saved in this browser. Research copy was not saved: ${contributionError} Edit this measurement and reattach the original files to try again.`);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setContributionStatus("");
    const form = event.currentTarget;
    try {
      await saveFromForm(form);
    } catch (e) { setError(e instanceof Error ? e.message : "Measurement upload failed."); }
  }
  const importedSource = (row: HeadphoneMeasurement) => { try { return new URL(row.source).hostname; } catch { return row.source || "Imported measurement"; } };
  const attachments: { kind: Attachment; label: string; filename: string; detail: string }[] = editing ? [
    ...(editing.singlePoints || (!editing.leftPoints && !editing.rightPoints) ? [{kind:"single" as const,label:"Single response",filename:editing.responseFileName || "Saved response (original filename unavailable)",detail:`${(editing.singlePoints || editing.points).length} frequency points`}] : []),
    ...(editing.leftPoints ? [{kind:"left" as const,label:"Left response",filename:editing.leftFileName || "Saved Left response (original filename unavailable)",detail:`${editing.leftPoints.length} frequency points`}] : []),
    ...(editing.rightPoints ? [{kind:"right" as const,label:"Right response",filename:editing.rightFileName || "Saved Right response (original filename unavailable)",detail:`${editing.rightPoints.length} frequency points`}] : []),
    ...(editing.channelMatchPreset ? [{kind:"preset" as const,label:"Channel-match preset",filename:editing.channelMatchFileName || "Saved two-channel preset (original filename unavailable)",detail:`${editing.channelMatchPreset.channels[0].filters.length} Left / ${editing.channelMatchPreset.channels[1].filters.length} Right filters`}] : []),
  ] : [];
  return <><div className="heading-row"><div><h1>Upload headphone measurement</h1></div></div>
    <div className="upload-layout measurements-upload-layout"><form key={editing?.id ?? "new"} className="upload-form" onSubmit={e => void submit(e)}>
      {editing && <h2>{`Edit ${editing.name}`}</h2>}
      <label>Measurement name<input name="name" required maxLength={80} defaultValue={editing?.name} placeholder="My headphones · stock pads" /></label>
      <label>Headphone model<input name="device" required maxLength={120} defaultValue={editing?.device} placeholder="Manufacturer and model" /></label>
      <label>Device type<select name="type" defaultValue={editing?.type ?? "ie"}><option value="ie">In-Ear</option><option value="oe">Over-Ear</option></select></label>
      <label>Measuring device / rig<input name="rig" required maxLength={120} defaultValue={editing?.rig} placeholder="711, KEMAR, 5128, other…" /></label>
      <label>Tips or pads<input name="fit" maxLength={120} defaultValue={editing?.fit} placeholder="Foam tips, stock pads, etc." /></label>
      <label>Fit, seal, vents and other notes<textarea name="notes" maxLength={500} defaultValue={editing?.notes} placeholder="Vent blocked; shallow insertion; glasses; channel…" /></label>
      <label>Source or measurer <span>optional</span><input name="source" maxLength={500} defaultValue={editing?.source} placeholder="Your measurement or a credited source URL" /></label>
      <label>Driver type <span>optional</span><input name="driverType" maxLength={80} defaultValue={editing?.driverType} placeholder="Dynamic, planar, BA, hybrid…" /></label>
      <label>Nozzle diameter, mm <span>optional; in-ear</span><input name="nozzleDiameterMm" type="number" min="0.1" max="30" step="0.1" defaultValue={editing?.nozzleDiameterMm} placeholder="e.g. 5.5" /></label>
      <label className="file-label">Single response CSV / TXT <span>or use both channel files</span><input name="file" type="file" accept=".csv,.txt,text/csv,text/plain" /><span className="drop-zone">↥<strong>Choose one raw response</strong><small>Frequency (Hz), level (dB) · up to 4 MB; dense REW files accepted</small></span></label>
      <div className="channel-file-row"><label>Left channel CSV / TXT<input name="leftFile" type="file" accept=".csv,.txt,text/csv,text/plain" /></label><label>Right channel CSV / TXT<input name="rightFile" type="file" accept=".csv,.txt,text/csv,text/plain" /></label></div>
      {editing && <section className="saved-measurement-files" aria-label="Saved measurement attachments"><strong>Saved attachments</strong><p>These responses and presets are stored with this measurement. Removing an attachment takes effect when you save.</p>{attachments.map(item=><div className={`saved-measurement-file ${isRemoved(item.kind) ? "pending-removal" : ""}`} key={item.kind}><span><b>{item.label}</b><small>{item.filename} · {item.detail}</small></span><button type="button" onClick={()=>setRemoved(current=>isRemoved(item.kind)?current.filter(kind=>kind!==item.kind):[...current,item.kind])}>{isRemoved(item.kind)?"Undo":"Remove"}</button></div>)}</section>}
      <fieldset className="channel-match-settings"><legend>Channel matching for Open comparison</legend><p>Choose how this measurement balances Left and Right during Open comparison. Ranked tests always use Auto Match.</p><label><input type="radio" name="channelMatchMode" value="auto" defaultChecked={editing?.channelMatchMode !== "custom"} /><span><b>Auto Match</b><small>Uses your saved Left and Right responses when both are attached.</small></span></label><label><input type="radio" name="channelMatchMode" value="custom" defaultChecked={editing?.channelMatchMode === "custom"} /><span><b>My channel-match preset</b><small>Use a two-channel PEQdB/Qudelix export with CH: 0 and CH: 1 sections.</small></span></label><label className="channel-match-file">Channel-match preset TXT<input name="channelMatchFile" type="file" accept=".txt,text/plain" /></label></fieldset>
      <label className="research-consent"><input name="contribute" type="checkbox" value="yes" checked={contribute} onChange={event => setContribute(event.target.checked)} />Contribute the original measurement file(s) and the model, rig, fit, source, driver and nozzle details above to the owner’s long-term research archive. Private listening does not require this.</label>
      {contribute && <label className="research-consent"><input name="rights" type="checkbox" value="yes" required />I made these measurements or have permission to contribute the original files for research. I understand they will be linked to my random listener ID and may be kept for ongoing research.</label>}
      <button className="primary">{editing ? "Save changes →" : "Save measurement →"}</button>{editing && <button type="button" className="export-button" onClick={() => beginEdit(null)}>Cancel edit</button>}{error && <p role="alert">{error}</p>}
      {contributionStatus && <p role="status">{contributionStatus}</p>}
    </form></div>
    <div className="private-list" id="saved-measurements"><h2>Saved measurements</h2>{rows.length ? rows.map(row => <div className="private-row" key={row.id}><span><strong>{row.name}</strong><small>{row.type === "ie" ? "In-Ear" : "Over-Ear"} · {row.device} · {row.rig}{row.fit ? ` · ${row.fit}` : ""} · {row.channelMatchMode === "custom" ? "custom match in Open comparison" : row.leftPoints && row.rightPoints ? "automatic Left/Right match" : "shared stereo EQ"}{row.researchContributionId ? " · contributed to research" : ""}</small>{isImportedMeasurement(row) && <small>Imported from {importedSource(row)}</small>}{row.notes && <small>{row.notes}</small>}</span><button type="button" onClick={() => onSelect(row.id)}>{row.id === selectedId ? "Selected" : "Use for listening"}</button><button type="button" className="measurement-icon-button" aria-label={`Edit ${row.name}`} title="Edit measurement" onClick={() => { beginEdit(row); window.scrollTo({top:0,behavior:"smooth"}); }}>✎</button><button type="button" className="measurement-icon-button" aria-label={`Delete ${row.name}`} title="Delete measurement" onClick={() => { if (window.confirm(`Delete ${row.name} from this browser?`)) { onDelete(row.id); if (editing?.id === row.id) beginEdit(null); } }}>×</button></div>) : <p className="footnote">No measurements saved yet.</p>}</div>
  </>;
}
