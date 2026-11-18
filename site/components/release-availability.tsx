"use client";

import { useEffect, useState } from "react";

const accountAccess = "Feature access depends on your account permissions.";

export default function ReleaseAvailability() {
  const [label, setLabel] = useState(accountAccess);
  useEffect(() => {
    const lifetime = new AbortController();
    let checking = false;
    const refresh = async () => {
      if (checking || document.visibilityState === "hidden") return;
      checking = true;
      try {
        const response = await fetch("/api/maintenance", {
          cache: "no-store",
          signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(8_000)]),
        });
        if (!response.ok) throw new Error("Status request failed");
        const status: unknown = await response.json();
        if (!status || typeof status !== "object" || !("active" in status) || typeof status.active !== "boolean") {
          throw new Error("Invalid maintenance status");
        }
        if (lifetime.signal.aborted) return;
        if ("ownerOnly" in status && status.ownerOnly === true) {
          setLabel("The site is closed for private testing.");
        } else if (status.active && "pauseSubmissions" in status && status.pauseSubmissions === true) {
          setLabel("Some features are temporarily paused for maintenance.");
        } else {
          setLabel(status.active ? accountAccess : `No active maintenance. ${accountAccess}`);
        }
      } catch {
        if (!lifetime.signal.aborted) setLabel(`Maintenance status is unavailable. ${accountAccess}`);
      } finally {
        checking = false;
      }
    };
    const check = () => void refresh();
    check();
    const timer = window.setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      lifetime.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  return <p role="status">{label}</p>;
}
