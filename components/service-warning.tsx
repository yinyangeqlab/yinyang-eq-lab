"use client";

import { useEffect, useState } from "react";
import { SERVICE_WARNING_EVENT, warningFor, type ServiceWarning } from "@/lib/service-warning";

export function ServiceWarningCard({ warning, onDismiss }: { warning: ServiceWarning; onDismiss: () => void }) {
  return <aside className="service-warning-popup" role="alert" aria-label={warning.title}>
    <span className="service-warning-icon" aria-hidden="true">♡</span>
    <div><strong>{warning.title}</strong><p>{warning.detail}</p>{warning.retry && <p className="service-warning-retry">{warning.retry}</p>}</div>
    <button type="button" aria-label="Dismiss service warning" onClick={onDismiss}>×</button>
  </aside>;
}

export default function ServiceWarningPopup() {
  const [warning, setWarning] = useState<ServiceWarning | null>(null);
  useEffect(() => {
    const show = (event: Event) => setWarning((event as CustomEvent<ServiceWarning>).detail);
    window.addEventListener(SERVICE_WARNING_EVENT, show);
    const original = window.fetch;
    const monitored: typeof fetch = async (input, init) => {
      const response = await original(input, init);
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, window.location.href);
      if (url.origin === window.location.origin && (url.pathname.startsWith("/api/") || url.pathname.startsWith("/__private/"))) {
        const next = warningFor(response);
        if (next) setWarning(next);
      }
      return response;
    };
    window.fetch = monitored;
    return () => {
      window.removeEventListener(SERVICE_WARNING_EVENT, show);
      if (window.fetch === monitored) window.fetch = original;
    };
  }, []);
  return warning ? <ServiceWarningCard warning={warning} onDismiss={() => setWarning(null)} /> : null;
}
