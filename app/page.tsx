"use client";

import "./welcome.css";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import WelcomeLandscape from "@/components/welcome-landscape";
import { useInvitesEnabled } from "@/components/invite-mode";
import AdminAccountLink from "@/components/admin-account-link";
import { readDisplayPreferences, subscribeDisplayPreferences, writeDisplayPreferences } from "@/lib/display-preferences";

function WelcomeLinkEffect({ kind }: { kind: "shootout" | "listening" | "tuning" }) {
 return <span className={`alpha-welcome-effect alpha-welcome-${kind}`} aria-hidden="true"><svg viewBox="0 0 40 24" fill="none">{kind === "listening" ? <><path d="M1 12c5-14 8 14 13 0s8 14 13 0 8 8 12-1"/><path d="M1 19c5-7 8 7 13 0s8 7 13 0 8 4 12-1"/></> : kind === "tuning" ? <path d="M1 14c8 0 8 4 15 4s4-14 11-14 4 12 12 12"/> : <><rect x="15" y="2" width="10" height="20" rx="2"/><circle cx="20" cy="7" r="2"/><circle cx="20" cy="16" r="3"/><path d="M10 12c-3 2-3 6 0 8M30 12c3 2 3 6 0 8M6 9c-5 4-5 10 0 14M34 9c5 4 5 10 0 14"/></>}</svg></span>;
}

export default function Welcome() {
  const invites = useInvitesEnabled();
  const [motion, setMotion] = useState(true);
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(true);
  const hero = useRef<HTMLElement>(null);
  const dataMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => setMotion(!reduced.matches && readDisplayPreferences().motion !== "reduced");
    preference();
    const unsubscribe = subscribeDisplayPreferences(preference);
    const visibility = () => setVisible(!document.hidden);
    const outside = (event: PointerEvent) => { if (dataMenu.current?.open && !dataMenu.current.contains(event.target as Node)) dataMenu.current.open = false; };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && dataMenu.current?.open) { dataMenu.current.open = false; dataMenu.current.querySelector("summary")?.focus(); } };
    const observer = new IntersectionObserver(entries => setInView(entries[0]?.isIntersecting ?? false));
    if (hero.current) observer.observe(hero.current);
    reduced.addEventListener("change", preference);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { unsubscribe(); observer.disconnect(); reduced.removeEventListener("change", preference); document.removeEventListener("visibilitychange", visibility); document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  return <main className="welcome-shell">
    <section ref={hero} className="welcome-hero" data-motion={motion && inView && visible} aria-labelledby="welcome-title">
      <WelcomeLandscape running={motion && inView && visible}/>
      <div className="welcome-shade" aria-hidden="true" />
      <header className="welcome-nav">
        {/* eslint-disable-next-line @next/next/no-img-element -- This small fixed local brand asset uses the existing static asset pipeline; preserve its CSS sizing. */}
        <a className="welcome-brand" href="/home" aria-label="YinYang EQ home"><img src="/brand-avatar-aligned.webp" alt="" /><span>YinYang <em>EQ</em></span></a>
        <nav aria-label="Welcome navigation">
          <a className="welcome-tool-link" data-effect="shootout" href="/listen"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12H3v7h4v-7H4Zm16 0h1v7h-4v-7h3Z" /></svg><span className="welcome-tool-label">Listen</span><WelcomeLinkEffect kind="shootout" /></a>
          <a className="welcome-tool-link" data-effect="listening" href="/music-library"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18V5l11-2v13M9 9l11-2" /><ellipse cx="6" cy="18" rx="3" ry="3" /><ellipse cx="17" cy="16" rx="3" ry="3" /></svg><span className="welcome-tool-label">Music library</span><WelcomeLinkEffect kind="listening" /></a>
          <a className="welcome-tool-link" data-effect="tuning" href="/preference-tuning"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 3v8m0 4v6M12 3v3m0 4v11M19 3v11m0 4v3M2 11h6M9 6h6m1 8h6" /></svg><span className="welcome-tool-label">Preference Tuning</span><WelcomeLinkEffect kind="tuning" /></a>
          <a className="welcome-tool-link" href="/ear-tuning"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 13h4l3-6 4 12 4-14 3 8h2"/></svg><span className="welcome-tool-label">Tune by ear</span></a>
        </nav>
        <details ref={dataMenu} className="welcome-settings"><summary><svg className="welcome-menu-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg><span>Your data & settings</span></summary><div className="welcome-settings-panel"><a href="/account-sync"><strong>Your account &amp; Sync</strong><span>Saved data, devices and account access</span></a><a href="/sync"><strong>Browser Sync</strong><span>Use your saved data on another browser</span></a><a href="/my-data"><strong>My data &amp; sharing</strong><span>Manage participation and saved submissions</span></a><a href="/privacy"><strong>Privacy notice</strong><span>How your data is used</span></a></div></details>
      </header>
      <div className="welcome-copy">
        <span className="welcome-kicker"><span aria-hidden="true" /> WELCOME TO YINYANG EQ</span>
        <h1 id="welcome-title">Find your sound.<br /><strong>Let your ears decide.</strong></h1>
        <p>Hear the same music with two sound settings. Choose the one you enjoy more. Find your personal favorites, and help explore what the community prefers.</p>
        <div className="welcome-actions"><a className="welcome-primary" href="/shootout/personal">{invites ? "Enter with invitation" : "Find a sound I like"} <span aria-hidden="true">→</span></a><a className="welcome-secondary" href="/ear-tuning">Tune by ear <span aria-hidden="true">→</span></a><a className="welcome-secondary" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a></div>
        <div className="welcome-sync-note"><p>Already using another browser?</p><a className="welcome-sync-button" href="/sync"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.36-6.36L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.36 6.36L3 16M8 16H3v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg><span>Sync this browser</span><span aria-hidden="true">↗</span></a></div>
        <p className="welcome-access-note">{invites ? "Invited testers" : "Listeners"} must agree to comparison-data collection before using the listening tools. Sharing details from your own music is optional.</p>
      </div>
      <div className="welcome-hero-foot"><span><i className="welcome-a" /> SOUND A</span><span className="welcome-foot-line" aria-hidden="true" /><span className="welcome-tagline">Two sounds. Your choice.</span><span className="welcome-foot-line" aria-hidden="true" /><span><i className="welcome-b" /> SOUND B</span><button type="button" className="welcome-motion-control" aria-pressed={motion} onClick={()=>{ const next = !motion; setMotion(next); writeDisplayPreferences({ motion: next ? "auto" : "reduced" }); }} title={motion ? "Pause the animated background" : "Resume the animated background"}>{motion ? <Pause size={13} aria-hidden="true"/> : <Play size={13} aria-hidden="true"/>}<span>{motion ? "Pause background" : "Resume background"}</span></button></div>
    </section>

    <section className="welcome-how" id="how-it-works" aria-labelledby="welcome-how-title">
      <div className="welcome-section-head"><span className="welcome-eyebrow">THREE STEPS</span><h2 id="welcome-how-title">A simple way to listen.</h2><p>Start with your headphones and a song. We’ll guide you through a short comparison.</p></div>
      <div className="welcome-steps">
        <article><div className="welcome-step-visual visual-headphones" aria-hidden="true"><svg viewBox="0 0 160 100" fill="none"><path d="M31 57V48a49 49 0 0 1 98 0v9" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/><rect x="24" y="55" width="24" height="32" rx="8" fill="currentColor"/><rect x="112" y="55" width="24" height="32" rx="8" fill="currentColor"/><path d="M55 76l10-9 10 7 11-18 10 8 9-15" stroke="#a6fff0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg><span>YOUR HEADPHONES</span></div><span className="welcome-step-number">01 / SETUP</span><h3>Choose your headphones</h3><p>Search for your headphone brand and choose your exact model. If it is listed, you do not need to measure anything yourself.</p></article>
        <article><div className="welcome-step-visual visual-compare" aria-hidden="true"><div><strong>A</strong><svg viewBox="0 0 120 32"><polyline points="0,17 8,17 13,8 19,26 25,12 31,19 42,19 48,6 53,27 60,15 68,18 79,18 83,9 90,24 97,15 104,18 120,18" /></svg></div><div><strong>B</strong><svg viewBox="0 0 120 32"><polyline points="0,17 9,17 14,11 20,23 27,15 34,18 43,18 49,7 54,26 62,14 68,19 78,19 84,11 90,23 98,15 105,18 120,18" /></svg></div><span>SAME SONG · TWO SOUND SETTINGS</span></div><span className="welcome-step-number">02 / LISTEN</span><h3>Switch between A and B</h3><p>Switch between A and B during the same part of a song. EQ changes the balance of bass, voices and higher sounds.</p></article>
        <article><div className="welcome-step-visual visual-vote" aria-hidden="true"><div><span>A</span><span>B</span><span>TIE</span></div><svg viewBox="0 0 160 46" fill="none"><path d="M5 29C28 18 39 33 57 22S89 8 109 20s28 2 46-8" stroke="#ff526f" strokeWidth="3"/><path d="M5 36C27 31 37 16 57 30S89 38 109 26s28-17 46-10" stroke="#48b8ff" strokeWidth="3"/></svg><span>YOUR PREFERENCE · YOUR CHOICE</span></div><span className="welcome-step-number">03 / DECIDE</span><h3>Pick A, B, or a tie</h3><p>Choose the sound you enjoy more, or pick a tie if you have no preference. Keep listening to build a shortlist of your favorites.</p></article>
      </div>
      <div className="welcome-last-call"><div><span className="welcome-eyebrow">{invites ? "INVITED LISTENERS" : "LISTENERS"}</span><h2>Try your first comparison</h2>{invites && <p>Have your invitation code handy.</p>}</div><a className="welcome-primary" href="/listen">Choose how to listen <span aria-hidden="true">→</span></a></div>
    </section>

    <footer className="welcome-footer"><span>YinYang EQ · by Yin Yang EQ Lab</span><span>Built for curious ears. Eligible Blind Research votes shape the research rankings.</span><div className="welcome-footer-links"><a href="/listeners/yinyangeq">YinYangEQ’s published listening history</a><a href="/privacy">Privacy notice</a><a href="/my-data">My data</a><a href="/sync">Browser Sync</a><a href="https://github.com/yinyangeqlab/yinyang-eq-lab" target="_blank" rel="noopener noreferrer">Source code on GitHub</a><a href="https://github.com/yinyangeqlab/yinyang-eq-lab/issues/new" target="_blank" rel="noopener noreferrer">Report a bug or contact us on GitHub</a><a href="mailto:yinyangeqlab@gmail.com">yinyangeqlab@gmail.com</a></div><AdminAccountLink placement="welcome"/></footer>
  </main>;
}
