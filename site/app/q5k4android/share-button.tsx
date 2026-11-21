"use client";

import { useState } from "react";
import { Link2, Share2 } from "lucide-react";

export function ShareCompanion() {
  const [status, setStatus] = useState("");
  const [manual, setManual] = useState(false);
  const url = "https://yinyangeq.com/q5k4android?tour=qudelix";
  async function share() {
    setStatus("");
    if (navigator.share) {
      try {
        await navigator.share({ title: "YinYang EQ Companion for Qudelix 5K and 5K Plus", url });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied.");
    } catch {
      setManual(true);
    }
  }
  return <div className="companion-share">
    <button type="button" onClick={share}><Share2 aria-hidden="true" size={18}/> Share app features</button>
    <span role="status">{status}</span>
    {manual && <input readOnly aria-label="Share link" value={url} onFocus={e => e.target.select()}/>}
  </div>;
}

export function CopyTrailerLink({ path, format }: { path: string; format: "portrait" | "landscape" }) {
  const [status, setStatus] = useState<"copied" | "manual" | null>(null);
  const url = "https://yinyangeq.com" + path;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("manual");
    }
  }

  return <div className="companion-share trailer-copy-link">
    <button type="button" onClick={copy}><Link2 aria-hidden="true" size={18}/> Copy {format} link</button>
    <span role="status">{status === "copied" ? "Link copied." : status === "manual" ? "Select and copy the URL below." : ""}</span>
    {status === "manual" && <input readOnly aria-label={`${format} trailer link`} value={url} onFocus={e => e.target.select()} />}
  </div>;
}
