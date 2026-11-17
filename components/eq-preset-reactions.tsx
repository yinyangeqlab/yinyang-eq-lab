"use client";

import { useEffect, useRef, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { EQ_COMPARISON_PLAY_EVENT } from "@/lib/blind-eq-audio";
import { replaceEqStage, watchAudioInterruptions } from "@/lib/eq-playback";
import type { PublishedPreset } from "@/lib/eq-rankings";
import { parseLibraryEq, type LibraryEq } from "@/lib/music-library-eq";
import { listeningPool } from "@/lib/music-catalog";

type Preview = NonNullable<PublishedPreset["preview"]>;
type Reaction = "up" | "down";
type Snapshot = { up: number; down: number; mine: Reaction | null; canReact: boolean };
const choices = [{ value: "up", Icon: ThumbsUp, label: "Thumbs up" }, { value: "down", Icon: ThumbsDown, label: "Thumbs down" }] as const;
const previewTrack = listeningPool.find(track => !track.permissionOnly);
const endpoint = "/api/eq-preset-reactions";

async function readSnapshot(response: Response): Promise<Snapshot> {
  const result = await response.json() as Partial<Snapshot> & { error?: string };
  if (!response.ok) throw Error(result.error || "Could not load preset reactions.");
  if (typeof result.up !== "number" || typeof result.down !== "number" || typeof result.canReact !== "boolean" ||
      (result.mine !== "up" && result.mine !== "down" && result.mine !== null)) throw Error("Could not load preset reactions.");
  return { up: result.up, down: result.down, mine: result.mine, canReact: result.canReact };
}

async function loadPreset(url: string, sha256: string, name: string, signal: AbortSignal) {
  const response = await fetch(url, { redirect: "error", signal });
  if (!response.ok) throw Error("This preset file could not be loaded.");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 100_000) throw Error("This preset file is too large.");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const version = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  if (version !== sha256) throw Error("This preset version changed. Refresh the page to try it.");
  return parseLibraryEq(new TextDecoder("utf-8", { fatal: true }).decode(bytes), name);
}

function ReactionPreview({ modelId, presetId, name, preview }: { modelId: string; presetId: string; name: string; preview: Preview }) {
  const [eq, setEq] = useState<LibraryEq | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [heard, setHeard] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [reactionMessage, setReactionMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const startingPlayback = useRef(false);
  const audio = useRef<HTMLAudioElement>(null);
  const graph = useRef<{ context: AudioContext; dispose: () => void } | null>(null);

  const params = new URLSearchParams({ model: modelId, preset: presetId, version: preview.sha256 });
  const reactionUrl = `${endpoint}?${params}`;
  const previewUrl = `${reactionUrl}&preview=1`;

  useEffect(() => {
    const request = new AbortController();
    void loadPreset(previewUrl, preview.sha256, name, request.signal)
      .then(preset => { if (!request.signal.aborted) setEq(preset); })
      .catch(() => { if (!request.signal.aborted) setAudioError("This preview could not be loaded. Close it and try again."); });
    void fetch(reactionUrl, { cache: "no-store", signal: request.signal }).then(readSnapshot)
      .then(state => { if (!request.signal.aborted) setSnapshot(state); })
      .catch(() => { if (!request.signal.aborted) setReactionMessage("Could not load reactions. Close this preview and try again."); });

    const element = audio.current;
    const stopForOtherAudio = (event: Event) => { if (event.target !== element) element?.pause(); };
    const stopWhenHidden = () => { if (document.hidden) element?.pause(); };
    document.addEventListener("play", stopForOtherAudio, true);
    document.addEventListener("visibilitychange", stopWhenHidden);
    window.addEventListener(EQ_COMPARISON_PLAY_EVENT, stopForOtherAudio);
    return () => {
      request.abort();
      document.removeEventListener("play", stopForOtherAudio, true);
      document.removeEventListener("visibilitychange", stopWhenHidden);
      window.removeEventListener(EQ_COMPARISON_PLAY_EVENT, stopForOtherAudio);
      element?.pause();
      graph.current?.dispose();
      graph.current = null;
    };
  }, [name, preview.sha256, previewUrl, reactionUrl]);

  async function togglePlayback() {
    const element = audio.current;
    if (!element || !eq || startingPlayback.current) return;
    if (!element.paused) { element.pause(); return; }
    startingPlayback.current = true;
    setStarting(true);
    setAudioError("");
    let created: AudioContext | undefined;
    try {
      if (!graph.current) {
        const context = created = new AudioContext();
        const output = context.createGain();
        const source = context.createMediaElementSource(element);
        const stage = replaceEqStage(context, source, output, eq.filters);
        output.gain.value = 0.3 * 10 ** (eq.preamp / 20);
        output.connect(context.destination);
        const stopWatching = watchAudioInterruptions(context, () => element, () => setPlaying(false));
        graph.current = { context, dispose() { stopWatching(); stage.dispose(); output.disconnect(); void context.close(); } };
      }
      await Promise.all([graph.current.context.resume(), element.play()]);
    } catch {
      element.pause();
      if (created && !graph.current) void created.close();
      if (element.isConnected) setAudioError("Playback failed. Close this preview and try again.");
    } finally {
      startingPlayback.current = false;
      if (element.isConnected) setStarting(false);
    }
  }

  function recordPlayback() {
    const element = audio.current;
    if (!element || element.paused || element.seeking || graph.current?.context.state !== "running") return;
    const last = element.played.length - 1;
    if (last >= 0 && element.played.end(last) > element.played.start(last)) setHeard(true);
  }

  async function react(choice: Reaction | null) {
    if (pending.current || (choice === null ? !snapshot?.mine : !heard || !snapshot?.canReact)) return;
    pending.current = true;
    setSaving(true);
    setReactionMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelId, preset: presetId, version: preview.sha256, choice }),
      });
      setSnapshot(await readSnapshot(response));
      setReactionMessage(choice === null ? "Reaction removed." : "Reaction saved.");
    } catch (error) {
      setReactionMessage(error instanceof Error ? error.message : "Could not save your reaction.");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return <div className="eq-reaction-preview">
    <audio ref={audio} src={previewTrack?.fileUrl} preload="none" onPlaying={() => setPlaying(true)}
      onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={recordPlayback}
      onError={() => { setPlaying(false); setAudioError("The preview recording is unavailable."); }} />
    {previewTrack && <p>{previewTrack.title} · {previewTrack.artist}</p>}
    <button type="button" disabled={!eq || !previewTrack || starting} onClick={() => void togglePlayback()}>{starting ? "Starting preview…" : playing ? "Pause preview" : "Play preview"}</button>
    {eq && <p><a href={previewUrl} download={`${presetId}.txt`}>Download EQ preset</a></p>}
    {audioError && <p role="alert">{audioError}</p>}
    <p>Reactions contribute to public preset totals. Model rankings use level-matched A/B results.</p>
    {!heard ? <p>Play the preview to react.</p> : snapshot && !snapshot.canReact && <p>Participating accounts can save reactions. <a href="/my-data">Review your data choices</a>.</p>}
    <div className="eq-reaction-actions" role="group" aria-label={`Reactions for ${name}`}>
      {choices.map(({ value, Icon, label }) => <button key={value} type="button"
        aria-pressed={snapshot?.mine === value} disabled={!heard || !snapshot?.canReact || saving} onClick={() => void react(value)}>
        <Icon size={16} aria-hidden="true"/>{label}{snapshot && <span> · {snapshot[value]}</span>}
      </button>)}
      {snapshot?.mine && <button type="button" disabled={saving} onClick={() => void react(null)}>Remove reaction</button>}
    </div>
    <p role="status">{reactionMessage}</p>
  </div>;
}

export default function EqPresetReactions({ modelId, preset }: { modelId: string; preset: PublishedPreset }) {
  const [open, setOpen] = useState(false);
  if (!preset.preview) return null;
  return <details className="eq-preset-reactions" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Try preset and react</summary>
    {open && <ReactionPreview key={preset.preview.sha256} modelId={modelId} presetId={preset.id} name={preset.name} preview={preset.preview}/>}
  </details>;
}
