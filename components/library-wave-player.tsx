"use client";

import { attachMediaRecovery } from "@/lib/media-recovery";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import TrackWaveform from "@/components/track-waveform";
import { curatedWaveform } from "@/lib/curated-waveforms";
import { playbackGain } from "@/lib/music-preferences";
import type { LibraryEq } from "@/lib/music-library-eq";

type TrackSource = { title: string; artist: string; fileUrl: string; duration: number; integrated_lufs?: number };

function clock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

type EqGraph = { context: AudioContext; normalization: GainNode; preamp: GainNode; filters: BiquadFilterNode[]; safety: DynamicsCompressorNode; ceiling: WaveShaperNode };
const ceilingCurve = new Float32Array(65537);
for (let index = 0; index < ceilingCurve.length; index++) {
  const input = index / (ceilingCurve.length - 1) * 2 - 1;
  const magnitude = Math.abs(input);
  ceilingCurve[index] = Math.sign(input) * (magnitude <= .94 ? magnitude : .94 + .04 * Math.tanh((magnitude - .94) / .04));
}

export default function LibraryWavePlayer({ track, onPlay, onPause, active = false, eq = null, matchLoudness = true, targetLufs = -16 }: { active?: boolean; matchLoudness?: boolean; targetLufs?: number; track: TrackSource; onPlay: (audio: HTMLAudioElement) => void; onPause?: (audio: HTMLAudioElement) => void; eq?: LibraryEq | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const missingAudioProbe = useRef<AbortController | null>(null);
  const playbackAttempt = useRef(0);
  const [audioGeneration, setAudioGeneration] = useState(0);
  const restorePosition = useRef<number | null>(null);
  const mediaRecovery = useRef<ReturnType<typeof attachMediaRecovery> | null>(null);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const attemptCounter = playbackAttempt;
    const recovery = attachMediaRecovery(audio, {
      onRecovering: () => { cancelMissingAudioProbe(); setError(""); setBuffering(true); },
      onRecovered: () => { cancelMissingAudioProbe(); setError(""); setBuffering(false); },
      onFailure: () => { setBuffering(false); setError("The audio connection was interrupted. Press Play to try again."); },
    });
    mediaRecovery.current = recovery;
    return () => { attemptCounter.current++; cancelMissingAudioProbe(); recovery.dispose(); mediaRecovery.current = null; };
  }, [audioGeneration, track.fileUrl]);

  const graph = useRef<EqGraph | null>(null);
  const waveform = curatedWaveform(track.fileUrl);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(track.duration);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    const current = graph.current;
    if (!current) return;
    const now = current.context.currentTime;
    current.normalization.gain.setTargetAtTime(matchLoudness ? playbackGain(track.integrated_lufs, targetLufs) : 1, now, .025);
    current.filters[current.filters.length - 1].disconnect();
    current.filters[current.filters.length - 1].connect(eq ? current.safety : current.context.destination);
    current.preamp.gain.setTargetAtTime(eq ? 10 ** (eq.preamp / 20) : 1, now, .025);
    current.safety.threshold.setTargetAtTime(eq ? -1.5 : 0, now, .025);
    current.ceiling.curve = eq ? ceilingCurve : null;
    current.filters.forEach((node, index) => {
      const filter = eq?.filters[index];
      node.frequency.setTargetAtTime(filter?.hz || 1000, now, .025);
      node.Q.setTargetAtTime(filter?.q || 1, now, .025);
      node.gain.setTargetAtTime(filter?.gain || 0, now, .025);
    });
  }, [eq, matchLoudness, targetLufs, track.integrated_lufs]);
  useEffect(() => () => { if (graph.current && graph.current.context.state !== "closed") void graph.current.context.close(); }, []);

  useEffect(() => {
    if (active || !graph.current) return;
    const audio = audioRef.current;
    restorePosition.current = audio?.ended ? 0 : audio?.currentTime ?? position;
    if (audio) audio.pause();
    const retired = graph.current;
    graph.current = null;
    if (retired.context.state !== "closed") void retired.context.close();
    // A media element can be attached to only one source node. Replace it before the next Play.
    setAudioGeneration(value => value + 1);
  }, [active]);

  function ensureGraph(audio: HTMLAudioElement) {
    if (graph.current) return graph.current;
    const context = new AudioContext();
    const source = context.createMediaElementSource(audio);
    const preamp = context.createGain();
    preamp.gain.value = eq ? 10 ** (eq.preamp / 20) : 1;
    const normalization = context.createGain();
    normalization.gain.value = matchLoudness ? playbackGain(track.integrated_lufs, targetLufs) : 1;
    source.connect(normalization); normalization.connect(preamp);
    const filters = Array.from({ length: 20 }, (_, index) => {
      const node = context.createBiquadFilter();
      const filter = eq?.filters[index];
      node.type = "peaking"; node.frequency.value = filter?.hz || 1000;
      node.Q.value = filter?.q || 1; node.gain.value = filter?.gain || 0;
      return node;
    });
    let previous: AudioNode = preamp;
    filters.forEach(node => { previous.connect(node); previous = node; });
    const safety = context.createDynamicsCompressor();
    safety.threshold.value = eq ? -1.5 : 0;
    safety.knee.value = 0;
    safety.ratio.value = 20;
    safety.attack.value = .003;
    safety.release.value = .08;
    previous.connect(eq ? safety : context.destination);
    const ceiling = context.createWaveShaper();
    ceiling.curve = eq ? ceilingCurve : null;
    ceiling.oversample = "4x";
    safety.connect(ceiling);
    ceiling.connect(context.destination);
    graph.current = { context, normalization, preamp, filters, safety, ceiling };
    return graph.current;
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    cancelMissingAudioProbe();
    const attempt = ++playbackAttempt.current, sourceUrl = audio.src;
    if (!audio.paused) { audio.pause(); return; }
    setError("");
    try {
      await ensureGraph(audio).context.resume();
      if (attempt !== playbackAttempt.current || audioRef.current !== audio || audio.src !== sourceUrl) return;
      if (!mediaRecovery.current?.retry()) await audio.play();
    } catch {
      if (attempt !== playbackAttempt.current || audioRef.current !== audio || audio.src !== sourceUrl || !audio.paused) return;
      setError("This browser could not play this preview."); void explainMissingAudio(audio);
    }
  }

  // A local installation has no recordings. Native media errors hide the HTTP status, so on a loopback host
  // only, a HEAD probe tells an absent file (404, or the 503 the local media route returns without assets)
  // from other failures. Hosted sites keep their existing messages, so an outage is never mislabeled.
  function cancelMissingAudioProbe() {
    missingAudioProbe.current?.abort(); missingAudioProbe.current = null;
  }
  async function explainMissingAudio(audio: HTMLAudioElement | null) {
    cancelMissingAudioProbe();
    if (!audio?.src || audioRef.current !== audio) return;
    const sourceUrl = audio.src;
    let url: URL;
    try { url = new URL(sourceUrl); } catch { return; }
    if (!["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname) || url.origin !== window.location.origin) return;
    const controller = new AbortController(); missingAudioProbe.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(url, { method: "HEAD", cache: "no-store", credentials: "same-origin", signal: controller.signal });
      // Abort alone is insufficient: a settled response can race with retry,
      // successful playback, element replacement or unmount cleanup.
      if (controller.signal.aborted || missingAudioProbe.current !== controller || audioRef.current !== audio || audio.src !== sourceUrl || !audio.paused) return;
      if (response.status === 404 || response.status === 503) setError("This recording's audio file is not installed in this local copy, so it cannot play here. See “Run locally” in the README.");
    } catch {} finally {
      window.clearTimeout(timeout);
      if (missingAudioProbe.current === controller) missingAudioProbe.current = null;
    }
  }

  return <div className="library-player" role="group" aria-label={`Preview ${track.title} by ${track.artist}`}>
    <div className="library-player-controls">
      <button type="button" className="library-play" aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`} onClick={togglePlayback}>{playing ? <Pause size={19} fill="currentColor" aria-hidden="true" /> : <Play size={19} fill="currentColor" aria-hidden="true" />}</button>
      <span className="library-player-time" aria-live="off">{clock(position)} <span aria-hidden="true">/</span> {clock(duration)}</span>
      <label className="library-volume"><span className="sr-only">Volume for {track.title}</span>{volume === 0 ? <VolumeX size={17} aria-hidden="true" /> : <Volume2 size={17} aria-hidden="true" />}<input type="range" min="0" max="1" step="0.01" value={volume} aria-label={`Volume for ${track.title}`} onChange={event => { const next = Number(event.target.value); setVolume(next); if (audioRef.current) audioRef.current.volume = next; }} /></label>
    </div>
    <TrackWaveform compact hideZoom hideHeading analysis={waveform} placeholder="Waveform unavailable" position={position} duration={duration} onSeek={seconds => { if (audioRef.current) { audioRef.current.currentTime = seconds; setPosition(seconds); } }} dynamicRange={0} onDynamicRangeChange={() => {}} />
    {matchLoudness && <small className="library-match-status">{Number.isFinite(track.integrated_lufs) ? `${targetLufs.toFixed(1)} LUFS target · ${(20 * Math.log10(playbackGain(track.integrated_lufs, targetLufs))).toFixed(1)} dB gain` : "Loudness not measured; original level"}</small>}
    {buffering && <p className="library-player-buffering" role="status">Buffering audio…</p>}
    {error && <p className="library-player-error" role="alert">{error}</p>}
    <audio key={audioGeneration} ref={audioRef} src={track.fileUrl} preload="none" crossOrigin="anonymous" onPlay={event => { cancelMissingAudioProbe(); setError(""); setPlaying(true); onPlay(event.currentTarget); }} onPlaying={() => { cancelMissingAudioProbe(); setError(""); setBuffering(false); }} onWaiting={() => setBuffering(true)} onSeeking={() => setBuffering(true)} onSeeked={event => { if (event.currentTarget.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) setBuffering(false); }} onPause={event => { setPlaying(false); setBuffering(false); onPause?.(event.currentTarget); }} onEnded={event => { setPlaying(false); setBuffering(false); setPosition(0); onPause?.(event.currentTarget); }} onTimeUpdate={event => setPosition(event.currentTarget.currentTime)} onLoadedMetadata={event => { if (restorePosition.current !== null) { event.currentTarget.currentTime = Math.min(restorePosition.current, Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : restorePosition.current); event.currentTarget.volume = volume; restorePosition.current = null; } const seconds = event.currentTarget.duration; if (Number.isFinite(seconds) && seconds > 0) setDuration(seconds); }} onError={event => { if (mediaRecovery.current?.handleError()) return; setBuffering(false); setError(audioRef.current?.error?.code === 2 ? "The audio connection was interrupted. Press Play to try again." : "This preview could not be loaded."); void explainMissingAudio(event.currentTarget); }} />
  </div>;
}
