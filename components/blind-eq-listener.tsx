"use client";

import { useEffect, useRef, useState } from "react";
import { BlindEqPlayer, EQ_COMPARISON_PLAY_EVENT, prepareComparison, type PreparedComparison } from "@/lib/blind-eq-audio";
import type { EqPreset } from "@/lib/blind-eq";
import type { ChannelMatch } from "@/lib/channel-balance";

export type EqSong = { id: string; title: string; artist: string; url?: string; file?: File };
export type ListeningEvidence = { heard: [number, number]; start: number; seconds: number };
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export default function BlindEqListener({ song, presets, match, context, onEvidence, initialVolume = 1, onVolumeChange, sourceCache, sharedMatch, freeListening = false, sideLabels }: { freeListening?: boolean; sideLabels?: [string, string]; sourceCache?: { current: { id: string; buffer: AudioBuffer; start?: number } | null }; sharedMatch?: ChannelMatch; context?: AudioContext; initialVolume?: number; onVolumeChange?: (volume: number) => void; song: EqSong; presets: [EqPreset, EqPreset]; match: boolean; onEvidence: (evidence: ListeningEvidence) => void }) {
  const player = useRef<BlindEqPlayer | null>(null), source = useRef<AudioBuffer | null>(null), prepared = useRef<PreparedComparison | null>(null);
  const playRequest = useRef(0), generation = useRef(0), controller = useRef<AbortController | null>(null), heardRef = useRef<[number, number]>([0, 0]);
  const sideRef = useRef<0 | 1>(0), volumeRef = useRef(initialVolume), lastTime = useRef(0), passageRef = useRef({ start: 0, seconds: 15 });
  const report = useRef(onEvidence);
  useEffect(() => { report.current = onEvidence; }, [onEvidence]);
  const [looping, setLooping] = useState(false);
  const [busy, setBusy] = useState(false), [ready, setReady] = useState(false), [playing, setPlaying] = useState(false), [error, setError] = useState("");
  const [needsAdminSignIn, setNeedsAdminSignIn] = useState(false);
  const [side, setSide] = useState<0 | 1>(0), [volume, setVolume] = useState(initialVolume), [heard, setHeard] = useState<[number, number]>([0, 0]);
  const [duration, setDuration] = useState(0), [start, setStart] = useState(0), [draftStart, setDraftStart] = useState(0), [position, setPosition] = useState(0);

  function resetEvidence() { heardRef.current = [0, 0]; setHeard([0, 0]); report.current({ heard: [0, 0], ...passageRef.current }); }
  function pause() { playRequest.current++; player.current?.pause(); setPlaying(false); }
  useEffect(() => {
    // Generated-set rounds remount for each pair. Reuse decoded audio and prepare,
    // without autoplay, when the shared context is already running.
    if (sourceCache?.current?.id === song.id && context?.state === "running") void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- One preparation per keyed listener instance; later passage changes are explicit.
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = player.current;
      if (!current) return;
      const now = current.elapsed, delta = Math.max(0, Math.min(.3, now - lastTime.current));
      lastTime.current = Math.max(lastTime.current, now);
      if (freeListening || current.playing) setPosition(Math.max(0, current.time));
      if (!current.playing) { setPlaying(false); return; }
      if (document.visibilityState !== "visible" || volumeRef.current <= 0) return;
      const next: [number, number] = [...heardRef.current]; next[sideRef.current] = Math.min(freeListening ? Infinity : 5, next[sideRef.current] + delta);
      heardRef.current = next; setHeard(next); report.current({ heard: next, ...passageRef.current });
    }, 100);
    const visibility = () => { if (document.visibilityState !== "visible") { playRequest.current++; player.current?.pause(); setPlaying(false); } };
    document.addEventListener("visibilitychange", visibility);
    // These refs own resources for this component instance, rather than DOM nodes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", visibility); generation.current++; playRequest.current++; controller.current?.abort(); const retired = player.current; player.current = null; source.current = null; prepared.current = null; void retired?.close(); };
  }, [freeListening]);

  async function renderPassage(decoded: AudioBuffer, at: number, token: number, signal: AbortSignal) {
    const seconds = Math.min(15, decoded.duration);
    const value = await prepareComparison(decoded, presets, at, seconds, match, signal, sharedMatch, freeListening);
    if (token !== generation.current || signal.aborted) return;
    if (sourceCache?.current?.id === song.id) sourceCache.current.start = at;
    player.current?.restart(); prepared.current = value; passageRef.current = { start: at, seconds: value.seconds };
    setStart(at); setDraftStart(at); resetEvidence(); setReady(true); setPosition(0);
  }
  async function load() {
    const token = ++generation.current;
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setError(""); setNeedsAdminSignIn(false); setBusy(true); setReady(false); setDuration(0); setStart(0); setDraftStart(0); resetEvidence(); pause(); source.current = null; prepared.current = null;
    try {
      player.current ??= new BlindEqPlayer(context);
      // Resume in the user gesture before any asynchronous fetch/decode.
      const current = player.current; current.setVolume(volumeRef.current);
      await current.resume();
      if (token !== generation.current || abort.signal.aborted) return;
      const cached = sourceCache?.current;
      if (cached?.id === song.id) {
        source.current = cached.buffer; setDuration(cached.buffer.duration);
        const at = cached.start ?? Math.min(Math.floor(cached.buffer.duration * .3), Math.max(0, cached.buffer.duration - 15));
        await renderPassage(cached.buffer, at, token, abort.signal); return;
      }
      // Retain at most one decoded recording across generated-set rounds.
      if (sourceCache) sourceCache.current = null;
      let data: ArrayBuffer;
      if (song.file) { if (song.file.size > 100_000_000) throw Error("Choose a recording under 100 MB."); data = await song.file.arrayBuffer(); }
      else {
        const response = await fetch(song.url!, { signal: abort.signal });
        if (token !== generation.current || abort.signal.aborted) return;
        if (response.status === 503 && response.headers.get("X-YinYang-Service") === "owner-only-maintenance") {
          setNeedsAdminSignIn(true); throw Error("This recording requires an authenticated admin while the site is closed. Open admin sign-in in another tab, then retry here without losing your session.");
        }
        if (!response.ok) throw Error(response.status === 401 || response.status === 403 ? "Sign in to access Listening Pool recordings, or choose a local audio file." : "This recording could not be loaded. Try another song or a local file.");
        if (Number(response.headers.get("content-length")) > 100_000_000) throw Error("Choose a recording under 100 MB.");
        data = await response.arrayBuffer();
      }
      if (token !== generation.current || abort.signal.aborted) return;
      if (data.byteLength > 100_000_000) throw Error("Choose a recording under 100 MB.");
      let decoded: AudioBuffer;
      try { decoded = await current.context.decodeAudioData(data); }
      catch { throw Error("This browser could not decode the audio. Try a shorter WAV or MP3 file; long or compressed files can need substantial memory, especially on mobile."); }
      if (token !== generation.current) return;
      if (decoded.numberOfChannels > 2) throw Error("Use a mono or stereo recording for this comparison.");
      if (decoded.duration > 1200 || decoded.length * decoded.numberOfChannels * 4 > 200_000_000) throw Error("Choose audio under 20 minutes and 200 MB of decoded samples. Use a shorter excerpt on mobile.");
      if (!freeListening && decoded.duration < 5) throw Error("Choose a recording at least five seconds long.");
      if (sourceCache) sourceCache.current = { id: song.id, buffer: decoded };
      source.current = decoded; setDuration(decoded.duration);
      const at = Math.min(Math.floor(decoded.duration * .3), Math.max(0, decoded.duration - 15));
      setDraftStart(at); await renderPassage(decoded, at, token, abort.signal);
    } catch (cause) { if (token === generation.current) setError(cause instanceof Error ? cause.message : "This browser could not decode the audio."); }
    finally { if (token === generation.current) setBusy(false); }
  }
  async function changePassage() {
    if (!source.current || busy) return;
    const decoded = source.current, token = ++generation.current;
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    pause(); player.current?.restart(); prepared.current = null; setReady(false); setBusy(true); setError(""); resetEvidence();
    try { await renderPassage(decoded, draftStart, token, abort.signal); }
    catch (cause) { if (token === generation.current) setError(cause instanceof Error ? cause.message : "Could not prepare this passage."); }
    finally { if (token === generation.current) setBusy(false); }
  }
  async function play(loop = looping) {
    const current = player.current, value = prepared.current, token = generation.current;
    if (!current || !value || document.visibilityState !== "visible") return;
    const request = ++playRequest.current;
    setError("");
    try {
      await current.resume();
      if (request !== playRequest.current || token !== generation.current || player.current !== current || prepared.current !== value || document.visibilityState !== "visible") return;
      window.dispatchEvent(new Event(EQ_COMPARISON_PLAY_EVENT));
      if (freeListening && source.current && value.gains) {
        const section = passageRef.current;
        const range = loop ? { start: section.start, end: section.start + section.seconds } : undefined;
        current.playTrack(source.current, presets, value.gains, sideRef.current, range, sharedMatch);
      } else {
        current.play(value, sideRef.current);
      }
      lastTime.current = current.elapsed + .02;
      setPlaying(true);
    } catch { if (request === playRequest.current && token === generation.current) setError("Playback was interrupted. Press Play to try again."); }
  }
  function switchSide(next: 0 | 1) {
    if (next === sideRef.current) return;
    sideRef.current = next; setSide(next); player.current?.switch(next);
    // Exclude the short crossfade from either side's listening evidence.
    lastTime.current = (player.current?.elapsed || 0) + .08;
  }
  const changed = Math.abs(draftStart - start) > .01;
  return <section className="eq-card eq-listener" aria-label={sideLabels ? "EQ listening player" : "Blind listening player"}>
    <h2>{song.title}</h2><p className="eq-muted">{song.artist}</p>
    {!ready && duration === 0 && <button type="button" className="eq-primary" disabled={busy} onClick={() => void load()}>{busy ? "Preparing both EQs…" : "Get this song ready"}</button>}
    {busy && <p role="status">Preparing the same section with both EQ settings…</p>}
    {ready && <>
      <div className={sideLabels ? "eq-ab eq-ab-named" : "eq-ab"} role="group" aria-label="Choose the EQ to hear">{([0, 1] as const).map(value => <button type="button" key={value} aria-pressed={side === value} onClick={() => switchSide(value)}><strong>{sideLabels?.[value] ?? (value === 0 ? "A" : "B")}</strong><span>{side === value ? "Selected" : "Switch to this EQ"}</span></button>)}</div>
      <div className="eq-actions">
        <button type="button" className="eq-primary" onClick={() => playing ? pause() : void play()}>{playing ? "Pause" : `Play ${sideLabels?.[side] ?? (side === 0 ? "A" : "B")}`}</button>
        <button type="button" onClick={() => {
          const wasPlaying = player.current?.playing;
          pause();
          if (freeListening) player.current?.seek(start);
          else player.current?.restart();
          setPosition(freeListening ? start : 0);
          if (wasPlaying) void play();
        }}>Replay this section</button>
        {freeListening && <button type="button" aria-pressed={looping} onClick={() => {
          const wasPlaying = player.current?.playing;
          setLooping(!looping);
          if (wasPlaying) void play(!looping);
        }}>Loop this section</button>}
        <span>{freeListening ? `${clock(position)} / ${clock(duration)}` : `${clock(start + position)} / ${clock(start + Math.min(15, duration))} · loops`}</span>
      </div>
      <label className="eq-volume">Listening volume<input aria-label="Listening volume" type="range" min={0} max={1} step={.01} value={volume} onChange={event => { const value = Number(event.target.value); volumeRef.current = value; setVolume(value); onVolumeChange?.(value); player.current?.setVolume(value); lastTime.current = player.current?.elapsed || 0; }} /><span>{Math.round(volume * 100)}%</span></label>
      <div className="eq-heard" role="group" aria-label="Listening progress">{heard.map((value, index) => <span key={index}>{sideLabels?.[index] ?? (index === 0 ? "A" : "B")}: {freeListening ? value > 0 ? "played" : "waiting" : value >= 5 ? "ready" : `${(Math.floor(value * 10) / 10).toFixed(1)} / 5 s`}</span>)}</div>
    </>}
    {duration > 0 && <>
      <label className="eq-passage">Section start · {clock(draftStart)}<input type="range" aria-label="Section start" disabled={busy} min={0} max={Math.max(0, duration - Math.min(15, duration))} step={.1} value={draftStart} onChange={event => setDraftStart(Number(event.target.value))} /></label>
      <button type="button" disabled={busy || (ready && !changed)} onClick={() => void changePassage()}>{ready ? "Use this section" : "Prepare this section"}</button>
      <p className="eq-muted">{freeListening ? "The track plays through by default. The selected section sets the level match and optional loop. Loudness may vary elsewhere in the track." : <>{!ready ? "Choose another passage and prepare it, or skip this song. " : changed ? "The player still uses the previous passage until you apply this change. " : ""}Both EQs use the same {Math.min(15, duration).toFixed(0)} seconds. {match ? "Rendered stereo RMS levels are matched for this passage; perceived loudness can still differ." : "Preset preamp differences are preserved."} {sharedMatch && "The same channel correction is applied to both. "}Common headroom protects sample peaks. Start at a comfortable volume with other EQ disabled.</>}</p>
    </>}
    {needsAdminSignIn && <p><a href="/admin-login" target="_blank" rel="noopener noreferrer">Open admin sign-in in a new tab</a></p>}
    {error && <p className="eq-error" role="alert">{error}</p>}
  </section>;
}
