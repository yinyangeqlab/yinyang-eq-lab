"use client";

import { useEffect, useState } from "react";
import { SERVICE_WARNING_EVENT, type ServiceWarning } from "@/lib/service-warning";

export default function ServiceWarningPopup() {
  const [warning, setWarning] = useState<ServiceWarning | null>(null);
  useEffect(() => {
    const show = (event: Event) => setWarning((event as CustomEvent<ServiceWarning>).detail);
    window.addEventListener(SERVICE_WARNING_EVENT, show);
    return () => window.removeEventListener(SERVICE_WARNING_EVENT, show);
  }, []);

  if (!warning) return null;
  return <div className="service-warning-popup" role="alert">
    <span className="service-warning-icon" aria-hidden="true">!</span>
    <div><strong>{warning.title}</strong><p>{warning.detail}</p></div>
    <button type="button" aria-label="Dismiss service warning" onClick={() => setWarning(null)}>×</button>
  </div>;
}
