"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import "./admin-account-link.css";

type Session = { admin: boolean; expiresAt: number | null };

export default function AdminAccountLink({ placement = "utility" }: { placement?: "utility" | "welcome" }) {
  const [session, setSession] = useState<Session>({ admin: false, expiresAt: null });
  useEffect(() => {
    let alive = true, generation = 0;
    async function refresh() {
      const current = ++generation;
      try {
        const response = await fetch("/api/admin-session", { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) return;
        const result = await response.json() as Session;
        if (alive && current === generation) setSession({ admin: result.admin === true && typeof result.expiresAt === "number" && result.expiresAt > Date.now(), expiresAt: result.expiresAt });
      } catch { /* Retain a verified indicator until its known expiry when temporarily offline. */ }
    }
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    const timer = window.setInterval(visible, 30_000);
    window.addEventListener("focus", visible);
    window.addEventListener("yinyang-data-changed", visible);
    document.addEventListener("visibilitychange", visible);
    return () => { alive = false; generation++; window.clearInterval(timer); window.removeEventListener("focus", visible); window.removeEventListener("yinyang-data-changed", visible); document.removeEventListener("visibilitychange", visible); };
  }, []);
  useEffect(() => {
    if (!session.admin || !session.expiresAt) return;
    const timer = window.setTimeout(() => setSession({ admin: false, expiresAt: null }), Math.max(0, session.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [session]);
  const active = session.admin;
  // Participants never see an admin entry inside listening pages; the Welcome footer keeps "Admin sign in", and an active session still shows its indicator.
  if (placement === "utility" && !active) return null;
  const explanation = active ? "Admin session active. Admin privileges and test-only contribution restrictions apply. Open admin controls." : "Open admin sign-in and controls.";
  return <a className={`${placement === "welcome" ? "welcome-admin-link" : "owner-utility-link"} admin-session-link${active ? " admin-session-active" : ""}`} href={active || placement === "utility" ? "/owner-research" : "/admin-login"} title={explanation} aria-label={explanation} data-admin-active={active ? "true" : "false"}>
    <ShieldCheck aria-hidden="true" />
    <span>{active ? "Admin active" : placement === "welcome" ? "Admin sign in" : "Admin view"}</span>
  </a>;
}
