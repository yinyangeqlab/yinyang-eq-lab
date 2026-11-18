"use client";

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { mountSample } from '@/components/first-listen/audio';
import '@/components/first-listen/home.css';
import { Eye, EyeOff, Pause, Play } from 'lucide-react';
import WelcomeLandscape from '@/components/welcome-landscape';
import WelcomeWallpapers from '@/components/welcome-wallpapers';
import { displayPreferencesSnapshot, parseDisplayPreferences, subscribeDisplayPreferences, writeDisplayPreferences } from '@/lib/display-preferences';
import '@/app/welcome.css';

const destinations = [
  { id: "ranking", title: "Your Own Personal EQ Ranking", description: "Pick your favorite sound in each matchup.", href: "/shootout/personal" },
  { id: "tuning", title: "Personal EQ Tuning", description: "Adjust bass, mids and treble as you listen.", href: "/preference-tuning" },
  { id: "comparison", title: "EQ Comparison", description: "Compare 2 EQ presets side by side.", href: "/eq-compare" },
  { id: "contribute", title: "Contribute To Public EQ Rankings", description: "Cast your vote in a blind listening test.", href: "/shootout?mode=blind" },
];

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
  const motionLabel = running ? 'Pause scene' : 'Resume scene';
  const flightsLabel = preferences.welcomeFlights ? 'Hide carpets' : 'Show carpets';
  return <>
    <div className="scene-plate"><WelcomeLandscape running={running} showFlights={preferences.welcomeFlights} /></div>
    {systemReduced ? null : <div className="scene-controls" role="group" aria-label="Landscape controls">
      <button type="button" title={motionLabel} onClick={() => writeDisplayPreferences({ motion: running ? 'reduced' : 'auto' })}>
        {running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        <span>{motionLabel}</span>
      </button>
      {running && <button type="button" title={flightsLabel} onClick={() => writeDisplayPreferences({ welcomeFlights: !preferences.welcomeFlights })}>
        {preferences.welcomeFlights ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        <span>{flightsLabel}</span>
      </button>}
    </div>}
  </>;
}

export default function FirstListenHome() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (root.current) return mountSample(root.current);
  }, []);
  return <div ref={root} id="first-listen-home">
  <section id="scene" className="landscape" aria-label="Red and blue YinYang EQ landscape with an aurora, sound waves and flying carpets">
    <Panorama />
  </section>
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
  <nav id="listening-tools" className="destination-grid" aria-label="Listening tools">
    {destinations.map(({ id, title, description, href }) => (
      <a key={id} href={href} className="destination-panel" data-tool={id}
        aria-labelledby={`tool-${id}`} aria-describedby={`tool-${id}-description`}>
        <span className="destination-art" aria-hidden="true" />
        <div className="destination-copy">
          <h2 id={`tool-${id}`}>{title}</h2>
          <p id={`tool-${id}-description`}>{description}</p>
        </div>
      </a>
    ))}
  </nav>
  <WelcomeWallpapers />
  </div>
</div>;
}
