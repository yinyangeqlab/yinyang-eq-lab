"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const themes = [
  { id: "blue", name: "Blue", color: "#9ab7ff" },
  { id: "amoled", name: "AMOLED black", color: "#000" },
  { id: "light", name: "Light", color: "#f3f4f6" },
  { id: "green", name: "YinYang green", color: "#76e3ba" },
] as const;

const screens = [
  { id: "presets", name: "Presets", alt: "Preset browser with PEQ Filters (USR) and Channel Match (SPK)." },
  { id: "eq", name: "PEQ editor", alt: "Listening demo draft with file import and export and a stereo response graph." },
  { id: "match", name: "Channel Match", alt: "Studio match draft with Left and Right channel selectors." },
  { id: "compare", name: "Compare EQ", alt: "Blind A/B setup with two EQs selected and Loudness match enabled." },
  { id: "audio", name: "Audio", alt: "Playback status, hardware and Android volume, battery and input priority." },
  { id: "usb", name: "USB & microphone", alt: "USB profile and microphone settings for the original 5K." },
  { id: "mixer", name: "Phone audio mixer", alt: "Phone mixer with controls for adding a source and choosing an output." },
  { id: "collection", name: "My Collection", alt: "The Lab’s My Collection page inside the Companion." },
  { id: "tuning", name: "Personal Tuning", alt: "The Lab’s headphone search and target selection inside the Companion." },
  { id: "debug", name: "Debug", alt: "Firmware compatibility, active EQ export and diagnostic tests." },
] as const;

export function CompanionGallery() {
  const [theme, setTheme] = useState<(typeof themes)[number]>(themes[0]);
  const [index, setIndex] = useState(3);
  const start = useRef<{ x: number; y: number } | null>(null);
  const screen = screens[index];
  const step = (offset: number) => setIndex(i => (i + offset + screens.length) % screens.length);
  return (
    <section className="companion-gallery" aria-label="App screen previews" aria-roledescription="carousel"
      onKeyDown={event => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          step(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}>
      <fieldset className="gallery-themes">
        <legend>Preview theme</legend>
        {themes.map(option => (
          <button key={option.id} type="button" aria-pressed={option.id === theme.id} onClick={() => setTheme(option)}>
            <span aria-hidden="true" style={{ background: option.color }}/>{option.name}
          </button>
        ))}
      </fieldset>
      <figure className="companion-screen">
        <div className="gallery-stage"
          onTouchStart={e => { const t = e.touches[0]; start.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null; }}
          onTouchCancel={() => { start.current = null; }}
          onTouchEnd={e => {
            const t = e.changedTouches[0], from = start.current;
            start.current = null;
            if (!from) return;
            const dx = t.clientX - from.x;
            if (Math.abs(dx) > 48 && Math.abs(dx) > 1.5 * Math.abs(t.clientY - from.y)) step(dx < 0 ? 1 : -1);
          }}>
          <button type="button" className="gallery-arrow" aria-label="Previous app screen" onClick={() => step(-1)}><ChevronLeft aria-hidden="true"/></button>
          <img key={theme.id + screen.id} src={`/android/screens/${theme.id}/${screen.id}.webp`} width="500" height="1000"
            alt={`${screen.alt} ${theme.name} theme.`}/>
          <button type="button" className="gallery-arrow" aria-label="Next app screen" onClick={() => step(1)}><ChevronRight aria-hidden="true"/></button>
        </div>
        <figcaption aria-live="polite" aria-atomic="true">{screen.name}<span> · {index + 1} of {screens.length}</span></figcaption>
      </figure>
      <div className="gallery-dots" role="group" aria-label="Choose an app screen">
        {screens.map((s, i) => <button type="button" key={s.id} aria-label={s.name} title={s.name} aria-current={i === index ? "true" : undefined} onClick={() => setIndex(i)}><span/></button>)}
      </div>
    </section>
  );
}
