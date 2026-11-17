"use client";
import { useId, useRef, useState, type ReactNode } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import "./playback-transport.css";
export const playbackClock = (seconds: number) => { const n = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0; return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`; };
export default function PlaybackTransport({ playing, disabled = false, onToggle, volume, onVolume, playLabel = "Play music", pauseLabel = "Pause music", tools, zoom }: { playing: boolean; disabled?: boolean; onToggle: () => void; volume: number; onVolume: (value: number) => void; playLabel?: string; pauseLabel?: string; tools?: ReactNode; zoom?: { value: number; min: number; max: number; available: boolean; onChange: (value: number) => void } }) {
  const [volumeOpen, setVolumeOpen] = useState(false);
  const volumeButton = useRef<HTMLButtonElement>(null);
  const volumeId = useId();
  return <div className="unified-transport-shell" role="group" aria-label="Music playback controls" onKeyDown={event => { if (event.key === "Escape" && volumeOpen) { event.preventDefault(); setVolumeOpen(false); volumeButton.current?.focus(); } }}>
    <div className={`unified-transport${playing ? " is-playing" : ""}`}>
      <div className="unified-tools">{tools}</div>
      <button type="button" className="unified-play" aria-label={playing ? pauseLabel : playLabel} aria-keyshortcuts="Space" disabled={disabled} onClick={onToggle}>{playing ? <Pause size={17} fill="currentColor"/> : <Play size={17} fill="currentColor"/>}<span>{playing ? "Pause" : "Play"}</span></button>
      <div className="unified-end">
        {zoom && <div className="unified-zoom" role="group" aria-label="Waveform zoom"><button type="button" aria-label="Zoom waveform out" disabled={!zoom.available || zoom.value <= zoom.min} onClick={() => zoom.onChange(Math.max(zoom.min, zoom.value / 2))}>−</button><span>{zoom.value}×</span><button type="button" aria-label="Zoom waveform in" disabled={!zoom.available || zoom.value >= zoom.max} onClick={() => zoom.onChange(Math.min(zoom.max, zoom.value * 2))}>+</button></div>}
        <button ref={volumeButton} type="button" className="unified-volume-button" aria-label="Volume" aria-expanded={volumeOpen} aria-controls={volumeId} onClick={() => setVolumeOpen(value => !value)}>{volume === 0 ? <VolumeX size={20}/> : <Volume2 size={20}/>}</button>
      </div>
    </div>
    {volumeOpen && <label id={volumeId} className="unified-volume-control"><span>Volume</span><input type="range" min="0" max="1" step="0.01" value={volume} aria-label="Volume" onChange={event => onVolume(Number(event.target.value))}/><output>{Math.round(volume * 100)}%</output></label>}
  </div>;
}
export function PlaybackTime({ position, duration }: { position: number; duration: number }) { return <div className="unified-time" aria-label="Playback time"><span>{playbackClock(position)}</span><span>{playbackClock(duration)}</span></div>; }
export function NowPlaying({ title, artist, source, playing }: { title: string; artist?: string; source?: string; playing: boolean }) { return <div className="unified-now-playing"><span>{playing ? "NOW PLAYING" : title ? "SELECTED SONG" : "NO SONG SELECTED"}</span><strong title={title}>{title || "Choose music to begin"}</strong>{(artist || source) && <small>{[artist, source].filter(Boolean).join(" · ")}</small>}</div>; }
