"use client";
import "./admin-review.css";
import { AdminTable, adminDate, identityColumns, type SubmissionIdentity } from "@/components/admin-table";
import { trialDisplayLabels } from "@/lib/target-labels";
import { useEffect, useMemo, useState } from "react";
import { moderationIndex, type ModerationEvent, type RecordKind } from "@/lib/moderation";
import type { Trial } from "@/components/results-profile";

type Row = SubmissionIdentity & { id: string; createdAt: number; [key: string]: unknown };
type ReviewData = { votes: Row[]; openChoices: Row[]; listeningRuns: Row[]; feedback: Row[]; researchMeasurements: Row[]; preferenceExports: Row[]; moderationEvents: ModerationEvent[]; targets: { id: string; name: string }[] };
const sources: [RecordKind, keyof ReviewData, string][] = [["vote", "votes", "Ranked votes"], ["open", "openChoices", "Open choices"], ["run", "listeningRuns", "Listening runs"], ["feedback", "feedback", "Descriptions"], ["measurement", "researchMeasurements", "Measurements"], ["export", "preferenceExports", "Exports"]];
export default function AdminReview({ data, reload }: { data: ReviewData; reload: () => Promise<void> }) {
  const [kind, setKind] = useState<RecordKind>("vote"), [status, setStatus] = useState("active");
  const [ownerConfirmation,setOwnerConfirmation]=useState("");
  const [erasing, setErasing] = useState(false), [eraseConfirmed, setEraseConfirmed] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null), [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [browserTrials, setBrowserTrials] = useState<Trial[]>([]), [browserLog, setBrowserLog] = useState<ModerationEvent[]>([]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Bootstrap external browser/server state and expose loading or reset feedback before asynchronous completion.
  useEffect(() => { try { setBrowserTrials((JSON.parse(localStorage.getItem("target-lab-trials") || "[]") as Trial[]).map(trialDisplayLabels)); setBrowserLog(JSON.parse(localStorage.getItem("target-lab-browser-reviews") || "[]")); } catch { setMessage("Browser history could not be read."); } }, []);
  const names = new Map(data.targets.map(target => [target.id, target.name]));
  const latest = useMemo(() => moderationIndex(data.moderationEvents), [data]);
  const rows = (data[sources.find(source => source[0] === kind)![1]] as Row[]).filter(row => {
    const removed = latest.get(`${kind}:${row.id}`)?.action === "remove";
    return status === "all" || (status === "removed") === removed;
  }).sort((a,b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
  const reviewFor = (row: Row) => latest.get(`${kind}:${row.id}`);
  const recordStatus = (row: Row) => reviewFor(row)?.action === "remove" ? "Removed" : "Active";
  const text = (row: Row, key: string) => typeof row[key] === "string" ? String(row[key]) : "";
  const evidence = (row: Row) => ["winnerId", "loserId", "targetAId", "targetBId"]
    .map(key => text(row, key)).filter(Boolean).map(id => names.get(id) || id).join(" / ") || text(row, "targetName") || text(row, "name") || row.id;
  function select(row: Row, erase: boolean) {
    setSelected(row);
    setErasing(erase);
    setReason("");
    setEraseConfirmed(false);
    setOwnerConfirmation("");
  }
  async function submit() {
    if (!selected || busy) return;
    setBusy(true); setMessage("");
    try {
      const action = latest.get(`${kind}:${selected.id}`)?.action === "remove" ? "restore" : "remove";
      const response = await fetch(erasing ? "/api/owner-research/erasure" : "/api/owner-research/moderation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(erasing ? {kind,id:selected.id,confirmation:"ERASE VERIFIED SUBMISSION",includeOwnerAccount:ownerConfirmation==="INCLUDE YINYANGEQ ACCOUNT",ownerAccountConfirmation:ownerConfirmation} : { kind, id: selected.id, action, reason }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Review failed.");
      setSelected(null); setReason(""); await reload(); setMessage(erasing ? "Submission and associated audit notes permanently erased." : action === "remove" ? "Submission removed from active results. Audit entry saved." : "Submission restored. Audit entry saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Review failed."); }
    finally { setBusy(false); }
  }
  function reviewBrowser(row: Trial) {
    const note = window.prompt("Reason for changing this browser tally (3–1000 characters):");
    if (note === null) return;
    if (note.trim().length < 3 || note.trim().length > 1000) { setMessage("Enter a reason of 3–1000 characters."); return; }
    const action = moderationIndex(browserLog).get(`browser:${row.id}`)?.action === "remove" ? "restore" : "remove";
    // eslint-disable-next-line react-hooks/purity -- Time/randomness is sampled inside a user action handler, never while rendering.
    const next = [...browserLog, { sequence: browserLog.length + 1, recordKind: "browser", recordId: row.id, action, reason: note.trim(), actor: "admin on this browser", createdAt: Date.now() }];
    try { localStorage.setItem("target-lab-browser-reviews", JSON.stringify(next)); setBrowserLog(next); setMessage("Browser tally updated. Server submissions must be reviewed separately above."); } catch { setMessage("Browser storage failed; the tally was not changed."); }
  }
  return <section className="admin-review" aria-label="Submission review">
    <h2>Review submissions</h2>
    <p>Find a submission, remove it from active results, or restore it. Each decision requires a reason.</p>
    <details className="admin-review-guide">
      <summary>How moderation affects results</summary>
      <p>Removing a ranked vote or its listening run excludes the linked vote or tie from public results. Open choices stay private and check answers do not weight preferences. Browser IDs and playback times help investigate records.</p>
    </details>
    <div className="owner-filters">
      <label>Record type<select value={kind} disabled={busy} onChange={e => { setKind(e.target.value as RecordKind); setSelected(null); }}>
        {sources.map(([value,,label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>Status<select value={status} disabled={busy} onChange={e => { setStatus(e.target.value); setSelected(null); }}>
        <option value="active">Active</option><option value="removed">Removed</option><option value="all">All</option>
      </select></label>
    </div>
    <AdminTable key={kind} label="Submission review" rows={rows} rowKey={row => row.id} initialSort={{ key: "date", descending: true }} columns={[
      adminDate<Row>("Submitted", row => row.createdAt), ...identityColumns<Row>(),
      { key: "id", label: "Record ID", value: row => row.id, render: row => <code className="admin-id">{row.id}</code> },
      { key: "song", label: "Song", value: row => text(row, "songTitle") },
      { key: "artist", label: "Artist", value: row => text(row, "songArtist") },
      { key: "mode", label: "Mode", value: row => text(row, "testMode") },
      { key: "evidence", label: "Evidence", value: evidence,
        search: row => ["winnerId", "loserId", "targetAId", "targetBId", "filename", "format", "reasonTags", "otherReason", "device", "targetCreator", "measurementName"].map(key => text(row, key)).join(" "),
        render: row => <details><summary>{evidence(row)}</summary><pre>{JSON.stringify(row, null, 2)}</pre></details> },
      { key: "status", label: "Status", value: recordStatus, search: row => reviewFor(row)?.reason,
        render: row => <>{recordStatus(row)}{reviewFor(row) && <p>{reviewFor(row)?.reason}</p>}</> },
      { key: "actions", label: "Actions", className: "admin-row-actions", render: row => <>
        <button type="button" disabled={busy} onClick={() => select(row, false)}>{recordStatus(row) === "Removed" ? "Restore…" : "Remove…"}</button>
        <button type="button" disabled={busy} onClick={() => select(row, true)}>Erase for privacy…</button>
      </> },
    ]} empty="No submissions with this status." />
    {selected && <form className="admin-review-form" onSubmit={event => { event.preventDefault(); void submit(); }}><h3>{erasing?"Permanently erase":latest.get(`${kind}:${selected.id}`)?.action === "remove" ? "Restore" : "Remove"} {kind}</h3><code>{selected.id}</code>{erasing ? <><p>This erases the selected record, original measurement bytes if applicable, and its audit notes. It cannot be restored. Related records must be checked separately. YinYangEQ is excluded unless explicitly included below.</p><label>Only to include protected YinYangEQ data: type INCLUDE YINYANGEQ ACCOUNT<input value={ownerConfirmation} onChange={event=>setOwnerConfirmation(event.target.value)} autoComplete="off"/></label><label><input type="checkbox" required checked={eraseConfirmed} disabled={busy} onChange={e=>setEraseConfirmed(e.target.checked)} />I have verified the requester’s ownership and intend to permanently erase this record.</label></> : <><label>Reason / note<textarea autoFocus required minLength={3} maxLength={1000} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} placeholder="For example: accidental test submission during setup" /></label><p>Keep personal details out of notes. Audit history is retained until the associated data is erased for privacy.</p></>}<button disabled={busy || (erasing?!eraseConfirmed:reason.trim().length < 3)} type="submit">{busy ? "Saving…" : erasing?"Permanently erase":"Save review"}</button> <button type="button" disabled={busy} onClick={() => setSelected(null)}>Cancel</button></form>}
    {message && <p role="status">{message}</p>}
    <details><summary>Audit log · {data.moderationEvents.length} entries</summary>
      <p>Privacy erasure also deletes the associated audit entries.</p>
      <AdminTable label="Moderation audit log" rows={[...data.moderationEvents].sort((a,b) => b.sequence-a.sequence)} rowKey={row => String(row.sequence)}
        initialSort={{ key: "date", descending: true }} columns={[
          adminDate<ModerationEvent>("When", row => row.createdAt),
          { key: "actor", label: "Admin", value: row => row.actor },
          { key: "action", label: "Action", value: row => row.action },
          { key: "kind", label: "Record type", value: row => row.recordKind },
          { key: "record", label: "Record ID", value: row => row.recordId, render: row => <code className="admin-id">{row.recordId}</code> },
          { key: "reason", label: "Reason", value: row => row.reason },
        ]} />
    </details>
    <details><summary>Clean up this browser’s personal tally</summary><p>This is the private tally shown in My results, including unsent trials. These changes and their log stay in this browser. Review server records above to change shared results.</p>{browserTrials.map(row => <div className="admin-browser-row" key={row.id}><span>{new Date(row.createdAt).toLocaleString()} · {row.device || "Unknown headphone"} · {row.pairNames.join(" / ")} · {row.result || row.winnerName}</span><button type="button" onClick={() => reviewBrowser(row)}>{moderationIndex(browserLog).get(`browser:${row.id}`)?.action === "remove" ? "Restore to tally" : "Remove from tally"}</button></div>)}{!browserTrials.length && <p>No saved trials in this browser.</p>}<h3>Browser tally log</h3>{[...browserLog].reverse().map(event => <p key={event.sequence}>{new Date(event.createdAt).toLocaleString()} · {event.action} · {event.recordId} · {event.reason}</p>)}</details>
  </section>;
}
