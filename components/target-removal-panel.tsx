"use client";
import { AdminTable, adminDate, identityColumns, type SubmissionIdentity } from "@/components/admin-table";

import { useCallback, useEffect, useState } from "react";

type RemovalRequest = SubmissionIdentity & { id: string; targetId: string; message: string; status: "pending" | "done" | "declined"; adminNote: string | null; createdAt: number; resolvedAt: number | null; targetName: string | null; targetCreator: string | null; targetStatus: string | null };

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
    {rows === null ? <p role="status">Loading requests…</p> : <AdminTable label="Open target removal requests" rows={open} rowKey={row => row.id}
      empty="No open requests." initialSort={{ key: "date", descending: true }} columns={[
        adminDate<RemovalRequest>("Requested", row => row.createdAt), ...identityColumns<RemovalRequest>(),
        { key: "target", label: "Target", value: row => row.targetName ?? "Unknown target", search: row => row.targetId },
        { key: "creator", label: "Creator", value: row => row.targetCreator },
        { key: "status", label: "Target status", value: row => row.targetStatus },
        { key: "message", label: "Message", value: row => row.message },
        { key: "note", label: "Your note", render: row => <input aria-label={`Note for ${row.targetName ?? "request"}`} maxLength={500}
          value={notes[row.id] ?? ""} onChange={event => setNotes(current => ({ ...current, [row.id]: event.target.value }))} /> },
        { key: "actions", label: "Decision", render: row => <>
          <button type="button" disabled={Boolean(busy)} onClick={() => void decide(row, "done")}>Remove from rankings</button>
          <button type="button" disabled={Boolean(busy)} onClick={() => void decide(row, "declined")}>Decline</button>
        </> },
      ]} />}
    {closed.length > 0 && <details><summary>Recent decisions ({closed.length})</summary><ul>{closed.map(row => <li key={row.id}>{row.targetName ?? row.targetId} · {row.status === "done" ? "removed" : "declined"} {row.resolvedAt ? new Date(row.resolvedAt).toLocaleDateString() : ""}{row.adminNote ? ` · ${row.adminNote}` : ""}</li>)}</ul></details>}
  </section>;
}
