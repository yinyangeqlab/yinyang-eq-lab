"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

export function ShareCompanion({ trailer = false }: { trailer?: boolean }) {
  const [status, setStatus] = useState("");
  const [manual, setManual] = useState(false);
  const url = "https://yinyangeq.com/q5k4android" + (trailer ? "/trailer/portrait" : "");
  async function share() {
    setStatus("");
    if (navigator.share) {
      try {
        await navigator.share({ title: trailer ? "YinYang Companion walkthrough" : "YinYang Companion App for Qudelix 5K", url });
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
    <button type="button" onClick={share}><Share2 aria-hidden="true" size={18}/>{trailer ? "Share trailer" : "Share with your friends and community"}</button>
    <span role="status">{status}</span>
    {manual && <input readOnly aria-label="Share link" value={url} onFocus={e => e.target.select()}/>}
  </div>;
}
