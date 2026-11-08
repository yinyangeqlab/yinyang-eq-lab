"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Headphones, Pause, Play, Plus, Save, SlidersHorizontal, Trash2 } from "lucide-react";
import MusicTrackPicker from "@/components/music-track-picker";
import { type PeqFilter, response } from "@/lib/autoeq";
import { fitAutoEqAsync } from "@/lib/autoeq-client";
import type { AutoEqFit } from "@/lib/autoeq-fit";
import { downloadLocalFile } from "@/lib/channel-match-export";
import type { Point } from "@/lib/curves";
import { EarTuningAudio, EAR_ADJUSTMENT_LIMIT, EAR_LOW_HZ, EAR_HIGH_HZ, EAR_SWEEP_SECONDS, sweepFrequency, type EarSignal } from "@/lib/ear-tuning-audio";
import { DEFAULT_FITTER } from "@/lib/fitter-settings";
import type { HeadphoneMeasurement } from "@/lib/measurement";
import { listeningPool } from "@/lib/music-catalog";
import { safeLibraryEq, saveLibraryEq } from "@/lib/music-library-eq";
import "./style.css";

type MarkKind = "peak" | "dip";
type Adjustment = PeqFilter & { id: string; kind: MarkKind };
type Target = { id: string; name: string; points: Point[] };
type Base = { key: string; fit: AutoEqFit };
const flat: Target = { id: "flat", name: "Flat reference", points: [[20, 0], [20000, 0]] };
const emptyFilters: PeqFilter[] = [];
const stimuli = [
  { id: "sine", name: "Sine tone", help: "A single pitch for locating a peak or dip." },
  { id: "pink", name: "Pink noise", help: "A steady noise for hearing the balance across frequencies." },
  { id: "harmonics", name: "Harmonic tone", help: "A pitched sound with overtones, closer to a musical note." },
  { id: "music", name: "Music", help: "Use a familiar passage to decide if the change helps." },
] as const;
const sweepRanges = [
  { name: "Bass · 40–250 Hz", from: 40, to: 250 },
  { name: "Mids · 250 Hz–2 kHz", from: 250, to: 2000 },
  { name: "Treble · 2–14 kHz", from: 2000, to: 14000 },
];
const boundHz = (value: number) => Math.min(EAR_HIGH_HZ, Math.max(EAR_LOW_HZ, Math.round(value)));
const logPosition = (hz: number) => Math.log(hz / EAR_LOW_HZ) / Math.log(EAR_HIGH_HZ / EAR_LOW_HZ);
const prettyHz = (hz: number) => `${Math.round(hz).toLocaleString("en-US")} Hz`;
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

function AdjustmentGraph({ filters, base, hz }: { filters: PeqFilter[]; base: PeqFilter[]; hz: number }) {
  const rows = useMemo(() => Array.from({ length: 401 }, (_, i) => {
    const frequency = sweepFrequency({ from: EAR_LOW_HZ, to: EAR_HIGH_HZ }, i / 400);
    const start = base.reduce((db, filter) => db + response(frequency, filter), 0);
    const end = filters.reduce((db, filter) => db + response(frequency, filter), start);
    return { frequency, start, end };
  }), [filters, base]);
  const low = Math.min(-6, ...rows.flatMap(row => [row.start, row.end]));
  const high = Math.max(3, ...rows.flatMap(row => [row.start, row.end]));
  const x = (frequency: number) => 42 + 497 * logPosition(frequency);
  const y = (db: number) => 18 + 145 * (high - db) / (high - low);
  const path = (key: "start" | "end") => rows.map((row, i) =>
    `${i ? "L" : "M"}${x(row.frequency).toFixed(1)} ${y(row[key]).toFixed(1)}`).join(" ");
  return <div className="ear-plot">
    <svg viewBox="0 0 560 200" role="img" aria-label="EQ gain across frequencies. Gray shows the starting EQ. Teal shows the EQ with your changes.">
      <line x1="42" x2="539" y1={y(0)} y2={y(0)} stroke="#4e636a"/>
      <text x="35" y={y(0) + 4} textAnchor="end">0 dB</text>
      {[40, 100, 500, 2000, 8000, 16000].map(tick => <g key={tick}>
        <line x1={x(tick)} x2={x(tick)} y1="18" y2="163" stroke="#2a424a"/>
        <text x={x(tick)} y="187" textAnchor="middle">{tick < 1000 ? tick : `${tick / 1000}k`}</text>
      </g>)}
      <path d={path("start")} stroke="#a2aeb6" strokeWidth="1.6" fill="none" vectorEffect="non-scaling-stroke"/>
      <path d={path("end")} stroke="#84e8ce" strokeWidth="2.4" fill="none" vectorEffect="non-scaling-stroke"/>
      <line x1={x(hz)} x2={x(hz)} y1="18" y2="163" stroke="#efc480" opacity=".8"/>
    </svg>
    <div className="ear-legend"><span><i/> Starting EQ</span><span><i/> With your changes</span><span><i/> Current frequency</span></div>
  </div>;
}

export default function EarTuningPage() {
  const audio = useRef<HTMLAudioElement>(null);
  const engine = useRef<EarTuningAudio | null>(null);
  const fileUrl = useRef("");
  const fitRequest = useRef<AbortController | null>(null);
  const [signal, setSignal] = useState<EarSignal>("sine");
  const [hz, setHz] = useState(2400);
  const [rangeIndex, setRangeIndex] = useState(2);
  const [volume, setVolume] = useState(.18);
  const volumeRef = useRef(.18);
  const [bandFocus, setBandFocus] = useState(false);
  const [bypass, setBypass] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [outputPeak, setOutputPeak] = useState(0);
  const [starting, setStarting] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
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
  const target = targets.find(row => row.id === targetId) ?? flat;
  const setupKey = useMemo(() => JSON.stringify([measurementId, measurement?.points, target.id, target.points]), [measurementId, measurement?.points, target]);
  const currentBase = mode === "target" && base?.key === setupKey ? base.fit : null;
  const baseFilters = currentBase?.filters ?? emptyFilters;
  const canAudition = mode === "manual" || !!currentBase;
  const canPlay = canAudition && (signal !== "music" || !!chosenSong?.url);
  const canSave = canAudition && adjustments.some(row => row.gain !== 0);
  const sweepAvailable = signal === "sine" || signal === "harmonics";

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
    try { add(JSON.parse(localStorage.getItem("target-lab-private-targets") || "[]")); } catch {}
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
      focus: bandFocus && (signal === "music" || signal === "pink"), hz });
  }, [baseFilters, currentBase?.preamp, adjustments, bypass, bandFocus, signal, hz]);
  useEffect(() => {
    if (!sweeping) return;
    const timer = window.setInterval(() => {
      const current = engine.current?.sweepPosition;
      if (current != null) setHz(boundHz(current));
    }, 50);
    return () => window.clearInterval(timer);
  }, [sweeping]);

  function stop() {
    playIntent.current++;
    engine.current?.stop();
    setPlaying(false); setStarting(false); setSweeping(false);
  }

  async function play(scan = false) {
    if (!canPlay || !audio.current) return;
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
        focus: bandFocus && (signal === "music" || signal === "pink"), hz });
      const started = await player.play(signal, hz, () => volumeRef.current, scan ? sweepRanges[rangeIndex] : undefined);
      if (intent !== playIntent.current) return;
      setPlaying(started);
      setSweeping(started && scan);
    } catch {
      if (intent === playIntent.current) setMessage("Playback could not start. Check your audio output or try a different file.");
    } finally {
      if (intent === playIntent.current) setStarting(false);
    }
  }

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setOutputPeak(engine.current?.outputPeak ?? 0), 150);
    return () => window.clearInterval(timer);
  }, [playing]);

  function mark(kind: MarkKind) {
    const frequency = boundHz(engine.current?.sweepPosition ?? hz);
    if (sweeping) stop();
    setHz(frequency);
    const adjustment: Adjustment = { id: crypto.randomUUID(), kind, hz: frequency, gain: kind === "peak" ? -3 : 2, q: 4, type: "PK" };
    setAdjustments(rows => rows.length < EAR_ADJUSTMENT_LIMIT ? [...rows, adjustment] : rows);
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
    if (!measurement || fitting) return;
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
        setMessage("Starting EQ ready. Compare it with your changes using the same sound.");
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
      const presetName = name.trim() || (currentBase ? `${target.name} · by ear` : "Tune by ear · manual adjustments");
      const eq = safeLibraryEq({
        id: crypto.randomUUID(), name: presetName, source: currentBase ? "Tune by ear · target and manual adjustments" : "Tune by ear · manual adjustments",
        filters: [...baseFilters, ...adjustments.filter(row => row.gain !== 0).map(({ hz, q, gain }) => ({ type: "PK" as const, hz, q, gain }))],
        preamp: 0,
        ...(currentBase && measurement ? { measurementId: measurement.id, headphone: measurement.device || measurement.name,
          target, fitter: DEFAULT_FITTER, engine: currentBase.engine, engineVersion: `${currentBase.engineVersion};ear-adjustments-v1` } : {}),
      });
      if (download) {
        const filters = eq.filters.map((row, i) => `Filter ${i + 1}: ON ${row.type ?? "PK"} Fc ${row.hz} Hz Gain ${row.gain.toFixed(4)} dB Q ${row.q.toFixed(4)}`).join("\n");
        downloadLocalFile("tune-by-ear.txt", `Preamp: ${eq.preamp.toFixed(1)} dB\n${filters}\n`, "text/plain");
        setSaveMessage("EQ settings downloaded.");
      } else {
        saveLibraryEq(eq);
        setSaveMessage(`Saved “${eq.name}” to My space. Account Sync includes saved EQs on approved browsers when enabled.`);
      }
    } catch (error) { setSaveMessage(errorMessage(error, "Could not save this EQ.")); }
  }

  return <main className="ear-tool">
    <header className="ear-intro">
      <span className="ear-kicker"><Headphones size={16} aria-hidden="true"/> Listening tools</span>
      <h1>Tune by ear</h1>
      <p>Find peaks that sound too strong and dips that sound too quiet. Try an adjustment and check it with music you know.</p>
    </header>
    <section className="ear-card" aria-labelledby="ear-listen">
      <div className="ear-step"><AudioLines size={19} aria-hidden="true"/><h2 id="ear-listen">1. Find a peak or dip</h2></div>
      <details className="ear-setup">
        <summary>Starting sound · {mode === "manual" ? "Manual adjustments only" : currentBase ? target.name : "Target setup"}</summary>
      <fieldset className="ear-mode">
        <legend>Starting sound</legend>
        <label><input type="radio" name="ear-base" checked={mode === "manual"} onChange={() => { changeSetup(); setMode("manual"); }}/> Manual adjustments only</label>
        <label><input type="radio" name="ear-base" checked={mode === "target"} onChange={() => { changeSetup(); setMode("target"); }}/> Fit a target, then add my changes</label>
      </fieldset>
      {mode === "target" && <div className="ear-base">
        <label>Saved headphones<select value={measurementId} onChange={event => { changeSetup(); setMeasurementId(event.target.value); }}>
          <option value="">Choose headphones</option>
          {measurements.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select></label>
        <label>Target<select value={targetId} onChange={event => { changeSetup(); setTargetId(event.target.value); }}>
          {targets.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select></label>
        <button type="button" disabled={!measurement || fitting} onClick={() => void fitTarget()}>{fitting ? "Fitting target…" : currentBase ? "Rebuild starting EQ" : "Prepare starting EQ"}</button>
        {!measurement && <p><Link href="/preference-tuning">Add a headphone measurement in Tuning</Link> to fit a target.</p>}
        {currentBase && <p>Starting sound follows {target.name} for {measurement?.name}.</p>}
        {targetStatus && <p role="status">{targetStatus}</p>}
      </div>}
      </details>
      <div className="ear-sources" role="group" aria-label="Sound source">
        {stimuli.map(item => <button type="button" aria-pressed={signal === item.id} key={item.id} onClick={() => {
          if (signal !== item.id) { stop(); setSignal(item.id); setMessage(""); }
        }}>{item.name}</button>)}
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
      <label className="ear-range">
        <span>Frequency <strong>{prettyHz(hz)}</strong></span>
        <input type="range" min={0} max={1000} value={Math.round(logPosition(hz) * 1000)} aria-valuetext={prettyHz(hz)}
          disabled={sweeping} onChange={event => setHz(boundHz(sweepFrequency({ from: EAR_LOW_HZ, to: EAR_HIGH_HZ }, Number(event.target.value) / 1000)))}/>
      </label>
      {(signal === "music" || signal === "pink") && <label className="ear-check"><input type="checkbox" checked={bandFocus} onChange={event => setBandFocus(event.target.checked)}/> Focus on this frequency region</label>}
      <div className="ear-transport">
        <button type="button" className="ear-primary" disabled={!canPlay && !playing && !starting} onClick={() => playing || starting ? stop() : void play()}>
          {playing || starting ? <Pause size={16} aria-hidden="true"/> : <Play size={16} aria-hidden="true"/>}
          {starting ? "Cancel playback" : playing ? "Stop" : "Play sound"}
        </button>
        {sweepAvailable && <>
          <label>Sweep region<select value={rangeIndex} disabled={sweeping} onChange={event => setRangeIndex(Number(event.target.value))}>
            {sweepRanges.map((range, index) => <option key={range.name} value={index}>{range.name}</option>)}
          </select></label>
          <button type="button" disabled={!canPlay || starting || sweeping} onClick={() => void play(true)}>Sweep · {EAR_SWEEP_SECONDS} s</button>
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
      {playing && <div className="ear-signal">
        <meter min={0} max={100} value={Math.max(0, 100 + 20 * Math.log10(Math.max(outputPeak, .00001)))} aria-label="Browser audio output level"/>
        <span>{outputPeak > .0001 ? "Browser audio signal detected" : "No output signal"}</span>
      </div>}
      <div className="ear-add">
        <button type="button" disabled={adjustments.length >= EAR_ADJUSTMENT_LIMIT} onClick={() => mark("peak")}><Plus size={16} aria-hidden="true"/> Mark peak at {prettyHz(hz)}</button>
        <button type="button" disabled={adjustments.length >= EAR_ADJUSTMENT_LIMIT} onClick={() => mark("dip")}><Plus size={16} aria-hidden="true"/> Mark dip at {prettyHz(hz)}</button>
        <a href="#ear-adjust">{adjustments.length} of {EAR_ADJUSTMENT_LIMIT} adjustments</a>
      </div>
      {message && <p className="ear-status" role="status">{message}</p>}
    </section>
    <section className="ear-card" aria-labelledby="ear-adjust">
      <div className="ear-step"><SlidersHorizontal size={19} aria-hidden="true"/><h2 id="ear-adjust">2. Adjust and compare</h2></div>
      <p>Peaks start with a small cut and dips start with a small boost. Check the result with full music and the headphones seated as you normally wear them.</p>
      <AdjustmentGraph filters={adjustments} base={baseFilters} hz={hz}/>
      <div className="ear-sources ear-compare" role="group" aria-label="Compare before and after adjustments">
        <button type="button" disabled={!adjustments.length} aria-pressed={bypass} onClick={() => setBypass(true)}>Starting sound</button>
        <button type="button" disabled={!adjustments.length} aria-pressed={!bypass} onClick={() => setBypass(false)}>With your changes</button>
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
          <label>{peak ? "Cut" : "Boost"} · {Math.abs(row.gain)} dB<input type="range" min={0} max={peak ? 12 : 6} step={.5} value={Math.abs(row.gain)}
            onChange={event => changeAdjustment(row.id, { gain: (peak ? -1 : 1) * Number(event.target.value) })}/></label>
          <label>Width<select value={row.q} onChange={event => changeAdjustment(row.id, { q: Number(event.target.value) })}>
            <option value={1.5}>Wide</option><option value={4}>Medium</option><option value={8}>Narrow</option>
          </select></label>
          <button type="button" className="ear-icon" aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
            onClick={() => setAdjustments(rows => rows.filter(item => item.id !== row.id))}><Trash2 size={16} aria-hidden="true"/></button>
        </fieldset>;
      })}
    </section>
    <section className="ear-card" aria-labelledby="ear-save">
      <div className="ear-step"><Save size={19} aria-hidden="true"/><h2 id="ear-save">3. Save your EQ</h2></div>
      <label className="ear-name">Preset name<input type="text" value={name} maxLength={100} placeholder="My headphone EQ" onChange={event => setName(event.target.value)}/></label>
      <div className="ear-save-actions">
        <button type="button" className="ear-primary" disabled={!canSave} onClick={() => output()}>Save EQ to My space</button>
        <button type="button" disabled={!canSave} onClick={() => output(true)}>Download EQ TXT</button>
        <Link href="/shootout?tab=eqs">View saved EQs</Link>
      </div>
      <p>Saved EQs are available in Tuning and the Music library. They sync when Account Sync is enabled on an approved browser.</p>
      {saveMessage && <p className="ear-status" role="status">{saveMessage}</p>}
    </section>
  </main>;
}
