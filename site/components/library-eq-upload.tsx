"use client";

import { useId, useState } from "react";
import { parseLibraryEq, saveLibraryEq, type LibraryEq } from "@/lib/music-library-eq";
import "./library-eq-upload.css";

export default function LibraryEqUpload({ onImported }: { onImported?: (eq: LibraryEq) => void }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setMessage(""); setError("");
    try {
      if (file.size > 100_000) throw new Error("Choose an EQ settings TXT file under 100 KB.");
      const eq = parseLibraryEq(await file.text(), file.name.replace(/\.txt$/i, "").trim().slice(0, 100) || "Imported EQ");
      saveLibraryEq(eq, { refuseIfFull: true });
      setMessage(`Saved ${eq.name} · ${eq.filters.length} ${eq.filters.length === 1 ? "filter" : "filters"} · ${eq.preamp.toFixed(1)} dB playback preamp. ${onImported ? "This EQ is selected." : "Choose Try in Tuning below to listen."}`);
      onImported?.(eq);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not import this EQ file.");
    } finally { setBusy(false); }
  }

  return <div className="library-eq-import">
    <label htmlFor={id}>{busy ? "Reading EQ…" : "Upload your EQ (.txt)"}</label>
    <input id={id} type="file" accept=".txt,text/plain" disabled={busy} aria-describedby={id + "-help"} onChange={event => {
      const file = event.target.files?.[0]; event.target.value = ""; void upload(file);
    }}/>
    <p id={id + "-help"}>Choose a parametric EQ TXT with Preamp and Filter lines. No target or headphone measurement needed.</p>
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
