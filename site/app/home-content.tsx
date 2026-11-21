"use client";

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { mountSample } from '@/components/first-listen/audio';
import ToolIllustration from '@/components/first-listen/tool-illustration';
import '@/components/first-listen/home.css';
import '@/components/first-listen/tool-motion.css';
import { Eye, EyeOff, Pause, Play } from 'lucide-react';
import { CompanionAppIcons, DownloadAppManager } from '@/components/companion-app-brand';
import WelcomeLandscape from '@/components/welcome-landscape';
import WelcomeWallpapers from '@/components/welcome-wallpapers';
import { displayPreferencesSnapshot, parseDisplayPreferences, subscribeDisplayPreferences, writeDisplayPreferences } from '@/lib/display-preferences';
import '@/app/welcome.css';

const destinations = [
  { id: "ranking", title: "Your Own Personal EQ Ranking", description: "Pick your favorite sound in each matchup.", href: "/shootout/personal" },
  { id: "tuning", title: "Personal EQ Tuning", description: "Adjust bass, mids and treble as you listen.", href: "/preference-tuning" },
  { id: "comparison", title: "EQ Comparison", description: "Compare 2 EQ presets side by side.", href: "/eq-compare" },
  { id: "contribute", title: "Contribute To Public EQ Rankings", description: "Cast your vote in a blind listening test.", href: "/shootout?mode=blind" },
] as const;

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
function subscribeMotion(change: () => void) {
  const media = matchMedia(reducedMotionQuery);
  media.addEventListener('change', change);
  return () => media.removeEventListener('change', change);
}

function Panorama() {
  const preferences = parseDisplayPreferences(useSyncExternalStore(subscribeDisplayPreferences, displayPreferencesSnapshot, () => '{}'));
  const systemReduced = useSyncExternalStore(subscribeMotion, () => matchMedia(reducedMotionQuery).matches, () => false);
  const running = !systemReduced && preferences.motion !== 'reduced';
  const motionLabel = running ? 'Pause motion' : 'Resume motion';
  const flightsLabel = preferences.welcomeFlights ? 'Hide carpets' : 'Show carpets';
  return <>
    <section id="scene" className="landscape" aria-label="Animated YinYang EQ landscape">
      <WelcomeLandscape running={running} showFlights={preferences.welcomeFlights} steadyAurora />
    </section>
    {systemReduced ? null : <div className="scene-controls" role="group" aria-label="Landscape controls">
      <button type="button" className="motion-control" aria-label={motionLabel} aria-describedby="motion-benefit"
        onClick={() => writeDisplayPreferences({ motion: running ? 'reduced' : 'auto' })}>
        <span className="scene-control-face">{running ? <Pause aria-hidden="true"/> : <Play aria-hidden="true"/>}{motionLabel}</span>
        <small id="motion-benefit">{running ? 'Saves battery & compute' : 'Saving battery & compute'}</small>
      </button>
      <button type="button" disabled={!running} onClick={() => writeDisplayPreferences({ welcomeFlights: !preferences.welcomeFlights })}>
        <span className="scene-control-face">{preferences.welcomeFlights ? <EyeOff aria-hidden="true"/> : <Eye aria-hidden="true"/>}{flightsLabel}</span>
      </button>
    </div>}
  </>;
}

export default function FirstListenHome() {
  const root = useRef<HTMLDivElement>(null);
  const toolGrid = useRef<HTMLElement>(null);
  useEffect(() => {
    const grid = toolGrid.current;
    if (!grid) return;
    let inView = false;
    const sync = () => grid.toggleAttribute('data-playing', inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); });
    observer.observe(grid);
    document.addEventListener('visibilitychange', sync);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, []);
  useEffect(() => {
    if (root.current) return mountSample(root.current);
  }, []);
  return <div ref={root} id="first-listen-home">
  <Panorama />
  <div className="frame">
  <section className="first" aria-labelledby="home-title">
    <div className="intro">
      <h1 id="home-title">Compare Two Headphone <span>Sounds.</span></h1>
      <p className="lead">Hear the same part of a song with two EQ settings and pick the one you prefer.</p>
      <p className="headphone-note">Start at a comfortable volume.</p>
    </div>
    <section className="player" id="sample" tabIndex={-1} aria-labelledby="sample-title">
      <div className="desk">
        <div className="track"><h2 id="sample-title">Preview</h2><span className="time"><span id="clock">0:00</span> / 0:12</span></div>
        <p className="sr-only" id="sample-status" role="status" />
        <div className="timeline">
          <button id="transport" aria-label="Play sample" title="Play sample"><span className="play-icon" aria-hidden="true"></span></button>
          <div className="rail"><canvas aria-hidden="true"></canvas><input id="seek" type="range" aria-label="Sample position" aria-valuetext="0 seconds" min="0" max="11.99" step="0.01" defaultValue="0" /></div>
        </div>
        <div className="channels" role="group" aria-label="Listen with either EQ setting">
          <button type="button" data-side="A" aria-pressed="false">Sound A</button>
          <button type="button" data-side="B" aria-pressed="false">Sound B</button>
        </div>
      </div>
    </section>
  </section>
  <nav ref={toolGrid} id="listening-tools" className="destination-grid" aria-label="Listening tools">
    {destinations.map(({ id, title, description, href }) => (
      <a key={id} href={href} className="destination-panel" data-tool={id}
        aria-labelledby={`tool-${id}`} aria-describedby={`tool-${id}-description`}>
        <ToolIllustration tool={id} />
        <div className="destination-copy">
          <h2 id={`tool-${id}`}>{title}</h2>
          <p id={`tool-${id}-description`}>{description}</p>
        </div>
      </a>
    ))}
  </nav>
  <section className="home-companion" aria-labelledby="home-companion-title">
    <CompanionAppIcons/>
    <h2 id="home-companion-title">Android companion for Qudelix 5K and 5K Plus</h2>
    <p className="home-companion-copy"><strong>Build and manage EQs right from your phone.</strong> Import and edit presets, or use your measurements to create an EQ offline.</p>
    <div className="home-companion-actions">
      <DownloadAppManager className="home-manager-download"/>
      <a className="companion-more" href="/q5k4android#trailer">Watch trailer</a>
      <a className="companion-more" href="/q5k4android">See app features</a>
    </div>
    <p className="home-companion-hint">Use App Manager on Android to install and update the Qudelix Companion.</p>
  </section>
  <WelcomeWallpapers />
  </div>
</div>;
}
