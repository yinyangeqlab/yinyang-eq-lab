"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AlphaShell from "@/components/alpha-shell";
import PrivacyEvents from "@/components/privacy-events";
import ServiceWarningPopup from "@/components/service-warning";
import SiteDataFooter from "@/components/site-data-footer";
import SiteTopbar from "@/components/site-topbar";
import TuningSession from "@/components/tuning-session";

// Guest shootouts and private EQ comparisons use the site bar without the
// sidebar, account sync, cross-tab redirects, service popups or site footer.
const STANDALONE = /^\/(?:embed|s)\/[a-z0-9]+(?:\/|$)/;

export function isStandalonePath(pathname: string | null): boolean {
  return pathname !== null && (STANDALONE.test(pathname) || pathname === "/share-shootout" || pathname === "/eq-compare");
}

export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isStandalonePath(pathname) && pathname) {
    if (pathname.startsWith("/embed/")) return <>{children}</>;
    const title = pathname === "/eq-compare" ? "Blind EQ Comparison"
      : pathname === "/share-shootout" ? "Create a Shareable Shootout"
      : /\/results\/?$/.test(pathname) ? "Private Shootout Results"
      : "Blind Shootout";
    return <><SiteTopbar title={title} />{children}</>;
  }
  return <><PrivacyEvents /><AlphaShell><ServiceWarningPopup /><TuningSession pathname={pathname} />{children}<SiteDataFooter home={pathname === "/" || pathname === "/home"} /></AlphaShell></>;
}
