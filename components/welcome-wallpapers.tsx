"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, ExternalLink, Play } from "lucide-react";
import { buildLabel } from "@/lib/release-info";
import { offlineWallpaperFilename, wallpaperDirectory, wallpaperFilename, wallpaperFormats, wallpaperManifest, wallpaperScenes, wallpaperSizes } from "@/lib/welcome-wallpapers";

type WallpaperScene = typeof wallpaperScenes[number];

function downloadGroups(scene: WallpaperScene) {
  return [
    ...([["video", "Animated loops"], ["still", "Still images"]] as const).map(([kind, label]) => ({
      label,
      choices: wallpaperSizes.flatMap(size => wallpaperFormats.filter(format => format.kind === kind).map(format => ({
        name: wallpaperFilename(scene.id, size.id, format.extension),
        label: `${size.label} ${format.label}`,
        detail: `${size.width} × ${size.height}`,
        previewable: true,
      }))),
    })),
    { label: "Live desktop wallpaper", choices: [{ name: offlineWallpaperFilename(scene.id), label: "Offline HTML (ZIP)", detail: "Fits your display", previewable: false }] },
  ];
}

const files = wallpaperScenes.flatMap(scene => downloadGroups(scene).flatMap(group => group.choices.map(choice => choice.name)));

function wallpaperUrl(name: string) {
  return `${wallpaperDirectory}/${name}?v=${buildLabel}`;
}

function WallpaperPreview({ scene }: { scene: WallpaperScene }) {
  const [format, setFormat] = useState<"webm" | "mp4" | "unavailable" | null>(null);
  const player = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    player.current?.focus({ preventScroll: true });
  }, [format]);
  const poster = wallpaperUrl(wallpaperFilename(scene.id, "1080p", "jpg"));
  if (format === "webm" || format === "mp4") return <video
    key={format}
    ref={player}
    aria-label={`${scene.title} animation preview`}
    autoPlay controls loop muted playsInline
    poster={poster}
    src={wallpaperUrl(wallpaperFilename(scene.id, "1080p", format))}
    onError={() => setFormat(format === "webm" ? "mp4" : "unavailable")}
  />;

  return <>
    <button type="button" className="welcome-wallpaper-preview"
      aria-label={`Preview animation · ${scene.title}`} onClick={() => setFormat("webm")}>
      {/* eslint-disable-next-line @next/next/no-img-element -- This prepared poster is also the 1080p download. */}
      <img src={poster} alt="" width={1920} height={1080} loading="lazy" decoding="async"/>
      <span><Play size={14} aria-hidden="true"/> Preview animation</span>
    </button>
    {format === "unavailable" && <p role="status">The preview couldn’t play. You can download a video below.</p>}
  </>;
}

function WallpaperDownload({ scene, sizes }: { scene: WallpaperScene; sizes: Record<string, number> }) {
  const groups = downloadGroups(scene);
  const [selectedName, setSelectedName] = useState(groups[0].choices[0].name);
  const choice = groups.flatMap(group => group.choices).find(item => item.name === selectedName) ?? groups[0].choices[0];

  return <div className="welcome-wallpaper-download">
    <select value={choice.name} onChange={event => setSelectedName(event.currentTarget.value)} aria-label={`${scene.title} download format`}>
      {groups.map(group => <optgroup key={group.label} label={group.label}>
        {group.choices.map(item => <option key={item.name} value={item.name}>
          {item.label} · {(sizes[item.name] / 1_000_000).toFixed(1)} MB
        </option>)}
      </optgroup>)}
    </select>
    <a href={wallpaperUrl(choice.name)} download={choice.name} aria-label={`Download ${scene.title} · ${choice.label}`}>
      <Download size={15} aria-hidden="true"/> Download
    </a>
    <div className="welcome-wallpaper-download-detail">
      <small>{choice.detail}</small>
      {choice.previewable && <a href={wallpaperUrl(choice.name)} target="_blank" rel="noopener noreferrer"
        aria-label={`Open full size: ${scene.title} · ${choice.label} (new tab)`}>
        Open full size <ExternalLink size={13} aria-hidden="true"/>
      </a>}
    </div>
  </div>;
}

function WallpaperGallery() {
  const [sizes, setSizes] = useState<Record<string, number> | null>();
  useEffect(() => {
    const abort = new AbortController();
    fetch(wallpaperUrl(wallpaperManifest), { signal: abort.signal })
      .then(async response => {
        if (!response.ok) throw Error("Wallpapers unavailable");
        const sizes = await response.json() as Record<string, number>;
        if (!sizes || !files.every(name => Number.isSafeInteger(sizes[name]) && sizes[name] > 0)) throw Error("Incomplete wallpaper set");
        if (!abort.signal.aborted) setSizes(sizes);
      })
      .catch(() => { if (!abort.signal.aborted) setSizes(null); });
    return () => abort.abort();
  }, []);

  return <section className="welcome-wallpapers" aria-labelledby="wallpapers-title">
    <div className="welcome-section-head">
      <h2 id="wallpapers-title">Homepage wallpapers</h2>
      <p>Thought the homepage animation would look good on your desktop? We did too. Take a wallpaper with you, free, and show your YinYang EQ spirit.</p>
    </div>
    {sizes === undefined && <p role="status">Loading wallpapers…</p>}
    {sizes === null && <p role="status">Wallpaper downloads are unavailable in this build.</p>}
    {sizes && <><div className="welcome-wallpaper-grid">
      {wallpaperScenes.map(scene => <article key={scene.id} className="welcome-wallpaper-card">
        <h3>{scene.title}</h3>
        <WallpaperPreview scene={scene}/>
        <WallpaperDownload scene={scene} sizes={sizes}/>
      </article>)}
    </div>
    <details className="welcome-wallpaper-help">
      <summary>Use as a live desktop wallpaper</summary>
      <p>Choose <strong>Offline HTML (ZIP)</strong> and extract it into its own folder. Open <strong>index.html</strong> in a browser, or import it as a web wallpaper in an app such as Wallpaper Engine or Lively on Windows. It runs on your computer without streaming.</p>
    </details></>}
  </section>;
}

export default function WelcomeWallpapers() {
  const [open, setOpen] = useState(false);
  return <details id="wallpapers" className="welcome-wallpaper-disclosure"
    onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="welcome-wallpaper-toggle">
      Wallpapers <ChevronDown size={14} aria-hidden="true"/>
    </summary>
    {open && <WallpaperGallery/>}
  </details>;
}
