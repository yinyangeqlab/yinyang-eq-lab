import { buildLabel, releaseInfo, updateLabel } from "@/lib/release-info";
import SiteDataMenu from "@/components/welcome-data-menu";
import type { ReactNode } from "react";

export default function SiteTopbar({ title, inert, navigationControl }: {
  title: string;
  inert?: boolean;
  navigationControl?: ReactNode;
}) {
  return (
    <header className="site-topbar" inert={inert}>
      <div className="site-topbar-start">
        {navigationControl}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Use document navigation so the private comparison can warn before leaving. */}
        <a className="site-topbar-brand" href="/" aria-label="YinYang EQ home">
          {/* eslint-disable-next-line @next/next/no-img-element -- The static SVG is sized by the header layout. */}
          <img src={`/brand-header.svg?v=${buildLabel}`} alt="" />
          <span>YinYang <em>EQ</em></span>
        </a>
        <span className="site-topbar-title" title={title}>{title}</span>
      </div>
      <div className="site-topbar-actions">
        <a className="site-topbar-version" href="/version" aria-label={`About version ${buildLabel}`} title="About this version, changes and licensing">
          <span className="site-topbar-version-long">{updateLabel}</span>
          <span className="site-topbar-version-compact">v{releaseInfo.build.update}</span>
          <span className="site-topbar-version-badge">{releaseInfo.build.preview ? `PREVIEW ${releaseInfo.build.preview}` : "BETA"}</span>
        </a>
        <SiteDataMenu />
      </div>
    </header>
  );
}
