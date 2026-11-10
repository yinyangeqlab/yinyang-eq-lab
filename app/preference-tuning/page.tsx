"use client";
import { graphColor, useGraphTheme } from "@/lib/graph-theme";
import { shortcutDecision } from "@/lib/playback-shortcuts";
import { usePlaybackShortcutContext } from "@/lib/use-playback-shortcut-context";
import { useConsentPrompt } from "@/components/use-consent-prompt";
import "@/components/alpha-audio-workbench.css";
import { recordAdminTestIfNeeded } from "@/lib/admin-test-store";
import {musicDisplayTitle} from "@/lib/music-display";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, BookOpen, FileAudio, FolderOpen, Play, RotateCcw, Redo2, Shuffle, SlidersHorizontal, Undo2, Upload, X } from "lucide-react";
import { parseCurve, type Point } from "@/lib/curves";
import { packRegionLabels, placeMarkerLabels } from "@/lib/curve-label-layout";
import { presetFilterResponse, type PresetFilter } from "@/lib/peq-preset";
import { fitAutoEqAsync } from "@/lib/autoeq-client";
import EqCandidateResults from "@/components/eq-candidate-results";
import { useGeneratedEqResults } from "@/lib/use-generated-eq-results";
import { generateEqCandidates } from "@/lib/eq-candidates";
import FitterControls from "@/components/fitter-controls";
import { useFitterSettings } from "@/lib/use-fitter-settings";
import { fitterLabel } from "@/lib/fitter-settings";
import type { AutoEqFit } from "@/lib/autoeq-fit";
import { replaceEqStage, safeGain, watchAudioInterruptions, type EqStage } from "@/lib/eq-playback";
import { exportPeq, exportEqualizerApo, exportEasyEffects, exportQudelixGuide, type FinalizedVariant } from "@/lib/preference-finalize";
import type { HeadphoneMeasurement } from "@/lib/measurement";
import HeadphonePicker, { type CatalogMeasurement } from "@/components/headphone-picker";
import MeasurementManager from "@/components/measurement-manager";
import { importCatalogEntry } from "@/lib/public-measurements";
import { measurementChannelMatch, readLibraryEqs, saveLibraryEq, type LibraryEq } from "@/lib/music-library-eq";
import SoundSetup, { type SoundMode } from "@/components/sound-setup";
import PlaybackTransport, { PlaybackTime, NowPlaying } from "@/components/playback-transport";
import { measurementResponsePoints, tuningResponsePlot } from "@/lib/eq-response";
import { channelMatchWav, downloadLocalFile, autoMatchFilename } from "@/lib/channel-match-export";
import MusicTrackPicker from "@/components/music-track-picker";
import TrackWaveform from "@/components/track-waveform";
import { analyzeTrack, type TrackAnalysis } from "@/lib/loudness";
import { listeningPool as curatedMusic } from "@/lib/music-catalog";
import "./style.css";

type Target = { id: string; name: string; creator: string; points: Point[] };
type Settings = { bass: number; ear: number; treble: number; body: number; air: number; bassHz: number; earHz: number; trebleHz: number };
const defaults: Settings = { bass: 0, ear: 0, treble: 0, body: 0, air: 0, bassHz: 105, earHz: 2800, trebleHz: 6500 };
const CURVE_VIEW = { min: 55, max: 90, anchor: 75 } as const;
const EXPANDED_GAIN_LIMIT = 20;
const MAX_VIEW_HZ = 22000;
type AxisView = { freqMin: number; freqMax: number; dbMin: number; dbMax: number; autoDb: boolean; width: number; height: number };
const defaultAxis: AxisView = { freqMin: 20, freqMax: 20000, dbMin: 55, dbMax: 90, autoDb: true, width: 100, height: 0 };
const formatHz = (hz: number) => hz >= 1000 ? `${hz / 1000}k` : String(hz);
const formatHzWithUnit = (hz: number) => hz >= 1000 ? `${hz / 1000} kHz` : `${hz} Hz`;
const fallback: Target = { id: "flat", name: "Flat reference", creator: "Reference", points: [[20, 0], [20000, 0]] };
type GainKey = "bass" | "body" | "ear" | "air" | "treble";
type EditSnapshot = { settings: Settings; selected: string; expanded: boolean };
const GAIN_CONTROLS: { key: GainKey; name: string; hz: number; limit: number; color: string; lightColor: string; hint: string }[] = [
  { key: "bass", name: "Bass", hz: 80, limit: 12, color: "#65c9ff", lightColor: "#145f9d", hint: "Deep bass and drum impact" },
  { key: "body", name: "Body", hz: 320, limit: 6, color: "#e9b66a", lightColor: "#80551d", hint: "Fullness in voices and instruments" },
  { key: "ear", name: "Voice presence", hz: 2800, limit: 10, color: "#b3a0ff", lightColor: "#65429b", hint: "Voice and instrument presence" },
  { key: "air", name: "Sharpness", hz: 6500, limit: 6, color: "#ffb66f", lightColor: "#a14922", hint: "Crisp sounds and sharp “s” sounds" },
  { key: "treble", name: "Treble", hz: 12000, limit: 12, color: "#79e5b2", lightColor: "#2d6a3d", hint: "Higher sounds and cymbal detail" },
];
type PlacementKey = "bassHz" | "earHz" | "trebleHz";
const PLACEMENTS = {
  bassHz: { name: "Bass transition", tag: "B", min: 60, max: 250, step: 5 },
  earHz: { name: "Ear gain center", tag: "EG", min: 1500, max: 4500, step: 50 },
  trebleHz: { name: "Treble transition", tag: "T", min: 3500, max: 10000, step: 100 },
} as const;
const TONE_FREQUENCIES: { label: string; relation: string; placement?: PlacementKey; fixed?: number }[] = [
  { label: "Bass", relation: "Below", placement: "bassHz" },
  { label: "Body", relation: "Around", fixed: 320 },
  { label: "Voice", relation: "Around", placement: "earHz" },
  { label: "Edge", relation: "Around", fixed: 6500 },
  { label: "Air", relation: "Above", placement: "trebleHz" },
];
const BANDS = [
  { name: "Sub", short: "SUB", range: "20–60 Hz", example: "808 sustain, subwoofer rumble, the lowest kick fundamentals", effect: "More feels deeper and heavier; less tightens rumble that masks bass notes.", low: 20, high: 60, color: "#4fdac8", lightColor: "#08695a" },
  { name: "Bass", short: "BASS", range: "60–250 Hz", example: "Kick punch, bass guitar fundamentals, low piano and cello", effect: "More adds impact and weight; too much can blur rhythm.", low: 60, high: 250, color: "#65c9ff", lightColor: "#145f9d" },
  { name: "Low mids", short: "BODY", range: "250–800 Hz", example: "Vocal chest, guitar and brass body, piano warmth", effect: "More adds fullness; less clears mud but can make music thin.", low: 250, high: 800, color: "#e9b66a", lightColor: "#80551d" },
  { name: "Mids & ear gain", short: "VOICE", range: "800 Hz–4 kHz", example: "Vocal intelligibility, flute, guitar attack, brass presence", effect: "More brings voices forward; too much can sound shouty.", low: 800, high: 4000, color: "#b3a0ff", lightColor: "#65429b" },
  { name: "Sharpness", short: "EDGE", range: "4–8 kHz", example: "Consonants, snare snap, pick noise and sibilance", effect: "More adds definition; less softens sharpness and hiss.", low: 4000, high: 8000, color: "#ffb66f", lightColor: "#a14922" },
  { name: "Air", short: "AIR", range: "8–22 kHz", example: "Cymbal shimmer, room air and breath detail", effect: "More sounds open; too much can make recordings splashy.", low: 8000, high: MAX_VIEW_HZ, color: "#79e5b2", lightColor: "#2d6a3d" },
] as const;
const at = (points: Point[], hz: number) => {
  if (!points.length) return 0;
  if (hz <= points[0][0]) return points[0][1];
  if (hz >= points[points.length - 1][0]) return points[points.length - 1][1];
  let low = 0, high = points.length - 1;
  while (high - low > 1) { const middle = (low + high) >>> 1; if (points[middle][0] < hz) low = middle; else high = middle; }
  const [a, y0] = points[low], [b, y1] = points[high];
  return y0 + (y1 - y0) * Math.log(hz / a) / Math.log(b / a);
};
const filtersFor = (s: Settings): PresetFilter[] => [
  { type: "LSC", hz: s.bassHz, gain: s.bass, q: Math.SQRT1_2 },
  { type: "PK", hz: 320, gain: s.body, q: .8 },
  { type: "PK", hz: s.earHz, gain: s.ear, q: .9 },
  { type: "PK", hz: 6500, gain: s.air, q: 1.5 },
  { type: "HSC", hz: s.trebleHz, gain: s.treble, q: Math.SQRT1_2 },
];
const previewGain = (filters: PresetFilter[], bypass: boolean) => {
  if (bypass) return 1;
  const peak = Math.max(0, ...Array.from({ length: 121 }, (_, i) => {
    const hz = 20 * 1000 ** (i / 120);
    return filters.reduce((sum, filter) => sum + presetFilterResponse(hz, filter, 48000), 0);
  }));
  return 10 ** (-peak / 20);
};
type CurveOverlay = { key: "raw" | "after" | "target"; label: string; points?: Point[]; color: string; dash?: string };
function CurveChart({ points, curveBase, overlays = [], saved = false, editable = true, settings, expanded, axis, sampleRate = 48000, analyser, playing, fitterControls, regionDrag, onDragStart, onDrag, onDragEnd }: { points: Point[]; curveBase?: Point[]; overlays?: CurveOverlay[]; saved?: boolean; editable?: boolean; settings: Settings; expanded: boolean; axis: AxisView; sampleRate?: number; analyser: AnalyserNode | null; playing: boolean; fitterControls?: import("react").ReactNode; regionDrag: boolean; onDragStart: () => void; onDrag: (key: keyof Settings, value: number) => void; onDragEnd: () => void }) {
  const surface = useRef<HTMLDivElement>(null);
  const [comparison, setComparison] = useState({ raw: false, after: false, target: false });
  const [size, setSize] = useState({ width: 800, height: 230 });
  const drag = useRef<{ key: GainKey; startY: number; startGain: number; startResponse: number; frequency: number; settings: Settings; regional: boolean; height: number; scale: number; plotHeight: number; limit: number } | null>(null);
  const markerDrag = useRef<{key: "bassHz" | "earHz" | "trebleHz"; min: number; max: number; step: number} | null>(null);
  useEffect(() => {
    const node = surface.current;
    if (!node) return;
    const update = () => { const bounds = node.getBoundingClientRect(); const width = Math.round(bounds.width), height = Math.round(bounds.height); if (width && height) setSize(current => current.width === width && current.height === height ? current : { width, height }); };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const filters = filtersFor(settings);
  const frequencies = [...new Set([...Array.from({ length: 961 }, (_, i) => 20 * (MAX_VIEW_HZ / 20) ** (i / 960)), ...(curveBase ?? points).map(([hz]) => hz)])].filter(hz => hz >= 20 && hz <= MAX_VIEW_HZ).sort((a, b) => a - b);
  const baseAt = (hz: number) => curveBase ? at(curveBase, hz) : at(points, hz) - at(points, 1000) + CURVE_VIEW.anchor;
  const base = frequencies.map(baseAt);
  const visibleOverlays = overlays.filter(row => comparison[row.key] && row.points?.length);
  const adjusted = frequencies.map((hz, i) => base[i] + filters.reduce((sum, filter) => sum + presetFilterResponse(hz, filter, sampleRate), 0));
  const visible = frequencies.flatMap((hz, i) => hz >= axis.freqMin && hz <= axis.freqMax ? [base[i], adjusted[i]] : []);
  const measured = [...(visible.length ? visible : [...base, ...adjusted]), ...visibleOverlays.flatMap(row => [at(row.points!, axis.freqMin), at(row.points!, axis.freqMax), ...row.points!.filter(([hz]) => hz >= axis.freqMin && hz <= axis.freqMax).map(([, db]) => db)])];
  const viewMin = axis.autoDb ? Math.min(CURVE_VIEW.min, Math.floor((Math.min(...measured) - 2) / 5) * 5) : axis.dbMin;
  const viewMax = axis.autoDb ? Math.max(CURVE_VIEW.max, Math.ceil((Math.max(...measured) + 2) / 5) * 5) : axis.dbMax;
  const plot = { left: 48, right: size.width - 17, top: 25, bottom: size.height - 38 };
  const plotWidth = plot.right - plot.left;
  const x = (hz: number) => plot.left + plotWidth * Math.log(hz / axis.freqMin) / Math.log(axis.freqMax / axis.freqMin);
  const visibleBands = BANDS.filter(b => b.high > axis.freqMin && b.low < axis.freqMax);
  const regionLabels = packRegionLabels(visibleBands.map(b => ({ x: x(Math.sqrt(Math.max(b.low, axis.freqMin) * Math.min(b.high, axis.freqMax))), width: b.short.length * 7.7 + 4 })), plot.left, plot.right);
  plot.top += Math.max(0, ...regionLabels.map(label => label.row)) * 16;
  const plotHeight = plot.bottom - plot.top;
  const y = (db: number) => plot.top + (viewMax - db) * plotHeight / (viewMax - viewMin);
  const tickStep = viewMax - viewMin > 55 ? 10 : 5;
  const ticks = Array.from({ length: Math.floor((viewMax - viewMin) / tickStep) + 1 }, (_, i) => viewMin + i * tickStep);
  const standardTicks = (size.width < 650 ? [20, 100, 500, 2000, 10000, 20000] : [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]).filter(hz => hz > axis.freqMin && hz < axis.freqMax);
  const frequencyTicks = [axis.freqMin, ...standardTicks.filter(hz => x(hz) - plot.left > 32 && plot.right - x(hz) > 32), axis.freqMax];
  const path = (dbs: number[]) => dbs.map((db, i) => `${i ? "L" : "M"}${x(frequencies[i]).toFixed(2)} ${y(db).toFixed(2)}`).join(" ");
  const adjustedAt = (hz: number) => baseAt(hz) + filters.reduce((sum, filter) => sum + presetFilterResponse(hz, filter, sampleRate), 0);
  const placementMarkers = [
    { key: "bassHz" as const, min: 60, max: 250, step: 5, name: "Bass transition", tag: "B", hz: settings.bassHz, color: graphColor(GAIN_CONTROLS[0].color, GAIN_CONTROLS[0].lightColor) },
    { key: "earHz" as const, min: 1500, max: 4500, step: 50, name: "Ear gain center", tag: "EG", hz: settings.earHz, color: graphColor(GAIN_CONTROLS[2].color, GAIN_CONTROLS[2].lightColor) },
    { key: "trebleHz" as const, min: 3500, max: 10000, step: 100, name: "Treble transition", tag: "T", hz: settings.trebleHz, color: graphColor(GAIN_CONTROLS[4].color, GAIN_CONTROLS[4].lightColor) },
  ];
  const visibleMarkers = placementMarkers.filter(marker => marker.hz >= axis.freqMin && marker.hz <= axis.freqMax).map(marker => ({ ...marker, x: x(marker.hz), y: Math.max(plot.top + 3, Math.min(plot.bottom - 3, y(adjustedAt(marker.hz)))), width: marker.tag === "EG" ? 30 : 24 }));
  const markerLabels = placeMarkerLabels(visibleMarkers, { left: plot.left, right: plot.right, top: plot.top, bottom: plot.bottom });
  return <div className="pt-chart-wrap"><div className="pt-chart-surface" ref={surface} style={{ width: `${axis.width}%`, height: axis.height || undefined }}><svg viewBox={`0 0 ${size.width} ${size.height}`} role="group" aria-label={`${saved ? "Saved EQ settings" : "Starting target"} in gray and region colored adjusted curve with optional headphone response overlays, plotted from ${axis.freqMin} to ${axis.freqMax} hertz and ${viewMin} to ${viewMax} dB`}>
    <defs><clipPath id="pt-plot-clip"><rect x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} /></clipPath></defs>
    {ticks.map(db => <g key={db}><line className="pt-grid-line" x1={plot.left} x2={plot.right} y1={y(db)} y2={y(db)} stroke={db === CURVE_VIEW.anchor ? "rgba(160,185,190,.30)" : db % 10 === 0 ? "rgba(130,160,175,.16)" : "rgba(130,160,175,.10)"} strokeWidth={db === CURVE_VIEW.anchor ? .8 : db % 10 === 0 ? .7 : .6} vectorEffect="non-scaling-stroke" /><text x={plot.left - 9} y={y(db) + 3.5} textAnchor="end" fill={graphColor("#8ca4ab", "#435e68")} fontSize="10">{db}</text></g>)}
    {BANDS.slice(1).filter(b => b.low > axis.freqMin && b.low < axis.freqMax).map(b => <line className="pt-region-grid-line" key={b.name} x1={x(b.low)} x2={x(b.low)} y1={plot.top} y2={plot.bottom} stroke="rgba(130,160,175,.14)" strokeWidth=".65" vectorEffect="non-scaling-stroke"/>)}
    <path d={path(base)} clipPath="url(#pt-plot-clip)" fill="none" stroke={graphColor("#8a999c", "#56656d")} strokeWidth="2" strokeDasharray={saved ? undefined : "1 5"} strokeLinecap="round" />
    {visibleBands.map((b, index) => <g key={b.name}><text className="pt-region-label" x={regionLabels[index].x} y={16 + regionLabels[index].row * 16} textAnchor="middle" fill={graphColor(b.color, b.lightColor)} fontSize="11" fontWeight="700">{b.short}</text><clipPath id={`pt-region-${b.short}`}><rect x={x(Math.max(b.low, axis.freqMin))} y={plot.top} width={x(Math.min(b.high, axis.freqMax))-x(Math.max(b.low, axis.freqMin))} height={plotHeight} /></clipPath><path d={path(adjusted)} clipPath={`url(#pt-region-${b.short})`} fill="none" stroke={graphColor(b.color, b.lightColor)} className="pt-curve-glow" strokeWidth="8" strokeOpacity=".23" strokeLinejoin="round" style={{ filter: `var(--curve-glow, drop-shadow(0 0 7px ${b.color}))` }}/><path d={path(adjusted)} clipPath={`url(#pt-region-${b.short})`} fill="none" stroke={graphColor(b.color, b.lightColor)} strokeWidth="3" strokeLinejoin="round" style={{ filter: `var(--curve-glow, drop-shadow(0 0 4px ${b.color}))` }}/></g>)}
    {visibleOverlays.map(row => <path key={row.key} d={row.points!.map(([hz, db], index) => `${index ? "L" : "M"}${x(hz).toFixed(2)} ${y(db).toFixed(2)}`).join(" ")} clipPath="url(#pt-plot-clip)" fill="none" stroke={row.color} className={`pt-overlay pt-overlay-${row.key}`} strokeWidth={row.key === "after" ? "3" : "1.8"} strokeDasharray={row.dash} strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>)}
    {frequencyTicks.map(hz => <text key={hz} x={x(hz)} y={plot.bottom + 16} textAnchor="middle" fill={graphColor("#91a8ae", "#435e68")} fontSize="10">{formatHz(hz)}</text>)}
    <text x={plot.right} y={size.height - 5} textAnchor="end" fill={graphColor("#91a8ae", "#435e68")} fontSize="10">Frequency (Hz) · level (dB)</text>
    <rect x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} fill="transparent" className="pt-curve-drag" aria-hidden="true" onPointerDown={event => { if (!editable) return; const svg = event.currentTarget.ownerSVGElement; if (!svg) return; const bounds = svg.getBoundingClientRect(); const xx = (event.clientX - bounds.left) * size.width / bounds.width; const hz = axis.freqMin * (axis.freqMax / axis.freqMin) ** (Math.max(0, Math.min(1, (xx - plot.left) / plotWidth))); const sensitivity = (key: GainKey) => { const up = filtersFor({...settings, [key]: .5}), down = filtersFor({...settings, [key]: -.5}); return up.reduce((sum, filter, index) => sum + presetFilterResponse(hz, filter, sampleRate) - presetFilterResponse(hz, down[index], sampleRate), 0); }; const control = GAIN_CONTROLS.reduce((best, item) => sensitivity(item.key) > sensitivity(best.key) ? item : best, GAIN_CONTROLS[0]); drag.current = { key: control.key, startY: event.clientY, startGain: settings[control.key], startResponse: adjustedAt(hz), frequency: hz, settings: {...settings}, regional: regionDrag || event.shiftKey, height: bounds.height, scale: viewMax - viewMin, plotHeight, limit: expanded ? EXPANDED_GAIN_LIMIT : control.limit }; event.currentTarget.setPointerCapture(event.pointerId); onDragStart(); }} onPointerMove={event => { const active = drag.current; if (!active) return; const delta = (active.startY - event.clientY) * size.height / active.height * active.scale / active.plotHeight; let next = active.startGain + delta;
      if (!active.regional) {
        const desired = active.startResponse + delta;
        const response = (gain: number) => baseAt(active.frequency) + filtersFor({...active.settings, [active.key]: gain}).reduce((sum, filter) => sum + presetFilterResponse(active.frequency, filter, sampleRate), 0);
        let low = -active.limit, high = active.limit;
        for (let iteration = 0; iteration < 28; iteration++) { const middle = (low + high) / 2; if (response(middle) < desired) low = middle; else high = middle; }
        next = (low + high) / 2;
      }
      onDrag(active.key, Math.round(Math.max(-active.limit, Math.min(active.limit, next)) * 1000) / 1000); }} onPointerUp={event => { if (drag.current) { drag.current = null; event.currentTarget.releasePointerCapture(event.pointerId); onDragEnd(); } }} onPointerCancel={() => { drag.current = null; onDragEnd(); }}/>
    {(editable ? visibleMarkers : []).map((marker, index) => { const mx = marker.x, my = marker.y; const label = markerLabels[index]; const labelCenter = label.x + label.width / 2; const labelEdge = my < label.y ? label.y : label.y + label.height; return <g key={marker.name} className="pt-placement-marker" role="slider" tabIndex={0} aria-label={marker.name} aria-valuemin={marker.min} aria-valuemax={marker.max} aria-valuenow={marker.hz} aria-valuetext={`${marker.hz} hertz`} aria-orientation="horizontal" aria-keyshortcuts="ArrowLeft ArrowRight Home End" onKeyDown={event => { let next = marker.hz; if (event.key === "ArrowLeft") next -= marker.step; else if (event.key === "ArrowRight") next += marker.step; else if (event.key === "Home") next = marker.min; else if (event.key === "End") next = marker.max; else return; event.preventDefault(); event.stopPropagation(); onDragStart(); onDrag(marker.key, Math.max(marker.min, Math.min(marker.max, next))); }} onKeyUp={onDragEnd} onBlur={onDragEnd} onPointerDown={event => { event.stopPropagation(); markerDrag.current = marker; event.currentTarget.setPointerCapture(event.pointerId); onDragStart(); }} onPointerMove={event => { const active = markerDrag.current; const svg = event.currentTarget.ownerSVGElement; if (!active || !svg) return; const bounds = svg.getBoundingClientRect(); const xx = (event.clientX - bounds.left) * size.width / bounds.width; const frequency = axis.freqMin * (axis.freqMax / axis.freqMin) ** Math.max(0, Math.min(1, (xx - plot.left) / plotWidth)); onDrag(active.key, Math.max(active.min, Math.min(active.max, Math.round(frequency / active.step) * active.step))); }} onPointerUp={event => { if (markerDrag.current) { markerDrag.current = null; event.currentTarget.releasePointerCapture(event.pointerId); onDragEnd(); } }} onPointerCancel={() => { markerDrag.current = null; onDragEnd(); }}><title>{`${marker.name}: drag left or right, or use arrow keys`}</title><circle className="pt-marker-halo" cx={mx} cy={my} r="12" fill={marker.color} fillOpacity=".12" stroke={marker.color} strokeOpacity=".35"/><line x1={mx} x2={labelCenter} y1={my} y2={labelEdge} stroke={marker.color} strokeWidth="1" opacity=".7"/><circle cx={mx} cy={my} r="5" fill={marker.color} stroke={graphColor("#041013", "#f7fbfa")} strokeWidth="1.5"/><rect className="pt-marker-tag" x={label.x} y={label.y} width={label.width} height={label.height} rx="4" fill={graphColor("#061116", "#f7fbfa")} stroke={marker.color} strokeWidth="1"/><text x={labelCenter} y={label.y + 12} textAnchor="middle" fill={marker.color} fontSize="11" fontWeight="800" letterSpacing=".5">{marker.tag}</text></g>; })}
  </svg><LiveSpectrum analyser={analyser} playing={playing} size={size} plot={plot} freqMin={axis.freqMin} freqMax={axis.freqMax}/></div><div className="pt-legend"><span><i className={saved ? "baseline saved" : "baseline"}/>{saved ? "Saved EQ" : "Starting target"}</span><span><i className="adjusted"/>Your curve</span><span>Live spectrum when music plays</span></div><div className="pt-response-overlays" role="group" aria-label="Optional response overlays">{overlays.map(row => <label key={row.key}><input type="checkbox" checked={comparison[row.key]} disabled={!row.points?.length} onChange={event => setComparison(state => ({ ...state, [row.key]: event.target.checked }))}/><i style={{ background: row.color }}/>{row.label}</label>)}{fitterControls}</div></div>;
}
function LiveSpectrum({ analyser, playing, size, plot, freqMin, freqMax }: { analyser: AnalyserNode | null; playing: boolean; size: { width: number; height: number }; plot: { left: number; right: number; top: number; bottom: number }; freqMin: number; freqMax: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const light = useGraphTheme() === "light";
  useEffect(() => {
    const element = canvas.current, pen = element?.getContext("2d");
    if (!element || !pen) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    element.width = Math.round(size.width * ratio); element.height = Math.round(size.height * ratio);
    pen.setTransform(ratio, 0, 0, ratio, 0, 0);
    pen.clearRect(0, 0, size.width, size.height);
    if (!analyser || !playing) return;
    let frame = 0;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      analyser.getByteFrequencyData(data); pen.clearRect(0, 0, size.width, size.height);
      for (let layer = 2; layer >= 0; layer--) for (const band of BANDS) {
        if (band.high <= freqMin || band.low >= freqMax) continue;
        const plotWidth = plot.right - plot.left, plotHeight = plot.bottom - plot.top;
        const left = plot.left + plotWidth * Math.log(Math.max(band.low, freqMin) / freqMin) / Math.log(freqMax / freqMin), right = plot.left + plotWidth * Math.log(Math.min(band.high, freqMax) / freqMin) / Math.log(freqMax / freqMin);
        pen.beginPath(); pen.moveTo(left, plot.bottom);
        for (let x = left; x <= right; x += 2) {
          const hz = freqMin * (freqMax / freqMin) ** ((x - plot.left) / plotWidth);
          const bin = Math.max(0, Math.min(data.length - 1, Math.round(hz / analyser.context.sampleRate * analyser.fftSize)));
          const energy = Math.max(0, (data[bin] - 42) / 213);
          pen.lineTo(x, plot.bottom - Math.min(plotHeight * .68, energy * plotHeight * (.48 + layer * .08)));
        }
        const tone = light ? band.lightColor : band.color;
        pen.strokeStyle = layer === 0 ? (light ? tone : "#efffff") : tone + (layer === 1 ? "b8" : "70");
        pen.lineWidth = layer === 0 ? 2.3 : 1.6;
        pen.shadowColor = tone;
        pen.shadowBlur = light ? 0 : layer === 0 ? 14 : 8;
        pen.stroke();
        pen.shadowBlur = 0;
        pen.lineTo(right, plot.bottom); pen.closePath(); pen.fillStyle = tone + ["24", "15", "0b"][layer]; pen.fill();
      }
      frame = requestAnimationFrame(draw);
    };
    draw(); return () => { cancelAnimationFrame(frame); pen.clearRect(0, 0, size.width, size.height); };
  }, [analyser, playing, light, size.width, size.height, plot.left, plot.right, plot.top, plot.bottom, freqMin, freqMax]);
  return <canvas ref={canvas} className="pt-spectrum" aria-label="Live music spectrum across the labeled frequency regions" role="img"/>;
}
type AudioGraph = { context: AudioContext; input: GainNode; filters: BiquadFilterNode[]; fit: EqStage; balance: EqStage; fitKey?: string; fitAbort?: AbortController; fitPromise?: Promise<AutoEqFit[]>; prepared?: AutoEqFit; appliedFitKey?: string; fitReady?: boolean; output: GainNode; spectrum: AnalyserNode; media?: MediaElementAudioSourceNode; dynamics?: AudioWorkletNode; dynamicsLoading?: boolean; playbackInitialized?: boolean; stopInterruptions?: () => void; volumeGain: GainNode };
function sameEdit(a: EditSnapshot, b: EditSnapshot) { return a.selected === b.selected && a.expanded === b.expanded && (Object.keys(defaults) as (keyof Settings)[]).every(key => a.settings[key] === b.settings[key]); }
export default function PreferenceTuning() {
  const consent = useConsentPrompt("Tuning needs no agreement. Viewing or exporting your EQ keeps the file, curve and settings for private research, so we ask once, here.");
  const [targets, setTargets] = useState<Target[]>([fallback]);
  const [curatedRanking, setCuratedRanking] = useState<{ id: string; name: string; rank: number }[]>([]);
  const curatedLeader = curatedRanking.find(row => row.rank === 1) ?? null;
  const [selected, setSelected] = useState("flat");
  const [settings, setSettings] = useState<Settings>(defaults);
  const [expanded, setExpanded] = useState(false);
  const [axis, setAxis] = useState<AxisView>(defaultAxis);
  const [axisOpen, setAxisOpen] = useState(false);
  const [regionDrag, setRegionDrag] = useState(false);
  const [axisLoaded, setAxisLoaded] = useState(false);
  const [audioName, setAudioName] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioAnalysis, setAudioAnalysis] = useState<TrackAnalysis | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [waveZoom, setWaveZoom] = useState(1);
  const [dynamicRange, setDynamicRange] = useState(0);
  const dynamicRangeRef = useRef(0);
  const [dynamicSliderEnabled, setDynamicSliderEnabled] = useState(false);
  const [dynamicsReady, setDynamicsReady] = useState(false);
  const lastCuratedIndex = useRef(-1);
  const [playing, setPlaying] = useState(false);
  const [past, setPast] = useState<EditSnapshot[]>([]);
  const [future, setFuture] = useState<EditSnapshot[]>([]);
  const hadSavedSelection = useRef(false);
  const editRef = useRef<EditSnapshot>({ settings: defaults, selected: "flat", expanded: false });
  const gestureRef = useRef<EditSnapshot | null>(null);
  const [measurements, setMeasurements] = useState<HeadphoneMeasurement[]>([]);
  const [measurementId, setMeasurementId] = useState("");
  const [headphoneType, setHeadphoneType] = useState<"ie" | "oe" | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [activeBand, setActiveBand] = useState(3);
  const [frequencyEditor, setFrequencyEditor] = useState<PlacementKey | null>(null);
  const [frequencyDraft, setFrequencyDraft] = useState("");
  const frequencyInput = useRef<HTMLInputElement>(null);
  const frequencyTrigger = useRef<HTMLButtonElement | null>(null);
  const [message, setMessage] = useState("");
  const [storageNotice, setStorageNotice] = useState("");
  const sourceGeneration = useRef(0);
  const playbackIntent = useRef(0);
  const analysisRequest = useRef<AbortController | null>(null);
  const [measurementAttention, setMeasurementAttention] = useState(0);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const finalizeButton = useRef<HTMLButtonElement>(null);
  const resetButton = useRef<HTMLButtonElement>(null);
  const resetNoButton = useRef<HTMLButtonElement>(null);
  const resetYesButton = useRef<HTMLButtonElement>(null);
  const instructionsButton = useRef<HTMLButtonElement>(null);
  const instructionsClose = useRef<HTMLButtonElement>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalProgress, setFinalProgress] = useState(0);
  const finalizeAbort = useRef<AbortController | null>(null);
  const graph = useRef<AudioGraph | null>(null);
  const [analyser,setAnalyser]=useState<AnalyserNode | null>(null);
  const media = useRef<HTMLAudioElement>(null);
  const objectUrl = useRef("");
  const { fitter, setFitter, defaultFitter, saveDefault, notice: fitterNotice } = useFitterSettings();
  const [bypass, setBypass] = useState(false);
  const [matchEnabled, setMatchEnabled] = useState(true);
  const [soundMode, setSoundMode] = useState<SoundMode>("target");
  const [presets, setPresets] = useState<LibraryEq[]>([]);
  const [presetId, setPresetId] = useState("");
  const [previewRate, setPreviewRate] = useState(48000);
  const [preparingEq, setPreparingEq] = useState(false);
  const modeDrafts = useRef<Record<SoundMode, Settings>>({ target: { ...defaults }, saved: { ...defaults } });
  useEffect(() => {
    const refresh = () => {
      setPresets(readLibraryEqs());
      try { const rows = JSON.parse(localStorage.getItem("target-lab-measurements") || "[]"); if (Array.isArray(rows)) setMeasurements(rows); } catch {}
    }; refresh();
    window.addEventListener("library-eqs-changed", refresh); window.addEventListener("storage", refresh); window.addEventListener("yinyang-data-changed", refresh);
    return () => { window.removeEventListener("library-eqs-changed", refresh); window.removeEventListener("storage", refresh); window.removeEventListener("yinyang-data-changed", refresh); };
  }, []);
  useEffect(() => { const current = graph.current; if (current) current.volumeGain.gain.setTargetAtTime(volume, current.context.currentTime, .01); }, [volume]);
  useEffect(() => { if (frequencyEditor) { frequencyInput.current?.focus(); frequencyInput.current?.select(); } }, [frequencyEditor]);
  const showEdit = useCallback((next: EditSnapshot) => { setFrequencyEditor(null); editRef.current = next; setSettings(next.settings); setSelected(next.selected); setExpanded(next.expanded); }, []);
  const applyEdit = useCallback((next: EditSnapshot) => {
    const previous = editRef.current;
    if (sameEdit(next, previous)) return;
    if (!gestureRef.current) { setPast(rows => [...rows, previous]); setFuture([]); }
    showEdit(next);
  }, [showEdit]);

  useEffect(() => {
    try {
      const savedText = localStorage.getItem("personal-tuning-v1");
      hadSavedSelection.current = Boolean(savedText);
      const saved = JSON.parse(savedText || "{}");
      const restored = { settings: saved.settings ? { ...defaults, ...saved.settings } : defaults, selected: typeof saved.selected === "string" ? saved.selected : "flat", expanded: saved.expanded === true };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate browser-only tuning, measurements and saved settings after SSR.
      editRef.current = restored; setSettings(restored.settings); setSelected(restored.selected); setExpanded(restored.expanded);
    } catch {}
    try {
      const savedAxis = JSON.parse(localStorage.getItem("preference-tuning-axis-v1") || "{}");
      const restored = { ...defaultAxis, ...savedAxis } as AxisView;
      if (restored.freqMin >= 20 && restored.freqMax <= MAX_VIEW_HZ && restored.freqMax > restored.freqMin * 1.2 && restored.dbMax > restored.dbMin + 5 && restored.width >= 65 && restored.width <= 100 && restored.height >= 0 && restored.height <= 520) setAxis(restored);
    } catch {}
    setAxisLoaded(true);
    try { setMeasurements(JSON.parse(localStorage.getItem("target-lab-measurements") || "[]")); } catch {}
    try { setMeasurementId(localStorage.getItem("target-lab-active-measurement") || ""); } catch {}
    try { const savedRows = JSON.parse(localStorage.getItem("target-lab-measurements") || "[]") as HeadphoneMeasurement[]; const active = savedRows.find(row => row.id === localStorage.getItem("target-lab-active-measurement")); if (active) setHeadphoneType(active.type); } catch {}
    const generationRef = sourceGeneration, intentRef = playbackIntent, requestRef = analysisRequest, audio = media.current;
    let stopped = false;
    let stopRankingRefresh = () => {};
    async function load() {
      try {
        const response = await fetch("/api/targets");
        if (!response.ok) throw new Error();
        const approved: Target[] = await response.json();
        let privateTargets: Target[] = [];
        try { privateTargets = JSON.parse(localStorage.getItem("target-lab-private-targets") || "[]"); } catch {}
        if (stopped) return;
        const available=[fallback, ...approved.filter(t => Array.isArray(t.points)), ...privateTargets.filter(t => Array.isArray(t.points))];
        setTargets(available);
        const requestedId=new URLSearchParams(window.location.search).get("target");
        if (requestedId) {
          const requested=available.find(row=>row.id===requestedId);
          hadSavedSelection.current=true;
          if (requested) {
            applyEdit({selected:requested.id,settings:{...defaults},expanded:false});
            setMessage(`Loaded ${requested.name} for fine-tuning with neutral adjustments. Undo restores your previous tuning.`);
          } else setMessage("The requested curve is unavailable. Your existing tuning is unchanged; choose a target or import its curve.");
        }
        let firstRankingLoad = true;
        let rankingRequest = 0;
        async function refreshRanking() {
          const request = ++rankingRequest;
          try {
            const rankingResponse = await fetch("/api/research", { cache: "no-store" });
            if (!rankingResponse.ok) return;
            const ranking = await rankingResponse.json() as { protocols?: { current?: { all?: { rows?: { id: string; name: string }[] } } } };
            if (stopped || request !== rankingRequest) return;
            const rows = (ranking.protocols?.current?.all?.rows ?? []).map((row, index) => ({ ...row, rank: index + 1 }));
            setCuratedRanking(rows);
            const leader = rows.find(row => row.rank === 1 && approved.some(target => target.id === row.id));
            if (firstRankingLoad && leader && !hadSavedSelection.current) {
              editRef.current = { ...editRef.current, selected: leader.id }; setSelected(leader.id);
            }
            firstRankingLoad = false;
          } catch { /* Keep the last successful ranking during a temporary failure. */ }
        }
        if (stopped) return;
        const timer = window.setInterval(() => { if (!document.hidden) void refreshRanking(); }, 60_000);
        const onFocus = () => { void refreshRanking(); };
        window.addEventListener("focus", onFocus);
        stopRankingRefresh = () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
        await refreshRanking();
      } catch { setMessage("Shared targets are unavailable right now. You can still use a flat reference or import a curve."); }
    }
    void load();
    return () => { stopped = true; generationRef.current++; intentRef.current++; requestRef.current?.abort(); audio?.pause(); stopRankingRefresh(); if (graph.current) { graph.current.fitAbort?.abort(); graph.current.stopInterruptions?.(); void graph.current.context.close(); } graph.current = null; if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); };
  }, [applyEdit]);
  // A failed external storage write needs immediate visible feedback; editing remains available.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!axisLoaded || soundMode !== "target") return; try { localStorage.setItem("personal-tuning-v1", JSON.stringify({ settings, selected, expanded })); } catch { setStorageNotice("Browser storage is unavailable. Tuning still works in this tab; changes will not be saved when you leave."); } }, [settings, selected, expanded, axisLoaded, soundMode]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Report an external storage failure.
  useEffect(() => { if (axisLoaded) try { localStorage.setItem("preference-tuning-axis-v1", JSON.stringify(axis)); } catch { setStorageNotice("Browser storage is unavailable. Tuning still works in this tab; changes will not be saved when you leave."); } }, [axis, axisLoaded]);
  const target = targets.find(t => t.id === selected) || fallback;
  const normalized = useMemo(() => [...target.points].sort((a, b) => a[0] - b[0]), [target]);
  const curatedRanks = useMemo(() => new Map(curatedRanking.map(row => [row.id, row.rank])), [curatedRanking]);
  const targetOptions = useMemo(() => [...targets].sort((a, b) => (curatedRanks.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (curatedRanks.get(b.id) ?? Number.MAX_SAFE_INTEGER)), [targets, curatedRanks]);
  const filters = useMemo(() => filtersFor(settings), [settings]);
  const savedEq = presets.find(eq => eq.id === presetId);
  const measurement = measurements.find(row => row.id === (soundMode === "saved" ? savedEq?.measurementId : measurementId));
  const activeMatch = useMemo(() => soundMode === "saved" ? savedEq?.channelMatch : measurementChannelMatch(measurement), [soundMode, savedEq, measurement]);
  const tweaksChanged = GAIN_CONTROLS.some(control => Math.abs(settings[control.key]) > .0001);
  const eqAvailable = soundMode === "target" || !!savedEq;
  const eqOn = !bypass && eqAvailable;
  const [fit, setFit] = useState<AutoEqFit | null>(null);
  const basePreamp = soundMode === "saved" ? savedEq?.preamp ?? 0 : fit?.preamp ?? 0;
  const responseRaw = useMemo(() => measurementResponsePoints(measurement), [measurement]);
  const responsePlot = useMemo(() => tuningResponsePlot(responseRaw, soundMode === "target" ? normalized : savedEq?.target?.points, soundMode === "saved" ? savedEq?.filters ?? [] : fit?.filters ?? [], filters, previewRate, soundMode === "saved" ? "1khz" : "shootout", eqOn, CURVE_VIEW.anchor, { referenceRaw: measurement?.points, channelMatch: matchEnabled ? activeMatch : undefined }), [responseRaw, measurement, normalized, savedEq, fit, filters, previewRate, soundMode, eqOn, matchEnabled, activeMatch]);
  const responseReady = !preparingEq && (soundMode === "saved" ? !!savedEq : !!fit);
  const responseOverlays: CurveOverlay[] = [
    { key: "raw", label: "Raw headphones", points: responsePlot.raw, color: graphColor("#d6e0e7", "#425a6b") },
    { key: "after", label: "Predicted EQ", points: responseReady ? responsePlot.after : undefined, color: graphColor("#a4ffe4", "#086751") },
    ...(soundMode === "saved" ? [{ key: "target" as const, label: "Saved target", points: responsePlot.target, color: graphColor("#aeb7be", "#68727a"), dash: "1 5" }] : []),
  ];
  const preferenceCurve = useMemo<Point[]>(() => Array.from({ length: 241 }, (_, i) => {
    const hz = 20 * 1000 ** (i / 240);
    return [hz, at(normalized, hz) - at(normalized, 1000) + filters.reduce((sum, filter) => sum + presetFilterResponse(hz, filter, 48000), 0)];
  }), [normalized, filters]);
  const finalizeKey = useMemo(() => JSON.stringify({ selected, settings, measurementId, raw: measurement?.points, target: normalized }), [selected, settings, measurementId, measurement?.points, normalized]);
  useEffect(() => () => { finalizeAbort.current?.abort(); }, [finalizeKey]);
  const { result: previousResults, current: finalized, heading: resultsHeading, save: saveResults, clear: clearResults } = useGeneratedEqResults("tuning", finalizeKey);
  /** Tuning itself needs no agreement. Viewing the finished EQ or exporting it keeps the file, curve and settings for private research, so that step asks once. */
  async function finalizeCurve() { await consent.ask(runFinalize); }
  async function runFinalize() {
    if (!measurement?.points?.length || finalizing) return;
    finalizeAbort.current?.abort(); const request = new AbortController(); finalizeAbort.current = request;
    setFinalizing(true); setFinalProgress(0);
    const curve = preferenceCurve;
    const variants: FinalizedVariant[] = [];
    try {
      variants.push(...await generateEqCandidates(measurement.points,curve,request.signal,setFinalProgress));
      if (!request.signal.aborted) saveResults(variants);
    } catch (error) { if (!request.signal.aborted) setMessage(error instanceof Error ? error.message : "Could not generate EQ filters."); }
    finally { if (finalizeAbort.current === request) setFinalizing(false); }
  }
  async function downloadText(filename: string, contents: string, type = "text/plain", variant?: FinalizedVariant) { await consent.ask(() => void runDownload(filename, contents, type, variant)); }
  async function runDownload(filename: string, contents: string, type = "text/plain", variant?: FinalizedVariant) {
    const exportKind = variant ? "eq" : filename === "original-target.csv" ? "original-target" : "preference-target";
    const format = filename.endsWith("-equalizerapo.txt") ? "equalizerapo" : filename.endsWith("-easyeffects.txt") ? "easyeffects" : filename.endsWith("-qudelix5k.txt") ? "qudelix5k" : variant ? "txt" : "csv";
    try {
      const adminTestOnly=await recordAdminTestIfNeeded("export",{targetName:target.name,exportKind,format,filename,contents,settings,curve:exportKind==="original-target"?normalized:preferenceCurve,variant});
      if(!adminTestOnly){
      const response = await fetch("/api/preference-exports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        targetId: target.id, targetName: target.name, targetCreator: target.creator, measurementName: variant ? measurement?.name : null,
        exportKind, format, filename, contents, settings, curve: exportKind === "original-target" ? normalized : preferenceCurve, variant,
      }) });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error || "Export could not be recorded.");
      }
      const url = URL.createObjectURL(new Blob([contents], { type }));
      const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(adminTestOnly?"Admin test download · saved locally; no official contribution was recorded.":"");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Export could not be recorded. Please try again."); }
  }
  useEffect(() => {
    if (!graph.current) return;
    graph.current.filters.forEach((node, i) => {
      node.type = filters[i].type === "LSC" ? "lowshelf" : filters[i].type === "HSC" ? "highshelf" : "peaking";
      node.frequency.setTargetAtTime(filters[i].hz, graph.current!.context.currentTime, .025);
      node.Q.setTargetAtTime(filters[i].q, graph.current!.context.currentTime, .025);
      node.gain.setTargetAtTime(eqOn ? filters[i].gain : 0, graph.current!.context.currentTime, .025);
    });
    safeGain(graph.current.output, (graph.current.fitReady || graph.current.playbackInitialized) ? previewGain(filters, !eqOn) * 10 ** ((eqOn ? basePreamp : 0) / 20) : 0, graph.current.context.currentTime);
  }, [filters, eqOn, basePreamp]);
  const ensureGraph = useCallback(() => {
    if (graph.current) return graph.current;
    const context = new AudioContext();
    setPreviewRate(context.sampleRate);
    const input = context.createGain();
    const nodes = filtersFor(settings).map(filter => {
      const node = context.createBiquadFilter();
      node.type = filter.type === "LSC" ? "lowshelf" : filter.type === "HSC" ? "highshelf" : "peaking";
      node.frequency.value = filter.hz; node.gain.value = eqOn ? filter.gain : 0; node.Q.value = filter.q;
      return node;
    });
    const output = context.createGain();
    output.gain.value = 0;
    const fitStage = replaceEqStage(context, input, nodes[0], []);
    nodes.forEach((node, i) => { if (nodes[i + 1]) node.connect(nodes[i + 1]); });
    const balance = replaceEqStage(context, nodes[nodes.length - 1], output, [], undefined, matchEnabled ? activeMatch : undefined);
    const spectrum = context.createAnalyser(); spectrum.fftSize = 8192; spectrum.smoothingTimeConstant = .78;
    const volumeGain = context.createGain(); volumeGain.gain.value = volume;
    output.connect(spectrum); spectrum.connect(volumeGain); volumeGain.connect(context.destination);
    const stopInterruptions = watchAudioInterruptions(context, () => graph.current?.context === context ? media.current : null, () => {
      playbackIntent.current++; setPlaying(false); setMessage("Audio was interrupted. Press Play music to resume.");
    });
    const source = media.current ? context.createMediaElementSource(media.current) : undefined;
    source?.connect(input);
    graph.current = { context, input, filters: nodes, fit: fitStage, balance, output, spectrum, stopInterruptions, volumeGain, media: source };
    setAnalyser(spectrum);
    return graph.current;
  }, [settings, eqOn, volume, matchEnabled, activeMatch, setMessage]);
  useEffect(() => {
    const current = graph.current;
    if (!current) return;
    current.balance = replaceEqStage(current.context, current.filters[current.filters.length - 1], current.output, [], current.balance, matchEnabled ? activeMatch : undefined);
  }, [matchEnabled, activeMatch]);
  const preparePreviewFit = useCallback(async (current: AudioGraph) => {
    const raw = measurement?.points;
    const key = JSON.stringify([soundMode, savedEq?.id, savedEq?.filters, savedEq?.preamp, raw, normalized, fitter, current.context.sampleRate]);
    const apply = (baseFilters: AutoEqFit["filters"], preamp: number) => {
      const appliedKey = JSON.stringify([key, eqOn]);
      if (current.appliedFitKey !== appliedKey) {
        current.fit = replaceEqStage(current.context, current.input, current.filters[0], eqOn ? baseFilters : [], current.fit);
        current.appliedFitKey = appliedKey;
      }
      safeGain(current.output, previewGain(filters, !eqOn) * 10 ** ((eqOn ? preamp : 0) / 20), current.context.currentTime);
    };
    if (soundMode === "saved" || !raw?.length) {
      current.fitAbort?.abort(); current.fitKey = key; current.fitReady = true; current.prepared = undefined;
      setFit(null); setPreparingEq(false);
      apply(soundMode === "saved" ? savedEq?.filters ?? [] : [], soundMode === "saved" ? savedEq?.preamp ?? 0 : 0);
      return true;
    }
    if (current.fitKey !== key || current.fitAbort?.signal.aborted) {
      current.fitAbort?.abort(); current.fitAbort = new AbortController(); current.fitKey = key; current.fitReady = false;
      setPreparingEq(true);
      // Keep the last verified graph audible while the replacement is fitted.
      if (!current.playbackInitialized) { current.output.gain.cancelScheduledValues(current.context.currentTime); current.output.gain.setValueAtTime(0, current.context.currentTime); }
      current.fitPromise = fitAutoEqAsync({ raw, targets: [normalized], kind: "shootout", ...fitter, sampleRate: current.context.sampleRate }, current.fitAbort.signal);
    }
    try {
      const [prepared] = await current.fitPromise!;
      if (graph.current !== current || current.fitKey !== key || current.fitAbort?.signal.aborted) return false;
      current.prepared = prepared; current.fitReady = true; setFit(prepared); setPreparingEq(false); apply(prepared.filters, prepared.preamp);
      return true;
    } catch (error) {
      if (graph.current !== current || current.fitKey !== key || current.fitAbort?.signal.aborted || error instanceof Error && error.name === "AbortError") return false;
      current.fitAbort?.abort(); setPreparingEq(false); setMessage(error instanceof Error ? error.message : "Could not prepare headphone EQ."); return false;
    }
  }, [soundMode, savedEq, measurement, normalized, fitter, filters, eqOn, setMessage]);
  useEffect(() => { if (savedEq || measurement?.points?.length || graph.current) try { void preparePreviewFit(ensureGraph()); } catch { /* Play reports audio initialization failures. */ } }, [savedEq, measurement, preparePreviewFit, ensureGraph]);
  // Reconcile external deletion without silently switching back to a target.
  useEffect(() => {
    if (presetId && !savedEq) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- The saved collection changed outside this editor.
      setPresetId(""); modeDrafts.current.saved = { ...defaults };
      if (soundMode === "saved") {
        setMessage("The selected saved EQ was removed. Choose another EQ; playback now uses the original sound.");
        showEdit({ ...editRef.current, settings: { ...defaults } }); setPast([]); setFuture([]);
      }
    }
  }, [presetId, savedEq, soundMode, showEdit]);
  const updateDynamicRange = useCallback((value: number) => {
    const amount = Math.max(-1, Math.min(1, value));
    dynamicRangeRef.current = amount; setDynamicRange(amount);
    graph.current?.dynamics?.port.postMessage({ amount });
  }, []);
  const setupDynamics = useCallback((current: AudioGraph) => {
    if (!current.context.audioWorklet || current.dynamics || current.dynamicsLoading) return;
    current.dynamicsLoading = true;
    void current.context.audioWorklet.addModule("/dynamic-range-worklet.js").then(() => {
      if (graph.current !== current || !current.media) return;
      const node = new AudioWorkletNode(current.context, "target-dynamic-range", { outputChannelCount: [2] });
      node.port.postMessage({ amount: dynamicRangeRef.current });
      node.onprocessorerror = () => {
        if (graph.current !== current || current.dynamics !== node || !current.media) return;
        current.media.disconnect(node); node.disconnect(); current.media.connect(current.input);
        current.dynamics = undefined; setDynamicsReady(false); setDynamicSliderEnabled(false); updateDynamicRange(0);
      };
      current.media.disconnect(current.input); current.media.connect(node); node.connect(current.input);
      current.dynamics = node; setDynamicsReady(true);
    }).catch(() => { if (graph.current !== current) return; setDynamicsReady(false); setDynamicSliderEnabled(false); updateDynamicRange(0); }).finally(() => { current.dynamicsLoading = false; });
  }, [updateDynamicRange]);
  function stop() {
    playbackIntent.current++;
    media.current?.pause();
    setPlaying(false);
  }
  const play = useCallback(async () => {
    const audio = media.current;
    if (!audio || !(audio.currentSrc || audio.src)) return;
    const intent = ++playbackIntent.current;
    const source = sourceGeneration.current;
    try {
      const current = ensureGraph();
      if (!current.media) { current.media = current.context.createMediaElementSource(audio); current.media.connect(current.input); }
      setupDynamics(current);
      const key = JSON.stringify([soundMode, savedEq?.id, savedEq?.filters, savedEq?.preamp, measurement?.points, normalized, fitter, current.context.sampleRate]);
      if (!current.fitReady || current.fitKey !== key) {
        void preparePreviewFit(current);
        if (!current.fitReady) { setMessage("Preparing headphone EQ. Press Play when it is ready."); return; }
      }
      current.playbackInitialized = true;
      await Promise.all([current.context.resume(), audio.play()]);
      if (intent !== playbackIntent.current || source !== sourceGeneration.current) return;
      setPlaying(!audio.paused); setMessage("");
    } catch { if (intent === playbackIntent.current && source === sourceGeneration.current) setMessage("Playback could not start. Choose another track or check browser audio permissions."); }
  }, [ensureGraph, setupDynamics, preparePreviewFit, measurement, normalized, soundMode, savedEq, fitter, setMessage]);
  function handleMediaPlay() {
    const current = graph.current, audio = media.current;
    if (!audio) return;
    if (!current?.media || !current.playbackInitialized) {
      audio.pause(); setPlaying(false); setMessage("Press Play music to initialize audio processing."); return;
    }
    const key = JSON.stringify([soundMode, savedEq?.id, savedEq?.filters, savedEq?.preamp, measurement?.points, normalized, fitter, current.context.sampleRate]);
    if (!current.fitReady || current.fitKey !== key) {
      audio.pause(); setPlaying(false); void preparePreviewFit(current); setMessage("Preparing headphone EQ. Press Play music when it is ready."); return;
    }
    const intent = playbackIntent.current, source = sourceGeneration.current;
    if (current.context.state !== "running") void current.context.resume().catch(() => {
      if (graph.current === current && intent === playbackIntent.current && source === sourceGeneration.current) { audio.pause(); setPlaying(false); setMessage("Audio was interrupted. Press Play music to resume."); }
    });
    setPlaying(true);
  }
  async function loadAudio(file: File | undefined) {
    if (!file) return;
    const generation = ++sourceGeneration.current; analysisRequest.current?.abort();
    stop(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(file);
    if (media.current) { try { ensureGraph(); } catch { /* Play reports unsupported audio initialization. */ } media.current.src = objectUrl.current; media.current.load(); }
    setAudioUrl(objectUrl.current); setAudioName(file.name); setAudioAnalysis(null);
    setPosition(0); setDuration(0); setWaveZoom(1); setMessage("Track ready. Press Play music to hear changes live.");
    void analyzeTrack(file).then(result => { if (generation === sourceGeneration.current) setAudioAnalysis(result); }).catch(() => { if (generation === sourceGeneration.current) setMessage("Track ready; source waveform analysis is unavailable for this format."); });
  }
  function loadCurated(index: number, autoPlay = false) {
    const track = curatedMusic[index]; if (!track) return;
    const generation = ++sourceGeneration.current; analysisRequest.current?.abort();
    const controller = new AbortController(); analysisRequest.current = controller;
    lastCuratedIndex.current = index;
    stop(); if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = ""; }
    if (media.current) { try { ensureGraph(); } catch { /* Play reports unsupported audio initialization. */ } media.current.src = track.fileUrl; media.current.load(); }
    setAudioUrl(track.fileUrl); setAudioName(musicDisplayTitle(track.title) + " · " + track.artist); setAudioAnalysis(null); setPosition(0); setDuration(0); setWaveZoom(1);
    setMessage(autoPlay ? "Starting random curated track…" : "Curated track ready. Press Play music.");
    if (autoPlay) void play();
    void fetch(track.fileUrl, { signal: controller.signal }).then(response => { if (!response.ok) throw new Error(); return response.blob(); }).then(blob => generation === sourceGeneration.current ? analyzeTrack(blob) : null).then(result => { if (generation === sourceGeneration.current && result) setAudioAnalysis(result); }).catch(() => {});
  }
  function playRandomCurated() {
    if (!curatedMusic.length) return;
    const pick = Math.floor(Math.random() * (curatedMusic.length > 1 ? curatedMusic.length - 1 : 1));
    const index = curatedMusic.length > 1 && pick >= lastCuratedIndex.current && lastCuratedIndex.current >= 0 ? pick + 1 : pick;
    loadCurated(index, true);
  }
  function shuffleFolder() {
    if (!queue.length) return;
    const currentIndex = queue.findIndex(file => file.name === audioName);
    const nextIndex = queue.length === 1 ? 0 : currentIndex < 0 ? Math.floor(Math.random() * queue.length) : (() => { const pick = Math.floor(Math.random() * (queue.length - 1)); return pick >= currentIndex ? pick + 1 : pick; })();
    void loadAudio(queue[nextIndex]);
  }
  async function loadCurve(file: File | undefined) {
    if (!file) return;
    try {
      const points = parseCurve(await file.text());
      const custom = { id: "imported", name: file.name.replace(/\.[^.]+$/, ""), creator: "Imported in this browser", points };
      setTargets(current => [...current.filter(t => t.id !== "imported"), custom]); changeTarget("imported"); setMessage("Curve imported for this session.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not read curve."); }
  }
  function beginGesture() { if (!gestureRef.current) gestureRef.current = editRef.current; }
  function endGesture() { const start = gestureRef.current; gestureRef.current = null; if (start && !sameEdit(start, editRef.current)) { setPast(rows => [...rows, start]); setFuture([]); } }
  function finishSliderPointer() { requestAnimationFrame(endGesture); }
  function set(key: keyof Settings, value: number) { applyEdit({ ...editRef.current, settings: { ...editRef.current.settings, [key]: value } }); }
  function toggleExpanded() {
    const next = !editRef.current.expanded;
    const limited = { ...editRef.current.settings };
    if (!next) for (const control of GAIN_CONTROLS) limited[control.key] = Math.max(-control.limit, Math.min(control.limit, limited[control.key]));
    applyEdit({ ...editRef.current, expanded: next, settings: limited });
  }
  function changeTarget(id: string) { hadSavedSelection.current = true; applyEdit({ ...editRef.current, selected: id }); }
  const undo = useCallback(() => { if (!past.length) return; const previous = past[past.length - 1]; setPast(past.slice(0, -1)); setFuture([editRef.current, ...future]); showEdit(previous); }, [past, future, showEdit]);
  const redo = useCallback(() => { if (!future.length) return; const next = future[0]; setPast([...past, editRef.current]); setFuture(future.slice(1)); showEdit(next); }, [past, future, showEdit]);
  function closeReset() { setResetOpen(false); resetButton.current?.focus(); }
  function confirmReset() {
    gestureRef.current = null;
    setPast([]); setFuture([]);
    showEdit({ settings: defaults, selected: curatedLeader?.id || "flat", expanded: false });
    setAxis(defaultAxis); setActiveBand(3); setBypass(false); finalizeAbort.current?.abort(); clearResults();
    setMessage("Tuning reset. Undo and redo history cleared.");
    closeReset();
  }
  useEffect(() => { const keydown = (event: KeyboardEvent) => { if (resetOpen || instructionsOpen) return; if (!(event.ctrlKey || event.metaKey) || event.altKey) return; const target = event.target; if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement && ["text", "search", "url"].includes(target.type)) return; if (event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); } else if (event.key.toLowerCase() === "y") { event.preventDefault(); redo(); } }; window.addEventListener("keydown", keydown); return () => window.removeEventListener("keydown", keydown); }, [undo, redo, resetOpen, instructionsOpen]);
  const shortcutContext = usePlaybackShortcutContext(".pt-listen");
  useEffect(() => {
    if (!audioUrl || resetOpen || instructionsOpen) return;
    const toggleWithSpace = (event: KeyboardEvent) => {
      if (!["Space", "ArrowLeft", "ArrowRight"].includes(event.code) || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.defaultPrevented) return;
      const decision = shortcutDecision(event.target instanceof Element ? event.target : null, event, shortcutContext());
      if (!decision.run) return;
      if (decision.blurTarget && event.target instanceof HTMLElement) event.target.blur();
      event.preventDefault(); event.stopPropagation();
      if (event.code === "ArrowLeft" || event.code === "ArrowRight") { const audio = media.current; if (audio) { audio.currentTime = Math.max(0, Math.min(Number.isFinite(audio.duration) ? audio.duration : 0, audio.currentTime + (event.code === "ArrowRight" ? 1 : -1) * (event.shiftKey ? 1 : .25))); setPosition(audio.currentTime); } } else if (media.current?.paused) void play(); else stop();
    };
    window.addEventListener("keydown", toggleWithSpace, true);
    return () => window.removeEventListener("keydown", toggleWithSpace, true);
  }, [audioUrl, resetOpen, instructionsOpen, play, shortcutContext]);
  useEffect(() => {
    if (!resetOpen) return;
    resetNoButton.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") closeReset(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [resetOpen]);
  useEffect(() => {
    if (!instructionsOpen) return;
    instructionsClose.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setInstructionsOpen(false); instructionsButton.current?.focus(); } };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [instructionsOpen]);
  function persistBrowserValue(key: string, value: string | null) {
    try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); }
    catch { setStorageNotice("Browser storage is unavailable. Tuning and headphone changes apply in this tab only; they will not be saved when you leave."); }
  }
  function saveMeasurements(rows: HeadphoneMeasurement[]) { setMeasurements(rows); persistBrowserValue("target-lab-measurements", JSON.stringify(rows)); }
  function chooseMeasurement(id: string) { setMeasurementId(id); persistBrowserValue("target-lab-active-measurement", id); const row = measurements.find(item => item.id === id); if (row) setHeadphoneType(row.type); }
  function clearMeasurement() { setMeasurementId(""); persistBrowserValue("target-lab-active-measurement", null); }
  function addMeasurement(row: HeadphoneMeasurement) { saveMeasurements([...measurements, row]); setMeasurementId(row.id); setHeadphoneType(row.type); persistBrowserValue("target-lab-active-measurement", row.id); }
  function deleteMeasurement(id: string) { saveMeasurements(measurements.filter(row => row.id !== id)); if (measurementId === id) clearMeasurement(); }
  async function importMeasurement(entry: CatalogMeasurement) { try { const row = await importCatalogEntry(entry); addMeasurement(row); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not import this headphone measurement."); } }
  function changeSoundMode(next: SoundMode) {
    if (next === soundMode) return;
    modeDrafts.current[soundMode] = { ...settings }; setSoundMode(next);
    showEdit({ ...editRef.current, settings: { ...modeDrafts.current[next] } }); setPast([]); setFuture([]);
  }
  function chooseSavedEq(id: string) {
    setPresetId(id); setMessage("");
    showEdit({ ...editRef.current, settings: { ...defaults } }); modeDrafts.current.saved = { ...defaults }; setPast([]); setFuture([]);
    const eq = presets.find(item => item.id === id);
    if (eq?.measurementId && measurements.some(row => row.id === eq.measurementId)) chooseMeasurement(eq.measurementId);
  }
  function saveEditedEq() {
    if (!savedEq) return;
    try {
      const combined = [...savedEq.filters, ...filters.filter(filter => Math.abs(filter.gain) > .0001)];
      const eq: LibraryEq = { ...savedEq, id: crypto.randomUUID(), name: `${savedEq.name} · tuned`, source: `Tuned copy of ${savedEq.name}`, filters: combined, preamp: Math.min(savedEq.preamp, basePreamp), createdAt: undefined, updatedAt: undefined };
      saveLibraryEq(eq); chooseSavedEq(eq.id); setMessage("Saved a new EQ to My space. The original EQ is unchanged.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save this EQ."); }
  }
  function closeFrequencyEditor() { setFrequencyEditor(null); frequencyTrigger.current?.focus(); }
  function applyFrequency() {
    if (!frequencyEditor || !frequencyDraft.trim()) return;
    const placement = PLACEMENTS[frequencyEditor], value = Number(frequencyDraft);
    if (!Number.isFinite(value) || value < placement.min || value > placement.max) return;
    set(frequencyEditor, Math.max(placement.min, Math.min(placement.max, Math.round(value / placement.step) * placement.step)));
    closeFrequencyEditor();
  }
  const selectedCuratedIndex = curatedMusic.findIndex(track => track.fileUrl === audioUrl);
  return <main className="pt-shell alpha-tuning">
    {storageNotice && <p role="status" className="pt-message">{storageNotice}</p>}
    {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Use full-document navigation so access checks and unsaved-listening beforeunload guards run. */}
    <header className="pt-top"><a href="/home" className="pt-brand" aria-label="YinYang EQ home"><span className="pt-brand-mark" aria-hidden="true"/><span>YinYang <em>EQ</em></span></a><nav aria-label="Main navigation"><a href="/">Home</a><a href="/shootout">Listen</a><a href="/music-library">Music library</a><span aria-current="page">Preference Tuning</span></nav></header>
    <div className="pt-content">
      <div className="pt-heading"><div><div className="pt-eyebrow">PREFERENCE TUNING LAB</div><div className="pt-title-row"><h1>Shape the sound you want.</h1></div></div><div className="pt-header-actions"><button ref={instructionsButton} type="button" className="pt-instructions-button" aria-haspopup="dialog" aria-expanded={instructionsOpen} onClick={() => setInstructionsOpen(true)}><BookOpen size={15}/> Instructions</button><div className="pt-history" role="group" aria-label="Tuning history"><button type="button" disabled={!past.length} onClick={undo} title="Undo (Ctrl/⌘ Z)"><Undo2 size={16}/> Undo {past.length > 0 && <span>{past.length}</span>}</button><button type="button" disabled={!future.length} onClick={redo} title="Redo (Ctrl/⌘ Shift Z)"><Redo2 size={16}/> Redo {future.length > 0 && <span>{future.length}</span>}</button><button ref={resetButton} type="button" className="pt-reset" aria-haspopup="dialog" aria-expanded={resetOpen} onClick={() => setResetOpen(true)}><RotateCcw size={16}/> Reset</button></div></div></div>
      <div className="pt-get-started" aria-label="How to get started"><strong>Start here</strong><ol><li><a href="#tuning-headphones"><b>1</b> Choose headphones &amp; EQ</a></li><li><a href="#saved-eq-listening"><b>2</b> Play music</a></li><li><a href="#tuning-curve"><b>3</b> Shape your sound</a></li></ol></div>
      <div className="pt-workbench">
        <section className="pt-chart-card" id="tuning-curve"><div className="pt-card-heading"><div><span className="pt-step">SHAPE</span><h2>Fine-tune your sound</h2></div><div className="pt-chart-meta"><div className="pt-listening-checks" role="group" aria-label="Listening options"><label><input type="checkbox" aria-label="Enable EQ" checked={eqOn} disabled={!eqAvailable} onChange={event => setBypass(!event.target.checked)}/>EQ {eqOn ? "on" : "off"}</label><label><input type="checkbox" aria-label="Enable channel match" checked={!!activeMatch && matchEnabled} disabled={!activeMatch} onChange={event => setMatchEnabled(event.target.checked)}/>Channel match {matchEnabled && activeMatch ? "on" : "off"}</label></div><span className="pt-chart-badge">{formatHzWithUnit(axis.freqMin)} – {formatHzWithUnit(axis.freqMax)}</span><button type="button" className="pt-axis-button" aria-expanded={axisOpen} aria-controls="pt-axis-panel" onClick={() => setAxisOpen(open => !open)}><SlidersHorizontal size={13}/> Graph display</button><label className="pt-range-toggle" title="Allow all five gain sliders to reach ±20 dB"><input type="checkbox" checked={expanded} onChange={toggleExpanded}/> ±20 dB range</label></div></div>
          <div className="pt-current-target"><span>{soundMode === "saved" ? "Saved EQ" : "Target"}</span><strong>{soundMode === "saved" ? savedEq?.name || "Choose a saved EQ below" : target.name}</strong><small>Adjustments below add to this sound.</small></div>
                    {axisOpen && <div className="pt-axis-panel" id="pt-axis-panel" aria-label="Chart axis and size controls"><div className="pt-axis-fields"><label>Frequency start <span>Hz</span><input type="number" min="20" max="10000" step="10" value={axis.freqMin} onChange={e => setAxis(current => ({ ...current, freqMin: Math.min(current.freqMax / 1.25, Math.max(20, Number(e.target.value) || 20)) }))}/></label><label>Frequency end <span>Hz</span><input type="number" min="40" max={MAX_VIEW_HZ} step="10" value={axis.freqMax} onChange={e => setAxis(current => ({ ...current, freqMax: Math.max(current.freqMin * 1.25, Math.min(MAX_VIEW_HZ, Number(e.target.value) || defaultAxis.freqMax)) }))}/></label><label>Bottom <span>dB</span><input type="number" min="-20" max="110" step="1" value={axis.dbMin} disabled={axis.autoDb} onChange={e => setAxis(current => ({ ...current, dbMin: Math.min(current.dbMax - 5, Math.max(-20, Number(e.target.value) || 0)) }))}/></label><label>Top <span>dB</span><input type="number" min="-10" max="120" step="1" value={axis.dbMax} disabled={axis.autoDb} onChange={e => setAxis(current => ({ ...current, dbMax: Math.max(current.dbMin + 5, Math.min(120, Number(e.target.value) || 90)) }))}/></label><label>Width <span>%</span><input type="number" min="65" max="100" step="1" value={axis.width} onChange={e => setAxis(current => ({ ...current, width: Math.max(65, Math.min(100, Number(e.target.value) || 100)) }))}/></label><label>Height · 0 = auto <span>px</span><input type="number" min="0" max="520" step="10" value={axis.height} onChange={e => setAxis(current => ({ ...current, height: Math.max(0, Math.min(520, Number(e.target.value) || 0)) }))}/></label></div><div className="pt-axis-actions"><label><input type="checkbox" checked={axis.autoDb} onChange={e => setAxis(current => ({ ...current, autoDb: e.target.checked }))}/> Auto-fit dB to curve</label><button type="button" onClick={() => setAxis(defaultAxis)}>Reset view</button></div></div>}
          <CurveChart points={normalized} curveBase={soundMode === "saved" ? responsePlot.base : undefined} overlays={responseOverlays} saved={soundMode === "saved"} editable={soundMode === "target" || !!savedEq} settings={settings} expanded={expanded} axis={axis} sampleRate={previewRate} fitterControls={soundMode === "saved" ? <details className="fitter-controls"><summary>Advanced EQ settings</summary><div className="fitter-panel"><p>Stored base EQ · {savedEq?.fitter ? fitterLabel(savedEq.fitter) : "fitter unrecorded"} · {savedEq?.filters.length ?? 0} stored filters{tweaksChanged ? " + tuning adjustments" : ""}</p></div></details> : <FitterControls advanced value={fitter} defaultValue={defaultFitter} onChange={setFitter} onDefault={saveDefault} notice={fitterNotice}/>} analyser={analyser} playing={playing} regionDrag={regionDrag} onDragStart={beginGesture} onDrag={(key,value) => { set(key,value); if (["bass", "body", "ear", "air", "treble"].includes(key)) setActiveBand(key === "bass" ? 1 : key === "body" ? 2 : key === "ear" ? 3 : key === "air" ? 4 : 5); }} onDragEnd={endGesture}/>
          <div className="pt-match-download"><span>{activeMatch ? activeMatch.channelMatchMode === "custom" ? "Uploaded channel match" : "YinYang AutoMatch · from saved Left/Right responses" : "Channel match needs paired Left/Right responses."}</span><button type="button" disabled={!activeMatch} onClick={()=>{try { if(activeMatch) downloadLocalFile(autoMatchFilename(measurement?.device || savedEq?.headphone || "headphones", activeMatch.channelMatchMode === "custom"),channelMatchWav(activeMatch),"audio/wav"); } catch(error) { setMessage(error instanceof Error?error.message:"Could not download the channel match."); }}}>Download match WAV</button><a href="/shootout?tab=eqs#channel-matches">Saved channel matches</a></div><p className="pt-fit-status" role="status">{soundMode === "saved" ? `Stored EQ · ${savedEq?.source || "original coefficients"}` : `${fitterLabel(fitter)}${preparingEq ? " · preparing replacement; current sound continues" : fit?.fallbackReason ? " · original fitter fallback" : ""}`}</p><p className="pt-response-note">{!measurement ? soundMode === "saved" ? "The saved EQ’s linked headphone measurement is needed for raw and predicted overlays." : "Choose a headphone measurement to add raw and predicted response overlays." : preparingEq ? "Preparing EQ… the predicted overlay will be available when the fit is ready." : "Raw and predicted overlays retain the measurement’s peaks and dips. The prediction adds the filters used for playback; it is not a new measurement."}{soundMode === "saved" && !savedEq?.target && " This saved EQ has no stored target curve."}{matchEnabled && activeMatch && " Includes the active channel correction; paired measurements show the L/R average."} Overall playback volume and headroom are excluded. Your curve shows the settings; the prediction follows EQ on/off.</p>
          {soundMode === "saved" && savedEq && <div className="pt-saved-edit-status"><span>{tweaksChanged ? "Edited · not saved" : "Playing the saved filters"}</span><button type="button" disabled={!tweaksChanged} onClick={saveEditedEq}>Save as new EQ</button></div>}
          <div className="pt-gesture-guide"><span>Drag the curve or use the controls below.</span><label><input type="checkbox" checked={regionDrag} onChange={event => setRegionDrag(event.target.checked)}/> Move by region gain <span>(or hold Shift)</span></label></div>
          <fieldset className="pt-tone-controls" disabled={soundMode === "saved" && !savedEq}>
            <legend className="pt-visually-hidden">Added tuning adjustments</legend>
            <div className="pt-tone-strips">{GAIN_CONTROLS.map((control, index) => {
              const tone = TONE_FREQUENCIES[index], hz = tone.placement ? settings[tone.placement] : tone.fixed!;
              const limit = expanded ? EXPANDED_GAIN_LIMIT : control.limit, gain = Math.round(settings[control.key] * 10) / 10;
              return <div className="pt-tone-strip" key={control.key} style={{ color: graphColor(control.color, control.lightColor) }}>
                <label className="pt-tone-gain" title={control.hint}>
                  <strong>{tone.label}</strong><output>{gain > 0 ? "+" : ""}{gain}<small> dB</small></output>
                  <span className="pt-tone-rail"><i className="pt-tone-zero" aria-hidden="true"/><input type="range" min={-limit} max={limit} step={.5} value={settings[control.key]} style={{ accentColor: graphColor(control.color, control.lightColor) }} aria-label={control.name} aria-orientation="vertical" aria-valuetext={`${settings[control.key]} decibels; ${tone.relation.toLowerCase()} ${hz} hertz`} onPointerDown={() => { beginGesture(); setActiveBand(index + 1); }} onPointerUp={finishSliderPointer} onPointerCancel={finishSliderPointer} onKeyDown={event => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) beginGesture(); }} onKeyUp={endGesture} onBlur={endGesture} onChange={event => { set(control.key, Number(event.target.value)); setActiveBand(index + 1); }}/></span>
                </label>
                <span className="pt-tone-relation">{tone.relation}</span>
                {tone.placement ? <button type="button" className="pt-tone-frequency" aria-label={`Edit ${PLACEMENTS[tone.placement].name}`} aria-expanded={frequencyEditor === tone.placement} aria-controls="pt-frequency-editor" title={`Change ${PLACEMENTS[tone.placement].name.toLowerCase()} (${PLACEMENTS[tone.placement].tag})`} onClick={event => { frequencyTrigger.current = event.currentTarget; if (frequencyEditor === tone.placement) closeFrequencyEditor(); else { setFrequencyDraft(String(hz)); setFrequencyEditor(tone.placement!); } }}><span>{formatHz(hz)}<small> Hz</small></span><b>{PLACEMENTS[tone.placement].tag}</b></button> : <span className="pt-tone-frequency pt-tone-fixed" title="Fixed center frequency">{formatHz(hz)}<small> Hz</small></span>}
              </div>;
            })}</div>
            {frequencyEditor && <form className="pt-frequency-editor" id="pt-frequency-editor" aria-label="Frequency placement" onSubmit={event => { event.preventDefault(); applyFrequency(); }} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeFrequencyEditor(); } }}>
              <label htmlFor="pt-frequency-value"><strong>{PLACEMENTS[frequencyEditor].tag} · {PLACEMENTS[frequencyEditor].name}</strong><span>{PLACEMENTS[frequencyEditor].min}–{PLACEMENTS[frequencyEditor].max} Hz</span></label>
              <div><input ref={frequencyInput} id="pt-frequency-value" aria-label={PLACEMENTS[frequencyEditor].name + " frequency"} type="number" inputMode="decimal" required min={PLACEMENTS[frequencyEditor].min} max={PLACEMENTS[frequencyEditor].max} step={PLACEMENTS[frequencyEditor].step} value={frequencyDraft} onChange={event => setFrequencyDraft(event.target.value)}/><span>Hz</span></div>
              <button type="submit">Apply</button><button type="button" className="pt-frequency-cancel" aria-label="Cancel frequency change" onClick={closeFrequencyEditor}><X size={15}/></button>
            </form>}
          </fieldset>
          <div className="pt-tone-help"><span>Slide up to add, down to reduce. Click B, EG or T to move its frequency.</span><details className="pt-frequency-guide"><summary>Frequency guide</summary><div className="pt-region-guide"><div className="pt-region-tabs" role="group" aria-label="Frequency region guide">{BANDS.map((band, index) => <button type="button" aria-pressed={activeBand === index} key={band.name} onClick={() => setActiveBand(index)} style={{ borderTopColor: band.color }}><strong style={{ color: graphColor(band.color, band.lightColor) }}>{band.name}</strong><small>{band.range}</small></button>)}</div><p><strong style={{ color: BANDS[activeBand].color }}>{BANDS[activeBand].name}:</strong> {BANDS[activeBand].example}. {BANDS[activeBand].effect}</p><p>Bass and Treble change a broad shelf below or above their transition. Body, Voice and Edge adjust around a center frequency. These shapes overlap; the curve shows their combined effect.</p></div></details></div>
        </section>
        <div id="tuning-headphones"><SoundSetup mode={soundMode} onMode={changeSoundMode} presets={presets} presetId={presetId} onPreset={chooseSavedEq}
          headphones={<div className="shootout-content pt-headphones"><HeadphonePicker rows={measurements} selectedId={measurementId} headphoneType={headphoneType} onType={type => { setHeadphoneType(type); clearMeasurement(); }} onSelect={chooseMeasurement} onClear={clearMeasurement} onImport={importMeasurement} onUpload={() => { setEditId(null); setManagerOpen(true); }} onEdit={id => { setEditId(id); setManagerOpen(true); }} onDelete={deleteMeasurement} responsiveUploadLabel/></div>}
          target={<><div><label className="pt-visually-hidden" htmlFor="tuning-target">Target curve</label><div className="sound-source-actions"><select id="tuning-target" aria-label="Target curve" value={selected} onChange={event => changeTarget(event.target.value)}>{targetOptions.map(row => <option key={row.id} value={row.id}>{row.name} · {row.creator}</option>)}</select><label className="pt-import" title="Import a target CSV or TXT"><Upload size={15}/><span>Import</span><input type="file" accept=".csv,.txt,text/plain,text/csv" onChange={event => void loadCurve(event.target.files?.[0])}/></label></div></div><p>{measurement ? `Fitted for ${measurement.name}.` : "Choose your headphones to hear this target applied to their measurement."}</p></>}>
          {soundMode === "saved" && savedEq && !measurement && <p className="sound-state">{savedEq.measurementId ? "The linked headphone measurement is unavailable in this browser. Saved filters still work; raw and predicted headphone overlays need that measurement." : "This EQ has no linked headphone measurement. Saved filters still work; headphone response overlays are unavailable."}</p>}
        </SoundSetup></div>
      <section className="pt-listen pt-unified-player" id="saved-eq-listening" aria-label="Music player"><div className="pt-card-heading"><NowPlaying title={audioName} source={audioUrl.startsWith("blob:") ? "File on your device" : audioUrl ? "Music library" : undefined} playing={playing}/></div>
        <p className="pt-active-sound" role="status">{eqOn ? soundMode === "saved" ? `Saved EQ: ${savedEq?.name}` : `Target: ${target.name}${measurement ? ` · ${measurement.name}` : " · choose headphones to apply this target"}` : "EQ off · original sound"}{soundMode === "saved" && tweaksChanged ? " · edited, not saved" : ""}{matchEnabled && activeMatch ? " · channel match on" : ""}{preparingEq ? " · preparing EQ…" : ""}</p>
      <div className="pt-music-chooser" role="group" aria-label="Choose music">
      <div className={`pt-source-row${queue.length ? " pt-has-folder" : ""}`}><button className="pt-track-play" onClick={playRandomCurated}><Shuffle size={16}/> Random song</button><MusicTrackPicker tracks={curatedMusic} selectedIndex={selectedCuratedIndex} onSelect={index => loadCurated(index)}/><label className="pt-file"><FileAudio size={16}/> Audio file<input type="file" accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg,.opus" onChange={e => void loadAudio(e.target.files?.[0])}/></label><label className="pt-file"><FolderOpen size={16}/> Music folder<input type="file" accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg,.opus" multiple {...{ webkitdirectory: "" }} onChange={e => { const files = Array.from(e.target.files || []).filter(file => /\.(mp3|m4a|flac|wav|ogg|opus|aac)$/i.test(file.name)); setQueue(files); if (files[0]) void loadAudio(files[0]); }}/></label>{queue.length > 0 && <><button type="button" className="pt-track-play pt-folder-shuffle" onClick={shuffleFolder}><Shuffle size={14}/> Shuffle folder</button><select aria-label="Choose a track from the folder" value="" onChange={e => e.target.value === "shuffle" ? shuffleFolder() : void loadAudio(queue[Number(e.target.value)])}><option value="" disabled>{queue.length} folder tracks</option><option value="shuffle">↝ Shuffle folder tracks</option>{queue.map((file, index) => <option key={index} value={index}>{file.name}</option>)}</select></>}</div>
</div>
      <div className={`pt-playback-deck${playing ? " is-playing" : ""}`} role="group" aria-label="Music playback controls">
        <PlaybackTransport playing={playing} disabled={!audioUrl || (!playing && preparingEq)} onToggle={() => void (media.current?.paused ? play() : stop())} volume={volume} onVolume={setVolume} zoom={{ value: waveZoom, min: 1, max: 8, available: !!audioAnalysis, onChange: setWaveZoom }} tools={<><button type="button" aria-label="Toggle Dynamic Range Compression/Expansion slider" aria-pressed={dynamicSliderEnabled} disabled={!dynamicsReady || !duration} onClick={() => setDynamicSliderEnabled(value => !value)} title="Adjust the difference between quiet and loud moments"><AudioLines size={18}/><span>Dynamics</span></button>{Math.abs(dynamicRange) >= .0001 && <button type="button" aria-label="Reset track dynamics" disabled={!dynamicsReady} onClick={() => updateDynamicRange(0)}>Reset dynamics</button>}</>}/>
        {dynamicSliderEnabled && <p className="pt-dynamics-note">Dynamics changes the level contrast over time. Drag up to expand (quieter quiet parts), or down to compress (less contrast, with makeup gain). 0% keeps the original. It cannot restore detail already lost in a compressed recording.</p>}
        <TrackWaveform playing={playing} getPlaybackPosition={()=>media.current?.currentTime??position} compact hideZoom zoom={waveZoom} onZoom={setWaveZoom} analysis={audioAnalysis} sourceUrl={audioUrl} position={position} duration={duration} onSeek={seconds => { if (media.current) media.current.currentTime = seconds; setPosition(seconds); }} dynamicRange={dynamicRange} onDynamicRangeChange={updateDynamicRange} dynamicSliderEnabled={dynamicSliderEnabled} dynamicRangeDisabled={!dynamicsReady} placeholder={audioUrl ? "Track ready · waveform analysis in progress" : "Choose music to view its waveform"}/>
        <PlaybackTime position={position} duration={duration}/>
        <p className="pt-playback-shortcut"><kbd>Space</kbd> play / pause</p>
      </div>
      <audio ref={media} crossOrigin="anonymous" preload="metadata" onLoadedMetadata={() => { setDuration(media.current?.duration || 0); if (media.current) media.current.volume = 1; }} onTimeUpdate={() => setPosition(media.current?.currentTime || 0)} onPlay={handleMediaPlay} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setMessage("This track could not be played in your browser. Try another format or file.")}/></section>
        {managerOpen && <div className="pt-manager"><button type="button" className="pt-reset" onClick={() => setManagerOpen(false)}>Close measurement editor</button><div className="shootout-content"><MeasurementManager key={editId || "new"} rows={measurements} selectedId={measurementId} editId={editId} onAdd={row => { addMeasurement(row); setManagerOpen(false); }} onUpdate={row => { saveMeasurements(measurements.map(item => item.id === row.id ? row : item)); setManagerOpen(false); }} onDelete={deleteMeasurement} onSelect={chooseMeasurement}/></div></div>}

        {soundMode === "target" && <section className="pt-finalize" aria-label="Make EQ settings">
          <div className="pt-finalize-intro"><div><span className="pt-step">EXPORT</span><h2>Make EQ settings for my headphones</h2><p>Create settings to use in this site’s music library or a compatible EQ app. Start with the recommended EQ, which favors smaller boosts, especially in deep bass. Listen to the closer fit too when it differs.</p></div><div className="pt-finalize-action">{!measurement?.points?.length && <p key={measurementAttention} className={`pt-measurement-needed${measurementAttention ? " pt-attention" : ""}`} role="note"><strong>Choose a headphone measurement</strong><span>to generate EQ filters.</span></p>}<button ref={finalizeButton} type="button" className={`pt-finalize-button${measurementAttention ? " pt-attention" : ""}`} disabled={finalizing} onClick={event => { if (!measurement?.points?.length) { setMessage("Choose a headphone measurement to generate EQ filters."); setMeasurementAttention(value => value + 1); document.querySelector<HTMLInputElement>('.pt-headphones input[type="search"]')?.focus(); document.querySelector('.pt-headphones')?.scrollIntoView({block:"center"}); if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) event.currentTarget.animate([{ transform: "translateX(0)" }, { transform: "translateX(-7px)" }, { transform: "translateX(7px)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }], { duration: 500, easing: "ease-in-out" }); return; } void finalizeCurve(); }}>{finalizing ? `Making EQ settings ${finalProgress} / 12…` : !measurement?.points?.length ? "Choose headphones first" : finalized ? "Regenerate EQ settings" : "Make my EQ settings"}</button></div></div>
          {finalized && <a className="eq-results-jump" href="#tuning-eq-results">View generated EQ results</a>}
          <p id="pt-export-disclosure" className="pt-export-disclosure">For participating listener accounts, downloading sends the selected target, adjusted curve, settings and exported file for administrator-only research. EQ exports also include the selected measurement name. Admin and hidden test accounts save local tests instead. Music files and raw headphone measurements are not collected here.</p>
          <div className="pt-curve-downloads"><p>Download curve data</p><div className="pt-export-downloads" role="group" aria-label="Target curve downloads" aria-describedby="pt-export-disclosure"><button type="button" onClick={() => void downloadText("original-target.csv", `frequency_hz,level_db\n${normalized.map(([hz, db]) => `${hz.toFixed(2)},${db.toFixed(3)}`).join("\n")}\n`, "text/csv")}>Starting curve data (CSV)</button><button type="button" onClick={() => void downloadText("preference-target.csv", `frequency_hz,level_db\n${preferenceCurve.map(([hz, db]) => `${hz.toFixed(2)},${db.toFixed(3)}`).join("\n")}\n`, "text/csv")}>My adjusted curve data (CSV)</button></div></div>

          {previousResults && !finalized && <p className="pt-finalize-hint">Your sound or headphones changed. Make updated settings before downloading.</p>}
          {finalized && <section className="eq-results-section" aria-labelledby="tuning-eq-results">
            <header className="eq-results-heading">
              <h2 id="tuning-eq-results" ref={resultsHeading} tabIndex={-1}>EQ results for {measurement?.name}</h2>
              <p>{finalized.saved ? "The last generated set is saved in this browser for this setup." : "These results are available in this tab. Browser storage is unavailable."}</p>
            </header>

            <EqCandidateResults tuning comparisonContext={{headphones:measurement?.device || measurement?.name || "Selected headphones",target:target.name}} channelMatch={matchEnabled?activeMatch:undefined} onCompare={stop} variants={finalized.variants} raw={measurement!.points} target={preferenceCurve} onDownload={(variant,format)=>{const base=`preference-${variant.bands}band-${variant.method}${variant.reducedBoost ? "-reduced-boost" : ""}`;const content=format==="equalizerapo"?exportEqualizerApo(variant):format==="easyeffects"?exportEasyEffects(variant):format==="qudelix5k"?exportQudelixGuide(variant):exportPeq(variant);void downloadText(`${base}${format==="txt"?"":"-"+format}.txt`,content,"text/plain",variant);}} onSave={variant=>{try { saveLibraryEq({id:crypto.randomUUID(),name:`${measurement?.device || measurement?.name} → ${target.name}`,fitter:{method:variant.method,bands:variant.bands},source:`Tuning · ${variant.bands} bands · ${variant.method}${variant.reducedBoost ? " · reduced boost" : ""}`,engine:variant.engine,engineVersion:variant.engineVersion,filters:variant.filters,preamp:variant.preamp,measurementId:measurement?.id,headphone:measurement?.device || measurement?.name,channelMatch:measurementChannelMatch(measurement),target:{id:target.id,name:target.name,points:preferenceCurve}});setMessage("EQ saved to My space, Tuning and Music library.");} catch(error){setMessage(error instanceof Error?error.message:"Could not save this EQ.");}}}/>

            <p className="pt-export-help">EasyEffects uses its Import APO action; set its input gain to the listed preamp if needed. The Qudelix 5K file is a manual-entry guide.</p>
            <details className="pt-finalize-note"><summary>How the volume adjustment is calculated</summary><p>Preamp is rounded down from the highest calculated EQ boost over 20 Hz–20 kHz at 44.1, 48, and 96 kHz, plus 0.5 dB headroom. Keep additional player or device headroom for intersample peaks and other processing. This does not measure the sound level at your ears.</p></details>
          </section>}

        </section>}
      </div>
      {message && <p className="pt-message" role="status">{message}</p>}
    </div>
    {resetOpen && <div className="pt-reset-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeReset(); }}>
      <section className="pt-reset-dialog" role="dialog" aria-modal="true" aria-labelledby="pt-reset-title" aria-describedby="pt-reset-description" onKeyDown={event => { if (event.key === "Tab") { event.preventDefault(); (document.activeElement === resetNoButton.current ? resetYesButton.current : resetNoButton.current)?.focus(); } }}>
        <span className="pt-reset-kicker">RESET TUNING</span><h2 id="pt-reset-title">Reset all changes?</h2><p id="pt-reset-description">This restores the starting target, sliders, frequency placements, and chart view. It clears every Undo and Redo state and removes generated EQ results. Your headphone selection and loaded music stay in place. This cannot be undone.</p>
        <div className="pt-reset-actions"><button ref={resetNoButton} type="button" onClick={closeReset}>Keep my changes</button><button ref={resetYesButton} type="button" className="pt-reset-confirm" onClick={confirmReset}>Reset tuning</button></div>
      </section>
    </div>}
    {instructionsOpen && <div className="pt-instructions-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setInstructionsOpen(false); instructionsButton.current?.focus(); } }}>
      <section className="pt-instructions-dialog" role="dialog" aria-modal="true" aria-labelledby="pt-instructions-title" onKeyDown={event => { if (event.key !== "Tab") return; const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),summary,a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(el=>el.getClientRects().length>0); const first=controls[0],last=controls.at(-1); if (event.shiftKey && document.activeElement===first) {event.preventDefault();last?.focus();} else if (!event.shiftKey && document.activeElement===last) {event.preventDefault();first?.focus();} }}>
        <div className="pt-instructions-header"><div><span className="pt-step">PREFERENCE TUNING LAB</span><h2 id="pt-instructions-title">How to use the lab</h2><p>Four quick moves, with examples of what to click and what changes.</p></div><button ref={instructionsClose} type="button" aria-label="Close instructions" onClick={() => { setInstructionsOpen(false); instructionsButton.current?.focus(); }}><X size={18}/></button></div>
        <div className="pt-instructions-steps">
          <section className="pt-instructions-step"><div className="pt-instructions-copy"><h3><span>1</span> Start with a target and headphones</h3><p>Choose your headphones in Headphones & EQ, then select Target or Saved EQ. A measurement lets the lab account for your headphones and create an EQ you can download.</p><p><b>Example:</b> Pick a target from the list, search for your headphone model, then select its measurement. You can also upload a CSV or TXT curve or your own headphone measurement.</p></div><div className="pt-instructions-preview" aria-hidden="true"><span className="pt-preview-label">TARGET</span><div className="pt-preview-row"><span className="pt-preview-select">Choose target <b>⌄</b></span><span className="pt-preview-square"><Upload size={13}/></span></div><span className="pt-preview-label">HEADPHONES</span><div className="pt-preview-row"><span className="pt-preview-pill">In-Ear</span><span className="pt-preview-pill">Over-Ear</span><span className="pt-preview-search">Search model</span></div></div></section>
          <section className="pt-instructions-step"><div className="pt-instructions-copy"><h3><span>2</span> Shape the curve</h3><p>Drag the colored curve up or down, or use the sliders beneath it. The dashed gray line shows where you started; the colored line shows your changes.</p><p><b>Example:</b> Raise Bass by 3 dB for more low-end weight. Use Undo or Reset if you want to try another direction.</p></div><div className="pt-instructions-preview" aria-hidden="true"><span className="pt-preview-label">YOUR CHANGE</span><div className="pt-preview-curve"><i/><i/><i/></div><div className="pt-preview-slider"><b>Bass</b><span>━━━━●━━━━</span><b>+3 dB</b></div><div className="pt-preview-row"><span className="pt-preview-pill">↶ Undo</span><span className="pt-preview-pill">↷ Redo</span><span className="pt-preview-pill">Reset</span></div></div></section>
          <section className="pt-instructions-step"><div className="pt-instructions-copy"><h3><span>3</span> Listen to the difference</h3><p>Play a library song or choose audio from your device. Turn <b>EQ</b> on and off above Fine-tune your sound to compare your edited sound with the starting target. Keep the volume comfortable.</p><p><b>Example:</b> Listen to a vocal section, bypass your change, then turn it back on. Click the waveform to replay the same moment.</p></div><div className="pt-instructions-preview" aria-hidden="true"><span className="pt-preview-label">PLAYBACK</span><div className="pt-preview-row"><span className="pt-preview-play"><Play size={12}/> Play</span><span className="pt-preview-pill">□ Hear without my added EQ changes</span></div><div className="pt-preview-wave">▁▃▇▄▂▅▇▃▁▆▂▅▇▄▁</div><span className="pt-preview-label">COMPARE THE SAME MOMENT</span></div></section>
          <section className="pt-instructions-step"><div className="pt-instructions-copy"><h3><span>4</span> Make settings and choose where to use them</h3><p>Press <b>Make EQ settings</b> after choosing a headphone measurement. Use quick setup, then choose where to use it: this site’s music library, a supported app, or a manual setup guide. You can keep editing and generate settings again.</p><p>You can also download the original target or your adjusted preference curve as data.</p></div><div className="pt-instructions-preview" aria-hidden="true"><span className="pt-preview-label">EXPORT</span><span className="pt-preview-finalize">Make EQ settings</span><div className="pt-preview-row"><span className="pt-preview-pill">10 bands</span><span className="pt-preview-pill">15 bands</span><span className="pt-preview-pill">20 bands</span></div><span className="pt-preview-label">CHECK FIT · DOWNLOAD EQ</span></div></section>
        </div>
        <details className="pt-instructions-more"><summary>More controls and shortcuts</summary><div><p><b>Fine tuning:</b> Use Axis &amp; size for chart limits. Click the B, EG, or T frequency beneath a gain slider to change its placement, or drag its marker on the graph. The ±20 dB range expands the sliders. Open Frequency guide for sound examples.</p><p><b>Playback:</b> Space pauses or resumes when a form field is not focused. Shuffle folder picks another local track. Files from your device stay in the browser.</p><p><b>Export:</b> Standard spaces filters evenly; Precise fits more closely. Smooth favors a gentler curve; Close follows it more tightly. Leave device headroom when applying EQ.</p></div></details>
      </section>
    </div>}
  {consent.dialog}
  </main>;
}
