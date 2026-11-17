"use client";

import { useEffect, useRef, useState } from "react";

export default function FactShare({ url, message }: { url: string; message: string }) {
  const [status, setStatus] = useState("");
  const [manual, setManual] = useState<{ label: string; text: string } | null>(null);
  const textBox = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (manual) {
      textBox.current?.focus();
      textBox.current?.select();
    }
  }, [manual]);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setManual(null);
      setStatus(`${label} copied.`);
    } catch {
      setManual({ label, text });
      setStatus("Select and copy the text below.");
    }
  }

  return (
    <div className="audio-facts-share" aria-label="Share this fact check">
      <div className="audio-facts-actions">
        <button type="button" onClick={() => copy(url, "Link")}>Copy link</button>
        <button type="button" onClick={() => copy(message, "Full answer")}>Copy full answer for Discord</button>
      </div>
      <p>Share the link for a short preview, or paste the full answer with its sources into chat.</p>
      <span className="audio-facts-status" role="status">{status}</span>
      {manual && <textarea ref={textBox} aria-label={manual.label} rows={5} readOnly value={manual.text} />}
    </div>
  );
}
