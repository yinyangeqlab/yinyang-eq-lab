"use client";

import "./welcome.css";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Pause, Play } from "lucide-react";
import WelcomeLandscape from "@/components/welcome-landscape";
import WelcomeWallpapers from "@/components/welcome-wallpapers";
import { useInvitesEnabled } from "@/components/invite-mode";
import { readDisplayPreferences, subscribeDisplayPreferences, writeDisplayPreferences, type DisplayPreferences } from "@/lib/display-preferences";

function WelcomeComparison() {
  return <figure id="sound-comparison" className="welcome-comparison" aria-describedby="welcome-comparison-description">
    <figcaption>
      <span>Same song.</span>{" "}
      <span>Two sounds.</span>{" "}
      <strong>Your choice.</strong>
    </figcaption>
    <span className="welcome-comparison-sound welcome-comparison-a">Sound A</span>
    <span className="welcome-comparison-line welcome-comparison-line-a" aria-hidden="true"/>
    <span className="welcome-comparison-line welcome-comparison-line-b" aria-hidden="true"/>
    <span className="welcome-comparison-sound welcome-comparison-b">Sound B</span>
    <p id="welcome-comparison-description" className="sr-only">Hear the same song with two different sound settings, then choose the one you prefer.</p>
  </figure>;
}

export default function Welcome() {
  const invites = useInvitesEnabled();
  const [motion, setMotion] = useState(true);
  const [systemReduced, setSystemReduced] = useState(false);
  const [showFlights, setShowFlights] = useState(true);
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(true);
  const hero = useRef<HTMLElement>(null);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preference = (value: DisplayPreferences) => {
      setSystemReduced(reduced.matches);
      setMotion(!reduced.matches && value.motion !== "reduced");
      setShowFlights(value.welcomeFlights);
    };
    const systemMotionChange = () => preference(readDisplayPreferences());
    systemMotionChange();
    const unsubscribe = subscribeDisplayPreferences(preference);
    const visibility = () => setVisible(!document.hidden);
    const observer = new IntersectionObserver(entries => setInView(entries[0]?.isIntersecting ?? false));
    if (hero.current) observer.observe(hero.current);
    reduced.addEventListener("change", systemMotionChange);
    document.addEventListener("visibilitychange", visibility);
    return () => { unsubscribe(); observer.disconnect(); reduced.removeEventListener("change", systemMotionChange); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  return <main className="welcome-shell">
    <section ref={hero} className="welcome-hero" data-motion={motion && inView && visible} aria-labelledby="welcome-title">
      <WelcomeLandscape running={motion && inView && visible} showFlights={showFlights}/>
      <div className="welcome-shade" aria-hidden="true" />
      <div className="welcome-copy">
        <span className="welcome-kicker"><span aria-hidden="true" /> WELCOME TO YINYANG EQ</span>
        <h1 id="welcome-title">Find your sound.<br /><strong>Let your ears decide.</strong></h1>
        <p>Hear the same music with two sound settings. Choose the one you enjoy more. Find your personal favorites, and help explore what the community prefers.</p>
        <div className="welcome-actions"><a className="welcome-primary" href="/shootout/personal">{invites ? "Enter with invitation" : "Find a sound I like"} <span aria-hidden="true">→</span></a><a className="welcome-secondary" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a></div>
        <div className="welcome-sync-note"><p>Already used this in another browser?</p><a className="welcome-sync-button" href="/sync"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.36-6.36L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.36 6.36L3 16M8 16H3v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg><span>Sync this browser</span></a></div>
        <p className="welcome-access-note">Personal choices stay in this browser by default. Research modes ask you to agree before submitting comparisons. <a href="/listen#ranking-guide">See what each mode shares</a>.</p>
      </div>
      <div className="welcome-hero-foot">
        <WelcomeComparison />
        <div className="welcome-art-controls" role="group" aria-label="Background controls">
          {systemReduced ? <span className="welcome-motion-note">Background paused by your device’s motion setting</span> : <button
            type="button"
            onClick={() => {
              const next = !motion;
              setMotion(next);
              writeDisplayPreferences({ motion: next ? "auto" : "reduced" });
            }}
            title={motion ? "Pause the animated background" : "Resume the animated background"}
          >
            {motion ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
            <span>{motion ? "Reduce site motion" : "Use site animations"}</span>
          </button>}
          <button
            type="button"
            aria-describedby="welcome-flights-description"
            onClick={() => writeDisplayPreferences({ welcomeFlights: !showFlights })}
          >
            {showFlights ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
            <span>{showFlights ? "Hide flying carpets" : "Show flying carpets"}</span>
          </button>
          <span id="welcome-flights-description" className="sr-only">Includes the headphones and IEMs riding on the carpets.</span>
        </div>
      </div>
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

    <WelcomeWallpapers />
  </main>;
}
