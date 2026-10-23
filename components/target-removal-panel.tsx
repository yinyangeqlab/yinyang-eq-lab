"use client";

import { useCallback, useEffect, useState } from "react";

type RemovalRequest = { id: string; targetId: string; message: string; status: "pending" | "done" | "declined"; adminNote: string | null; createdAt: number; resolvedAt: number | null; targetName: string | null; targetCreator: string | null; targetStatus: string | null };

/** Owner queue for participants who asked to take an approved target out of public rankings. */
export default function TargetRemovalPanel() {
  const [rows, setRows] = useState<RemovalRequest[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/owner-research/target-removals", { cache: "no-store" });
      if (!response.ok) throw Error("Removal requests could not be loaded.");
      setRows((await response.json() as { requests: RemovalRequest[] }).requests);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Removal requests could not be loaded."); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the state is set after the response arrives
  useEffect(() => { void load(); }, [load]);
  async function decide(row: RemovalRequest, action: "done" | "declined") {
    if (action === "done" && !window.confirm(`Remove "${row.targetName ?? row.targetId}" from public rankings? Its votes are kept but stop counting, rankings recalculate, and the change appears in the ranking-change history.`)) return;
    setBusy(row.id);
    try {
      const response = await fetch("/api/owner-research/target-removals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, action, note: notes[row.id] || "" }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw Error(result.error || "The decision could not be saved.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The decision could not be saved."); } finally { setBusy(""); }
  }
  const open = (rows ?? []).filter(row => row.status === "pending");
  const closed = (rows ?? []).filter(row => row.status !== "pending").slice(0, 20);
  return <section id="target-removals" aria-label="Target removal requests"><h2>Target removal requests</h2>
    <p>Participants can ask to take an approved target out of public rankings. Nothing changes until you decide. Removing marks the target withdrawn: rankings recalculate without it and the change is logged as a coarse ranking-change day. Participants can also erase their own data from My data, which removes their submissions.</p>
    {error && <p role="alert">{error}</p>}
    {rows === null ? <p role="status">Loading requests…</p> : open.length === 0 ? <p className="footnote">No open requests.</p> : <div className="owner-table-wrap"><table><thead><tr><th>Requested</th><th>Target</th><th>Message</th><th>Your note</th><th>Decision</th></tr></thead><tbody>{open.map(row => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString()}</td><td><strong>{row.targetName ?? "Unknown target"}</strong><br />{row.targetCreator ?? ""}{row.targetStatus && row.targetStatus !== "approved" ? <><br /><small>Currently {row.targetStatus}</small></> : null}</td><td>{row.message || "—"}</td><td><input aria-label={`Note for ${row.targetName ?? "request"}`} maxLength={500} value={notes[row.id] ?? ""} onChange={event => setNotes(current => ({ ...current, [row.id]: event.target.value }))}/></td><td><button type="button" disabled={busy === row.id} onClick={() => void decide(row, "done")}>Remove from rankings</button> <button type="button" disabled={busy === row.id} onClick={() => void decide(row, "declined")}>Decline</button></td></tr>)}</tbody></table></div>}
    {closed.length > 0 && <details><summary>Recent decisions ({closed.length})</summary><ul>{closed.map(row => <li key={row.id}>{row.targetName ?? row.targetId} · {row.status === "done" ? "removed" : "declined"} {row.resolvedAt ? new Date(row.resolvedAt).toLocaleDateString() : ""}{row.adminNote ? ` · ${row.adminNote}` : ""}</li>)}</ul></details>}
  </section>;
}
