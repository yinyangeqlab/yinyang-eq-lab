"use client";

import { useEffect, useRef, useState } from "react";
import { createLandscapeRenderer } from "@/lib/welcome-landscape";

/** A decorative animation of the original art; the picture is the static fallback. */
export default function WelcomeLandscape({ running, artwork = "responsive" }: { running: boolean; artwork?: "responsive" | "amoled" }) {
  const host = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const active = useRef(running);
  const syncMotion = useRef<() => void>(() => {});
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!canvas.current || !image.current) return;
    const surface = canvas.current, picture = image.current;
    const ready = (value: boolean) => { if (host.current) host.current.dataset.rendered = String(value); };
    const engine = createLandscapeRenderer(surface, picture, ready);
    if (!engine) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let onScreen = true;
    const preference = () => engine.setRunning(active.current && onScreen && !reduced.matches && !document.hidden);
    syncMotion.current = preference;
    const visibility = new IntersectionObserver(entries => { onScreen = entries[0]?.isIntersecting ?? false; preference(); });
    visibility.observe(surface);
    const load = () => { engine.load(); preference(); };
    const lost = (event: Event) => { event.preventDefault(); ready(false); engine.setRunning(false); };
    const restored = () => setRevision(value => value + 1);
    const observer = new ResizeObserver(() => engine.resize()); observer.observe(surface);
    picture.addEventListener("load", load); surface.addEventListener("webglcontextlost", lost); surface.addEventListener("webglcontextrestored", restored);
    reduced.addEventListener("change", preference); document.addEventListener("visibilitychange", preference);
    load();
    return () => { observer.disconnect(); visibility.disconnect(); syncMotion.current = () => {}; picture.removeEventListener("load", load); surface.removeEventListener("webglcontextlost", lost); surface.removeEventListener("webglcontextrestored", restored); reduced.removeEventListener("change", preference); document.removeEventListener("visibilitychange", preference); engine.dispose(); };
  }, [revision]);
  useEffect(() => { active.current = running; syncMotion.current(); }, [running]);
  return <div ref={host} className="welcome-art" aria-hidden="true">
    <picture>{artwork === "responsive" && <source media="(min-width: 761px)" srcSet="/brand-landscape.webp" />}<img ref={image} src="/brand-amoled-smooth-moon-v1.webp" alt="" /></picture>
    <canvas ref={canvas} className="welcome-landscape-canvas" aria-hidden="true" />
  </div>;
}
