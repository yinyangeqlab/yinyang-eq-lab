"use client";

import Link from "next/link";
import { PanelLeftIcon, PanelTopIcon } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent as ReactPointerEvent, ReactNode, Ref } from "react";
import { buildLabel } from "@/lib/release-info";
import { isPersonalAreaSection, PERSONAL_AREA_TITLE } from "@/lib/personal-area";
import AccountAutoSync from "@/components/account-auto-sync";
import SiteTopbar from "@/components/site-topbar";
import { applyMotionPreference, readDisplayPreferences, subscribeDisplayPreferences } from "@/lib/display-preferences";

type Destination = "home" | "listen" | "tune" | "ear" | "library" | "rankings" | "space" | "terms";
type Layout = "full" | "icons" | "hidden";
const SIDEBAR_EDGE_DISTANCE = 48;
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
  { id: "tune", label: "Preference Tuning", href: "/preference-tuning" },
  { id: "ear", label: "Peak & Dip Finder", href: "/ear-tuning" },
  { id: "space", label: PERSONAL_AREA_TITLE, href: "/shootout?tab=profile" },
  { id: "rankings", label: "Research", href: "/shootout?tab=rankings" },
  { id: "library", label: "Music library", href: "/music-library" },
  { id: "terms", label: "Terms & definitions", href: "/glossary" },
];

function destinationFor(path: string, tab: string | null): Destination | null {
  if (path === "/glossary" || path === "/glossary/") return "terms";
  if (path === "/listen") return "listen";
  if (path.startsWith("/shootout/personal")) return "listen";
  if (path.startsWith("/shootout")) return isPersonalAreaSection(tab) ? "space" : tab === "rankings" ? "rankings" : tab === "music" ? "library" : "listen";
  if (path.startsWith("/music-library")) return "library";
  if (path === "/ear-tuning") return "ear";
  if (path.includes("tuning")) return "tune";
  if (["/discover", "/community-preferences", "/curve-credits", "/listeners"].some(p => path.startsWith(p))) return "rankings";
  return path === "/" || path === "/home" ? "home" : null;
}

function DestinationIcon({ kind, tuneAnimation }: { kind: Destination; tuneAnimation?: Ref<SVGAnimationElement> }) {
  const paperClip = useId();
  return <svg className="alpha-destination-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    {kind === "home" ? <>
      <path d="m7 15 9-8 9 8M10 13v12h4v-7h4v7h4V13"/>
      <g className="alpha-home-orbit">
        <circle cx="16" cy="16" r="13.5" opacity=".28" strokeDasharray="1 3"/>
        <g className="alpha-home-rocket" strokeWidth="1">
          <path d="M13 2.4c2.1-1.6 4.7-1.6 6.6-.4-1.2 1.8-3.4 2.8-6 2.2zM13.3 2.4l-1-.6-1.6 1m3 1.2-.9 1.4-1.8-.5"/>
          <circle cx="16.7" cy="2.6" r=".55" fill="currentColor" stroke="none"/>
          <path d="m10.8 3.7-1.7.5" opacity=".65"/>
        </g>
      </g>
    </> :
      kind === "listen" ? <><path d="M5 18v-3a11 11 0 0 1 22 0v3"/><rect x="3" y="15" width="5" height="11" rx="2"/><rect x="24" y="15" width="5" height="11" rx="2"/><path className="alpha-room-wave room-wave-one" d="M12 15v6"/><path className="alpha-room-wave" d="M16 12v12"/><path className="alpha-room-wave room-wave-three" d="M20 15v6"/></> :
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
        <clipPath id={paperClip}><path d="M5 1h23v14H5z"/></clipPath>
        <path d="M3 15V9a2 2 0 0 1 2-2h5l3 3"/>
        <g clipPath={`url(#${paperClip})`} strokeWidth="1.2">
          <path className="alpha-folder-paper alpha-folder-paper-back" d="M13 15V7h12v8m-9-5h6m-6 2.5h6" opacity=".65"/>
          <path className="alpha-folder-paper" d="M8 16v-5h12v5m-9-2.5h6"/>
        </g>
        <path d="M3 15h26v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <path d="m12 21 3 3 5-5"/>
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

export default function AlphaShell({ children }: { children: ReactNode }) {
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
  const peek = useRef<HTMLButtonElement>(null);
  const phoneToggle = useRef<HTMLButtonElement>(null);
  const tuneAnimation = useRef<SVGAnimationElement>(null);
  const restoreToggleFocus = useRef(false);
  const keepSavedLayout = useRef(false);
  const listeningMode = pathname === "/shootout" && active === "listen" ? currentQuery?.mode : null;
  const modeTitle = listeningMode === "blind" ? "Blind Research" : listeningMode === "open" ? "Open Comparison" : null;
  const title = modeTitle ?? pageTitles[pathname] ?? destinations.find(d => d.id === active)?.label ?? "YinYang EQ";

  useEffect(() => {
    const compact = window.matchMedia("(max-width: 800px)").matches && !window.matchMedia(PHONE_VIEWPORT).matches;
    try {
      const saved = localStorage.getItem("yinyang-navigation-layout");
      // A saved desktop preference should leave room for content on the first narrow view.
      keepSavedLayout.current = compact && saved === "full";
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
  useEffect(() => {
    const edge = peek.current;
    if (layout !== "hidden" || modalOpen || !edge) return;

    const retract = () => edge.removeAttribute("data-pointer-near");
    const onPointerMove = (event: PointerEvent) => {
      edge.toggleAttribute("data-pointer-near", event.pointerType === "mouse" &&
        event.clientX >= 0 && event.clientX < SIDEBAR_EDGE_DISTANCE);
    };
    const onPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) retract();
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true, capture: true });
    window.addEventListener("pointerout", onPointerOut, true);
    window.addEventListener("blur", retract);
    return () => {
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerout", onPointerOut, true);
      window.removeEventListener("blur", retract);
      retract();
    };
  }, [layout, modalOpen, phone]);
  useLayoutEffect(() => {
    if (!restoreToggleFocus.current) return;
    restoreToggleFocus.current = false;
    (layout === "hidden" ? peek.current : menu.current)?.focus({ preventScroll: true });
  }, [layout]);
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
  function cycleLayout(event: MouseEvent<HTMLButtonElement>) {
    if (layout === "hidden" || nextLayout === "hidden") {
      restoreToggleFocus.current = event.currentTarget.matches(":focus-visible");
    }
    setLayout(nextLayout);
  }
  const navigationToggle = (
    <button ref={menu} className="alpha-sidebar-divider" type="button" onClick={cycleLayout} aria-label={nextAction} aria-controls="alpha-navigation" aria-expanded="true" aria-describedby="alpha-navigation-state" data-next-layout={nextLayout}>
      <span className="alpha-divider-grip" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 6.5 9 12l5.5 5.5"/></svg>
      </span>
    </button>
  );
  const reopenIcon = (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9.5 6.5 5.5 5.5-5.5 5.5"/>
    </svg>
  );

  return <div className="alpha-app" data-alpha-layout={layout} data-phone-menu-open={phone && phoneMenuOpen || undefined} data-alpha-layout-ready={layoutLoaded || undefined} data-alpha-destination={active || "utility"}>
    <Suspense fallback={null}><QueryDestination path={pathname} onChange={setQuery}/></Suspense>
    <a className="alpha-skip" href="#alpha-content">Skip navigation</a>
    {!phone && layout === "hidden" && (
      <button
        ref={peek}
        className="alpha-sidebar-divider alpha-sidebar-peek"
        type="button"
        aria-label="Show sidebar from edge"
        aria-controls="alpha-navigation"
        aria-expanded={false}
        inert={modalOpen}
        onClick={cycleLayout}
      >
        <span className="alpha-divider-grip" aria-hidden="true">{reopenIcon}</span>
      </button>
    )}
    <div className="alpha-workspace">
      <SiteTopbar title={title} inert={modalOpen} navigationControl={(phone || layout === "hidden") && (
        <button
          ref={phone ? phoneToggle : undefined}
          className="alpha-sidebar-reopen"
          type="button"
          onClick={phone ? () => setPhoneMenuOpen(open => !open) : cycleLayout}
          onKeyDown={phone ? closeExpandedNavigation : undefined}
          aria-controls="alpha-navigation"
          aria-expanded={phone && phoneMenuOpen}
        >
          {phone ? <PanelTopIcon aria-hidden="true" /> : <PanelLeftIcon aria-hidden="true" />}
          <span>{phone ? (phoneMenuOpen ? "Close menu" : "Open menu") : "Open sidebar"}</span>
        </button>
      )} />
      <div className="alpha-navigation-frame" inert={modalOpen} onKeyDown={closeExpandedNavigation}>
        {!phone && layout !== "hidden" && navigationToggle}
        <aside id="alpha-navigation" className="alpha-navigation" aria-label="Main navigation" inert={layout === "hidden"} aria-hidden={layout === "hidden"}>
          {/* eslint-disable-next-line @next/next/no-img-element -- This small fixed local brand asset uses the existing static asset pipeline; preserve its CSS sizing. */}
          <Link className="alpha-brand" href="/" prefetch={false} aria-label="YinYang EQ home" onClick={followNavigation}><img src={`/brand-mark.svg?v=${buildLabel}`} alt=""/><span>YinYang EQ<small>Find your sound.</small></span></Link>

          <nav aria-label="Main destinations">{destinations.map(d => {
            // Enter Finder with a document navigation so Back can warn about an unfinished ranked challenge.
            const DestinationLink = d.id === "ear" ? "a" : Link;
            return <DestinationLink key={d.id} href={d.href} {...(d.id !== "ear" && { prefetch: false })} className={`alpha-destination${active === d.id ? " is-current" : ""}`} data-destination={d.id} aria-current={active === d.id ? "page" : undefined} title={d.label} onClick={followNavigation}
              onPointerEnter={d.id === "tune" ? startTuningIcon : undefined} onPointerLeave={d.id === "tune" ? stopTuningIcon : undefined}>
              <DestinationIcon kind={d.id} tuneAnimation={d.id === "tune" ? tuneAnimation : undefined}/><span>{d.label}</span>
            </DestinationLink>;
          })}</nav>
          <nav className="alpha-secondary-navigation" aria-label="Data and help">
            <Link href="/account-sync" aria-current={pathname === "/account-sync" ? "page" : undefined} prefetch={false} title="Devices and Sync" onClick={followNavigation}><UtilityIcon kind="sync"/><span>Devices &amp; Sync</span></Link>
            <Link href="/shortcuts" aria-current={pathname === "/shortcuts" ? "page" : undefined} prefetch={false} title="Help and playback hotkeys" onClick={followNavigation}><UtilityIcon kind="keyboard"/><span>Help &amp; hotkeys</span></Link>
            <Link href="/privacy" aria-current={pathname === "/privacy" ? "page" : undefined} prefetch={false} title="Privacy notice" onClick={followNavigation}><UtilityIcon kind="privacy"/><span>Privacy &amp; data</span></Link>
          </nav>
        </aside>
        <span id="alpha-navigation-state" hidden>{layoutNames[layout]}. Activate to cycle through full navigation, icons only and hidden navigation.</span>
      </div>
      <div className="alpha-sync-region" inert={modalOpen}><AccountAutoSync /></div>
      <div id="alpha-content" className="alpha-route-content" tabIndex={-1}>{children}</div>
    </div>
  </div>;
}
