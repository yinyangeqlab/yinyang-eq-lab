"use client";

import { useCallback, useEffect, useState } from "react";

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const check = useCallback(async () => {
    try {
      const response = await fetch("/api/maintenance", { cache: "no-store" });
      if (!response.ok) throw new Error("Maintenance status unavailable");
      const data = await response.json() as { enabled?: boolean };
      setEnabled(data.enabled === true);
    } catch {
      setEnabled(current => current ?? false);
    }
  }, []);
  useEffect(() => {
    void check();
    const timer = window.setInterval(() => void check(), 60_000);
    return () => window.clearInterval(timer);
  }, [check]);

  if (enabled === null) return <main className="maintenance-screen"><p>Loading site…</p></main>;
  if (enabled) return <main className="maintenance-screen" role="status"><div className="maintenance-card"><span className="mini-label">YINYANG EQ</span><h1>We’ll be back shortly.</h1><p>The site is undergoing maintenance. Your music and saved measurements stay on your device. Please try again in a few minutes.</p><button type="button" onClick={() => void check()}>Check again</button></div></main>;
  return children;
}
