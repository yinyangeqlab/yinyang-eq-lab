"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
export default function PrivacyEvents() {
  const pathname = usePathname();
  useEffect(() => {
    let handled = false;
    const refresh = () => { if (!handled) { handled = true; window.location.assign("/my-data?browser-cleared=1"); } };
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("yinyang-privacy-erasure") : null;
    if (channel) channel.onmessage = refresh;
    const syncChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("yinyang-browser-sync") : null;
    const synced = () => {if(!handled){handled=true;window.location.replace("/sync?linked=1");}};
    if(syncChannel)syncChannel.onmessage=synced;
    const storage = (event: StorageEvent) => { if(event.key==="yinyang-sync-event" && event.newValue) {synced();return;} if (event.key === "yinyang-erasure-event" && event.newValue) refresh();
      if (event.key === "yinyang-sharing-event" && event.newValue && !handled) { handled=true; window.location.reload(); } };
    window.addEventListener("storage", storage);
    return () => { channel?.close(); syncChannel?.close(); window.removeEventListener("storage",storage); };
  }, []);
  useEffect(() => {
    const allowed = new Set(["/", "/home", "/shootout", "/preference-tuning", "/personal-tuning", "/music-library", "/my-data", "/privacy", "/curve-credits"]);
    if (!allowed.has(pathname)) return;
    let sessionId = "";
    try {
      sessionId = sessionStorage.getItem("yinyang-activity-session") || crypto.randomUUID();
      sessionStorage.setItem("yinyang-activity-session", sessionId);
    } catch { return; }
    const state = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("target-lab-page-state") || "{}");
        const active = pathname === "/shootout" && Array.isArray(saved.pair) && saved.pair.length === 2 && saved.sessionExpired !== true && saved.sessionFinished !== true;
        return { shootoutTab: pathname === "/shootout" && typeof saved.tab === "string" ? saved.tab : undefined, testMode: pathname === "/shootout" && typeof saved.testMode === "string" ? saved.testMode : undefined, testActive: active };
      } catch { return { testActive: false }; }
    };
    const send = (eventType: string) => {
      try { if (localStorage.getItem("yinyang-activity-monitoring") !== "true") return; } catch { return; }
      const detail = state();
      void fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
        body: JSON.stringify({ sessionId, eventType, route: pathname, ...detail }) }).catch(() => {});
    };
    const custom = (event: Event) => {
      const type = (event as CustomEvent<{ eventType?: string }>).detail?.eventType;
      if (type === "shootout_tab" || type === "test_started" || type === "test_ended") send(type);
    };
    const monitorChoice = () => send("page_view");
    const heartbeat = () => { if (document.visibilityState === "visible") send("heartbeat"); };
    send("page_view");
    const timer = window.setInterval(heartbeat, 30_000);
    window.addEventListener("yinyang-activity", custom);
    window.addEventListener("yinyang-monitoring-choice", monitorChoice);
    document.addEventListener("visibilitychange", heartbeat);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("yinyang-activity", custom);
      window.removeEventListener("yinyang-monitoring-choice", monitorChoice);
      document.removeEventListener("visibilitychange", heartbeat);
    };
  }, [pathname]);
  return null;
}
