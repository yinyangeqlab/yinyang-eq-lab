"use client";

import "./welcome.css";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import ModeIllustration from "@/components/mode-illustration";
import { useInvitesEnabled } from "@/components/invite-mode";
import AdminAccountLink from "@/components/admin-account-link";
import { readDisplayPreferences, subscribeDisplayPreferences, writeDisplayPreferences } from "@/lib/display-preferences";

function WelcomeLinkEffect({ kind }: { kind: "shootout" | "listening" | "tuning" }) {
 return <span className={`alpha-welcome-effect alpha-welcome-${kind}`} aria-hidden="true"><svg viewBox="0 0 40 24" fill="none">{kind === "listening" ? <><path d="M1 12c5-14 8 14 13 0s8 14 13 0 8 8 12-1"/><path d="M1 19c5-7 8 7 13 0s8 7 13 0 8 4 12-1"/></> : kind === "tuning" ? <path d="M1 14c8 0 8 4 15 4s4-14 11-14 4 12 12 12"/> : <><rect x="15" y="2" width="10" height="20" rx="2"/><circle cx="20" cy="7" r="2"/><circle cx="20" cy="16" r="3"/><path d="M10 12c-3 2-3 6 0 8M30 12c3 2 3 6 0 8M6 9c-5 4-5 10 0 14M34 9c5 4 5 10 0 14"/></>}</svg></span>;
}

function WelcomeModeArt({kind}:{kind:"personal"|"blind"|"open"}){
 return <div className={`alpha-mode-art alpha-mode-${kind}`} aria-hidden="true"><ModeIllustration kind={kind}/></div>;
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
      <picture className="welcome-art" aria-hidden="true"><source media="(min-width: 761px)" srcSet="/brand-landscape.webp" /><img src="/brand-amoled-aligned.webp" alt="" /></picture>
      <svg className="welcome-sound-field" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
        <path className="welcome-signal signal-a" pathLength="100" d="M-80 560C100 660 170 410 330 530S540 680 710 570 1020 680 1280 620"/>
        <path className="welcome-signal signal-b" pathLength="100" d="M1280 430C1110 260 1070 660 890 550S620 500 470 650 140 600-80 680"/>
        <path className="welcome-signal signal-center" pathLength="100" d="M-80 720C180 610 200 750 450 700S750 520 930 650 1130 700 1280 630"/>
      </svg>
      <div className="welcome-shade" aria-hidden="true" />
      <header className="welcome-nav">
        <a className="welcome-brand" href="/home" aria-label="YinYang EQ home"><img src="/brand-avatar-aligned.webp" alt="" /><span>YinYang <em>EQ</em></span></a>
        <nav aria-label="Welcome navigation">
          <a className="welcome-tool-link" data-effect="shootout" href="/shootout"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12H3v7h4v-7H4Zm16 0h1v7h-4v-7h3Z" /></svg><span className="welcome-tool-label">Listen</span><WelcomeLinkEffect kind="shootout" /></a>
          <a className="welcome-tool-link" data-effect="listening" href="/music-library"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18V5l11-2v13M9 9l11-2" /><ellipse cx="6" cy="18" rx="3" ry="3" /><ellipse cx="17" cy="16" rx="3" ry="3" /></svg><span className="welcome-tool-label">Music library</span><WelcomeLinkEffect kind="listening" /></a>
          <a className="welcome-tool-link" data-effect="tuning" href="/preference-tuning"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 3v8m0 4v6M12 3v3m0 4v11M19 3v11m0 4v3M2 11h6M9 6h6m1 8h6" /></svg><span className="welcome-tool-label">Preference Tuning</span><WelcomeLinkEffect kind="tuning" /></a>
        </nav>
        <details ref={dataMenu} className="welcome-settings"><summary><svg className="welcome-menu-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg><span>Your data control</span></summary><div className="welcome-settings-panel"><a href="/sync"><strong>Sync browsers</strong><span>Use your saved data on another browser</span></a><a href="/my-data"><strong>My data &amp; sharing</strong><span>Manage participation and saved submissions</span></a><a href="/privacy"><strong>Privacy notice</strong><span>How your data is used</span></a></div></details>
      </header>
      <div className="welcome-copy">
        <span className="welcome-kicker"><span aria-hidden="true" /> WELCOME TO YINYANG EQ</span>
        <h1 id="welcome-title">Find your sound.<br /><strong>Let your ears decide.</strong></h1>
        <p>Hear two headphone EQ targets side by side. Find your personal favorites, and help explore what the community prefers.</p>
        <div className="welcome-actions"><a className="welcome-primary" href="/shootout/personal">{invites ? "Enter with invitation" : "Find my target"} <span aria-hidden="true">→</span></a><a className="welcome-secondary" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a></div>
        <div className="welcome-sync-note"><p>Already using another browser?</p><a className="welcome-sync-button" href="/sync"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.36-6.36L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.36 6.36L3 16M8 16H3v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg><span>Sync browsers</span><span aria-hidden="true">↗</span></a></div>
        <p className="welcome-access-note">{invites ? "Invited testers" : "Listeners"} must agree to comparison-data collection before using the listening tools. Sharing details from your own music is optional.</p>
      </div>
      <div className="welcome-hero-foot"><span><i className="welcome-a" /> TARGET A</span><span className="welcome-foot-line" aria-hidden="true" /><span className="welcome-tagline">Two curves. Your choice.</span><span className="welcome-foot-line" aria-hidden="true" /><span><i className="welcome-b" /> TARGET B</span><button type="button" className="welcome-motion-control" aria-pressed={motion} onClick={()=>{ const next = !motion; setMotion(next); writeDisplayPreferences({ motion: next ? "auto" : "reduced" }); }} title="Pause or resume decorative motion across the site; no audio plays">{motion ? <Pause size={13} aria-hidden="true"/> : <Play size={13} aria-hidden="true"/>}<span>{motion ? "Pause motion" : "Play motion"}</span></button></div>
    </section>

    <section className="welcome-fair" aria-labelledby="welcome-fair-title"><h2 id="welcome-fair-title">How the comparison stays fair</h2><ul>
      <li><strong>Same loudness</strong><span>Blind Research locks tracks to −16 LUFS. Personal and Open Comparison let you choose a loudness target, so level does not decide the vote.</span></li>
      <li><strong>Same passage</strong><span>Controlled Blind Research rounds require hearing the shared passage on both targets before you can vote.</span></li>
      <li><strong>Hidden names</strong><span>Personal keeps target names hidden while it narrows your shortlist; Blind Research reveals them after you choose.</span></li>
      <li><strong>Your headphones</strong><span>Targets are applied through your own measurement, with optional left/right channel matching.</span></li>
      <li><strong>Honest results</strong><span>Rankings are exploratory preference evidence, not a skill score or a measure of sound quality.</span></li>
    </ul></section>

    <section className="welcome-modes" aria-labelledby="welcome-modes-title"><div className="welcome-section-head"><span className="welcome-eyebrow">CHOOSE YOUR TOURNAMENT</span><h2 id="welcome-modes-title">Find a favorite. Help the research.</h2><p>Start with Personal to find what suits your ears. Choose Blind Research to help build shared Research Rankings. These results describe target preferences; no listener skill score or Golden Ears award is inferred.</p></div><details className="welcome-ranking-guide" id="ranking-guide"><summary>My results, Research Rankings, Community Preferences—what is the difference?</summary><dl><div><dt>My Personal Results <span>FOR YOU</span></dt><dd>Your own favorites from Personal Tournament, based on the curves and music you have compared. Your results can change as you listen more.</dd></div><div><dt>Research Rankings <span>AVAILABLE</span></dt><dd>Shared curve rankings built from Blind Research. They summarize participating listeners’ comparisons across a broader pool. They are not a promise that the top curve will be your favorite.</dd></div><div><dt>Community Preferences <span>VALIDATION PILOT</span></dt><dd>A separate optional research pilot for future Personal Tournament choices and randomized reference checks. It requires its own sharing permission. Public numerical summaries are withheld pending independent listener validation and privacy review; earlier private-only contributions stay private.</dd></div></dl><p>No listener gets a skill rank or score. These views describe preferences for target curves.</p></details><div className="welcome-mode-grid"><article className="welcome-mode recommended"><span className="welcome-mode-badge">SUGGESTED START</span><WelcomeModeArt kind="personal"/><h3>Personal Tournament</h3><p>Find your current favorites with a blind tournament that adapts to your choices. Underheard targets get a chance, repeated losers can be benched, and finalists get rechecked on different music. Pause and resume your saved progress.</p><p className="welcome-mode-data">For your own shortlist. Choices stay local by default. You can separately opt into private research or the Community Preferences pilot. Community aggregates require their own permission; public numeric results await validation.</p><a href="/shootout/personal">Find my target <span aria-hidden="true">→</span></a></article><article className="welcome-mode"><span className="welcome-mode-badge">SHARED RESEARCH</span><WelcomeModeArt kind="blind"/><h3>Blind Research</h3><p>Compare hidden targets across a broad, non-elimination pool. Use Music Source to choose the Listening Pool for a track picked for you, or Bring Your Own for a stereo song from your device.</p><p className="welcome-mode-data">Both sources contribute to Combined Research Rankings and remain available as separate source filters. Your audio stays on your device; sharing its song details is optional.</p><a href="/shootout?mode=blind">Contribute a blind comparison <span aria-hidden="true">→</span></a></article><article className="welcome-mode"><span className="welcome-mode-badge">FREE EXPLORATION · UNRANKED</span><WelcomeModeArt kind="open"/><h3>Open Comparison</h3><p>Choose two named targets yourself, revisit a favorite, or explore your own private curves. Useful when you already know what you want to compare.</p><p className="welcome-mode-data">No public ranking contribution. Approved-target choices can enter private owner research under the existing agreement; comparisons involving private targets stay local.</p><a href="/shootout?mode=open">Choose a comparison <span aria-hidden="true">→</span></a></article></div><section className="welcome-research-invite" aria-labelledby="welcome-research-invite-title"><h3 id="welcome-research-invite-title">Please contribute to both.</h3><p>Use Personal to find what you like, then try a few Blind Research comparisons when you can. Personal adapts around your favorites; its optional Community Preferences pilot includes separate randomized reference checks. Blind Research explores the broader target pool and contributes eligible comparisons to Research Rankings. Short visits are welcome—you do not need to compare every target.</p><a href="/shootout?mode=blind">Help build Research Rankings <span aria-hidden="true">→</span></a><p><a href="/community-preferences">Explore Community Preferences and its research limits →</a></p></section></section>

    <section className="welcome-how" id="how-it-works" aria-labelledby="welcome-how-title">
      <div className="welcome-section-head"><span className="welcome-eyebrow">THREE STEPS</span><h2 id="welcome-how-title">A simple way to compare sound.</h2><p>Blind rounds put two EQ targets through the same headphones and track. Listen first. Personal keeps names hidden while you narrow your shortlist; Blind Research reveals them after your choice.</p></div>
      <div className="welcome-steps">
        <article><div className="welcome-step-visual visual-headphones" aria-hidden="true"><svg viewBox="0 0 160 100" fill="none"><path d="M31 57V48a49 49 0 0 1 98 0v9" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/><rect x="24" y="55" width="24" height="32" rx="8" fill="currentColor"/><rect x="112" y="55" width="24" height="32" rx="8" fill="currentColor"/><path d="M55 76l10-9 10 7 11-18 10 8 9-15" stroke="#a6fff0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg><span>YOUR HEADPHONES</span></div><span className="welcome-step-number">01 / SETUP</span><h3>Choose your headphones</h3><p>Select a saved measurement or add one for your pair. The site uses it to apply the two EQ targets.</p></article>
        <article><div className="welcome-step-visual visual-compare" aria-hidden="true"><div><strong>A</strong><svg viewBox="0 0 120 32"><polyline points="0,17 8,17 13,8 19,26 25,12 31,19 42,19 48,6 53,27 60,15 68,18 79,18 83,9 90,24 97,15 104,18 120,18" /></svg></div><div><strong>B</strong><svg viewBox="0 0 120 32"><polyline points="0,17 9,17 14,11 20,23 27,15 34,18 43,18 49,7 54,26 62,14 68,19 78,19 84,11 90,23 98,15 105,18 120,18" /></svg></div><span>SAME TRACK · SAME LEVEL</span></div><span className="welcome-step-number">02 / LISTEN</span><h3>Switch between A and B</h3><p>Play the same track through both targets. Switch as often as you like before choosing; blind rounds hide the target names.</p></article>
        <article><div className="welcome-step-visual visual-vote" aria-hidden="true"><div><span>A</span><span>B</span><span>TIE</span></div><svg viewBox="0 0 160 46" fill="none"><path d="M5 29C28 18 39 33 57 22S89 8 109 20s28 2 46-8" stroke="#ff526f" strokeWidth="3"/><path d="M5 36C27 31 37 16 57 30S89 38 109 26s28-17 46-10" stroke="#48b8ff" strokeWidth="3"/></svg><span>CHOOSE · THEN REVEAL</span></div><span className="welcome-step-number">03 / DECIDE</span><h3>Pick A, B, or a tie</h3><p>Choose what sounds better to you, or pick a tie if you have no preference. Personal uses your choices to refine a shortlist. Eligible Blind Research comparisons contribute to Research Rankings; identical-filter checks remain diagnostic.</p></article>
      </div>
      <div className="welcome-last-call"><div><span className="welcome-eyebrow">{invites ? "INVITED LISTENERS" : "LISTENERS"}</span><h2>Ready to hear the difference?</h2>{invites && <p>Have your invitation code handy.</p>}</div><a className="welcome-primary" href="/shootout/personal">Find my target <span aria-hidden="true">→</span></a></div>
    </section>
    <footer className="welcome-footer"><span>YinYang EQ · by Yin Yang EQ Lab</span><span>Built for curious ears. Blind votes shape the rankings.</span><div className="welcome-footer-links"><a href="/listeners/yinyangeq">YinYangEQ’s published listening history</a><a href="/privacy">Privacy notice</a><a href="/my-data">My data</a><a href="/sync">Sync browsers</a><a href="https://github.com/yinyangeqlab/yinyang-eq-lab" target="_blank" rel="noopener noreferrer">Source code on GitHub</a><a href="https://github.com/yinyangeqlab/yinyang-eq-lab/issues/new" target="_blank" rel="noopener noreferrer">Report a bug or contact us on GitHub</a><a href="mailto:yinyangeqlab@gmail.com">yinyangeqlab@gmail.com</a></div><AdminAccountLink placement="welcome"/></footer>
  </main>;
}
