"use client";

import { useEffect, useState, type FormEvent } from "react";
import { copyText } from "@/components/embed-common";
import "./browser-ownership-proof.css";

type Proof = { code: string; expiresAt: number };
type VerifiedBrowser = { browserId: string; accountId: string; nickname: string | null };

async function post<T>(path: string, body: { browserId: string; code?: string }): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) {
    const message = result && typeof result === "object" && "error" in result ? result.error : null;
    throw new Error(typeof message === "string" ? message : "Browser verification is unavailable. Try again.");
  }
  return result as T;
}

export function BrowserOwnershipProof({ browserId, canVerify }: { browserId: string | null; canVerify: boolean }) {
  const [proof, setProof] = useState<Proof | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!proof) return;
    const timeout = window.setTimeout(() => {
      setProof(null);
      setStatus("This verification code expired.");
    }, Math.max(0, proof.expiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [proof]);

  async function copy(value: string, label: string) {
    setStatus(await copyText(value) ? `${label} copied.` : `Select and copy the ${label.toLowerCase()} manually.`);
  }

  async function generate() {
    if (!browserId || busy) return;
    setBusy(true);
    setProof(null);
    setStatus("");
    setError("");
    try {
      setProof(await post<Proof>("/api/my-data/browser-proof", { browserId }));
      setStatus("Verification code ready.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "A code could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return <section id="data-browser-id" className="browser-ownership-proof">
    <h2>Browser ID</h2>
    {browserId ? <>
      <p>You can send this ID privately to the site owner to help find your submissions.</p>
      <div className="browser-proof-value">
        <code>{browserId}</code>
        <button type="button" onClick={() => void copy(browserId, "Browser ID")}>Copy browser ID</button>
      </div>
      {canVerify && <>
        <p>For verification, generate a code in the browser you submitted from. Send the ID and code privately to the site owner. The code can be used once and lasts up to 10 minutes.</p>
        <button type="button" disabled={busy} onClick={() => void generate()}>{busy ? "Creating code…" : proof ? "Replace verification code" : "Generate verification code"}</button>
        {proof && <div className="browser-proof-value">
          <code aria-label="One-time verification code">{proof.code}</code>
          <button type="button" disabled={busy} onClick={() => void copy(`Browser ID: ${browserId}\nOne-time verification code: ${proof.code}`, "Browser ID and code")}>Copy browser ID and code</button>
        </div>}
      </>}
    </> : <p>No browser ID was found in this browser’s saved site data.</p>}
    {status && <p role="status">{status}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}

export function AdminBrowserOwnershipProof() {
  const [browserId, setBrowserId] = useState("");
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState<VerifiedBrowser | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setVerified(null);
    try {
      setVerified(await post<VerifiedBrowser>("/api/owner-research/browser-proof", { browserId, code }));
      setCode("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The code could not be checked.");
    } finally {
      setBusy(false);
    }
  }

  return <details className="admin-tool-group browser-ownership-proof">
    <summary>Verify a browser ID</summary>
    <p>A valid code confirms this browser ID matches a retained submission tied to the requester’s data session. Review older or unlinked submissions individually.</p>
    <form onSubmit={verify}>
      <label>Browser ID<input required maxLength={64} autoComplete="off" spellCheck={false} disabled={busy} value={browserId} onChange={event => setBrowserId(event.target.value)} /></label>
      <label>One-time verification code<input required maxLength={64} autoComplete="off" spellCheck={false} disabled={busy} value={code} onChange={event => setCode(event.target.value)} /></label>
      <button type="submit" disabled={busy || !browserId.trim() || !code.trim()}>{busy ? "Verifying…" : "Verify and use code"}</button>
    </form>
    {verified && <div role="status">
      <p><strong>Browser ID verified</strong> <code>{verified.browserId}</code></p>
      <p>{verified.nickname || "No saved username"} · <code>{verified.accountId}</code></p>
    </div>}
    {error && <p role="alert">{error}</p>}
  </details>;
}
