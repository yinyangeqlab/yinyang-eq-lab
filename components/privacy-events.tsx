"use client";
import { useEffect } from "react";
export default function PrivacyEvents() {
  useEffect(() => {
    let handled = false;
    const refresh = () => { if (!handled) { handled = true; window.location.assign("/my-data?browser-cleared=1"); } };
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("yinyang-privacy-erasure") : null;
    if (channel) channel.onmessage = refresh;
    const storage = (event: StorageEvent) => { if (event.key === "yinyang-erasure-event" && event.newValue) refresh();
      if (event.key === "yinyang-sharing-event" && event.newValue && !handled) { handled=true; window.location.reload(); } };
    window.addEventListener("storage", storage);
    return () => { channel?.close(); window.removeEventListener("storage",storage); };
  }, []);
  return null;
}
