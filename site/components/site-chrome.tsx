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

export default function SiteChrome({ children, help }: { children: ReactNode; help: ReactNode }) {
  const pathname = usePathname();
  const comparison = pathname === "/eq-compare";
  let chrome: ReactNode;

  if (isStandalonePath(pathname) && pathname) {
    if (pathname.startsWith("/embed/")) {
      chrome = children;
    } else {
      const title = comparison ? "Blind EQ Comparison"
        : pathname === "/share-shootout" ? "Create a Shareable Shootout"
        : /\/results\/?$/.test(pathname) ? "Private Shootout Results"
        : "Blind Shootout";
      chrome = <><SiteTopbar title={title} />{!comparison && children}</>;
    }
  } else {
    chrome = <><PrivacyEvents /><AlphaShell><ServiceWarningPopup /><TuningSession pathname={pathname} />{children}<SiteDataFooter home={pathname === "/" || pathname === "/home"} /></AlphaShell></>;
  }

  // Keep the same Help instance across navigation and put it before the comparison in tab order.
  return <>{chrome}{help}{comparison && children}</>;
}
