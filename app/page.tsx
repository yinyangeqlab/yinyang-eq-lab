"use client";

import { useEffect, useRef } from "react";
import "./welcome.css";

export default function Welcome() {
  const artwork = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = artwork.current;
    if (!image || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const move = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        image.style.transform = `translate3d(0, ${Math.min(window.scrollY * 0.16, 95)}px, 0) scale(1.16)`;
      });
    };
    move();
    window.addEventListener("scroll", move, { passive: true });
    return () => { window.removeEventListener("scroll", move); cancelAnimationFrame(frame); };
  }, []);

  return <main className="welcome-shell">
    <section className="welcome-hero" aria-labelledby="welcome-title">
      <div className="welcome-art" aria-hidden="true"><img ref={artwork} src="/brand-amoled.webp" alt="" /></div>
      <div className="welcome-shade" aria-hidden="true" />
      <header className="welcome-nav">
        <a className="welcome-brand" href="/" aria-label="YinYang EQ League home"><img src="/brand-avatar.webp" alt="" /><span>YinYang <em>EQ League</em></span></a>
        <nav aria-label="Welcome navigation"><a href="#how-it-works">How it works</a><a href="/owner-login">Owner sign in</a><a className="welcome-nav-enter" href="/shootout">Enter with invitation <span aria-hidden="true">↗</span></a></nav>
      </header>
      <div className="welcome-copy">
        <span className="welcome-kicker"><span aria-hidden="true" /> WELCOME TO YINYANG EQ LEAGUE</span>
        <h1 id="welcome-title">Find your sound.<br /><strong>Let your ears decide.</strong></h1>
        <p>Hear two headphone EQ targets side by side. Choose the sound you prefer, then see which curves were behind A and B.</p>
        <div className="welcome-actions"><a className="welcome-primary" href="/shootout">Enter with invitation <span aria-hidden="true">→</span></a><a className="welcome-secondary" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a></div>
        <p className="welcome-access-note">Listening tools are open to invited testers and the site owner.</p>
      </div>
      <div className="welcome-hero-foot"><span><i className="welcome-a" /> TARGET A</span><span className="welcome-foot-line" aria-hidden="true" /><span>THE SOUND BETWEEN</span><span className="welcome-foot-line" aria-hidden="true" /><span><i className="welcome-b" /> TARGET B</span></div>
    </section>

    <section className="welcome-how" id="how-it-works" aria-labelledby="welcome-how-title">
      <div className="welcome-section-head"><span className="welcome-eyebrow">THREE STEPS</span><h2 id="welcome-how-title">A simple way to compare sound.</h2><p>Each round puts two EQ targets through the same headphones and track. Listen first; the target names appear after you make your choice.</p></div>
      <div className="welcome-steps">
        <article><div className="welcome-step-visual visual-headphones" aria-hidden="true"><svg viewBox="0 0 160 100" fill="none"><path d="M31 57V48a49 49 0 0 1 98 0v9" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/><rect x="24" y="55" width="24" height="32" rx="8" fill="currentColor"/><rect x="112" y="55" width="24" height="32" rx="8" fill="currentColor"/><path d="M55 76l10-9 10 7 11-18 10 8 9-15" stroke="#a6fff0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg><span>YOUR HEADPHONES</span></div><span className="welcome-step-number">01 / SETUP</span><h3>Choose your headphones</h3><p>Select a saved measurement or add one for your pair. The site uses it to apply the two EQ targets.</p></article>
        <article><div className="welcome-step-visual visual-compare" aria-hidden="true"><div><strong>A</strong><svg viewBox="0 0 120 32"><polyline points="0,17 8,17 13,8 19,26 25,12 31,19 42,19 48,6 53,27 60,15 68,18 79,18 83,9 90,24 97,15 104,18 120,18" /></svg></div><div><strong>B</strong><svg viewBox="0 0 120 32"><polyline points="0,17 9,17 14,11 20,23 27,15 34,18 43,18 49,7 54,26 62,14 68,19 78,19 84,11 90,23 98,15 105,18 120,18" /></svg></div><span>SAME TRACK · SAME LEVEL</span></div><span className="welcome-step-number">02 / LISTEN</span><h3>Switch between A and B</h3><p>Play the same track through both targets. Switch as often as you like before choosing; blind rounds hide the target names.</p></article>
        <article><div className="welcome-step-visual visual-vote" aria-hidden="true"><div><span>A</span><span>B</span><span>TIE</span></div><svg viewBox="0 0 160 46" fill="none"><path d="M5 29C28 18 39 33 57 22S89 8 109 20s28 2 46-8" stroke="#ff526f" strokeWidth="3"/><path d="M5 36C27 31 37 16 57 30S89 38 109 26s28-17 46-10" stroke="#48b8ff" strokeWidth="3"/></svg><span>CHOOSE · THEN REVEAL</span></div><span className="welcome-step-number">03 / DECIDE</span><h3>Pick A, B, or a tie</h3><p>Choose what sounds better to you. Then reveal the curves and see how blind choices build the rankings.</p></article>
      </div>
      <div className="welcome-last-call"><div><span className="welcome-eyebrow">INVITED LISTENERS</span><h2>Ready to hear the difference?</h2><p>Have your invitation code handy. Owners can use the owner sign in link above.</p></div><a className="welcome-primary" href="/shootout">Enter the shootout <span aria-hidden="true">→</span></a></div>
    </section>
    <footer className="welcome-footer"><span>YinYang EQ League</span><span>Built for curious ears. Blind votes shape the rankings.</span></footer>
  </main>;
}
