"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { releaseInfo } from "@/lib/release-info";
import AccountAutoSync from "@/components/account-auto-sync";
import { applyMotionPreference, readDisplayPreferences, subscribeDisplayPreferences } from "@/lib/display-preferences";

type Destination = "home" | "listen" | "tune" | "explore" | "library" | "results" | "rankings" | "space";
type Layout = "full" | "icons" | "hidden";
const destinations: { id: Destination; label: string; href: string }[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "listen", label: "Listen", href: "/shootout?tab=shootout" },
  { id: "tune", label: "Tune", href: "/preference-tuning" },
  { id: "results", label: "My results", href: "/shootout?tab=profile" },
  { id: "rankings", label: "Rankings", href: "/shootout?tab=rankings" },
  { id: "library", label: "Music library", href: "/music-library" },
  { id: "explore", label: "Discover", href: "/discover" },
  { id: "space", label: "My space", href: "/shootout?tab=measurements" },
];

function destinationFor(path: string, tab: string | null): Destination | null {
  if (path.startsWith("/shootout/personal")) return "listen";
  if (path.startsWith("/shootout")) return tab === "profile" ? "results" : tab === "rankings" ? "rankings" : tab === "music" ? "library" : tab === "upload" || tab === "measurements" ? "space" : "listen";
  if (path.startsWith("/music-library")) return "library";
  if (path.includes("tuning")) return "tune";
  if (["/discover", "/community-preferences", "/curve-credits", "/listeners"].some(p => path.startsWith(p))) return "explore";
  return path === "/" || path === "/home" ? "home" : null;
}

function DestinationIcon({ kind }: { kind: Destination }) {
  return <svg className="alpha-destination-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    {kind === "home" ? <><path d="m5 15 11-9 11 9M8 13v13h6v-8h4v8h6V13"/><circle className="alpha-home-orbit" cx="16" cy="16" r="14"/></> :
      kind === "listen" ? <><path d="M5 18v-3a11 11 0 0 1 22 0v3"/><rect x="3" y="15" width="5" height="11" rx="2"/><rect x="24" y="15" width="5" height="11" rx="2"/><path className="alpha-room-wave room-wave-one" d="M12 15v6"/><path className="alpha-room-wave" d="M16 12v12"/><path className="alpha-room-wave room-wave-three" d="M20 15v6"/></> :
      kind === "tune" ? <><path d="M3 25h26M6 5v20"/><path className="alpha-tune-curve" d="M3 17c6 0 6 3 10 3s4-13 8-13 3 10 8 10"/></> :
      kind === "library" ? <><path d="M4 8v19M8 5v22" opacity=".5"/><rect x="12" y="3" width="17" height="25" rx="2"/><g className="alpha-explore-disc"><circle cx="20.5" cy="12" r="5"/><circle cx="20.5" cy="12" r="1"/><path d="M17.3 12a3.2 3.2 0 0 1 3.2-3.2M23.7 12a3.2 3.2 0 0 1-3.2 3.2" opacity=".45"/></g><path className="alpha-explore-wave wave-one" d="M15 23h2l1.5-3 2 5 1.5-3h3"/></> :
      kind === "explore" ? <><circle cx="16" cy="16" r="12"/><path d="M16 2v3m0 22v3M2 16h3m22 0h3" opacity=".4"/><g className="alpha-discover-needle"><path d="m21 10-3 9-7 3 3-9Z"/><path d="m14 13 4 6"/></g></> :
      kind === "results" ? <><path d="M8 3h12l5 5v21H8Z"/><path d="M20 3v6h5M12 14h9M12 19h9" opacity=".6"/><path d="m12 24 2 2 5-5"/></> :
      kind === "rankings" ? <><path d="M4 28h25" opacity=".5"/><rect x="5" y="16" width="6" height="12" rx="1"/><rect x="13" y="7" width="6" height="21" rx="1"/><rect x="21" y="20" width="6" height="8" rx="1"/><path d="m14 3 2-2 2 2"/></> :
      <><circle cx="16" cy="16" r="3"/><ellipse className="alpha-space-orbit orbit-one" cx="16" cy="16" rx="14" ry="7" transform="rotate(-35 16 16)"/><ellipse className="alpha-space-orbit orbit-two" cx="16" cy="16" rx="14" ry="7" transform="rotate(35 16 16)"/><circle className="alpha-space-satellite" cx="26" cy="8" r="2"/></>}
  </svg>;
}

function QueryDestination({path,onChange}:{path:string;onChange:(value:Destination | null)=>void}) {
  const params = useSearchParams();
  const tab = params.get("tab");
  useEffect(()=>onChange(destinationFor(path,tab)),[path,tab,onChange]);
  return null;
}

export default function AlphaShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const [active,setActive] = useState<Destination | null>(destinationFor(pathname,null));
  const [layout, setLayout] = useState<Layout>("full");
  const [narrow, setNarrow] = useState(false);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const mobileOpen = narrow && layout === "full";
  const [modalOpen, setModalOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLButtonElement>(null);
  const restoreMenuFocus = useRef(false);
  const keepSavedLayout = useRef(false);
  const utilityTitles: Record<string,string> = {"/shortcuts":"Shortcuts & help","/version":"About this version","/privacy":"Privacy notice","/my-data":"My data & sharing","/participation":"Data choices","/account-sync":"Devices & Sync","/my-profile":"My profile","/profile-access":"Profile access","/test-history":"Private test history","/owner-research":"Research administration"};
  const title = destinations.find(d => d.id === active)?.label || utilityTitles[pathname] || "YinYang EQ";

  useEffect(() => {
    const compact = window.matchMedia("(max-width: 800px)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate the browser media-query state after SSR and subscribe to changes.
    setNarrow(compact.matches);
    try {
      const saved = localStorage.getItem("yinyang-navigation-layout");
      // A saved desktop "full" would open the mobile modal drawer over every narrow page load; start at icons without overwriting it.
      keepSavedLayout.current = compact.matches && saved === "full";
      setLayout(keepSavedLayout.current ? "icons" : saved === "full" || saved === "icons" || saved === "hidden" ? saved : compact.matches ? "icons" : "full");
    }
    catch { setLayout(compact.matches ? "icons" : "full"); }
    setLayoutLoaded(true);
    const resize = () => setNarrow(compact.matches);
    compact.addEventListener("change", resize);
    return () => compact.removeEventListener("change", resize);
  }, []);
  useEffect(() => { applyMotionPreference(readDisplayPreferences().motion); return subscribeDisplayPreferences(value => applyMotionPreference(value.motion)); }, []);
  useEffect(() => { if (layoutLoaded && keepSavedLayout.current) { keepSavedLayout.current = false; return; } if (layoutLoaded) { try { localStorage.setItem("yinyang-navigation-layout", layout); } catch {} } }, [layout, layoutLoaded]);
  useEffect(() => {
    const update = () => setModalOpen([...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')]
      .some(el => !el.closest(".alpha-navigation-frame") && el.getClientRects().length > 0));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden", "open", "class", "style"] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen || modalOpen) return;
    const frame = requestAnimationFrame(() => menu.current?.focus({ preventScroll: true }));
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeMenu(); }
      if (event.key !== "Tab") return;
      const focusable = [...(panel.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),summary') || [])].filter(el => el.getClientRects().length && !el.closest("[inert]"));
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && (document.activeElement === first || !panel.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keys, true);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", keys, true); };
  }, [mobileOpen, modalOpen]);

  useEffect(() => {
    if (mobileOpen || !restoreMenuFocus.current) return;
    restoreMenuFocus.current = false;
    const frame = requestAnimationFrame(() => menu.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [mobileOpen]);

  function closeMenu() { restoreMenuFocus.current = true; setLayout("icons"); }
  const layoutNames = { full: "Full navigation", icons: "Icons only", hidden: "Navigation hidden" };
  const nextLayout = layout === "full" ? "icons" : layout === "icons" ? "hidden" : "full";
  const nextAction = layout === "full" ? "Show navigation icons only" : layout === "icons" ? "Hide navigation" : "Show full navigation";
  function cycleLayout() { setLayout(current => current === "full" ? "icons" : current === "icons" ? "hidden" : "full"); }

  return <div className="alpha-app" data-alpha-layout={layout} data-alpha-destination={active || "utility"}>
    <Suspense fallback={null}><QueryDestination path={pathname} onChange={setActive}/></Suspense>
    <a className="alpha-skip" href="#alpha-content">Skip navigation</a>
    <button className={`alpha-menu-backdrop${mobileOpen ? " is-open" : ""}`} type="button" aria-label="Close navigation" onClick={closeMenu} tabIndex={-1} inert={!mobileOpen} aria-hidden={!mobileOpen}/>
    <div ref={panel} className="alpha-navigation-frame" role={mobileOpen ? "dialog" : undefined} aria-label={mobileOpen ? "Main navigation" : undefined} aria-modal={mobileOpen ? true : undefined} inert={modalOpen}>
    <aside id="alpha-navigation" className={`alpha-navigation${mobileOpen ? " alpha-mobile-open" : ""}`} aria-label="Main navigation" inert={layout === "hidden"} aria-hidden={layout === "hidden"}>
      {/* eslint-disable-next-line @next/next/no-img-element -- This small fixed local brand asset uses the existing static asset pipeline; preserve its CSS sizing. */}
      <Link className="alpha-brand" href="/" prefetch={false} aria-label="YinYang EQ home"><img src="/brand-avatar-aligned.webp" alt=""/><span>YinYang EQ<small>LET YOUR EARS DECIDE</small></span></Link>

      <nav aria-label="Main destinations">{destinations.map(d => <Link key={d.id} href={d.href} prefetch={false} className={`alpha-destination${active === d.id ? " is-current" : ""}`} data-destination={d.id} aria-current={active === d.id ? "page" : undefined} title={d.label} onClick={() => { if (narrow) setLayout("icons"); window.scrollTo(0,0); }}><DestinationIcon kind={d.id}/><span>{d.label}</span></Link>)}</nav>
      <nav className="alpha-secondary-navigation" aria-label="Data and help"><Link href="/account-sync" aria-current={pathname === "/account-sync" ? "page" : undefined} prefetch={false} title="Devices and Sync"><span aria-hidden="true">⇄</span><span>Devices &amp; Sync</span></Link><Link href="/shortcuts" aria-current={pathname === "/shortcuts" ? "page" : undefined} prefetch={false} title="Keyboard shortcuts"><span aria-hidden="true">⌨</span><span>Shortcuts &amp; help</span></Link><Link href="/privacy" aria-current={pathname === "/privacy" ? "page" : undefined} prefetch={false} title="Privacy notice"><span aria-hidden="true">◇</span><span>Privacy &amp; data</span></Link></nav>
    </aside>
    <button ref={menu} className="alpha-sidebar-divider" type="button" onClick={cycleLayout} aria-label={nextAction} aria-controls="alpha-navigation" aria-expanded={layout !== "hidden"} aria-describedby="alpha-navigation-state" title={`${nextAction} · Full → Icons → Hidden`} data-next-layout={nextLayout}>
      <span className="alpha-divider-grip" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6"/></svg></span>
    </button>
    <span id="alpha-navigation-state" hidden>{layoutNames[layout]}. Activate to cycle through full navigation, icons only and hidden navigation.</span>
    </div>
    <div className="alpha-workspace">
      <header className="alpha-topbar" inert={modalOpen || mobileOpen}>
        <div className="alpha-topbar-start"><span className="alpha-breadcrumb">{title}<span>YinYang EQ</span></span></div>
        <Link className="alpha-version" href="/version" prefetch={false} aria-label={`About version ${releaseInfo.version}, ${releaseInfo.channel}`} title="About this version, changes and licensing">{releaseInfo.version}<span>{releaseInfo.published ? "BETA" : "LOCAL"}</span></Link>
      </header>
      <div className="alpha-sync-region" inert={modalOpen || mobileOpen}><AccountAutoSync /></div>
      <div id="alpha-content" className="alpha-route-content" tabIndex={-1} inert={mobileOpen}>{children}</div>
    </div>
  </div>;
}
