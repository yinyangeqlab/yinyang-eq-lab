"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AlphaShell from "@/components/alpha-shell";
import PrivacyEvents from "@/components/privacy-events";
import ServiceWarningPopup from "@/components/service-warning";
import SiteBetaNotice from "@/components/site-beta-notice";
import SiteDataFooter from "@/components/site-data-footer";

// Shareable shootout pages are public and anonymous, and /embed pages run inside
// other sites. They must not load the sidebar shell, account sync, cross-tab
// privacy redirects, service popups or the site footer.
const STANDALONE = /^\/(?:embed|s)\/[a-z0-9]+(?:\/|$)/;

export function isStandalonePath(pathname: string | null): boolean {
  return pathname !== null && (STANDALONE.test(pathname) || pathname === "/share-shootout");
}

export default function SiteChrome({ children }: { children: ReactNode }) {
  if (isStandalonePath(usePathname())) return <>{children}</>;
  return <><ServiceWarningPopup /><PrivacyEvents /><AlphaShell>{children}<SiteBetaNotice /><SiteDataFooter /></AlphaShell></>;
}
