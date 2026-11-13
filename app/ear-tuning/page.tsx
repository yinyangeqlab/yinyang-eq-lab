"use client";

import { PERSONAL_AREA_TITLE } from "@/lib/personal-area";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Headphones, Pause, Play, Save, SlidersHorizontal, Trash2 } from "lucide-react";
import BeforeYouListen from "@/components/before-you-listen";
import MusicTrackPicker from "@/components/music-track-picker";
import { type PeqFilter, response } from "@/lib/autoeq";
import { fitAutoEqAsync } from "@/lib/autoeq-client";
import type { AutoEqFit } from "@/lib/autoeq-fit";
import AutoEqCurveStatus from "@/components/autoeq-curve-status";
import { TargetCurveDownloads } from "@/components/target-curve-downloads";
import { useAutoEqSourceCurves } from "@/lib/use-autoeq-source-curves";
import { autoEqPickerTargets, autoEqTargetStorageKey, isSourceAutoEqTarget, readLocalAutoEqTargets } from "@/lib/autoeq-target-sources";
import { downloadLocalFile } from "@/lib/channel-match-export";
import type { Point } from "@/lib/curves";
import { EarTuningAudio, EAR_ADJUSTMENT_LIMIT, EAR_LOW_HZ, EAR_HIGH_HZ, EAR_SWEEP_SECONDS, sweepFrequency, type EarSignal } from "@/lib/ear-tuning-audio";
import { DEFAULT_FITTER } from "@/lib/fitter-settings";
import type { HeadphoneMeasurement } from "@/lib/measurement";
import { listeningPool } from "@/lib/music-catalog";
import { safeLibraryEq, saveLibraryEq } from "@/lib/music-library-eq";
import FrequencyNavigator from "./frequency-navigator";
import EarTuningGuide from "./guide";
import PeakDipIcon from "./peak-dip-icon";
import { useEarPlaybackKeys } from "./playback-keys";
import RankedPractice from "./ranked-practice";
import { gainLimit, type Adjustment, type AdjustmentEditor } from "./adjustment-handles";
import AdjustmentWidth from "./adjustment-width";
import "./style.css";

type MarkKind = "peak" | "dip";
type Target = { id: string; name: string; points: Point[] };
type Base = { key: string; fit: AutoEqFit };
const flat: Target = { id: "flat", name: "Flat reference", points: [[20, 0], [20000, 0]] };
const emptyFilters: PeqFilter[] = [];
const INITIAL_LISTENING_LEVEL = .10;
const stimuli = [
  { id: "sine", name: "Sine tone", help: "Hear one pitch at a time to locate a peak or dip." },
  { id: "pink", name: "Pink noise", help: "Move the playhead to listen to different bands of noise." },
  { id: "harmonics", name: "Harmonic tone", help: "Hear the selected pitch with overtones, closer to a musical note." },
  { id: "music", name: "Music", help: "Play a familiar passage to decide if the change helps." },
] as const;
const pitchOffsets = [
  { label: "Lower", octaves: -1 / 6 },
  { label: "Center", octaves: 0 },
  { label: "Higher", octaves: 1 / 6 },
];
const sweepRanges = [
  { name: "Bass · 40–250 Hz", from: 40, to: 250 },
  { name: "Mids · 250 Hz–2 kHz", from: 250, to: 2000 },
  { name: "Treble · 2–14 kHz", from: 2000, to: 14000 },
];
const boundHz = (value: number) => Math.min(EAR_HIGH_HZ, Math.max(EAR_LOW_HZ, Math.round(value)));
const prettyHz = (hz: number) => `${Math.round(hz).toLocaleString("en-US")} Hz`;
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export default function EarTuningPage() {
  const audio = useRef<HTMLAudioElement>(null);
  const engine = useRef<EarTuningAudio | null>(null);
  const stopPracticeRef = useRef<(() => void) | null>(null);
  const stopRankedRef = useRef<(() => void) | null>(null);
  const rankedDetails = useRef<HTMLDetailsElement>(null);
  const warningAcknowledged = useRef(false);
  const pendingListening = useRef<(() => void) | null>(null);
  const [warningOpen, setWarningOpen] = useState(false);
  const fileUrl = useRef("");
  const fitRequest = useRef<AbortController | null>(null);
  const [signal, setSignal] = useState<EarSignal>("sine");
  const [hz, setHz] = useState(2400);
  const [pitchAnchor, setPitchAnchor] = useState<number | null>(null);
  const [rangeIndex, setRangeIndex] = useState(2);
  const [volume, setVolume] = useState(INITIAL_LISTENING_LEVEL);
  const volumeRef = useRef(INITIAL_LISTENING_LEVEL);
  const [pinkFocus, setPinkFocus] = useState(true);
  const [musicFocus, setMusicFocus] = useState(true);
  const [bypass, setBypass] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [outputPeak, setOutputPeak] = useState(0);
  const [starting, setStarting] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [selectedAdjustment, setSelectedAdjustment] = useState<string>();
  const [songIndex, setSongIndex] = useState(-1);
  const [localSong, setLocalSong] = useState<{ url: string; title: string } | null>(null);
  const [mode, setMode] = useState<"manual" | "target">("manual");
  const [measurements, setMeasurements] = useState<HeadphoneMeasurement[]>([]);
  const [measurementId, setMeasurementId] = useState("");
  const [targets, setTargets] = useState<Target[]>([flat]);
  const [targetId, setTargetId] = useState(flat.id);
  const [targetStatus, setTargetStatus] = useState("");
  const [base, setBase] = useState<Base | null>(null);
  const [fitting, setFitting] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const playIntent = useRef(0);
  const chosenSong = localSong ?? (songIndex >= 0 ? { url: listeningPool[songIndex]?.fileUrl, title: listeningPool[songIndex]?.title } : null);
  const measurement = measurements.find(row => row.id === measurementId);
  const selectedTarget = targets.find(row => row.id === targetId) ?? flat;
  const sourceCurves = useAutoEqSourceCurves(mode === "target" ? [targetId] : []);
  const target = useMemo(() => sourceCurves.resolve(selectedTarget), [selectedTarget, sourceCurves]);
  const setupKey = useMemo(() => JSON.stringify([measurementId, measurement?.points, target.id, target.points]), [measurementId, measurement?.points, target]);
  const currentBase = mode === "target" && base?.key === setupKey ? base.fit : null;
  const baseFilters = currentBase?.filters ?? emptyFilters;
  const basePlot = useMemo(() => baseFilters.length ? Array.from({ length: 401 }, (_, index): Point => {
    const frequency = sweepFrequency({ from: EAR_LOW_HZ, to: EAR_HIGH_HZ }, index / 400);
    return [frequency, baseFilters.reduce((db, filter) => db + response(frequency, filter), 0)];
  }) : undefined, [baseFilters]);
  const editor: AdjustmentEditor = { bands: adjustments, selectedId: selectedAdjustment, onSelect: setSelectedAdjustment, onChange: changeAdjustment };
  const canAudition = mode === "manual" || !!currentBase;
  const canPlay = canAudition && (signal !== "music" || !!chosenSong?.url);
  const canSave = canAudition && adjustments.some(row => row.gain !== 0);
  const sweepAvailable = signal === "sine" || signal === "harmonics";
  const bandFocus = signal === "pink" ? pinkFocus : signal === "music" && musicFocus;
  const pitchReference = pitchAnchor ?? hz;

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem("target-lab-measurements") || "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Read saved headphones after hydration.
      if (Array.isArray(saved)) setMeasurements(saved.filter(row => row && typeof row.id === "string" && Array.isArray(row.points) && row.points.length > 1));
      setMeasurementId(localStorage.getItem("target-lab-active-measurement") || "");
    } catch { /* Manual adjustments work with no saved measurements. */ }
    const cancelIntent = () => { playIntent.current++; };
    const visibility = () => {
      if (document.visibilityState !== "hidden") return;
      cancelIntent();
      engine.current?.stop();
      setPlaying(false); setStarting(false); setSweeping(false);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      cancelIntent();
      engine.current?.close();
      engine.current = null;
      if (fileUrl.current) URL.revokeObjectURL(fileUrl.current);
    };
  }, []);

  useEffect(() => {
    if (mode !== "target") return;
    const controller = new AbortController();
    const available = new Map<string, Target>([[flat.id, flat]]);
    function add(rows: unknown) {
      if (!Array.isArray(rows)) return;
      for (const row of rows) {
        if (row && typeof row.id === "string" && typeof row.name === "string" && Array.isArray(row.points) && row.points.length > 1) available.set(row.id, row);
      }
    }
    try { add(JSON.parse(localStorage.getItem("target-lab-private-targets") || "[]")); add(readLocalAutoEqTargets(localStorage.getItem(autoEqTargetStorageKey))); } catch {}
    add(autoEqPickerTargets);
    void fetch("/api/targets", { signal: controller.signal }).then(async result => {
      if (!result.ok) throw Error();
      add(await result.json());
      if (!controller.signal.aborted) {
        setTargets([...available.values()]);
        setTargetStatus("");
      }
    }).catch(() => {
      if (!controller.signal.aborted) {
        setTargets([...available.values()]);
        setTargetStatus("Shared targets are unavailable. You can use the flat reference or a saved private target.");
      }
    });
    return () => controller.abort();
  }, [mode]);

  useEffect(() => () => fitRequest.current?.abort(), [setupKey, mode]);
  useEffect(() => {
    engine.current?.configure({ base: baseFilters, preamp: currentBase?.preamp ?? 0, adjustments, bypass,
      focus: bandFocus });
  }, [baseFilters, currentBase?.preamp, adjustments, bypass, bandFocus]);
  useEffect(() => {
    if (!sweeping) return;
    let frame: number;
    const followSweep = () => {
      const current = engine.current?.sweepPosition;
      if (current != null) setHz(boundHz(current));
      frame = window.requestAnimationFrame(followSweep);
    };
    frame = window.requestAnimationFrame(followSweep);
    return () => window.cancelAnimationFrame(frame);
  }, [sweeping]);

  function stop() {
    playIntent.current++;
    engine.current?.stop();
    setPlaying(false); setStarting(false); setSweeping(false);
  }

  function requestListening(action: () => void) {
    if (warningAcknowledged.current) {
      action();
      return;
    }
    pendingListening.current = action;
    setWarningOpen(true);
  }

  function acknowledgeWarning() {
    warningAcknowledged.current = true;
    const action = pendingListening.current;
    pendingListening.current = null;
    setWarningOpen(false);
    action?.();
  }

  function dismissWarning() {
    pendingListening.current = null;
    setWarningOpen(false);
  }

  function continueGenerated(next: Exclude<EarSignal, "music">, frequency: number) {
    try {
      if (!engine.current?.switchGenerated(next, frequency)) return false;
      setSweeping(false);
      return true;
    } catch {
      return false;
    }
  }

  function chooseSignal(next: EarSignal) {
    if (signal === next) return;
    const frequency = boundHz(engine.current?.sweepPosition ?? hz);
    setMessage("");
    if (playing && signal !== "music" && next !== "music") {
      if (!continueGenerated(next, frequency)) {
        stop();
        setMessage("This sound could not start. Press Play sound to try again.");
      }
    } else {
      stop();
    }
    if (sweeping) setPitchAnchor(null);
    engine.current?.setFrequency(frequency);
    setHz(frequency);
    setSignal(next);
  }

  async function play(scan = false) {
    if (!canPlay || !audio.current) return;
    stopPracticeRef.current?.();
    stopRankedRef.current?.();
    const intent = ++playIntent.current;
    setMessage("");
    setStarting(true);
    try {
      engine.current ??= new EarTuningAudio(audio.current, () => {
        playIntent.current++;
        setPlaying(false); setStarting(false); setSweeping(false);
      });
      const player = engine.current;
      player.configure({ base: baseFilters, preamp: currentBase?.preamp ?? 0, adjustments, bypass,
        focus: bandFocus });
      player.setFrequency(hz);
      const started = await player.play(signal, () => volumeRef.current, scan ? sweepRanges[rangeIndex] : undefined);
      if (intent !== playIntent.current) return;
      setPlaying(started);
      setSweeping(started && scan);
      if (started && scan) setPitchAnchor(null);
    } catch {
      if (intent === playIntent.current) {
        stop();
        setMessage("Playback could not start. Check your audio output or try a different file.");
      }
    } finally {
      if (intent === playIntent.current) setStarting(false);
    }
  }

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setOutputPeak(engine.current?.outputPeak ?? 0), 150);
    return () => window.clearInterval(timer);
  }, [playing]);

  function seekFrequency(value: number, anchor: number | null = null) {
    if (!Number.isFinite(value)) return;
    const frequency = boundHz(value);
    if (engine.current?.sweepPosition != null && (signal === "music" || !continueGenerated(signal, frequency))) stop();
    engine.current?.setFrequency(frequency);
    setHz(frequency);
    setPitchAnchor(anchor);
  }

  function togglePlayback() {
    if (playing || starting) stop();
    else if (canPlay) requestListening(() => void play());
  }
  const playbackKeys = useEarPlaybackKeys("finder", {
    toggle: togglePlayback,
    frequency: { hz, seek: seekFrequency },
  });

  function mark(kind: MarkKind) {
    const frequency = boundHz(engine.current?.sweepPosition ?? hz);
    seekFrequency(frequency, frequency);
    const adjustment: Adjustment = { id: crypto.randomUUID(), kind, hz: frequency, gain: kind === "peak" ? -3 : 2, q: 4, type: "PK" };
    setAdjustments(rows => rows.length < EAR_ADJUSTMENT_LIMIT ? [...rows, adjustment] : rows);
    setSelectedAdjustment(adjustment.id);
    setBypass(false);
    setMessage(`${kind === "peak" ? "Peak marked" : "Dip marked"} at ${prettyHz(frequency)}.`);
  }

  function changeAdjustment(id: string, update: Partial<Pick<Adjustment, "hz" | "gain" | "q">>) {
    setAdjustments(rows => rows.map(row => row.id === id ? { ...row, ...update } : row));
  }

  function chooseFile(file: File | undefined) {
    if (!file) return;
    stop();
    if (fileUrl.current) URL.revokeObjectURL(fileUrl.current);
    fileUrl.current = URL.createObjectURL(file);
    setLocalSong({ url: fileUrl.current, title: file.name });
    setSongIndex(-1);
    setMessage("");
  }

  function changeSetup() {
    stop();
    fitRequest.current?.abort();
    fitRequest.current = null;
    setFitting(false);
    setMessage("");
  }

  async function fitTarget() {
    if (!measurement || fitting || !sourceCurves.ready) return;
    stop();
    setMessage("");
    const controller = new AbortController();
    fitRequest.current = controller;
    setFitting(true);
    try {
      const [fit] = await fitAutoEqAsync({ raw: measurement.points, targets: [target.points], kind: "export",
        ...DEFAULT_FITTER, sampleRate: engine.current?.context.sampleRate ?? 48000 }, controller.signal);
      if (!controller.signal.aborted) {
        setBase({ key: setupKey, fit });
        setMessage("Reference EQ ready. Compare before and after adjustments using the same sound.");
      }
    } catch (error) {
      if (!controller.signal.aborted) setMessage(errorMessage(error, "Could not prepare this target."));
    } finally {
      if (fitRequest.current === controller && !controller.signal.aborted) setFitting(false);
    }
  }

  function output(download = false) {
    if (!canSave) return;
    try {
      const presetName = name.trim() || (currentBase ? `${target.name} · peak and dip adjustments` : "Peak & Dip Finder · manual adjustments");
      const eq = safeLibraryEq({
        id: crypto.randomUUID(), name: presetName, source: currentBase ? "Peak & Dip Finder · target and manual adjustments" : "Peak & Dip Finder · manual adjustments",
        filters: [...baseFilters, ...adjustments.filter(row => row.gain !== 0).map(({ hz, q, gain }) => ({ type: "PK" as const, hz, q, gain }))],
        preamp: 0,
        ...(currentBase && measurement ? { measurementId: measurement.id, headphone: measurement.device || measurement.name,
          target: isSourceAutoEqTarget(target.id) ? undefined : target, fitter: DEFAULT_FITTER, engine: currentBase.engine, engineVersion: `${currentBase.engineVersion};ear-adjustments-v1` } : {}),
      });
      if (download) {
        const filters = eq.filters.map((row, i) => `Filter ${i + 1}: ON ${row.type ?? "PK"} Fc ${row.hz} Hz Gain ${row.gain.toFixed(4)} dB Q ${row.q.toFixed(4)}`).join("\n");
        downloadLocalFile("tune-by-ear.txt", `Preamp: ${eq.preamp.toFixed(1)} dB\n${filters}\n`, "text/plain");
        setSaveMessage("EQ settings downloaded.");
      } else {
        saveLibraryEq(eq);
        setSaveMessage(`Saved “${eq.name}” to ${PERSONAL_AREA_TITLE}. Account Sync includes saved EQs on approved browsers when enabled.`);
      }
    } catch (error) { setSaveMessage(errorMessage(error, "Could not save this EQ.")); }
  }

  return <><main className="ear-tool">
    <header className="ear-intro">
      <span className="ear-kicker"><Headphones size={16} aria-hidden="true"/> Listening tools</span>
      <h1>Peak &amp; Dip Finder</h1>
      <p>Find peaks that sound too strong and dips that sound too quiet. Try an adjustment and check it with music you know.</p>
      <div className="ear-safety">
        <p><strong>Start low and listen briefly.</strong> Consider skipping the sound tests if you have tinnitus, sound sensitivity, or an elevated risk of hearing damage.</p>
        <button type="button" onClick={() => { stop(); stopPracticeRef.current?.(); stopRankedRef.current?.(); setWarningOpen(true); }}>Before you listen</button>
      </div>
    </header>
    <div className="ear-practice-options">
      <EarTuningGuide requestListening={requestListening} stopPracticeRef={stopPracticeRef}
        onBeforePractice={() => { stop(); stopRankedRef.current?.(); }}
        onOpenRanked={() => {
          const details = rankedDetails.current;
          if (!details) return;
          details.open = true;
          details.querySelector("summary")?.focus();
        }}/>
      <RankedPractice detailsRef={rankedDetails} stopRef={stopRankedRef} requestListening={requestListening}
        onBeforePractice={() => { stop(); stopPracticeRef.current?.(); }}/>
    </div>
    <section className="ear-card" aria-labelledby="ear-listen" data-ear-player="finder" onKeyDown={playbackKeys} tabIndex={0}>
      <div className="ear-step"><AudioLines size={19} aria-hidden="true"/><h2 id="ear-listen">1. Find a peak or dip</h2></div>
      <details className="ear-setup">
        <summary>Reference sound · {mode === "manual" ? "Manual adjustments only" : currentBase ? target.name : "Target setup"}</summary>
      <fieldset className="ear-mode">
        <legend>Reference sound</legend>
        <label><input type="radio" name="ear-base" checked={mode === "manual"} onChange={() => { changeSetup(); setMode("manual"); }}/> Manual adjustments only</label>
        <label><input type="radio" name="ear-base" checked={mode === "target"} onChange={() => { changeSetup(); setMode("target"); }}/> Fit a target, then add my changes</label>
      </fieldset>
      {mode === "target" && <div className="ear-base">
        <label>Saved measurement<select value={measurementId} onChange={event => { changeSetup(); setMeasurementId(event.target.value); }}>
          <option value="">Choose headphones or IEMs</option>
          {measurements.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select></label>
        <label>Target<select value={targetId} onChange={event => { changeSetup(); setTargetId(event.target.value); }}>
          {targets.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select></label>
        <TargetCurveDownloads key={selectedTarget.id} target={selectedTarget}/>
        <AutoEqCurveStatus {...sourceCurves}/>
        <button type="button" disabled={!measurement || fitting || !sourceCurves.ready} onClick={() => void fitTarget()}>{fitting ? "Fitting target…" : currentBase ? "Rebuild reference EQ" : "Prepare reference EQ"}</button>
        {!measurement && <p><Link href="/preference-tuning">Add a headphone measurement in Tuning</Link> to fit a target.</p>}
        {currentBase && <p>The reference follows {target.name} for {measurement?.name}.</p>}
        {targetStatus && <p role="status">{targetStatus}</p>}
      </div>}
      </details>
      <div className="ear-sources" role="group" aria-label="Sound source">
        {stimuli.map(item => <button type="button" aria-pressed={signal === item.id} key={item.id}
          onClick={() => chooseSignal(item.id)}>{item.name}</button>)}
      </div>
      <p>{stimuli.find(item => item.id === signal)?.help} Start with a low listening level.</p>
      {signal === "music" && <div className="ear-music">
        <div className="ear-music-search"><span>Find a song in the library</span><MusicTrackPicker tracks={listeningPool} selectedIndex={songIndex} onSelect={index => {
          stop();
          if (fileUrl.current) URL.revokeObjectURL(fileUrl.current);
          fileUrl.current = "";
          setSongIndex(index); setLocalSong(null); setMessage("");
        }}/></div>
        <label className="ear-file">Or choose a music file from this device<input type="file" accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg" onChange={event => {
          chooseFile(event.target.files?.[0]);
          event.target.value = "";
        }}/></label>
        {chosenSong?.title && <small>Selected audio · {chosenSong.title}</small>}
        <p>Your file stays on this device.</p>
      </div>}
      <audio ref={audio} src={chosenSong?.url} crossOrigin="anonymous" preload="none" onError={() => {
        if (signal === "music" && chosenSong?.url) {
          stop(); setMessage("This recording could not be played. Try another song or audio file.");
        }
      }}/>
      <div className="ear-transport">
        <button type="button" className="ear-primary" disabled={!canPlay && !playing && !starting} onClick={togglePlayback}>
          {playing || starting ? <Pause size={16} aria-hidden="true"/> : <Play size={16} aria-hidden="true"/>}
          {starting ? "Cancel playback" : playing ? "Stop" : "Play sound"}
        </button>
        {sweepAvailable && <>
          <label>Sweep region<select value={rangeIndex} disabled={sweeping} onChange={event => setRangeIndex(Number(event.target.value))}>
            {sweepRanges.map((range, index) => <option key={range.name} value={index}>{range.name}</option>)}
          </select></label>
          <button type="button" disabled={!canPlay || starting || sweeping} onClick={() => requestListening(() => void play(true))}>Sweep · {EAR_SWEEP_SECONDS} s</button>
        </>}
        <label className="ear-volume">Listening level · {Math.round(volume * 100)}%
          <input type="range" min={0} max={1} step={.01} value={volume} onChange={event => {
            const value = Number(event.target.value);
            volumeRef.current = value;
            setVolume(value);
            if (playing) engine.current?.volume(value);
          }}/>
        </label>
      </div>
      {!canAudition && <p>Prepare a reference EQ under Reference sound to start listening.</p>}
      <p className="ear-help">Volume starts at 10% each visit. With this player focused, Space plays or stops the sound and the arrow keys change frequency.</p>
      {playing && <div className="ear-signal">
        <meter min={0} max={100} value={Math.max(0, 100 + 20 * Math.log10(Math.max(outputPeak, .00001)))} aria-label="Browser audio output level"/>
        <span>{outputPeak > .0001 ? "Browser audio signal detected" : "No output signal"}</span>
      </div>}
      {mode === "manual" && measurements.length > 0 && <label className="ear-measurement">Graph measurement
        <select value={measurement?.id ?? ""} onChange={event => setMeasurementId(event.target.value)}>
          <option value="">Flat guide</option>
          {measurements.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
      </label>}
      {mode === "manual" && measurements.length === 0 && <p className="ear-help"><Link href="/preference-tuning">Add a headphone measurement in Tuning</Link> to show its response here.</p>}
      <FrequencyNavigator frequency={hz} points={measurement?.points} editor={editor} onSeek={seekFrequency}/>
      {sweepAvailable && <div className="ear-sources" role="group" aria-label="Check nearby pitches">
        {pitchOffsets.map(({ label, octaves }) => {
          const frequency = boundHz(pitchReference * 2 ** octaves);
          const outOfRange = octaves !== 0 && frequency === pitchReference;
          return <button type="button" key={label} disabled={sweeping || outOfRange}
            aria-pressed={!sweeping && !outOfRange && hz === frequency} onClick={() => seekFrequency(frequency, pitchReference)}>{label} · {prettyHz(frequency)}</button>;
        })}
      </div>}
      {(signal === "music" || signal === "pink") && <div className="ear-focus">
        <label className="ear-check"><input type="checkbox" aria-describedby="ear-focus-help" checked={bandFocus}
          onChange={event => (signal === "pink" ? setPinkFocus : setMusicFocus)(event.target.checked)}/> Isolate frequencies at the playhead</label>
        <small id="ear-focus-help">Dragging the playhead changes which part of the original sound the filter lets through. Drag left to hear its lower frequencies or right to hear its higher ones. {bandFocus ? "Turn this off for the full sound." : "Turn this on to isolate a band."}</small>
      </div>}
      <div className="ear-add">
        <button type="button" disabled={adjustments.length >= EAR_ADJUSTMENT_LIMIT} onClick={() => mark("peak")}><PeakDipIcon kind="peak"/> Mark peak at {prettyHz(hz)}</button>
        <button type="button" disabled={adjustments.length >= EAR_ADJUSTMENT_LIMIT} onClick={() => mark("dip")}><PeakDipIcon kind="dip"/> Mark dip at {prettyHz(hz)}</button>
        <a href="#ear-adjust">{adjustments.length} of {EAR_ADJUSTMENT_LIMIT} adjustments</a>
      </div>
      <p className="ear-help">Start with one or two changes you can hear repeatedly. This tool allows up to {EAR_ADJUSTMENT_LIMIT} manual adjustments.</p>
      {message && <p className="ear-status" role="status">{message}</p>}
    </section>
    <section className="ear-card" aria-labelledby="ear-adjust">
      <div className="ear-step"><SlidersHorizontal size={19} aria-hidden="true"/><h2 id="ear-adjust">2. Adjust and compare</h2></div>
      <p>Peaks start with a small cut and dips start with a small boost. Check the result with full music and the headphones seated as you normally wear them.</p>
      <FrequencyNavigator frequency={hz} points={basePlot} legendLabel={basePlot ? "Reference EQ" : "Flat EQ reference"} editor={editor}/>
      <div className="ear-sources ear-compare" role="group" aria-label="Compare before and after adjustments">
        <button type="button" disabled={!adjustments.length} aria-pressed={bypass} onClick={() => setBypass(true)}>Before adjustments</button>
        <button type="button" disabled={!adjustments.length} aria-pressed={!bypass} onClick={() => setBypass(false)}>After adjustments</button>
      </div>
      {adjustments.length === 0 && <p>Mark a peak or dip to edit its frequency, strength, and width here.</p>}
      {adjustments.map((row, index) => {
        const peak = row.kind === "peak";
        const label = peak ? "Peak" : "Dip";
        return <fieldset className="ear-adjustment" key={row.id}>
          <legend>{label} {index + 1}</legend>
          <label>Frequency (Hz)<input type="number" min={EAR_LOW_HZ} max={EAR_HIGH_HZ} defaultValue={row.hz} onBlur={event => {
            const frequency = event.target.valueAsNumber;
            const next = Number.isFinite(frequency) ? boundHz(frequency) : row.hz;
            event.target.value = String(next);
            changeAdjustment(row.id, { hz: next });
          }}/></label>
          <label>{peak ? "Cut" : "Boost"} · {Math.abs(row.gain)} dB<input type="range" min={0} max={gainLimit(row)} step={.5} value={Math.abs(row.gain)}
            onChange={event => changeAdjustment(row.id, { gain: (peak ? -1 : 1) * Number(event.target.value) })}/></label>
          <AdjustmentWidth hz={row.hz} q={row.q} onChange={q => changeAdjustment(row.id, { q })}/>
          <button type="button" className="ear-icon" aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
            onClick={() => setAdjustments(rows => rows.filter(item => item.id !== row.id))}><Trash2 size={16} aria-hidden="true"/></button>
        </fieldset>;
      })}
    </section>
    <section className="ear-card" aria-labelledby="ear-save">
      <div className="ear-step"><Save size={19} aria-hidden="true"/><h2 id="ear-save">3. Save your EQ</h2></div>
      <label className="ear-name">Preset name<input type="text" value={name} maxLength={100} placeholder="My headphone EQ" onChange={event => setName(event.target.value)}/></label>
      <div className="ear-save-actions">
        <button type="button" className="ear-primary" disabled={!canSave} onClick={() => output()}>Save EQ to {PERSONAL_AREA_TITLE}</button>
        <button type="button" disabled={!canSave} onClick={() => output(true)}>Download EQ TXT</button>
        <Link href="/shootout?tab=eqs">View saved EQs</Link>
      </div>
      <p>Saved EQs are available in Tuning and the Music library. They sync when Account Sync is enabled on an approved browser.</p>
      {saveMessage && <p className="ear-status" role="status">{saveMessage}</p>}
    </section>
  </main>
    {warningOpen && <BeforeYouListen earTuning onReady={acknowledgeWarning} onCancel={dismissWarning}/>}
  </>;
}
