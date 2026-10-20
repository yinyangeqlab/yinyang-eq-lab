"use client";

import "./welcome.css";
import { ShieldCheck } from "lucide-react";

function WelcomeLinkEffect({ kind }: { kind: "shootout" | "listening" | "tuning" }) {
  return <>{[0, 1, 2, 3, 4, 5, 6, 7].map(index => <span className={`welcome-link-particle particle-${index}`} key={index} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none">{kind === "listening" ? <><path d="M9 18V5l11-2v13M9 9l11-2" /><ellipse cx="6" cy="18" rx="3" ry="3" /><ellipse cx="17" cy="16" rx="3" ry="3" /></> : kind === "shootout" ? <path d="M2 12c3-12 5 12 8 0s5 12 8 0 3-6 4-4" /> : <><path d="M5 3v7m0 5v6M12 3v2m0 5v11M19 3v11m0 5v2" /><path className="welcome-floating-sliders" d="M2 10h6M9 5h6m1 9h6" /></>}</svg></span>)}</>;
}

export default function Welcome() {
  return <main className="welcome-shell">
    <section className="welcome-hero" aria-labelledby="welcome-title">
      <picture className="welcome-art" aria-hidden="true"><source media="(min-width: 761px)" srcSet="/brand-landscape.webp" /><img src="/brand-amoled-aligned.webp" alt="" /></picture>
      <div className="welcome-shade" aria-hidden="true" />
      <header className="welcome-nav">
        <a className="welcome-brand" href="/home" aria-label="YinYang EQ League home"><img src="/brand-avatar-aligned.webp" alt="" /><span>YinYang <em>EQ League</em></span></a>
        <nav aria-label="Welcome navigation">
          <a className="welcome-tool-link" data-effect="shootout" href="/shootout"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12H3v7h4v-7H4Zm16 0h1v7h-4v-7h3Z" /></svg><span className="welcome-tool-label">Shootout</span><WelcomeLinkEffect kind="shootout" /></a>
          <a className="welcome-tool-link" data-effect="listening" href="/music-library"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18V5l11-2v13M9 9l11-2" /><ellipse cx="6" cy="18" rx="3" ry="3" /><ellipse cx="17" cy="16" rx="3" ry="3" /></svg><span className="welcome-tool-label">Track library</span><WelcomeLinkEffect kind="listening" /></a>
          <a className="welcome-tool-link" data-effect="tuning" href="/preference-tuning"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 3v8m0 4v6M12 3v3m0 4v11M19 3v11m0 4v3M2 11h6M9 6h6m1 8h6" /></svg><span className="welcome-tool-label">Preference Tuning</span><WelcomeLinkEffect kind="tuning" /></a>
        </nav>
        <details className="welcome-settings"><summary><svg className="welcome-menu-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg><span>Your data control</span></summary><div className="welcome-settings-panel"><a href="/sync"><strong>Sync browsers</strong><span>Use your saved data on another browser</span></a><a href="/my-data"><strong>My data &amp; sharing</strong><span>Manage participation and saved submissions</span></a><a href="/privacy"><strong>Privacy notice</strong><span>How your data is used</span></a></div></details>
      </header>
      <div className="welcome-copy">
        <span className="welcome-kicker"><span aria-hidden="true" /> WELCOME TO YINYANG EQ LEAGUE</span>
        <h1 id="welcome-title">Find your sound.<br /><strong>Let your ears decide.</strong></h1>
        <p>Hear two headphone EQ targets side by side. Choose the sound you prefer, then see which curves were behind A and B.</p>
        <div className="welcome-actions"><a className="welcome-primary" href="/shootout">Enter with invitation <span aria-hidden="true">→</span></a><a className="welcome-secondary" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a></div>
        <div className="welcome-sync-note"><p>Already using another browser?</p><a className="welcome-sync-button" href="/sync"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.36-6.36L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.36 6.36L3 16M8 16H3v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg><span>Sync browsers</span><span aria-hidden="true">↗</span></a></div>
        <p className="welcome-access-note">Invited testers must agree to comparison-data collection before using the listening tools. Sharing details from your own music is optional.</p>
      </div>
      <div className="welcome-hero-foot"><span><i className="welcome-a" /> TARGET A</span><span className="welcome-foot-line" aria-hidden="true" /><span>THE SOUND BETWEEN</span><span className="welcome-foot-line" aria-hidden="true" /><span><i className="welcome-b" /> TARGET B</span></div>
    </section>

    <section className="welcome-how" id="how-it-works" aria-labelledby="welcome-how-title">
      <div className="welcome-section-head"><span className="welcome-eyebrow">THREE STEPS</span><h2 id="welcome-how-title">A simple way to compare sound.</h2><p>Each round puts two EQ targets through the same headphones and track. Listen first; the target names appear after you make your choice.</p></div>
      <div className="welcome-steps">
        <article><div className="welcome-step-visual visual-headphones" aria-hidden="true"><svg viewBox="0 0 160 100" fill="none"><path d="M31 57V48a49 49 0 0 1 98 0v9" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/><rect x="24" y="55" width="24" height="32" rx="8" fill="currentColor"/><rect x="112" y="55" width="24" height="32" rx="8" fill="currentColor"/><path d="M55 76l10-9 10 7 11-18 10 8 9-15" stroke="#a6fff0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg><span>YOUR HEADPHONES</span></div><span className="welcome-step-number">01 / SETUP</span><h3>Choose your headphones</h3><p>Select a saved measurement or add one for your pair. The site uses it to apply the two EQ targets.</p></article>
        <article><div className="welcome-step-visual visual-compare" aria-hidden="true"><div><strong>A</strong><svg viewBox="0 0 120 32"><polyline points="0,17 8,17 13,8 19,26 25,12 31,19 42,19 48,6 53,27 60,15 68,18 79,18 83,9 90,24 97,15 104,18 120,18" /></svg></div><div><strong>B</strong><svg viewBox="0 0 120 32"><polyline points="0,17 9,17 14,11 20,23 27,15 34,18 43,18 49,7 54,26 62,14 68,19 78,19 84,11 90,23 98,15 105,18 120,18" /></svg></div><span>SAME TRACK · SAME LEVEL</span></div><span className="welcome-step-number">02 / LISTEN</span><h3>Switch between A and B</h3><p>Play the same track through both targets. Switch as often as you like before choosing; blind rounds hide the target names.</p></article>
        <article><div className="welcome-step-visual visual-vote" aria-hidden="true"><div><span>A</span><span>B</span><span>TIE</span></div><svg viewBox="0 0 160 46" fill="none"><path d="M5 29C28 18 39 33 57 22S89 8 109 20s28 2 46-8" stroke="#ff526f" strokeWidth="3"/><path d="M5 36C27 31 37 16 57 30S89 38 109 26s28-17 46-10" stroke="#48b8ff" strokeWidth="3"/></svg><span>CHOOSE · THEN REVEAL</span></div><span className="welcome-step-number">03 / DECIDE</span><h3>Pick A, B, or a tie</h3><p>Choose what sounds better to you, or pick Unknown / tie if you can’t decide. Ties count as half a preference for each target in exploratory rankings. Identical-filter checks remain diagnostic. Then reveal the targets and curves.</p></article>
      </div>
      <div className="welcome-last-call"><div><span className="welcome-eyebrow">INVITED LISTENERS</span><h2>Ready to hear the difference?</h2><p>Have your invitation code handy.</p></div><a className="welcome-primary" href="/shootout">Enter the shootout <span aria-hidden="true">→</span></a></div>
    </section>
    <footer className="welcome-footer"><span>YinYang EQ League</span><span>Built for curious ears. Blind votes shape the rankings.</span><div className="welcome-footer-links"><a href="/privacy">Privacy notice</a><a href="/my-data">My data</a><a href="/sync">Sync browsers</a><a href="https://github.com/yinyangeqlab/yinyang-eq-league" target="_blank" rel="noopener noreferrer">Source code on GitHub</a><a href="https://github.com/yinyangeqlab/yinyang-eq-league/issues/new" target="_blank" rel="noopener noreferrer">Report a bug or contact us on GitHub</a><a href="mailto:yinyangeqlab@gmail.com">yinyangeqlab@gmail.com</a></div><a className="welcome-admin-link" href="/admin-login"><ShieldCheck aria-hidden="true" /><span>Admin sign in</span></a></footer>
  </main>;
}
