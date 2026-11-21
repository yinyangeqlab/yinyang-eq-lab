"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { DownloadAppManager } from "@/components/companion-app-brand";
import { companionTrailers } from "@/lib/companion-trailer.mjs";
import { CopyTrailerLink } from "./share-button";

type Format = keyof typeof companionTrailers;
const phonePortrait = "(orientation: portrait) and (max-width: 767px)";
const formats: Format[] = ["landscape", "portrait"];

function subscribe(onChange: () => void) {
  const query = window.matchMedia(phonePortrait);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
function preferredFormat(): Format {
  return window.matchMedia(phonePortrait).matches ? "portrait" : "landscape";
}
function serverFormat(): Format {
  return "landscape";
}

export function TrailerPlayer({ standaloneFormat }: { standaloneFormat?: Format }) {
  const Heading = standaloneFormat ? "h1" : "h2";
  const preferred = useSyncExternalStore(subscribe, preferredFormat, serverFormat);
  const [selected, setSelected] = useState<Format | null>(null);
  const [restore, setRestore] = useState<{
    time: number; resume: boolean; muted: boolean; captions: TextTrackMode;
  } | null>(null);
  const player = useRef<HTMLVideoElement>(null);
  const format = selected ?? standaloneFormat ?? preferred;
  const trailer = companionTrailers[format];

  function choose(next: Format) {
    const video = player.current;
    if (next === format || !video) return;
    setRestore(restore ?? {
      time: video.ended ? 0 : video.currentTime,
      resume: !video.paused && !video.ended,
      muted: video.muted,
      captions: video.textTracks[0]?.mode ?? "disabled",
    });
    setSelected(next);
  }

  function restorePlayback(video: HTMLVideoElement) {
    if (!restore) return;
    video.currentTime = Math.min(restore.time, video.duration);
    video.muted = restore.muted;
    if (video.textTracks[0]) video.textTracks[0].mode = restore.captions;
    if (restore.resume) void video.play().catch(() => {});
    setRestore(null);
  }

  return <section id="trailer" className="companion-trailer" data-format={format} aria-labelledby="trailer-title">
    <div className="trailer-intro">
      <Heading id="trailer-title">Watch the Companion in action</Heading>
      <p>See how to create an EQ offline from your measurements, save your favorite tunings, and try blind A/B.</p>
      <div className="trailer-formats" role="group" aria-label="Trailer format">
        {formats.map(option => <button key={option} type="button" aria-pressed={format === option}
          onClick={() => choose(option)}>{option === "landscape" ? "Landscape" : "Portrait"}</button>)}
      </div>
    </div>
    <video key={format} ref={player} controls playsInline preload={restore ? "metadata" : "none"}
      width={trailer.video.width} height={trailer.video.height} src={trailer.video.path}
      poster={trailer.poster} aria-label="YinYang EQ Companion trailer set to BTFO by Jason J. Chevallier"
      onPlay={() => setSelected(format)} onLoadedMetadata={e => restorePlayback(e.currentTarget)}>
      <track kind="captions" src="/android/companion-btfo.vtt?v=205" srcLang="en" label="English" />
      <a href={trailer.video.path}>Watch the MP4</a>
    </video>
    <div className="trailer-actions">
      <p className="trailer-duration">60 seconds · “BTFO” by Jason J. Chevallier</p>
      <div className="trailer-share-links" role="group" aria-label="Copy a trailer link">
        {formats.map(option => <CopyTrailerLink key={option} format={option} path={companionTrailers[option].path} />)}
      </div>
      {standaloneFormat && <DownloadAppManager className="companion-guide-link trailer-download" />}
    </div>
  </section>;
}
