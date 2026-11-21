"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createLandscapeRenderer } from "@/lib/welcome-landscape";
import { createWelcomeFlight } from "@/lib/welcome-flight-path";
import { buildLabel } from "@/lib/release-info";
import { FlightModel } from "./welcome-flight-model";

const defaultFlightArtwork = {
  headphones: `/welcome-headphone-carpet.webp?v=${buildLabel}`,
  iems: `/welcome-iem-carpet.webp?v=${buildLabel}`,
};
const defaultArtwork = {
  texture: `/brand-landscape.webp?v=${buildLabel}`,
  still: `/brand-landscape-crimson.webp?v=${buildLabel}`,
  flights: defaultFlightArtwork,
};

// The long wave crosses the complete hem. The extra lift at the loose ends
// fades continuously towards the middle, where the device rests.
function clothLift(x: number, turn: number) {
  const across = (x - 50) / 50;
  const reach = across * across;
  const ripple = 1.15 * Math.sin(turn - 3.1 * across);
  const curl = 6.8 * Math.sin(2 * turn - 2.6 * across);
  const swell = 2.6 * Math.sin(turn + 1.45 * across + .6);
  return ripple + reach * (curl + swell);
}

const stripWidth = 5;
const turns = Array.from({ length: 49 }, (_, frame) => frame * 2 * Math.PI / 48);
// Stretch about the device's contact line. The front point and its tassel
// travel farther than the supported back edge, as parts of one piece of cloth.
const frontWave = turns.map(t => `1 ${(1 + .115 * Math.sin(t - .85) + .035 * Math.sin(2 * t + .45)).toFixed(4)}`).join(";");
const carpetSlices = Array.from({ length: 100 / stripWidth }, (_, i) => {
  const left = i * stripWidth;
  const lift: string[] = [];
  const skew: string[] = [];
  for (const turn of turns) {
    const start = clothLift(left, turn);
    const slope = (clothLift(left + stripWidth, turn) - start) / stripWidth;
    lift.push(`0 ${(start - left * slope).toFixed(3)}`);
    skew.push((Math.atan(slope) * 180 / Math.PI).toFixed(3));
  }
  return { left, lift: lift.join(";"), skew: skew.join(";") };
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

function FlyingArtwork({ kind, moving, image }: { kind: "headphones" | "iems"; moving: boolean; image: string }) {
  const id = useId();
  const headphones = kind === "headphones";
  const rugFade = `${id}-rug-fade`;
  const rugMask = `${id}-rug-mask`;
  const carpet = `${id}-carpet`;
  const contactY = headphones ? 73 : 65;
  // The two rugs use different lengths and start points so they never match.
  const clothTiming = { dur: headphones ? "4.8s" : "5.5s", begin: headphones ? "0s" : "-1.9s", repeatCount: "indefinite" };
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
      <image id={carpet} className="welcome-carpet-art" href={image}
        width="100" height="100" mask={`url(#${rugMask})`} />
      {carpetSlices.map(slice => <clipPath key={slice.left} id={`${carpet}-${slice.left}`}>
        {/* Overlap adjoining strips slightly so the fabric has no seams. */}
        <rect x={slice.left - .3} width={stripWidth + .6} height="100" />
      </clipPath>)}
    </defs>
    <g className="welcome-flight-rug">
      <g transform={`translate(0 ${contactY})`}>
        <g className="welcome-front-wave">
          <animateTransform attributeName="transform" type="scale" values={frontWave} {...clothTiming} />
          <g transform={`translate(0 ${-contactY})`}>
            {carpetSlices.map(slice => <g key={slice.left} className="welcome-carpet-slice">
              <animateTransform attributeName="transform" type="translate" values={slice.lift} {...clothTiming} />
              <animateTransform attributeName="transform" type="skewY" values={slice.skew} additive="sum" {...clothTiming} />
              <use href={`#${carpet}`} clipPath={`url(#${carpet}-${slice.left})`} />
            </g>)}
          </g>
        </g>
      </g>
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

export function WelcomeFlights({ running, artwork = defaultFlightArtwork }: { running: boolean; artwork?: typeof defaultFlightArtwork }) {
  const flightLayer = useRef<HTMLDivElement>(null);
  const active = useRef(running);
  const syncFlights = useRef<() => void>(() => {});
  useEffect(() => {
    const layer = flightLayer.current;
    if (!layer) return;
    const props = layer.querySelectorAll<HTMLElement>(".welcome-landscape-prop");
    const artwork = layer.querySelectorAll<SVGSVGElement>(".welcome-flight-art");
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
        if (active.current) animation.play();
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
    syncFlights.current = () => {
      const playing = active.current;
      tracks.forEach(track => track.sync(playing));
      for (const svg of artwork) {
        if (playing) svg.unpauseAnimations();
        else svg.pauseAnimations();
      }
    };
    syncFlights.current();
    return () => {
      syncFlights.current = () => {};
      tracks.forEach(track => track.stop());
    };
  }, []);
  useEffect(() => { active.current = running; syncFlights.current(); }, [running]);
  return <div ref={flightLayer} className="welcome-landscape-flights">
    <div className="welcome-landscape-prop welcome-landscape-headphones">
      <div className="welcome-flight-body">
        <FlyingArtwork kind="headphones" moving={running} image={artwork.headphones} />
      </div>
    </div>
    <div className="welcome-landscape-prop welcome-landscape-iems">
      <div className="welcome-flight-body">
        <FlyingArtwork kind="iems" moving={running} image={artwork.iems} />
      </div>
    </div>
  </div>;
}

export default function WelcomeLandscape({ running, showFlights, artwork = defaultArtwork, preserveStillSky = false }: {
  running: boolean; showFlights: boolean; artwork?: typeof defaultArtwork; preserveStillSky?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const still = useRef<HTMLImageElement>(null);
  const active = useRef(running);
  const syncMotion = useRef<() => void>(() => {});
  const [revision, setRevision] = useState(0);
  // Mirrors data-animating so the device canvases freeze with the rest of the art.
  const [artMoving, setArtMoving] = useState(false);
  useEffect(() => {
    if (!host.current || !canvas.current) return;
    const container = host.current, surface = canvas.current;
    const picture = new Image();
    const stillSky = preserveStillSky ? still.current ?? undefined : undefined;
    const ready = (value: boolean) => { container.dataset.rendered = String(value); };
    const engine = createLandscapeRenderer(surface, picture, ready, {
      stillSky,
      getArtworkAnchor: () => {
        const percent = Number.parseFloat(getComputedStyle(container).getPropertyValue("--welcome-art-anchor"));
        return Number.isFinite(percent) ? percent / 100 : .25;
      },
    });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let onScreen = true;
    const preference = () => {
      const animating = active.current && onScreen && !reduced.matches && !document.hidden;
      container.dataset.animating = String(animating);
      engine?.setRunning(animating);
      setArtMoving(animating);
    };
    syncMotion.current = preference;
    const visibility = new IntersectionObserver(entries => { onScreen = entries[0]?.isIntersecting ?? false; preference(); });
    visibility.observe(surface);
    const load = () => { engine?.load(); preference(); };
    const lost = (event: Event) => { event.preventDefault(); ready(false); engine?.setRunning(false); };
    const restored = () => setRevision(value => value + 1);
    const observer = new ResizeObserver(() => engine?.resize()); observer.observe(surface);
    picture.addEventListener("load", load); stillSky?.addEventListener("load", load);
    surface.addEventListener("webglcontextlost", lost); surface.addEventListener("webglcontextrestored", restored);
    reduced.addEventListener("change", preference); document.addEventListener("visibilitychange", preference);
    if (engine) picture.src = artwork.texture;
    load();
    return () => { observer.disconnect(); visibility.disconnect(); syncMotion.current = () => {}; picture.removeEventListener("load", load); stillSky?.removeEventListener("load", load); surface.removeEventListener("webglcontextlost", lost); surface.removeEventListener("webglcontextrestored", restored); reduced.removeEventListener("change", preference); document.removeEventListener("visibilitychange", preference); engine?.dispose(); container.dataset.animating = "false"; setArtMoving(false); };
  }, [revision, artwork.texture, artwork.still, preserveStillSky]);
  useEffect(() => { active.current = running; syncMotion.current(); }, [running]);
  return <div ref={host} className="welcome-art" data-animating="false" aria-hidden="true">
    {/* eslint-disable-next-line @next/next/no-img-element -- The decorative fallback follows the static artwork pipeline. */}
    <img ref={still} className="welcome-landscape-image" src={artwork.still} alt="" />
    <canvas ref={canvas} className="welcome-landscape-canvas" aria-hidden="true" />
    {showFlights && <WelcomeFlights running={artMoving} artwork={artwork.flights}/>}
  </div>;
}
