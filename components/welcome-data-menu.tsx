"use client";

import { useEffect, useRef } from "react";
import { ArrowLeftRight, ChevronRight, Database, Laptop, Menu, ShieldCheck } from "lucide-react";
import "./welcome-data-menu.css";

const dataLinks = [
  { href: "/account-sync", title: "Account & devices", description: "Manage account access and connected devices", Icon: Laptop, color: "mint" },
  { href: "/sync", title: "Browser Sync", description: "Use your saved data on another browser", Icon: ArrowLeftRight, color: "blue" },
  { href: "/my-data", title: "My data & sharing", description: "Manage participation and saved submissions", Icon: Database, color: "violet" },
  { href: "/privacy", title: "Privacy notice", description: "See how your data is used", Icon: ShieldCheck, color: "green" },
] as const;

export default function SiteDataMenu() {
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = menu.current;
    if (!details) return;
    const closeOutside = (event: PointerEvent) => {
      if (details.open && !details.contains(event.target as Node)) details.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !details.open) return;
      details.open = false;
      details.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return <details ref={menu} className="welcome-settings">
    <summary>
      <Menu className="welcome-menu-icon" aria-hidden="true" />
      <span>Your data &amp; settings</span>
    </summary>
    <div className="welcome-settings-panel">
      <p className="welcome-settings-heading">Manage your data</p>
      {dataLinks.map(({ href, title, description, Icon, color }) => <a key={href} href={href}>
        <Icon className="welcome-settings-link-icon" data-color={color} aria-hidden="true" />
        <span className="welcome-settings-link-copy"><strong>{title}</strong><span>{description}</span></span>
        <ChevronRight className="welcome-settings-link-arrow" aria-hidden="true" />
      </a>)}
    </div>
  </details>;
}
