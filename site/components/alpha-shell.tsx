"use client";

import Link from "next/link";
import { BookA, ChartSpline, ChevronDown, ClipboardCheck, PanelLeftIcon, PanelTopIcon, Ruler } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode, Ref } from "react";
import { BLIND_EQ_COMPARE_PATH } from "@/lib/blind-eq";
import { buildLabel } from "@/lib/release-info";
import { isPersonalAreaSection, PERSONAL_AREA_TITLE } from "@/lib/personal-area";
import AccountAutoSync from "@/components/account-auto-sync";
import SiteTopbar from "@/components/site-topbar";
import { applyMotionPreference, readDisplayPreferences, subscribeDisplayPreferences } from "@/lib/display-preferences";

type Destination = "home" | "listen" | "compare" | "tune" | "ear" | "library" | "rankings" | "space" | "terms";
type Layout = "full" | "icons" | "hidden";
const PHONE_VIEWPORT = "(max-width: 600px)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

// Match the path commands across poses so the browser can morph one unbroken EQ line.
const tuningCurveRest = "M5 13C8 13 8 14 11 16S15 18 17 16S21 10 23 12S26 16 29 15";
const tuningCurveFlat = "M5 16C8 16 8 16 11 16S15 16 17 16S21 16 23 16S26 16 29 16";
const tuningCurveLoop = [
  tuningCurveRest,
  "M5 8C8 8 9 9 11 12S15 16 17 16S21 16 23 19S26 21 29 21", // Bass up, treble down.
  "M5 10C8 10 8 13 11 17S15 21 17 21S21 21 23 17S26 10 29 10", // Broad mid dip.
  "M5 21C8 21 9 19 11 17S15 15 17 16S21 15 23 11S26 8 29 8", // Bass down, treble up.
  "M5 11C8 11 8 21 11 21S15 11 17 11S21 21 23 21S26 11 29 11", // Two dips and a peak.
  tuningCurveFlat,
  tuningCurveFlat,
  tuningCurveRest,
].join(";");
const tuningCurveEasing = Array(7).fill(".42 0 .58 1").join(";");

function subscribePhoneViewport(onChange: () => void) {
  const viewport = window.matchMedia(PHONE_VIEWPORT);
  viewport.addEventListener("change", onChange);
  return () => viewport.removeEventListener("change", onChange);
}
const destinations: { id: Destination; label: string; href: string }[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "listen", label: "Listen", href: "/listen" },
  { id: "compare", label: "Compare EQs", href: BLIND_EQ_COMPARE_PATH },
  { id: "tune", label: "Personal EQ Tuning", href: "/preference-tuning" },
  { id: "ear", label: "Peak & Dip Finder", href: "/ear-tuning" },
  { id: "space", label: PERSONAL_AREA_TITLE, href: "/shootout?tab=profile" },
  { id: "rankings", label: "Research", href: "/shootout?tab=rankings" },
  { id: "library", label: "Music Library", href: "/music-library" },
  { id: "terms", label: "Glossary & Guides", href: "/glossary" },
];

const guides = [
  { label: "Glossary", href: "/glossary", icon: BookA },
  { label: "IEM Measurement Guide", href: "/glossary/iem-measurement", icon: Ruler },
  { label: "Audio Fact Checks", href: "/glossary/audio-facts", icon: ClipboardCheck },
  { label: "EQ Fitter Benchmark", href: "/glossary/eq-fitting", icon: ChartSpline },
];

function guideFor(path: string) {
  return guides.find(guide => path === guide.href || (guide.href !== "/glossary" && path.startsWith(guide.href + "/")));
}

function GuideNavigation({ path, layout, expandRail, follow, documentNavigation }: {
  path: string; layout: Layout; expandRail: () => void; documentNavigation: boolean; follow: () => void;
}) {
  const GuideLink = documentNavigation ? "a" : Link;
  const current = guideFor(path);
  const [open, setOpen] = useState(Boolean(current));
  const expanded = open && layout === "full";
  const toggle = useRef<HTMLButtonElement>(null);
  function close(event: KeyboardEvent) {
    if (event.key === "Escape" && expanded) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      toggle.current?.focus();
    }
  }
  return <div className="alpha-guide-group" onKeyDown={close}>
    <button type="button" ref={toggle} className="alpha-destination alpha-guide-toggle" data-destination="terms"
      title="Glossary & Guides" aria-label="Glossary & Guides" aria-expanded={expanded} aria-controls="alpha-guide-links"
      onClick={() => { if (layout === "icons") expandRail(); setOpen(!expanded); }}>
      <DestinationIcon kind="terms"/><span>Glossary &amp; Guides</span><ChevronDown className="alpha-guide-chevron" aria-hidden="true"/>
    </button>
    <ul id="alpha-guide-links" hidden={!expanded}>
      {guides.map(({ label, href, icon: Icon }) => <li key={href}>
        <GuideLink className={`alpha-destination alpha-guide-link${current?.href === href ? " is-current" : ""}`}
          href={href} {...(!documentNavigation && {prefetch: false})} aria-current={current?.href === href ? path === href ? "page" : "location" : undefined}
          onClick={follow}><Icon className="alpha-destination-icon" aria-hidden="true"/><span>{label}</span></GuideLink>
      </li>)}
    </ul>
  </div>;
}

function destinationFor(path: string, tab: string | null): Destination | null {
  if (path === "/glossary" || path.startsWith("/glossary/")) return "terms";
  if (path === "/listen") return "listen";
  if (path === BLIND_EQ_COMPARE_PATH) return "compare";
  if (path.startsWith("/shootout/personal")) return "listen";
  if (path.startsWith("/shootout")) return isPersonalAreaSection(tab) ? "space" : tab === "rankings" ? "rankings" : tab === "music" ? "library" : "listen";
  if (path.startsWith("/music-library")) return "library";
  if (path === "/ear-tuning") return "ear";
  if (path.includes("tuning")) return "tune";
  if (["/discover", "/community-preferences", "/curve-credits", "/listeners"].some(p => path.startsWith(p))) return "rankings";
  return path === "/" || path === "/home" ? "home" : null;
}

function DestinationIcon({ kind, tuneAnimation }: { kind: Destination; tuneAnimation?: Ref<SVGAnimationElement> }) {
  return <svg className="alpha-destination-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    {kind === "home" ? <>
      <path d="m5 15 11-9 11 9m-19-2.5V25h5.5v-7h5v7H24V12.5"/>
      <g className="alpha-home-orbit">
        <circle cx="16" cy="16" r="12.3" opacity=".36" strokeWidth=".9" strokeDasharray=".5 2.4"/>
        <g className="alpha-home-rocket">
          <g transform="translate(16 3.7)" strokeWidth="1">
            <path className="alpha-home-rocket-body" d="M-2.3-1.5C-.7-2.4 2.2-2.2 4.7 0 2.2 2.2-.7 2.4-2.3 1.5ZM-2.3-1.5l-1.6-1v5l1.6-1"/>
            <circle cx="1.5" cy="0" r=".65" fill="currentColor" stroke="none"/>
            <path d="M-5.5 0H-7.3" opacity=".8"/>
          </g>
        </g>
      </g>
    </> :
      kind === "listen" ? <><path d="M5 18v-3a11 11 0 0 1 22 0v3"/><rect x="3" y="15" width="5" height="11" rx="2"/><rect x="24" y="15" width="5" height="11" rx="2"/><path className="alpha-room-wave room-wave-one" d="M12 15v6"/><path className="alpha-room-wave" d="M16 12v12"/><path className="alpha-room-wave room-wave-three" d="M20 15v6"/></> :
      kind === "compare" ? <><rect x="3" y="7" width="11" height="18" rx="3"/><rect x="18" y="7" width="11" height="18" rx="3"/><path d="m6 19 2.5-6 2.5 6m-4.3-1.6h3.6M21.5 13h2.4a1.5 1.5 0 1 1 0 3h-2.4m0-3v6m0-3h2.7a1.5 1.5 0 1 1 0 3h-2.7"/></> :
      kind === "tune" ? <>
        <path d="M3 25h26M5 5v20" opacity=".65"/>
        <path className="alpha-tune-curve" d={tuningCurveRest}>
          <animate ref={tuneAnimation} attributeName="d" begin="indefinite" dur="6s" repeatCount="indefinite"
            values={tuningCurveLoop} keyTimes="0;.16;.32;.48;.64;.8;.88;1" calcMode="spline" keySplines={tuningCurveEasing}/>
        </path>
      </> :
      kind === "ear" ? <><path d="M4 17h4l3-6 4 13 4-16 3 9h6"/><circle className="alpha-ear-marker" cx="19" cy="8" r="1.6"/></> :
      kind === "library" ? <>
        <rect x="3" y="6" width="26" height="21" rx="3" />
        <g className="alpha-library-record">
          <circle cx="13" cy="16" r="7" />
          <circle cx="13" cy="16" r="1.3" />
          <path d="M9 14a4.5 4.5 0 0 1 3.4-2.4m1.2 8.8A4.5 4.5 0 0 0 17 18" opacity=".68" />
        </g>
        <circle cx="25" cy="11" r="1.4" />
        <path d="M25 12.5v6.7l-3.4 3.3M7 24h3" />
      </> :
      kind === "rankings" ? <><path d="M4 28h25" opacity=".5"/><rect className="alpha-research-bar" x="5" y="16" width="6" height="12" rx="1"/><rect className="alpha-research-bar" x="13" y="7" width="6" height="21" rx="1"/><rect className="alpha-research-bar" x="21" y="20" width="6" height="8" rx="1"/><path d="m14 3 2-2 2 2"/></> :
      kind === "terms" ? <><path d="M16 8C12 5 7 5 3 6v19c4-1 9-1 13 2 4-3 9-3 13-2V6c-4-1-9-1-13 2Zm0 0v19"/><path className="alpha-terms-lines" pathLength="1" d="m7 11 5 1m-5 4 5 1m8-5 5-1m-5 6 5-1" opacity=".65"/></> :
      <>
        <path d="M9 24a6.5 6.5 0 0 1-.7-13 8.4 8.4 0 0 1 16.2 1.4A5.9 5.9 0 0 1 23.6 24Z"/>
        <path className="alpha-collection-upload" d="M16 20v-7m-3 3 3-3 3 3"/>
      </>}
  </svg>;
}

function UtilityIcon({ kind }: { kind: "sync" | "keyboard" | "privacy" }) {
  return <svg className="alpha-utility-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    {kind === "sync" ? <>
      <path className="alpha-sync-arrow alpha-sync-out" d="M5 11h21m-5-5 5 5-5 5"/>
      <path className="alpha-sync-arrow alpha-sync-in" d="M27 21H6m5 5-5-5 5-5"/>
    </> : kind === "keyboard" ? <>
      <rect x="2.5" y="7" width="27" height="18" rx="2.5"/>
      <g fill="currentColor" stroke="none">
        {[6, 10, 14, 18, 22, 26, 8, 12, 16, 20, 24].map((x, i) =>
          <rect key={i} className="alpha-key" x={x - 1.25} y={i < 6 ? 11 : 15} width="2.5" height="2.5" rx=".45"
            style={{ animationDelay: `${i * .19}s` }}/>)}
        <rect className="alpha-key" x="10" y="19" width="12" height="2.5" rx=".5" style={{ animationDelay: "2.1s" }}/>
      </g>
    </> : <g className="alpha-privacy-scroll">
      <path d="M9 5h14a3 3 0 0 1 3 3v14M9 5a3 3 0 0 0-3 3v2h6V8a3 3 0 0 0-3-3Zm3 5v12a4 4 0 0 0 4 4h9a3 3 0 0 0 3-3v-1H16v1a3 3 0 0 1-1.5 2.6"/>
      <path className="alpha-scroll-writing" pathLength="1" d="M16 11h6m-6 3.5h6M16 18h4"/>
    </g>}
  </svg>;
}

const pageTitles: Record<string, string> = {
  "/about": "About Us",
  "/q5k4android": "Qudelix 5K Companion",
  "/account-sync": "Devices & Sync",
  "/community-preferences": "Community Preferences",
  "/curve-credits": "Curve Credits",
  "/listeners/yinyangeq": "Listening Journal",
  "/my-data": "My Data & Sharing",
  "/my-profile": "My Profile",
  "/owner-research": "Research Administration",
  "/participation": "Data Choices",
  "/privacy": "Privacy Notice",
  "/profile-access": "Profile Access",
  "/shootout/personal": "Personal Tournament",
  "/shortcuts": "Help & Hotkeys",
  "/software-licenses": "Software Licenses",
  "/terms": "Terms Of Use",
  "/test-history": "Private Test History",
  "/version": "About This Version",
};

type RouteQuery = { path: string; tab: string | null; mode: string | null };

function QueryDestination({ path, onChange }: { path: string; onChange: (query: RouteQuery) => void }) {
  const params = useSearchParams();
  const tab = params.get("tab");
  const mode = params.get("mode");
  useEffect(() => onChange({ path, tab, mode }), [path, tab, mode, onChange]);
  return null;
}

export default function AlphaShell({ children, helpControl, helpPanel, privateComparison = false }: {
  children: ReactNode;
  helpControl?: ReactNode;
  helpPanel?: ReactNode;
  privateComparison?: boolean;
}) {
  const pathname = usePathname() || "/";
  const [query, setQuery] = useState<RouteQuery | null>(null);
  const currentQuery = query?.path === pathname ? query : null;
  const active = destinationFor(pathname, currentQuery?.tab ?? null);
  const phone = useSyncExternalStore(subscribePhoneViewport, () => window.matchMedia(PHONE_VIEWPORT).matches, () => false);
  const [desktopLayout, setLayout] = useState<Layout>("full");
  const [phoneMenuOpen, setPhoneMenuOpen] = useState(false);
  const layout = phone ? (phoneMenuOpen ? "full" : "hidden") : desktopLayout;
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const menu = useRef<HTMLButtonElement>(null);
  const phoneToggle = useRef<HTMLButtonElement>(null);
  const tuneAnimation = useRef<SVGAnimationElement>(null);
  const keepSavedLayout = useRef(false);
  const listeningMode = pathname === "/shootout" && active === "listen" ? currentQuery?.mode : null;
  const modeTitle = listeningMode === "blind" ? "Blind Research" : listeningMode === "open" ? "Open Comparison" : null;
  const title = modeTitle ?? guideFor(pathname)?.label ?? pageTitles[pathname] ?? destinations.find(d => d.id === active)?.label ?? "YinYang EQ";

  useEffect(() => {
    const compact = window.matchMedia("(max-width: 800px)").matches && !window.matchMedia(PHONE_VIEWPORT).matches;
    try {
      const saved = localStorage.getItem("yinyang-navigation-layout");
      // A saved desktop preference should leave room for content on the first narrow view.
      keepSavedLayout.current = compact && saved === "full" && !guideFor(window.location.pathname);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Read browser-only layout preferences after hydration.
      setLayout(keepSavedLayout.current ? "icons" : saved === "full" || saved === "icons" || saved === "hidden" ? saved : compact ? "icons" : "full");
    }
    catch { setLayout(compact ? "icons" : "full"); }
    setLayoutLoaded(true);
  }, []);
  useEffect(() => {
    const systemMotion = window.matchMedia(REDUCED_MOTION);
    const stopIfReduced = () => {
      if (systemMotion.matches || document.documentElement.dataset.motion === "reduced") {
        tuneAnimation.current?.endElement?.();
      }
    };
    const updateMotion = (value: ReturnType<typeof readDisplayPreferences>) => {
      applyMotionPreference(value.motion);
      stopIfReduced();
    };
    updateMotion(readDisplayPreferences());
    systemMotion.addEventListener("change", stopIfReduced);
    const unsubscribe = subscribeDisplayPreferences(updateMotion);
    return () => {
      systemMotion.removeEventListener("change", stopIfReduced);
      unsubscribe();
    };
  }, []);
  useEffect(() => { if (layoutLoaded && keepSavedLayout.current) { keepSavedLayout.current = false; return; } if (layoutLoaded) { try { localStorage.setItem("yinyang-navigation-layout", desktopLayout); } catch {} } }, [desktopLayout, layoutLoaded]);
  useEffect(() => {
    const update = () => setModalOpen([...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')]
      .some(el => el.getClientRects().length > 0));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden", "open", "class", "style"] });
    return () => observer.disconnect();
  }, []);
  function closeExpandedNavigation(event: KeyboardEvent) {
    if (event.key !== "Escape" || layout !== "full") return;
    event.preventDefault();
    if (phone) {
      setPhoneMenuOpen(false);
      phoneToggle.current?.focus({ preventScroll: true });
    } else {
      setLayout("icons");
      menu.current?.focus({ preventScroll: true });
    }
  }

  const layoutNames = { full: "Full navigation", icons: "Icons only", hidden: "Navigation hidden" };
  const nextLayout = layout === "full" ? "icons" : layout === "icons" ? "hidden" : "full";
  const nextAction = layout === "full" ? "Show navigation icons only" : layout === "icons" ? "Hide navigation" : "Show sidebar";
  function followNavigation() {
    if (phone) setPhoneMenuOpen(false);
    window.scrollTo(0, 0);
  }
  function startTuningIcon(event: ReactPointerEvent<HTMLAnchorElement>) {
    if (event.pointerType !== "touch" && window.matchMedia("(hover: hover)").matches &&
      !window.matchMedia(REDUCED_MOTION).matches && document.documentElement.dataset.motion !== "reduced") {
      tuneAnimation.current?.beginElement?.();
    }
  }
  function stopTuningIcon() {
    tuneAnimation.current?.endElement?.();
  }
  // The private player owns its audio context for the lifetime of this document.
  const ShellLink = privateComparison ? "a" : Link;
  const shellLinkOptions = privateComparison ? {} : { prefetch: false as const };

  return <div className="alpha-app" data-alpha-layout={layout} data-phone-menu-open={phone && phoneMenuOpen || undefined} data-alpha-layout-ready={layoutLoaded || undefined} data-alpha-destination={active || "utility"}>
    <Suspense fallback={null}><QueryDestination path={pathname} onChange={setQuery}/></Suspense>
    <a className="alpha-skip" href="#alpha-content">Skip navigation</a>
    <div className="alpha-workspace">
      <div className="alpha-nav-header">
        <SiteTopbar title={title} inert={modalOpen} helpControl={helpControl} navigationControl={phone ? (
          <button
            ref={phoneToggle}
            className="alpha-sidebar-reopen"
            type="button"
            onClick={() => setPhoneMenuOpen(open => !open)}
            onKeyDown={closeExpandedNavigation}
            aria-controls="alpha-navigation"
            aria-expanded={phoneMenuOpen}
          >
            <PanelTopIcon aria-hidden="true" />
            <span>{phoneMenuOpen ? "Close menu" : "Open menu"}</span>
          </button>
        ) : (
          <button type="button" className="alpha-sidebar-reopen" ref={menu}
            title={nextAction} aria-label={nextAction} aria-controls="alpha-navigation"
            aria-expanded={layout !== "hidden"} aria-describedby="alpha-navigation-state"
            onClick={() => setLayout(nextLayout)}>
            <PanelLeftIcon aria-hidden="true" />
          </button>
        )} />
        <div className="alpha-navigation-frame" inert={modalOpen} onKeyDown={closeExpandedNavigation}>
        <aside id="alpha-navigation" className="alpha-navigation" aria-label="Main navigation" inert={layout === "hidden"} aria-hidden={layout === "hidden"}>
          {/* eslint-disable-next-line @next/next/no-img-element -- This small fixed local brand asset uses the existing static asset pipeline; preserve its CSS sizing. */}
          <ShellLink className="alpha-brand" href="/" {...shellLinkOptions} onClick={followNavigation}><img src={`/brand-mark.svg?v=${buildLabel}`} alt=""/><span>YinYang EQ<small>Find your sound.</small></span></ShellLink>

          <nav aria-label="Main destinations">{destinations.map(d => {
            if (d.id === "terms") return <GuideNavigation key={pathname} path={pathname} layout={layout} expandRail={() => setLayout("full")} follow={followNavigation} documentNavigation={privateComparison}/>;
            // Enter Finder with a document navigation so Back can warn about an unfinished ranked challenge.
            const documentNavigation = privateComparison || d.id === "ear" || d.id === "compare";
            const DestinationLink = documentNavigation ? "a" : Link;
            return <DestinationLink key={d.id} href={d.href} {...(!documentNavigation && { prefetch: false })} className={`alpha-destination${active === d.id ? " is-current" : ""}`} data-destination={d.id} aria-current={active === d.id ? "page" : undefined} title={d.label} onClick={followNavigation}
              onPointerEnter={d.id === "tune" ? startTuningIcon : undefined} onPointerLeave={d.id === "tune" ? stopTuningIcon : undefined}>
              <DestinationIcon kind={d.id} tuneAnimation={d.id === "tune" ? tuneAnimation : undefined}/><span>{d.label}</span>
            </DestinationLink>;
          })}</nav>
          <nav className="alpha-secondary-navigation" aria-label="Data and help">
            <ShellLink href="/account-sync" aria-current={pathname === "/account-sync" ? "page" : undefined} {...shellLinkOptions} title="Devices and Sync" onClick={followNavigation}><UtilityIcon kind="sync"/><span>Devices &amp; Sync</span></ShellLink>
            <ShellLink href="/shortcuts" aria-current={pathname === "/shortcuts" ? "page" : undefined} {...shellLinkOptions} title="Help and playback hotkeys" onClick={followNavigation}><UtilityIcon kind="keyboard"/><span>Help &amp; Hotkeys</span></ShellLink>
            <ShellLink href="/privacy" aria-current={pathname === "/privacy" ? "page" : undefined} {...shellLinkOptions} title="Privacy notice" onClick={followNavigation}><UtilityIcon kind="privacy"/><span>Privacy &amp; Data</span></ShellLink>
          </nav>
        </aside>
        <span id="alpha-navigation-state" hidden>{layoutNames[layout]}. Activate to cycle through full navigation, icons only and hidden navigation.</span>
        </div>
      </div>
      {!privateComparison && <div className="alpha-sync-region" inert={modalOpen}><AccountAutoSync /></div>}
      <div id="alpha-content" className="alpha-route-content" tabIndex={-1}>{helpPanel}{children}</div>
    </div>
  </div>;
}
