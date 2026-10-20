"use client";
import { createContext, useContext, useEffect, useState } from "react";
const InviteMode = createContext(false);
export const useInvitesEnabled = () => useContext(InviteMode);
export function InviteModeProvider({enabled, children}: {enabled: boolean; children: React.ReactNode}) {
  const [current, setCurrent] = useState(enabled);
  useEffect(() => {setCurrent(enabled);}, [enabled]);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/invite-system", {cache: "no-store"});
        if (!response.ok) return;
        const data = await response.json() as {enabled?: boolean};
        if (active && typeof data.enabled === "boolean") setCurrent(data.enabled);
      } catch { /* Keep the last server-confirmed mode during a network failure. */ }
    };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {active = false; window.removeEventListener("focus", refresh); window.clearInterval(timer);};
  }, []);
  return <InviteMode.Provider value={current}>{children}</InviteMode.Provider>;
}
