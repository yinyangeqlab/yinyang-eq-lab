"use client";
import { useEffect, useState } from "react";
/** Availability is operational state, independent from the beta product version. */
export default function ReleaseAvailability() {
  const [label, setLabel] = useState("Checking current access status…");
  useEffect(() => {
    const abort = new AbortController(); let request = 0;
    const refresh = async () => {
      const id = ++request;
      try {
        const response = await fetch("/api/maintenance", { cache: "no-store", signal: abort.signal });
        if (!response.ok) throw Error("unavailable");
        const value: unknown = await response.json();
        if (!value || typeof value !== "object" || !("active" in value) || typeof value.active !== "boolean") throw Error("unavailable");
        if (!abort.signal.aborted && id === request) setLabel("ownerOnly" in value && value.ownerOnly === true ? "Closed for private testing" : value.active ? "Some features are temporarily paused" : "No maintenance closure is reported; feature access follows your account permissions.");
      } catch { if (!abort.signal.aborted && id === request) setLabel("Current access status is unavailable. The beta label does not indicate whether access is open."); }
    };
    void refresh(); const timer = window.setInterval(()=>void refresh(), 60_000);
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => { abort.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, []);
  return <p role="status">{label}</p>;
}
