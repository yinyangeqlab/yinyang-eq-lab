"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

function ShareLink({ url, title, label, linkLabel }: {
  url: string;
  title: string;
  label: string;
  linkLabel: string;
}) {
  const [status, setStatus] = useState<"copied" | "manual" | null>(null);

  async function share() {
    setStatus(null);
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("manual");
    }
  }
  return <div className="companion-share">
    <button type="button" onClick={share}><Share2 aria-hidden="true" size={18}/> {label}</button>
    <span role="status">{status === "copied" ? "Link copied." : status === "manual" ? "Select and copy the URL below." : ""}</span>
    {status === "manual" && <input readOnly aria-label={linkLabel} value={url} onFocus={event => event.target.select()} />}
  </div>;
}

export function ShareCompanion() {
  return <ShareLink url="https://yinyangeq.com/q5k4android?tour=qudelix"
    title="YinYang EQ Companion for Qudelix 5K and 5K Plus" label="Share app features" linkLabel="Share link" />;
}

export function ShareTrailer({ path, format }: { path: string; format: "portrait" | "landscape" }) {
  return <ShareLink url={`https://yinyangeq.com${path}`}
    title="YinYang EQ Companion trailer" label="Share trailer" linkLabel={`${format} trailer link`} />;
}
