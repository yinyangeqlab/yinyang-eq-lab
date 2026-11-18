"use client";
import { BLIND_EQ_COMPARE_PATH } from "@/lib/blind-eq";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AlphaShell from "@/components/alpha-shell";
import PrivacyEvents from "@/components/privacy-events";
import ServiceWarningPopup from "@/components/service-warning";
import SiteDataFooter from "@/components/site-data-footer";
import SiteTopbar from "@/components/site-topbar";
import TuningSession from "@/components/tuning-session";

// Guest shootouts use a standalone header, or no chrome when embedded.
const STANDALONE = /^\/(?:embed|s)\/[a-z0-9]+(?:\/|$)/;

export function isStandalonePath(pathname: string | null): boolean {
  return pathname !== null && (STANDALONE.test(pathname) || pathname === "/share-shootout");
}

export default function SiteChrome({ children, help }: { children: ReactNode; help: ReactNode }) {
  const pathname = usePathname();
  const comparison = pathname === BLIND_EQ_COMPARE_PATH;
  if (isStandalonePath(pathname) && pathname) {
    const title = pathname === "/share-shootout" ? "Create A Shareable Shootout"
      : /\/results\/?$/.test(pathname) ? "Private Shootout Results"
      : "Blind Shootout";
    return <>{!pathname.startsWith("/embed/") && <SiteTopbar title={title} />}{children}{help}</>;
  }
  return <>
    {!comparison && <PrivacyEvents />}
    <AlphaShell privateComparison={comparison} help={help}>
      {!comparison && <><ServiceWarningPopup /><TuningSession pathname={pathname} /></>}
      {children}
      {!comparison && <SiteDataFooter home={pathname === "/" || pathname === "/home"} />}
    </AlphaShell>
  </>;
}
