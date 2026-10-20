"use client";
import { useCallback, useEffect, useState } from "react";

type Invite = { id: string; label: string; created_at: number; code_expires_at: number; redeemed_at: number | null; session_expires_at: number | null; revoked_at: number | null };
type Created = { label: string; code: string; codeExpiresAt: number };

export function TesterInvites() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const response = await fetch("/__private/admin/invites", { cache: "no-store" });
    const data = await response.json() as { invites?: Invite[]; error?: string };
    if (!response.ok) throw new Error(data.error || "Could not load tester invitations.");
    setInvites(data.invites || []);
  }, []);
  useEffect(() => { void refresh().catch(cause => setError(cause instanceof Error ? cause.message : "Could not load invitations.")); }, [refresh]);
  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setCreated(null); setCopyStatus("");
    try {
      const response = await fetch("/__private/admin/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: label.trim() }) });
      const data = await response.json() as Created & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not create invitation.");
      setCreated(data); setLabel(""); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create invitation."); }
    finally { setBusy(false); }
  }
  async function copyCode() {
    if (!created) return;
    try { await navigator.clipboard.writeText(created.code); setCopyStatus("Code copied."); }
    catch { setCopyStatus("Copy failed. Select the code above and copy it manually."); }
  }
  async function revoke(id: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/__private/admin/invites/${id}/revoke`, { method: "POST" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not revoke access.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not revoke access."); }
    finally { setBusy(false); }
  }
  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete ${name}'s access entry permanently? This also ends their access immediately.`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/__private/admin/invites/${id}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not delete the entry.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete the entry."); }
    finally { setBusy(false); }
  }
  const now = Date.now() / 1000;
  function status(row: Invite) {
    if (row.revoked_at) return "Revoked";
    if (row.redeemed_at) return row.session_expires_at && row.session_expires_at > now ? "Active browser" : "Expired browser";
    return row.code_expires_at > now ? "Unused invitation" : "Expired invitation";
  }
  return <section className="tester-invites">
    <h2>Private tester access</h2>
    <p>Create one invitation per tester. Each code expires after 48 hours and can be redeemed once in one browser. That browser stays signed in for 48 hours from redemption. Revoking an invitation also ends its active session. A code identifies the first browser that uses it; it does not verify a person’s identity.</p>
    <form onSubmit={create}><label>Tester name or label<input value={label} onChange={event => setLabel(event.target.value)} maxLength={80} required placeholder="For example: Alex" /></label><button disabled={busy}>Create invitation</button></form>
    {created && <div className="tester-created"><strong>Copy this code now for {created.label}. It will not be shown again.</strong><code>{created.code}</code><button type="button" onClick={() => void copyCode()}>Copy code</button>{copyStatus && <span role="status">{copyStatus}</span>}<p>Send them to <strong>https://yinyangeq.com/access</strong> and give them the code separately. Do not share the admin password.</p></div>}
    {error && <p role="alert">{error}</p>}
    <div className="owner-table-wrap"><table><thead><tr><th>Tester</th><th>Status</th><th>Expires</th><th>Actions</th></tr></thead><tbody>{invites.map(row => <tr key={row.id}><td>{row.label}</td><td>{status(row)}</td><td>{new Date((row.session_expires_at || row.code_expires_at) * 1000).toLocaleString()}</td><td><div className="tester-actions">{!row.revoked_at && <button type="button" disabled={busy} onClick={() => void revoke(row.id)}>Revoke</button>}<button type="button" disabled={busy} onClick={() => void remove(row.id, row.label)}>Delete</button></div></td></tr>)}</tbody></table></div>
  </section>;
}
