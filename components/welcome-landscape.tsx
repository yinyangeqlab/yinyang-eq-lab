"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createLandscapeRenderer } from "@/lib/welcome-landscape";
import { createWelcomeFlight } from "@/lib/welcome-flight-path";
import { buildLabel } from "@/lib/release-info";
import { FlightModel } from "./welcome-flight-model";

const headphoneArtwork = `/welcome-headphone-carpet.webp?v=${buildLabel}`;
const iemArtwork = `/welcome-iem-carpet.webp?v=${buildLabel}`;

// The middle 30 units of the rug never deform. Each loose side spans 35 units.
const clothRest = 15;
const clothWing = 35;
const clothStrip = 5;

function clothLift(x: number, turn: number) {
  // Vertical offset of the fabric in viewBox units (positive is down). The
  // supported middle is exactly flat, and each side bends like a held sheet: no
  // bend where it leaves the middle, most travel at the corner. Every term is a
  // whole harmonic of the loop, so the last frame meets the first.
  //  - A gust envelope (one strong and one weaker gust per loop) reaches the
  //    corner slightly after the root, giving a travelling follow-through.
  //  - A broad curl rolls outward twice per loop; the gust scales it and also
  //    lifts the corner, so it rises high in a gust and sags a little at rest.
  //  - Short bursts of a quick, small flick live only near the outer edge.
  // The two sides run out of phase and at different strengths.
  const reach = Math.min(1, Math.max(0, (Math.abs(x - 50) - clothRest) / clothWing));
  if (reach === 0) return 0;
  const hang = reach * reach * (1.5 - .5 * reach);
  const left = x < 50;
  const offset = left ? 0 : 2.3;
  const looseness = left ? 1 : .86;
  const strong = .5 + .5 * Math.sin(turn - offset - .6 * reach);
  const weak = .5 + .5 * Math.sin(2 * turn - 1.1 - 1.6 * offset - .6 * reach);
  const gust = (.62 * strong + .38 * weak) ** 2;
  const curl = 13 * (.55 + .45 * gust) * Math.sin(2 * turn - 2.4 * reach - .7 - .6 * offset);
  const burst = (.5 + .5 * Math.sin(3 * turn - 2 - offset)) ** 3;
  const flick = 3.5 * burst * (.48 + .52 * gust) * Math.sin((left ? 8 : 7) * turn - 3.4 * reach - 1.4 * offset);
  return looseness * (hang * (1 - 3 * gust + curl) + reach * reach * reach * flick);
}

const clothSamples = 60;
const carpetSlices = [
  ...Array.from({ length: clothWing / clothStrip }, (_, index) => index * clothStrip),
  50 - clothRest,
  ...Array.from({ length: clothWing / clothStrip }, (_, index) => 50 + clothRest + index * clothStrip)
].map(left => {
  const still = left === 50 - clothRest;
  const width = still ? 2 * clothRest : clothStrip;
  if (still) return { left, width, lift: "", skew: "" };
  // Each narrow strip follows the fabric height at both of its edges, so
  // neighbours always meet and the outline stays one continuous curve.
  const lift: string[] = [];
  const skew: string[] = [];
  for (let step = 0; step <= clothSamples; step++) {
    const turn = step * Math.PI * 2 / clothSamples;
    const start = clothLift(left, turn);
    const slope = (clothLift(left + width, turn) - start) / width;
    lift.push(`0 ${(start - left * slope).toFixed(2)}`);
    skew.push((Math.atan(slope) * 180 / Math.PI).toFixed(2));
  }
  return { left, width, lift: lift.join(";"), skew: skew.join(";") };
});

/**
 * A clear bubble around the device, ending just above the rug. The tint is
 * radially even, so only the rim and reflections turn, about the fixed centre.
 */
function FlightBubble({ id, headphones }: { id: string; headphones: boolean }) {
  const uid = `flight-bubble-${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  // Headphones: rug at y73, bubble spans y2..72. IEMs: rug at y64, bubble spans y1..63.
  const cx = 50;
  const cy = headphones ? 37 : 32;
  const r = headphones ? 35 : 31;
  return <g pointerEvents="none">
    <defs>
      {/* Clear centre, faint tint gathering only at the very edge. */}
      <radialGradient id={`${uid}-body`} cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="0.8" stopColor="#bfe9ff" stopOpacity="0" />
        <stop offset="0.95" stopColor="#a8f0e0" stopOpacity="0.1" />
        <stop offset="1" stopColor="#d9c8ff" stopOpacity="0.2" />
      </radialGradient>
      {/* Thin rim that shifts through aurora hues. */}
      <linearGradient id={`${uid}-rim`} x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
        <stop offset="0.3" stopColor="#7ef0c8" stopOpacity="0.45" />
        <stop offset="0.6" stopColor="#7cc4ff" stopOpacity="0.25" />
        <stop offset="1" stopColor="#c59bff" stopOpacity="0.5" />
      </linearGradient>
      {/* Small off-centre reflection. */}
      <linearGradient id={`${uid}-glint`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
        <stop offset="0.55" stopColor="#8ff5d2" stopOpacity="0.5" />
        <stop offset="1" stopColor="#b9a0ff" stopOpacity="0" />
      </linearGradient>
    </defs>
    <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-body)`} />
    <g className="welcome-bubble-shine">
      <circle cx={cx} cy={cy} r={r - 0.3} fill="none" stroke={`url(#${uid}-rim)`} strokeWidth="0.6" />
      {/* Highlight arc hugging the rim, plus a tiny dot. */}
      <path d={`M ${cx - r * 0.74} ${cy - r * 0.4} A ${r * 0.84} ${r * 0.84} 0 0 1 ${cx - r * 0.4} ${cy - r * 0.74}`}
        fill="none" stroke={`url(#${uid}-glint)`} strokeWidth="1.3" strokeLinecap="round" />
      <circle cx={cx - r * 0.2} cy={cy - r * 0.8} r="0.7" fill="#ffffff" fillOpacity="0.7" />
      {/* Faint counter-reflection on the opposite side. */}
      <path d={`M ${cx + r * 0.52} ${cy + r * 0.7} A ${r * 0.87} ${r * 0.87} 0 0 0 ${cx + r * 0.74} ${cy + r * 0.46}`}
        fill="none" stroke="#c59bff" strokeOpacity="0.35" strokeWidth="0.7" strokeLinecap="round" />
    </g>
  </g>;
}

function FlyingArtwork({ kind, moving }: { kind: "headphones" | "iems"; moving: boolean }) {
  const id = useId();
  const headphones = kind === "headphones";
  const rugFade = `${id}-rug-fade`;
  const rugMask = `${id}-rug-mask`;
  const carpet = `${id}-carpet`;
  // One loop holds a strong and a weaker gust per side, with two broad curls.
  // The two rugs use different lengths and start points so they never match.
  const clothTiming = { dur: headphones ? "3.8s" : "4.7s", begin: headphones ? "0s" : "-1.9s", repeatCount: "indefinite" };
  return <>
   <svg className="welcome-flight-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={rugFade} x1="0" x2="0" y1="0" y2="1">
        <stop offset={headphones ? ".73" : ".64"} stopColor="white" stopOpacity="0" />
        <stop offset={headphones ? ".76" : ".68"} stopColor="white" />
      </linearGradient>
      <mask id={rugMask} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
        <rect width="100" height="100" fill={`url(#${rugFade})`} />
      </mask>
      <image id={carpet} className="welcome-carpet-art" href={headphones ? headphoneArtwork : iemArtwork}
        width="100" height="100" mask={`url(#${rugMask})`} />
      {carpetSlices.map(slice => <clipPath key={slice.left} id={`${carpet}-${slice.left}`}>
        {/* Overlap adjoining strips slightly so the fabric has no seams. */}
        <rect x={slice.left - .3} width={slice.width + .6} height="100" />
      </clipPath>)}
    </defs>
    <g className="welcome-flight-rug">
      {carpetSlices.map(slice => <g key={slice.left} className="welcome-carpet-slice">
        {slice.lift && <>
          <animateTransform attributeName="transform" type="translate" values={slice.lift} {...clothTiming} />
          <animateTransform attributeName="transform" type="skewY" values={slice.skew} additive="sum" {...clothTiming} />
        </>}
        <use href={`#${carpet}`} clipPath={`url(#${carpet}-${slice.left})`} />
      </g>)}
    </g>
   </svg>
   {/* The device canvas and its bubble share one HTML layer over the art box,
       so the canvas never sits inside SVG and both bob together. The device
       turns on the canvas clock and the bubble's reflections on a slower CSS loop. */}
   <div className="welcome-device-sail">
     <FlightModel kind={kind} running={moving} />
     <svg className="welcome-flight-bubble" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
       <FlightBubble id={id} headphones={headphones} />
     </svg>
   </div>
  </>;
}

/** The WebGL texture excludes the still image's baked aurora. */
export default function WelcomeLandscape({ running }: { running: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const flightLayer = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const active = useRef(running);
  const syncMotion = useRef<() => void>(() => {});
  const syncFlights = useRef<(playing: boolean) => void>(() => {});
  const flightRunning = useRef(false);
  const [revision, setRevision] = useState(0);
  // Mirrors data-animating so the device canvases freeze with the rest of the art.
  const [artMoving, setArtMoving] = useState(false);
  useEffect(() => {
    if (!host.current || !canvas.current) return;
    const container = host.current, surface = canvas.current;
    const flyingArtwork = container.querySelectorAll<SVGSVGElement>(".welcome-flight-art");
    const picture = new Image();
    const ready = (value: boolean) => { container.dataset.rendered = String(value); };
    const engine = createLandscapeRenderer(surface, picture, ready);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let onScreen = true;
    const preference = () => {
      const animating = active.current && onScreen && !reduced.matches && !document.hidden;
      container.dataset.animating = String(animating);
      engine?.setRunning(animating);
      setArtMoving(animating);
      flightRunning.current = animating;
      syncFlights.current(animating);
      for (const artwork of flyingArtwork) {
        if (animating) artwork.unpauseAnimations();
        else artwork.pauseAnimations();
      }
    };
    syncMotion.current = preference;
    const visibility = new IntersectionObserver(entries => { onScreen = entries[0]?.isIntersecting ?? false; preference(); });
    visibility.observe(surface);
    const load = () => { engine?.load(); preference(); };
    const lost = (event: Event) => { event.preventDefault(); ready(false); engine?.setRunning(false); };
    const restored = () => setRevision(value => value + 1);
    const observer = new ResizeObserver(() => engine?.resize()); observer.observe(surface);
    picture.addEventListener("load", load); surface.addEventListener("webglcontextlost", lost); surface.addEventListener("webglcontextrestored", restored);
    reduced.addEventListener("change", preference); document.addEventListener("visibilitychange", preference);
    if (engine) picture.src = `/brand-landscape.webp?v=${buildLabel}`;
    load();
    return () => { observer.disconnect(); visibility.disconnect(); syncMotion.current = () => {}; picture.removeEventListener("load", load); surface.removeEventListener("webglcontextlost", lost); surface.removeEventListener("webglcontextrestored", restored); reduced.removeEventListener("change", preference); document.removeEventListener("visibilitychange", preference); engine?.dispose(); container.dataset.animating = "false"; setArtMoving(false); };
  }, [revision]);
  useEffect(() => {
    const props = flightLayer.current?.querySelectorAll<HTMLElement>(".welcome-landscape-prop");
    if (!props) return;
    const tracks = Array.from(props, prop => {
      const headphones = prop.classList.contains("welcome-landscape-headphones");
      let animation: Animation | undefined;
      let passesUntilClimb = headphones ? 2 : 1;
      const launch = (first = false) => {
        const climb = !first && passesUntilClimb-- === 0;
        if (climb) passesUntilClimb = 2 + Math.floor(2 * Math.random());
        const { duration, keyframes } = createWelcomeFlight(headphones, climb);
        animation?.cancel();
        animation = prop.animate(keyframes, { duration, fill: "both" });
        animation.pause();
        animation.currentTime = first ? duration * (headphones ? .245 : .265) : 0;
        if (flightRunning.current) animation.play();
        animation.onfinish = () => launch();
        prop.dataset.flightExit = climb ? "sky" : "side";
        prop.dataset.flightReady = "true";
      };
      launch(true);
      return {
        sync: (playing: boolean) => {
          if (!animation || animation.playState === "finished") return;
          if (playing && animation.playState !== "running") animation.play();
          else if (!playing && animation.playState !== "paused") {
            const position = animation.currentTime;
            animation.pause();
            // Hold the sampled position even if the compositor applies pause on its next frame.
            if (position !== null) animation.currentTime = position;
          }
        },
        stop: () => { if (animation) { animation.onfinish = null; animation.cancel(); } },
      };
    });
    syncFlights.current = playing => tracks.forEach(track => track.sync(playing));
    return () => {
      syncFlights.current = () => {};
      tracks.forEach(track => track.stop());
    };
  }, []);
  useEffect(() => { active.current = running; syncMotion.current(); }, [running]);
  return <div ref={host} className="welcome-art" data-animating="false" aria-hidden="true">
    {/* eslint-disable-next-line @next/next/no-img-element -- The decorative fallback follows the static artwork pipeline. */}
    <img className="welcome-landscape-image" src={`/brand-landscape-crimson.webp?v=${buildLabel}`} alt="" />
    <canvas ref={canvas} className="welcome-landscape-canvas" aria-hidden="true" />
    <div ref={flightLayer} className="welcome-landscape-flights">
      <div className="welcome-landscape-prop welcome-landscape-headphones">
        <div className="welcome-flight-body">
          <FlyingArtwork kind="headphones" moving={artMoving} />
        </div>
      </div>
      <div className="welcome-landscape-prop welcome-landscape-iems">
        <div className="welcome-flight-body">
          <FlyingArtwork kind="iems" moving={artMoving} />
        </div>
      </div>
    </div>
  </div>;
}
