"use client";
import { useConsentPrompt } from "@/components/use-consent-prompt";
import "@/components/alpha-audio-workbench.css";
import { recordAdminTestIfNeeded } from "@/lib/admin-test-store";
import {musicDisplayTitle} from "@/lib/music-display";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { BookOpen, Pause, Play, RotateCcw, Redo2, Shuffle, SlidersHorizontal, Undo2, Upload, Volume2, VolumeX, X } from "lucide-react";
import { parseCurve, type Point } from "@/lib/curves";
import { packRegionLabels, placeMarkerLabels } from "@/lib/curve-label-layout";
import { presetFilterResponse, type PresetFilter } from "@/lib/peq-preset";
import { fitAutoEq } from "@/lib/autoeq";
import { finalizeVariant, exportPeq, exportEqualizerApo, exportEasyEffects, exportQudelixGuide, type FinalizedVariant } from "@/lib/preference-finalize";
import type { HeadphoneMeasurement } from "@/lib/measurement";
import HeadphonePicker, { type CatalogMeasurement } from "@/components/headphone-picker";
import MeasurementManager from "@/components/measurement-manager";
import { importCatalogEntry } from "@/lib/public-measurements";
import { saveLibraryEq } from "@/lib/music-library-eq";
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
const formatTime = (seconds: number) => { const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0; return `${Math.floor(safe / 60)}:${String(Math.floor(safe % 60)).padStart(2, "0")}`; };
function ScrollingTrackTitle({ title }: { title: string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);
  useEffect(() => {
    const measure = () => setOverflow(Math.max(0, (content.current?.scrollWidth || 0) - (viewport.current?.clientWidth || 0)));
    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    if (content.current) observer.observe(content.current);
    measure();
    return () => observer.disconnect();
  }, [title]);
  const label = title || "Choose music to begin";
  return <div ref={viewport} className={`pt-deck-title${overflow > 1 ? " is-scrolling" : ""}`} title={label}>
    <span className="pt-visually-hidden">Track: </span><span ref={content} style={overflow > 1 ? { "--pt-title-distance": `${overflow}px`, animationDuration: `${Math.max(14, overflow / 18 + 6)}s` } as CSSProperties : undefined}>{label}</span>
  </div>;
}
const fallback: Target = { id: "flat", name: "Flat reference", creator: "Reference", points: [[20, 0], [20000, 0]] };
type GainKey = "bass" | "body" | "ear" | "air" | "treble";
type EditSnapshot = { settings: Settings; selected: string; expanded: boolean };
const GAIN_CONTROLS: { key: GainKey; name: string; hz: number; limit: number; color: string; hint: string }[] = [
  { key: "bass", name: "Bass", hz: 80, limit: 12, color: "#65c9ff", hint: "Sub weight and kick impact" },
  { key: "body", name: "Body", hz: 320, limit: 6, color: "#e9b66a", hint: "Warmth and low mids" },
  { key: "ear", name: "Ear gain", hz: 2800, limit: 10, color: "#b3a0ff", hint: "Voice and instrument presence" },
  { key: "air", name: "Upper presence", hz: 6500, limit: 6, color: "#f29cad", hint: "Clarity, snap and sibilance" },
  { key: "treble", name: "Treble", hz: 12000, limit: 12, color: "#df9ae9", hint: "Air and overall high end" },
];
const BANDS = [
  { name: "Sub", short: "SUB", range: "20–60 Hz", example: "808 sustain, subwoofer rumble, the lowest kick fundamentals", effect: "More feels deeper and heavier; less tightens rumble that masks bass notes.", low: 20, high: 60, color: "#4fdac8" },
  { name: "Bass", short: "BASS", range: "60–250 Hz", example: "Kick punch, bass guitar fundamentals, low piano and cello", effect: "More adds impact and weight; too much can blur rhythm.", low: 60, high: 250, color: "#65c9ff" },
  { name: "Low mids", short: "BODY", range: "250–800 Hz", example: "Vocal chest, guitar and brass body, piano warmth", effect: "More adds fullness; less clears mud but can make music thin.", low: 250, high: 800, color: "#e9b66a" },
  { name: "Mids & ear gain", short: "VOICE", range: "800 Hz–4 kHz", example: "Vocal intelligibility, flute, guitar attack, brass presence", effect: "More brings voices forward; too much can sound shouty.", low: 800, high: 4000, color: "#b3a0ff" },
  { name: "Upper presence", short: "EDGE", range: "4–8 kHz", example: "Consonants, snare snap, pick noise and sibilance", effect: "More adds definition; less softens sharpness and hiss.", low: 4000, high: 8000, color: "#f29cad" },
  { name: "Air", short: "AIR", range: "8–22 kHz", example: "Cymbal shimmer, room air and breath detail", effect: "More sounds open; too much can make recordings splashy.", low: 8000, high: MAX_VIEW_HZ, color: "#df9ae9" },
] as const;
const at = (points: Point[], hz: number) => {
  if (!points.length) return 0;
  if (hz <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) if (hz <= points[i][0]) {
    const [a, y0] = points[i - 1], [b, y1] = points[i];
    return y0 + (y1 - y0) * Math.log(hz / a) / Math.log(b / a);
  }
  return points[points.length - 1][1];
};
const filtersFor = (s: Settings): PresetFilter[] => [
  { type: "LSC", hz: s.bassHz, gain: s.bass, q: .7 },
  { type: "PK", hz: 320, gain: s.body, q: .8 },
  { type: "PK", hz: s.earHz, gain: s.ear, q: .9 },
  { type: "PK", hz: 6500, gain: s.air, q: 1.5 },
  { type: "HSC", hz: s.trebleHz, gain: s.treble, q: .7 },
];
const previewGain = (filters: PresetFilter[], bypass: boolean) => {
  if (bypass) return .7;
  const peak = Math.max(0, ...Array.from({ length: 121 }, (_, i) => {
    const hz = 20 * 1000 ** (i / 120);
    return filters.reduce((sum, filter) => sum + presetFilterResponse(hz, filter, 48000), 0);
  }));
  return .7 * 10 ** (-peak / 20);
};
function CurveChart({ points, settings, expanded, axis, analyser, playing, regionDrag, onDragStart, onDrag, onDragEnd }: { points: Point[]; settings: Settings; expanded: boolean; axis: AxisView; analyser: AnalyserNode | null; playing: boolean; regionDrag: boolean; onDragStart: () => void; onDrag: (key: keyof Settings, value: number) => void; onDragEnd: () => void }) {
  const surface = useRef<HTMLDivElement>(null);
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
  const frequencies = Array.from({ length: 241 }, (_, i) => 20 * (MAX_VIEW_HZ / 20) ** (i / 240));
  const base = frequencies.map(hz => at(points, hz) - at(points, 1000) + CURVE_VIEW.anchor);
  const adjusted = frequencies.map((hz, i) => base[i] + filters.reduce((sum, filter) => sum + presetFilterResponse(hz, filter, 48000), 0));
  const visible = frequencies.flatMap((hz, i) => hz >= axis.freqMin && hz <= axis.freqMax ? [base[i], adjusted[i]] : []);
  const measured = visible.length ? visible : [...base, ...adjusted];
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
  const adjustedAt = (hz: number) => at(points, hz) - at(points, 1000) + CURVE_VIEW.anchor + filters.reduce((sum, filter) => sum + presetFilterResponse(hz, filter, 48000), 0);
  const placementMarkers = [
    { key: "bassHz" as const, min: 60, max: 250, step: 5, name: "Bass transition", tag: "BT", hz: settings.bassHz, color: GAIN_CONTROLS[0].color },
    { key: "earHz" as const, min: 1500, max: 4500, step: 50, name: "Ear gain center", tag: "EGC", hz: settings.earHz, color: GAIN_CONTROLS[2].color },
    { key: "trebleHz" as const, min: 3500, max: 10000, step: 100, name: "Treble transition", tag: "TT", hz: settings.trebleHz, color: GAIN_CONTROLS[4].color },
  ];
  const visibleMarkers = placementMarkers.filter(marker => marker.hz >= axis.freqMin && marker.hz <= axis.freqMax).map(marker => ({ ...marker, x: x(marker.hz), y: Math.max(plot.top + 3, Math.min(plot.bottom - 3, y(adjustedAt(marker.hz)))), width: marker.tag === "EGC" ? 42 : 34 }));
  const markerLabels = placeMarkerLabels(visibleMarkers, { left: plot.left, right: plot.right, top: plot.top, bottom: plot.bottom });
  return <div className="pt-chart-wrap"><div className="pt-chart-surface" ref={surface} style={{ width: `${axis.width}%`, height: axis.height || undefined }}><svg viewBox={`0 0 ${size.width} ${size.height}`} role="group" aria-label={`Selected baseline curve in gray and region colored adjusted curve, plotted from ${axis.freqMin} to ${axis.freqMax} hertz and ${viewMin} to ${viewMax} dB`}>
    <defs><clipPath id="pt-plot-clip"><rect x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} /></clipPath></defs>
    {ticks.map(db => <g key={db}><line className="pt-grid-line" x1={plot.left} x2={plot.right} y1={y(db)} y2={y(db)} stroke={db === CURVE_VIEW.anchor ? "rgba(160,185,190,.30)" : db % 10 === 0 ? "rgba(130,160,175,.16)" : "rgba(130,160,175,.10)"} strokeWidth={db === CURVE_VIEW.anchor ? .8 : db % 10 === 0 ? .7 : .6} vectorEffect="non-scaling-stroke" strokeDasharray={db === CURVE_VIEW.anchor ? "4 4" : undefined}/><text x={plot.left - 9} y={y(db) + 3.5} textAnchor="end" fill="#8ca4ab" fontSize="10">{db}</text></g>)}
    {BANDS.slice(1).filter(b => b.low > axis.freqMin && b.low < axis.freqMax).map(b => <line className="pt-region-grid-line" key={b.name} x1={x(b.low)} x2={x(b.low)} y1={plot.top} y2={plot.bottom} stroke="rgba(130,160,175,.14)" strokeWidth=".65" vectorEffect="non-scaling-stroke" strokeDasharray="3 5"/>)}
    <path d={path(base)} clipPath="url(#pt-plot-clip)" fill="none" stroke="#8a999c" strokeWidth="2" strokeDasharray="6 5" />
    {visibleBands.map((b, index) => <g key={b.name}><text className="pt-region-label" x={regionLabels[index].x} y={16 + regionLabels[index].row * 16} textAnchor="middle" fill={b.color} fontSize="11" fontWeight="700">{b.short}</text><clipPath id={`pt-region-${b.short}`}><rect x={x(Math.max(b.low, axis.freqMin))} y={plot.top} width={x(Math.min(b.high, axis.freqMax))-x(Math.max(b.low, axis.freqMin))} height={plotHeight} /></clipPath><path d={path(adjusted)} clipPath={`url(#pt-region-${b.short})`} fill="none" stroke={b.color} strokeWidth="8" strokeOpacity=".23" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 7px ${b.color})` }}/><path d={path(adjusted)} clipPath={`url(#pt-region-${b.short})`} fill="none" stroke={b.color} strokeWidth="3" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${b.color})` }}/></g>)}
    {frequencyTicks.map(hz => <text key={hz} x={x(hz)} y={plot.bottom + 16} textAnchor="middle" fill="#91a8ae" fontSize="10">{formatHz(hz)}</text>)}
    <text x={plot.right} y={size.height - 5} textAnchor="end" fill="#91a8ae" fontSize="10">Frequency (Hz) · level (dB)</text>
    <rect x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} fill="transparent" className="pt-curve-drag" aria-hidden="true" onPointerDown={event => { const svg = event.currentTarget.ownerSVGElement; if (!svg) return; const bounds = svg.getBoundingClientRect(); const xx = (event.clientX - bounds.left) * size.width / bounds.width; const hz = axis.freqMin * (axis.freqMax / axis.freqMin) ** (Math.max(0, Math.min(1, (xx - plot.left) / plotWidth))); const sensitivity = (key: GainKey) => { const up = filtersFor({...settings, [key]: .5}), down = filtersFor({...settings, [key]: -.5}); return up.reduce((sum, filter, index) => sum + presetFilterResponse(hz, filter, 48000) - presetFilterResponse(hz, down[index], 48000), 0); }; const control = GAIN_CONTROLS.reduce((best, item) => sensitivity(item.key) > sensitivity(best.key) ? item : best, GAIN_CONTROLS[0]); drag.current = { key: control.key, startY: event.clientY, startGain: settings[control.key], startResponse: adjustedAt(hz), frequency: hz, settings: {...settings}, regional: regionDrag || event.shiftKey, height: bounds.height, scale: viewMax - viewMin, plotHeight, limit: expanded ? EXPANDED_GAIN_LIMIT : control.limit }; event.currentTarget.setPointerCapture(event.pointerId); onDragStart(); }} onPointerMove={event => { const active = drag.current; if (!active) return; const delta = (active.startY - event.clientY) * size.height / active.height * active.scale / active.plotHeight; let next = active.startGain + delta;
      if (!active.regional) {
        const desired = active.startResponse + delta;
        const response = (gain: number) => at(points, active.frequency) - at(points, 1000) + CURVE_VIEW.anchor + filtersFor({...active.settings, [active.key]: gain}).reduce((sum, filter) => sum + presetFilterResponse(active.frequency, filter, 48000), 0);
        let low = -active.limit, high = active.limit;
        for (let iteration = 0; iteration < 28; iteration++) { const middle = (low + high) / 2; if (response(middle) < desired) low = middle; else high = middle; }
        next = (low + high) / 2;
      }
      onDrag(active.key, Math.round(Math.max(-active.limit, Math.min(active.limit, next)) * 1000) / 1000); }} onPointerUp={event => { if (drag.current) { drag.current = null; event.currentTarget.releasePointerCapture(event.pointerId); onDragEnd(); } }} onPointerCancel={() => { drag.current = null; onDragEnd(); }}/>
    {visibleMarkers.map((marker, index) => { const mx = marker.x, my = marker.y; const label = markerLabels[index]; const labelCenter = label.x + label.width / 2; const labelEdge = my < label.y ? label.y : label.y + label.height; return <g key={marker.name} className="pt-placement-marker" role="slider" tabIndex={0} aria-label={marker.name} aria-valuemin={marker.min} aria-valuemax={marker.max} aria-valuenow={marker.hz} aria-valuetext={`${marker.hz} hertz`} aria-orientation="horizontal" aria-keyshortcuts="ArrowLeft ArrowRight Home End" onKeyDown={event => { let next = marker.hz; if (event.key === "ArrowLeft") next -= marker.step; else if (event.key === "ArrowRight") next += marker.step; else if (event.key === "Home") next = marker.min; else if (event.key === "End") next = marker.max; else return; event.preventDefault(); event.stopPropagation(); onDragStart(); onDrag(marker.key, Math.max(marker.min, Math.min(marker.max, next))); }} onKeyUp={onDragEnd} onBlur={onDragEnd} onPointerDown={event => { event.stopPropagation(); markerDrag.current = marker; event.currentTarget.setPointerCapture(event.pointerId); onDragStart(); }} onPointerMove={event => { const active = markerDrag.current; const svg = event.currentTarget.ownerSVGElement; if (!active || !svg) return; const bounds = svg.getBoundingClientRect(); const xx = (event.clientX - bounds.left) * size.width / bounds.width; const frequency = axis.freqMin * (axis.freqMax / axis.freqMin) ** Math.max(0, Math.min(1, (xx - plot.left) / plotWidth)); onDrag(active.key, Math.max(active.min, Math.min(active.max, Math.round(frequency / active.step) * active.step))); }} onPointerUp={event => { if (markerDrag.current) { markerDrag.current = null; event.currentTarget.releasePointerCapture(event.pointerId); onDragEnd(); } }} onPointerCancel={() => { markerDrag.current = null; onDragEnd(); }}><title>{`${marker.name}: drag left or right, or use arrow keys`}</title><circle className="pt-marker-halo" cx={mx} cy={my} r="12" fill={marker.color} fillOpacity=".12" stroke={marker.color} strokeOpacity=".35"/><line x1={mx} x2={labelCenter} y1={my} y2={labelEdge} stroke={marker.color} strokeWidth="1" opacity=".7"/><circle cx={mx} cy={my} r="5" fill={marker.color} stroke="#041013" strokeWidth="1.5"/><rect className="pt-marker-tag" x={label.x} y={label.y} width={label.width} height={label.height} rx="4" fill="#061116" stroke={marker.color} strokeWidth="1"/><text x={labelCenter} y={label.y + 12} textAnchor="middle" fill={marker.color} fontSize="11" fontWeight="800" letterSpacing=".5">{marker.tag}</text></g>; })}
  </svg><LiveSpectrum analyser={analyser} playing={playing} size={size} plot={plot} freqMin={axis.freqMin} freqMax={axis.freqMax}/></div><div className="pt-legend"><span><i className="baseline"/>Baseline</span><span><i className="adjusted"/>Your curve</span><span>Live spectrum when music plays</span></div></div>;
}
function LiveSpectrum({ analyser, playing, size, plot, freqMin, freqMax }: { analyser: AnalyserNode | null; playing: boolean; size: { width: number; height: number }; plot: { left: number; right: number; top: number; bottom: number }; freqMin: number; freqMax: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
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
        pen.strokeStyle = layer === 0 ? "#efffff" : band.color + (layer === 1 ? "b8" : "70"); pen.lineWidth = layer === 0 ? 2.3 : 1.6; pen.shadowColor = band.color; pen.shadowBlur = layer === 0 ? 14 : 8; pen.stroke(); pen.shadowBlur = 0;
        pen.lineTo(right, plot.bottom); pen.closePath(); pen.fillStyle = band.color + ["24", "15", "0b"][layer]; pen.fill();
      }
      frame = requestAnimationFrame(draw);
    };
    draw(); return () => { cancelAnimationFrame(frame); pen.clearRect(0, 0, size.width, size.height); };
  }, [analyser, playing, size.width, size.height, plot.left, plot.right, plot.top, plot.bottom, freqMin, freqMax]);
  return <canvas ref={canvas} className="pt-spectrum" aria-label="Live music spectrum across the labeled frequency regions" role="img"/>;
}
type AudioGraph = { context: AudioContext; input: GainNode; filters: BiquadFilterNode[]; fit: BiquadFilterNode[]; output: GainNode; spectrum: AnalyserNode; media?: MediaElementAudioSourceNode; dynamics?: AudioWorkletNode };
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
  const [volume, setVolume] = useState(.8);
  const [volumeOpen, setVolumeOpen] = useState(false);
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
  const [finalized, setFinalized] = useState<{ key: string; variants: FinalizedVariant[]; curve: Point[] } | null>(null);
  const [exportBand, setExportBand] = useState<10 | 15 | 20>(10);
  const graph = useRef<AudioGraph | null>(null);
  const [analyser,setAnalyser]=useState<AnalyserNode | null>(null);
  const media = useRef<HTMLAudioElement>(null);
  const objectUrl = useRef("");
  const [bypass, setBypass] = useState(false);
  const showEdit = useCallback((next: EditSnapshot) => { editRef.current = next; setSettings(next.settings); setSelected(next.selected); setExpanded(next.expanded); }, []);
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
    return () => { stopped = true; generationRef.current++; intentRef.current++; requestRef.current?.abort(); audio?.pause(); stopRankingRefresh(); if (graph.current) void graph.current.context.close(); graph.current = null; if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); };
  }, [applyEdit]);
  // A failed external storage write needs immediate visible feedback; editing remains available.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!axisLoaded) return; try { localStorage.setItem("personal-tuning-v1", JSON.stringify({ settings, selected, expanded })); } catch { setStorageNotice("Browser storage is unavailable. Tuning still works in this tab; changes will not be saved when you leave."); } }, [settings, selected, expanded, axisLoaded]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Report an external storage failure.
  useEffect(() => { if (axisLoaded) try { localStorage.setItem("preference-tuning-axis-v1", JSON.stringify(axis)); } catch { setStorageNotice("Browser storage is unavailable. Tuning still works in this tab; changes will not be saved when you leave."); } }, [axis, axisLoaded]);
  const target = targets.find(t => t.id === selected) || fallback;
  const normalized = useMemo(() => [...target.points].sort((a, b) => a[0] - b[0]), [target]);
  const curatedRanks = useMemo(() => new Map(curatedRanking.map(row => [row.id, row.rank])), [curatedRanking]);
  const selectedCuratedRank = curatedRanks.get(selected);
  const targetOptions = useMemo(() => [...targets].sort((a, b) => (curatedRanks.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (curatedRanks.get(b.id) ?? Number.MAX_SAFE_INTEGER)), [targets, curatedRanks]);
  const filters = useMemo(() => filtersFor(settings), [settings]);
  const measurement = measurements.find(row => row.id === measurementId);
  const fit = useMemo(() => measurement?.points?.length && normalized.length ? fitAutoEq(measurement.points, normalized) : null, [measurement, normalized]);
  const preferenceCurve = useMemo<Point[]>(() => Array.from({ length: 241 }, (_, i) => {
    const hz = 20 * 1000 ** (i / 240);
    return [hz, at(normalized, hz) - at(normalized, 1000) + filters.reduce((sum, filter) => sum + presetFilterResponse(hz, filter, 48000), 0)];
  }), [normalized, filters]);
  const finalizeKey = JSON.stringify({ selected, settings, measurementId });
  const finalIsCurrent = finalized?.key === finalizeKey;
  /** Tuning itself needs no agreement. Viewing the finished EQ or exporting it keeps the file, curve and settings for private research, so that step asks once. */
  async function finalizeCurve() { await consent.ask(runFinalize); }
  async function runFinalize() {
    if (!measurement?.points?.length || finalizing) return;
    setFinalizing(true); setFinalProgress(0); setFinalized(null);
    const curve = preferenceCurve;
    const variants: FinalizedVariant[] = [];
    try {
      for (const bands of [10, 15, 20] as const) for (const method of ["standard", "precise"] as const) for (const priority of ["smooth", "close"] as const) {
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        variants.push(finalizeVariant(measurement.points, curve, bands, method, priority));
        setFinalProgress(variants.length);
      }
      setFinalized({ key: finalizeKey, variants, curve });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not generate EQ filters."); }
    finally { setFinalizing(false); }
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
      node.gain.setTargetAtTime(bypass ? 0 : filters[i].gain, graph.current!.context.currentTime, .025);
    });
    graph.current.fit.forEach((node, i) => {
      const peq = fit?.filters[i]; node.frequency.setTargetAtTime(peq?.hz || 1000, graph.current!.context.currentTime, .03);
      node.Q.setTargetAtTime(peq?.q || 1, graph.current!.context.currentTime, .03);
      node.gain.setTargetAtTime(peq?.gain || 0, graph.current!.context.currentTime, .03);
    });
    graph.current.output.gain.setTargetAtTime(previewGain(filters, bypass) * 10 ** ((fit?.preamp || 0) / 20), graph.current.context.currentTime, .03);
  }, [filters, bypass, fit]);
  const ensureGraph = useCallback(() => {
    if (graph.current) return graph.current;
    const context = new AudioContext();
    const input = context.createGain();
    const nodes = filtersFor(settings).map(filter => {
      const node = context.createBiquadFilter();
      node.type = filter.type === "LSC" ? "lowshelf" : filter.type === "HSC" ? "highshelf" : "peaking";
      node.frequency.value = filter.hz; node.gain.value = bypass ? 0 : filter.gain; node.Q.value = filter.q;
      return node;
    });
    const fitNodes = Array.from({ length: 10 }, () => { const node = context.createBiquadFilter(); node.type = "peaking"; return node; });
    fitNodes.forEach((node, i) => { const peq = fit?.filters[i]; node.frequency.value = peq?.hz || 1000; node.Q.value = peq?.q || 1; node.gain.value = peq?.gain || 0; });
    const output = context.createGain();
    output.gain.value = previewGain(filtersFor(settings), bypass) * 10 ** ((fit?.preamp || 0) / 20);
    input.connect(fitNodes[0]); fitNodes.forEach((node, i) => node.connect(fitNodes[i + 1] || nodes[0])); nodes.forEach((node, i) => node.connect(nodes[i + 1] || output));
    const spectrum = context.createAnalyser(); spectrum.fftSize = 8192; spectrum.smoothingTimeConstant = .78;
    output.connect(spectrum); spectrum.connect(context.destination);
    graph.current = { context, input, filters: nodes, fit: fitNodes, output, spectrum };
    setAnalyser(spectrum);
    return graph.current;
  }, [settings, bypass, fit]);
  const updateDynamicRange = useCallback((value: number) => {
    const amount = Math.max(-1, Math.min(1, value));
    dynamicRangeRef.current = amount; setDynamicRange(amount);
    graph.current?.dynamics?.port.postMessage({ amount });
  }, []);
  const setupDynamics = useCallback((current: AudioGraph) => {
    if (!current.context.audioWorklet) return;
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
    }).catch(() => { setDynamicsReady(false); setDynamicSliderEnabled(false); updateDynamicRange(0); });
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
      if (!current.media) { current.media = current.context.createMediaElementSource(audio); current.media.connect(current.input); setupDynamics(current); }
      await Promise.all([current.context.resume(), audio.play()]);
      if (intent !== playbackIntent.current || source !== sourceGeneration.current) return;
      setPlaying(!audio.paused); setMessage("");
    } catch { if (intent === playbackIntent.current && source === sourceGeneration.current) setMessage("Playback could not start. Choose another track or check browser audio permissions."); }
  }, [ensureGraph, setupDynamics]);
  async function loadAudio(file: File | undefined) {
    if (!file) return;
    const generation = ++sourceGeneration.current; analysisRequest.current?.abort();
    stop(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(file);
    if (media.current) { media.current.src = objectUrl.current; media.current.load(); }
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
    if (media.current) { media.current.src = track.fileUrl; media.current.load(); }
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
    setAxis(defaultAxis); setActiveBand(3); setBypass(false); setFinalized(null);
    setMessage("Tuning reset. Undo and redo history cleared.");
    closeReset();
  }
  useEffect(() => { const keydown = (event: KeyboardEvent) => { if (resetOpen || instructionsOpen) return; if (!(event.ctrlKey || event.metaKey) || event.altKey) return; const target = event.target; if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement && ["text", "search", "url"].includes(target.type)) return; if (event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); } else if (event.key.toLowerCase() === "y") { event.preventDefault(); redo(); } }; window.addEventListener("keydown", keydown); return () => window.removeEventListener("keydown", keydown); }, [undo, redo, resetOpen, instructionsOpen]);
  useEffect(() => {
    if (!audioUrl || resetOpen || instructionsOpen) return;
    const toggleWithSpace = (event: KeyboardEvent) => {
      if (!["Space", "ArrowLeft", "ArrowRight"].includes(event.code) || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, button, a, summary, [contenteditable], [role='button'], [role='textbox'], [role='slider'], [role='dialog']")) return;
      event.preventDefault(); event.stopPropagation();
      if (event.code === "ArrowLeft" || event.code === "ArrowRight") { const audio = media.current; if (audio) { audio.currentTime = Math.max(0, Math.min(Number.isFinite(audio.duration) ? audio.duration : 0, audio.currentTime + (event.code === "ArrowRight" ? 1 : -1) * (event.shiftKey ? 1 : .25))); setPosition(audio.currentTime); } } else if (media.current?.paused) void play(); else stop();
    };
    window.addEventListener("keydown", toggleWithSpace, true);
    return () => window.removeEventListener("keydown", toggleWithSpace, true);
  }, [audioUrl, resetOpen, instructionsOpen, play]);
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
  const slider = (key: keyof Settings, title: string, detail: string, min: number, max: number, step = .5, unit = "dB", color?: string) =>
    <label className="pt-control" key={key} title={detail}><span><strong>{title}</strong><small>{detail}</small></span><input type="range" min={min} max={max} step={step} value={settings[key]} style={color ? { accentColor: color } : undefined} onPointerDown={beginGesture} onPointerUp={finishSliderPointer} onPointerCancel={finishSliderPointer} onKeyDown={e => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(e.key)) beginGesture(); }} onKeyUp={endGesture} onBlur={endGesture} onChange={e => set(key, Number(e.target.value))} aria-label={title} /><output style={color ? { color } : undefined}>{settings[key] > 0 && unit === "dB" ? "+" : ""}{settings[key]} {unit}</output></label>;
  return <main className="pt-shell alpha-tuning">
    {storageNotice && <p role="status" className="pt-message">{storageNotice}</p>}
    {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Use full-document navigation so access checks and unsaved-listening beforeunload guards run. */}
    <header className="pt-top"><a href="/home" className="pt-brand" aria-label="YinYang EQ home"><span className="pt-brand-mark" aria-hidden="true"/><span>YinYang <em>EQ</em></span></a><nav aria-label="Main navigation"><a href="/">Welcome</a><a href="/shootout">Tournament</a><a href="/music-library">Listening Pool</a><span aria-current="page">Preference Tuning</span></nav></header>
    <div className="pt-content">
      <div className="pt-heading"><div><div className="pt-eyebrow">PREFERENCE TUNING LAB</div><div className="pt-title-row"><h1>Shape the sound you want.</h1></div><p>Choose a target, drag its curve, and hear your changes with your own music.</p></div><div className="pt-history"><button ref={instructionsButton} type="button" className="pt-instructions-button" aria-haspopup="dialog" aria-expanded={instructionsOpen} onClick={() => setInstructionsOpen(true)}><BookOpen size={15}/> Instructions</button><button type="button" disabled={!past.length} onClick={undo} title="Undo (Ctrl/⌘ Z)"><Undo2 size={16}/> Undo <span>{past.length || ""}</span></button><button type="button" disabled={!future.length} onClick={redo} title="Redo (Ctrl/⌘ Shift Z)"><Redo2 size={16}/> Redo <span>{future.length || ""}</span></button><button ref={resetButton} type="button" className="pt-reset" aria-haspopup="dialog" aria-expanded={resetOpen} onClick={() => setResetOpen(true)}><RotateCcw size={16}/> Reset</button></div></div>
      <div className="pt-workbench">
        <section className="pt-chart-card"><div className="pt-card-heading"><div><span className="pt-step">SHAPE</span><h2>Drag the curve. Hear the change.</h2></div><div className="pt-chart-meta"><span className="pt-chart-badge">{formatHzWithUnit(axis.freqMin)} – {formatHzWithUnit(axis.freqMax)}</span><button type="button" className="pt-axis-button" aria-expanded={axisOpen} aria-controls="pt-axis-panel" onClick={() => setAxisOpen(open => !open)}><SlidersHorizontal size={13}/> Axis & size</button><label className="pt-range-toggle" title="Allow all five gain sliders to reach ±20 dB"><input type="checkbox" checked={expanded} onChange={toggleExpanded}/> ±20 dB range</label><span className="pt-fit-label">{measurement ? "Fitted to " + measurement.name : "Preference EQ preview"}</span></div></div>
          {axisOpen && <div className="pt-axis-panel" id="pt-axis-panel" aria-label="Chart axis and size controls"><div className="pt-axis-fields"><label>Frequency start <span>Hz</span><input type="number" min="20" max="10000" step="10" value={axis.freqMin} onChange={e => setAxis(current => ({ ...current, freqMin: Math.min(current.freqMax / 1.25, Math.max(20, Number(e.target.value) || 20)) }))}/></label><label>Frequency end <span>Hz</span><input type="number" min="40" max={MAX_VIEW_HZ} step="10" value={axis.freqMax} onChange={e => setAxis(current => ({ ...current, freqMax: Math.max(current.freqMin * 1.25, Math.min(MAX_VIEW_HZ, Number(e.target.value) || defaultAxis.freqMax)) }))}/></label><label>Bottom <span>dB</span><input type="number" min="-20" max="110" step="1" value={axis.dbMin} disabled={axis.autoDb} onChange={e => setAxis(current => ({ ...current, dbMin: Math.min(current.dbMax - 5, Math.max(-20, Number(e.target.value) || 0)) }))}/></label><label>Top <span>dB</span><input type="number" min="-10" max="120" step="1" value={axis.dbMax} disabled={axis.autoDb} onChange={e => setAxis(current => ({ ...current, dbMax: Math.max(current.dbMin + 5, Math.min(120, Number(e.target.value) || 90)) }))}/></label><label>Width <span>%</span><input type="number" min="65" max="100" step="1" value={axis.width} onChange={e => setAxis(current => ({ ...current, width: Math.max(65, Math.min(100, Number(e.target.value) || 100)) }))}/></label><label>Height · 0 = auto <span>px</span><input type="number" min="0" max="520" step="10" value={axis.height} onChange={e => setAxis(current => ({ ...current, height: Math.max(0, Math.min(520, Number(e.target.value) || 0)) }))}/></label></div><div className="pt-axis-actions"><label><input type="checkbox" checked={axis.autoDb} onChange={e => setAxis(current => ({ ...current, autoDb: e.target.checked }))}/> Auto-fit dB to curve</label><button type="button" onClick={() => setAxis(defaultAxis)}>Reset view</button></div></div>}
          <div className="pt-current-target" aria-live="polite"><span>Selected baseline</span><strong>{target.name}</strong><small>by {target.creator}</small></div>
          <CurveChart points={normalized} settings={settings} expanded={expanded} axis={axis} analyser={analyser} playing={playing} regionDrag={regionDrag} onDragStart={beginGesture} onDrag={(key,value) => { set(key,value); if (["bass", "body", "ear", "air", "treble"].includes(key)) setActiveBand(key === "bass" ? 1 : key === "body" ? 2 : key === "ear" ? 3 : key === "air" ? 4 : 5); }} onDragEnd={endGesture}/>
          <div className="pt-gesture-guide"><span>Drag the curve at your pointer · drag BT / EGC / TT sideways to place transitions.</span><label><input type="checkbox" checked={regionDrag} onChange={event => setRegionDrag(event.target.checked)}/> Move by region gain <span>(or hold Shift)</span></label></div>
          <div className="pt-gain-controls">{GAIN_CONTROLS.map(control => <div className="pt-gain-item" style={{ borderTopColor: control.color }} key={control.key}>{slider(control.key, control.name, control.hint, -(expanded ? EXPANDED_GAIN_LIMIT : control.limit), expanded ? EXPANDED_GAIN_LIMIT : control.limit, .5, "dB", control.color)}</div>)}</div>
          <div className="pt-region-guide"><div className="pt-region-tabs" role="group" aria-label="Frequency region guide">{BANDS.map((band, index) => <button type="button" aria-pressed={activeBand === index} key={band.name} onClick={() => setActiveBand(index)} style={{ borderTopColor: band.color }}><strong style={{ color: band.color }}>{band.name}</strong><small>{band.range}</small></button>)}</div><p><strong style={{ color: BANDS[activeBand].color }}>{BANDS[activeBand].name}:</strong> {BANDS[activeBand].example}. {BANDS[activeBand].effect}</p></div>
          <details className="pt-advanced"><summary>Advanced frequency placement <span className="pt-placement-key"><i style={{ color: GAIN_CONTROLS[0].color }}/>Bass <i style={{ color: GAIN_CONTROLS[2].color }}/>Ear gain <i style={{ color: GAIN_CONTROLS[4].color }}/>Treble</span></summary><div className="pt-frequency-controls">{slider("bassHz", "Bass transition", "Where the shelf turns", 60, 250, 5, "Hz", GAIN_CONTROLS[0].color)}{slider("earHz", "Ear gain center", "Move the presence peak", 1500, 4500, 50, "Hz", GAIN_CONTROLS[2].color)}{slider("trebleHz", "Treble transition", "Where the shelf begins", 3500, 10000, 100, "Hz", GAIN_CONTROLS[4].color)}</div></details>
        </section>
        <section className="pt-setup" aria-label="Tuning setup">
          <div className="pt-baseline"><div className="pt-setup-label"><span className="pt-step" title={selectedCuratedRank ? `Matched A/B blind rank across all headphone types: #${selectedCuratedRank}` : "This target has no eligible matched A/B blind ranking"}>{selectedCuratedRank ? `#${selectedCuratedRank} MATCHED A/B · ALL HEADPHONES` : "NO MATCHED A/B RANK"}</span><strong>Target</strong></div><p className="pt-cohort-note">Ranks use matched A/B blind comparisons from both music sources, across all headphone types. Positions can differ from filtered <a href="/shootout?tab=rankings">Research Rankings</a>.</p><div className="pt-selects"><label><span className="pt-visually-hidden">Target curve</span><select aria-label="Target curve" value={selected} onChange={e => changeTarget(e.target.value)}>{targetOptions.map(t => <option key={t.id} value={t.id}>{curatedRanks.has(t.id) ? `#${curatedRanks.get(t.id)} · ` : "No matched A/B rank · "}{t.name} · {t.creator}</option>)}</select></label><label className="pt-import" title="Import a target CSV or TXT"><Upload size={15}/><span>Import</span><input type="file" accept=".csv,.txt,text/plain,text/csv" onChange={e => void loadCurve(e.target.files?.[0])}/></label></div></div>
          <div className="pt-headphones"><div className="pt-setup-label"><span className="pt-step">HEADPHONES</span><strong>Playback fit</strong></div><div className="shootout-content pt-picker"><HeadphonePicker rows={measurements} selectedId={measurementId} headphoneType={headphoneType} onType={type => { setHeadphoneType(type); clearMeasurement(); }} onSelect={chooseMeasurement} onClear={clearMeasurement} onImport={importMeasurement} onUpload={() => { setEditId(null); setManagerOpen(true); }} onEdit={id => { setEditId(id); setManagerOpen(true); }} onDelete={deleteMeasurement} responsiveUploadLabel/></div></div>
        </section>
        {managerOpen && <div className="pt-manager"><button type="button" className="pt-reset" onClick={() => setManagerOpen(false)}>Close measurement editor</button><div className="shootout-content"><MeasurementManager key={editId || "new"} rows={measurements} selectedId={measurementId} editId={editId} onAdd={row => { addMeasurement(row); setManagerOpen(false); }} onUpdate={row => { saveMeasurements(measurements.map(item => item.id === row.id ? row : item)); setManagerOpen(false); }} onDelete={deleteMeasurement} onSelect={chooseMeasurement}/></div></div>}
      <section className="pt-listen"><p className="alpha-tuning-shortcuts"><kbd>Space</kbd> play / pause · <kbd>←</kbd> / <kbd>→</kbd> seek 0.25s · <kbd>Shift</kbd> + arrow seek 1s</p><div className="pt-card-heading"><div><span className="pt-step">LISTEN</span><h2>Play your music</h2></div><label className="pt-bypass"><input type="checkbox" checked={bypass} onChange={e => setBypass(e.target.checked)}/> Bypass adjustments</label></div>
      <div className={`pt-source-row${queue.length ? " pt-has-folder" : ""}`}><button className="pt-track-play" onClick={playRandomCurated}><Shuffle size={16}/> Random curated track</button><select aria-label="Choose a curated track" value="" onChange={e => loadCurated(Number(e.target.value))}><option value="" disabled>Choose curated music</option>{curatedMusic.map((track, index) => <option key={index} value={index}>{track.title} · {track.artist}{track.versionLabel ? ` · ${track.versionLabel}` : ""}</option>)}</select><label className="pt-file"><Upload size={16}/> Choose a file<input type="file" accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg,.opus" onChange={e => void loadAudio(e.target.files?.[0])}/></label><label className="pt-file"><Upload size={16}/> Choose a folder<input type="file" accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg,.opus" multiple {...{ webkitdirectory: "" }} onChange={e => { const files = Array.from(e.target.files || []).filter(file => /\.(mp3|m4a|flac|wav|ogg|opus|aac)$/i.test(file.name)); setQueue(files); if (files[0]) void loadAudio(files[0]); }}/></label>{queue.length > 0 && <><button type="button" className="pt-track-play pt-folder-shuffle" onClick={shuffleFolder}><Shuffle size={14}/> Shuffle folder</button><select aria-label="Choose a track from the folder" value="" onChange={e => e.target.value === "shuffle" ? shuffleFolder() : void loadAudio(queue[Number(e.target.value)])}><option value="" disabled>{queue.length} folder tracks</option><option value="shuffle">↝ Shuffle folder tracks</option>{queue.map((file, index) => <option key={index} value={index}>{file.name}</option>)}</select></>}</div>
      <div className={`pt-playback-deck${playing ? " is-playing" : ""}`} role="group" aria-label="Music playback controls">
        <div className="pt-deck-toolbar"><div className="pt-deck-heading"><strong>Local Playback</strong><span className="pt-deck-time">{formatTime(position)} <i>/</i> {formatTime(duration)}</span><small>L / R · pre-EQ · click to seek</small></div>
          <div className="pt-deck-actions"><button type="button" className="pt-deck-dynamics" aria-label="Toggle Dynamic Range Compression/Expansion slider" aria-pressed={dynamicSliderEnabled} disabled={!dynamicsReady || !duration} onClick={() => setDynamicSliderEnabled(enabled => !enabled)} title="Adjust dynamic range on the waveform"><SlidersHorizontal size={19}/></button><button type="button" className="pt-deck-dynamics" aria-label="Reset track dynamics" disabled={!dynamicsReady || Math.abs(dynamicRange) < .0001} onClick={() => updateDynamicRange(0)}><RotateCcw size={19}/></button>
          <button type="button" className="pt-deck-play" aria-label={playing ? "Pause music" : "Play music"} aria-keyshortcuts="Space" disabled={!audioUrl} onClick={() => void (media.current?.paused ? play() : stop())}>{playing ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor"/>}</button>
          <div className="pt-deck-zoom" role="group" aria-label="Waveform zoom"><button type="button" aria-label="Zoom waveform out" disabled={!audioAnalysis || waveZoom === 1} onClick={() => setWaveZoom(value => Math.max(1, value / 2))}>−</button><span>{waveZoom}×</span><button type="button" aria-label="Zoom waveform in" disabled={!audioAnalysis || waveZoom === 8} onClick={() => setWaveZoom(value => Math.min(8, value * 2))}>+</button></div>
          <div className="pt-deck-volume"><button type="button" aria-label={volume === 0 ? "Volume muted; show volume control" : "Show volume control"} aria-expanded={volumeOpen} onClick={() => setVolumeOpen(open => !open)}>{volume === 0 ? <VolumeX size={21}/> : <Volume2 size={21}/>}</button><input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} hidden={!volumeOpen} onChange={e => { const value = Number(e.target.value); setVolume(value); if (media.current) media.current.volume = value; }}/></div></div><ScrollingTrackTitle title={audioName}/></div>
        <TrackWaveform compact hideZoom zoom={waveZoom} onZoom={setWaveZoom} analysis={audioAnalysis} position={position} duration={duration} onSeek={seconds => { if (media.current) media.current.currentTime = seconds; setPosition(seconds); }} dynamicRange={dynamicRange} onDynamicRangeChange={updateDynamicRange} dynamicSliderEnabled={dynamicSliderEnabled} dynamicRangeDisabled={!dynamicsReady} placeholder={audioUrl ? "Track ready · waveform analysis in progress" : "Choose music to view its waveform"}/>
      </div>
      <audio ref={media} crossOrigin="anonymous" preload="metadata" onLoadedMetadata={() => { setDuration(media.current?.duration || 0); if (media.current) media.current.volume = volume; }} onTimeUpdate={() => setPosition(media.current?.currentTime || 0)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setMessage("This track could not be played in your browser. Try another format or file.")}/></section>
        <section className="pt-finalize" aria-label="Finalize preference curve">
          <div className="pt-finalize-intro"><div><span className="pt-step">EXPORT</span><h2>Finalize preference curve</h2><p>Generate 10, 15, and 20 band EQs with Standard and Precise fits, each tuned for a smoother shape or a closer match.</p></div><div className="pt-finalize-action">{!measurement?.points?.length && <p key={measurementAttention} className={`pt-measurement-needed${measurementAttention ? " pt-attention" : ""}`} role="note"><strong>Choose a headphone measurement</strong><span>to generate EQ filters.</span></p>}<button ref={finalizeButton} type="button" className={`pt-finalize-button${measurementAttention ? " pt-attention" : ""}`} disabled={finalizing} onClick={event => { if (!measurement?.points?.length) { setMessage("Choose a headphone measurement to generate EQ filters."); setMeasurementAttention(value => value + 1); if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) event.currentTarget.animate([{ transform: "translateX(0)" }, { transform: "translateX(-7px)" }, { transform: "translateX(7px)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }], { duration: 500, easing: "ease-in-out" }); return; } void finalizeCurve(); }}>{finalizing ? `Generating ${finalProgress} / 12…` : !measurement?.points?.length ? "Choose headphone to finalize" : finalIsCurrent ? "Regenerate 12 EQs" : "Finalize preference curve"}</button></div></div>
          <div className="pt-export-downloads" role="group" aria-label="Target curve downloads"><button type="button" onClick={() => void downloadText("original-target.csv", `frequency_hz,level_db\n${normalized.map(([hz, db]) => `${hz.toFixed(2)},${db.toFixed(3)}`).join("\n")}\n`, "text/csv")}>Download Original Target</button><button type="button" onClick={() => void downloadText("preference-target.csv", `frequency_hz,level_db\n${preferenceCurve.map(([hz, db]) => `${hz.toFixed(2)},${db.toFixed(3)}`).join("\n")}\n`, "text/csv")}>Download Preference Target</button></div>
          <p className="pt-export-disclosure">For participating listener accounts, downloads are recorded in admin-only research with the selected target, adjusted curve, settings and exported file. Admin and hidden test accounts save local tests instead. Music files and raw headphone measurements are not collected here.</p>
          {finalized && !finalIsCurrent && <p className="pt-finalize-hint">The curve or headphone changed. Finalize again for current settings.</p>}
          {finalized && finalIsCurrent && <>
            <div className="pt-finalize-results-heading"><div><strong>12 EQ options for {measurement?.name}</strong><span>Choose a band count, then compare Standard / Precise and Smooth / Close.</span></div></div>
            <div className="pt-export-band-tabs" role="group" aria-label="EQ band count">{([10, 15, 20] as const).map(bands => <button type="button" key={bands} aria-pressed={exportBand === bands} onClick={() => setExportBand(bands)}><b>{bands} bands</b><small>4 options</small></button>)}</div>
            <div className="pt-finalize-grid">{finalized.variants.filter(variant => variant.bands === exportBand).map(variant => { const base = `preference-${variant.bands}band-${variant.method}-${variant.priority}`; return <div className="pt-finalize-option" key={base}><div className="pt-option-top"><strong>{variant.method === "standard" ? "Standard" : "Precise"}</strong><span className={`pt-priority pt-${variant.priority}`}>{variant.priority === "smooth" ? "Smooth" : "Close"}</span></div><p>Fit error <b>{variant.rms.toFixed(2)} dB</b><span aria-hidden="true">·</span> Preamp <b>{variant.preamp.toFixed(1)} dB</b></p><details><summary>View {variant.bands} filters</summary><div className="pt-filter-list">{variant.filters.map((filter, index) => <span key={index}>{index + 1}. {filter.hz} Hz · {filter.gain > 0 ? "+" : ""}{filter.gain.toFixed(2)} dB · Q {filter.q.toFixed(2)}</span>)}</div></details><div className="pt-export-actions" aria-label="Download EQ formats"><button type="button" onClick={() => void downloadText(`${base}.txt`, exportPeq(variant), "text/plain", variant)}>TXT</button><button type="button" onClick={() => void downloadText(`${base}-equalizerapo.txt`, exportEqualizerApo(variant), "text/plain", variant)}>Equalizer APO</button><button type="button" onClick={() => void downloadText(`${base}-easyeffects.txt`, exportEasyEffects(variant), "text/plain", variant)}>EasyEffects</button><button type="button" onClick={() => void downloadText(`${base}-qudelix5k.txt`, exportQudelixGuide(variant), "text/plain", variant)}>Qudelix 5K</button><button type="button" onClick={() => { saveLibraryEq({ id: crypto.randomUUID(), name: `${measurement?.device || measurement?.name} → ${target.name}`, source: `Preference Tuning · ${variant.bands} bands · ${variant.method} · ${variant.priority}`, filters: variant.filters, preamp: variant.preamp }); setMessage("EQ saved for Listening Pool playback in this browser."); }}>Save listening EQ</button></div></div>; })}</div>
            <p className="pt-export-help">EasyEffects uses its Import APO action; set its input gain to the listed preamp if needed. The Qudelix 5K file is a manual-entry guide.</p>
            <p className="pt-finalize-note">Preamp is rounded down from the highest calculated EQ boost over 20 Hz–20 kHz at 44.1, 48, and 96 kHz, plus 0.5 dB headroom. Keep additional player or device headroom for intersample peaks and other processing.</p>
          </>}

        </section>
      </div>
      {message && <p className="pt-message" role="status">{message}</p>}
    </div>
    {resetOpen && <div className="pt-reset-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeReset(); }}>
      <section className="pt-reset-dialog" role="dialog" aria-modal="true" aria-labelledby="pt-reset-title" aria-describedby="pt-reset-description" onKeyDown={event => { if (event.key === "Tab") { event.preventDefault(); (document.activeElement === resetNoButton.current ? resetYesButton.current : resetNoButton.current)?.focus(); } }}>
        <span className="pt-reset-kicker">RESET TUNING</span><h2 id="pt-reset-title">Reset all changes?</h2><p id="pt-reset-description">This restores the starting target, sliders, frequency placements, and chart view. It clears every Undo and Redo state and removes generated EQ results. Your headphone selection and loaded music stay in place. This cannot be undone.</p>
        <div className="pt-reset-actions"><button ref={resetNoButton} type="button" onClick={closeReset}>No</button><button ref={resetYesButton} type="button" className="pt-reset-confirm" onClick={confirmReset}>Yes</button></div>
      </section>
    </div>}
    {instructionsOpen && <div className="pt-instructions-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setInstructionsOpen(false); instructionsButton.current?.focus(); } }}>
      <section className="pt-instructions-dialog" role="dialog" aria-modal="true" aria-labelledby="pt-instructions-title" onKeyDown={event => { if (event.key !== "Tab") return; const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),summary,a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(el=>el.getClientRects().length>0); const first=controls[0],last=controls.at(-1); if (event.shiftKey && document.activeElement===first) {event.preventDefault();last?.focus();} else if (!event.shiftKey && document.activeElement===last) {event.preventDefault();first?.focus();} }}>
        <div className="pt-instructions-header"><div><span className="pt-step">PREFERENCE TUNING LAB</span><h2 id="pt-instructions-title">How to use the lab</h2><p>Four quick moves, with examples of what to click and what changes.</p></div><button ref={instructionsClose} type="button" aria-label="Close instructions" onClick={() => { setInstructionsOpen(false); instructionsButton.current?.focus(); }}><X size={18}/></button></div>
        <div className="pt-instructions-steps">
          <section className="pt-instructions-step"><div className="pt-instructions-copy"><h3><span>1</span> Start with a target and headphones</h3><p>Choose a target curve, then select your In-Ear or Over-Ear headphones. A measurement lets the lab account for your headphones and create an EQ you can download.</p><p><b>Example:</b> Pick a target from the list, search for your headphone model, then select its measurement. You can also upload a CSV or TXT curve or your own headphone measurement.</p></div><div className="pt-instructions-preview" aria-hidden="true"><span className="pt-preview-label">TARGET</span><div className="pt-preview-row"><span className="pt-preview-select">Choose target <b>⌄</b></span><span className="pt-preview-square"><Upload size={13}/></span></div><span className="pt-preview-label">HEADPHONES</span><div className="pt-preview-row"><span className="pt-preview-pill">In-Ear</span><span className="pt-preview-pill">Over-Ear</span><span className="pt-preview-search">Search model</span></div></div></section>
          <section className="pt-instructions-step"><div className="pt-instructions-copy"><h3><span>2</span> Shape the curve</h3><p>Drag the colored curve up or down, or use the sliders beneath it. The dashed gray line shows where you started; the colored line shows your changes.</p><p><b>Example:</b> Raise Bass by 3 dB for more low-end weight. Use Undo or Reset if you want to try another direction.</p></div><div className="pt-instructions-preview" aria-hidden="true"><span className="pt-preview-label">YOUR CHANGE</span><div className="pt-preview-curve"><i/><i/><i/></div><div className="pt-preview-slider"><b>Bass</b><span>━━━━●━━━━</span><b>+3 dB</b></div><div className="pt-preview-row"><span className="pt-preview-pill">↶ Undo</span><span className="pt-preview-pill">↷ Redo</span><span className="pt-preview-pill">Reset</span></div></div></section>
          <section className="pt-instructions-step"><div className="pt-instructions-copy"><h3><span>3</span> Listen to the difference</h3><p>Play a curated track or choose audio from your device. Turn <b>Bypass adjustments</b> on and off to compare your edited sound with the starting target. Keep the volume comfortable.</p><p><b>Example:</b> Listen to a vocal section, bypass your change, then turn it back on. Click the waveform to replay the same moment.</p></div><div className="pt-instructions-preview" aria-hidden="true"><span className="pt-preview-label">PLAYBACK</span><div className="pt-preview-row"><span className="pt-preview-play"><Play size={12}/> Play</span><span className="pt-preview-pill">□ Bypass adjustments</span></div><div className="pt-preview-wave">▁▃▇▄▂▅▇▃▁▆▂▅▇▄▁</div><span className="pt-preview-label">COMPARE THE SAME MOMENT</span></div></section>
          <section className="pt-instructions-step"><div className="pt-instructions-copy"><h3><span>4</span> Finalize and download</h3><p>Press <b>Finalize preference curve</b> after choosing a headphone measurement. Compare the filter options, check fit error and preamp, then download the EQ format for your device.</p><p>You can also download the original target or your adjusted preference curve as data.</p></div><div className="pt-instructions-preview" aria-hidden="true"><span className="pt-preview-label">EXPORT</span><span className="pt-preview-finalize">Finalize preference curve</span><div className="pt-preview-row"><span className="pt-preview-pill">10 bands</span><span className="pt-preview-pill">15 bands</span><span className="pt-preview-pill">20 bands</span></div><span className="pt-preview-label">CHECK FIT · DOWNLOAD EQ</span></div></section>
        </div>
        <details className="pt-instructions-more"><summary>More controls and shortcuts</summary><div><p><b>Fine tuning:</b> Use Axis &amp; size for chart limits. Advanced frequency placement moves the BT, EGC, and TT points. The ±20 dB range expands the sliders. Tap colored frequency labels for sound examples.</p><p><b>Playback:</b> Space pauses or resumes when a form field is not focused. Shuffle folder picks another local track. Files from your device stay in the browser.</p><p><b>Export:</b> Standard spaces filters evenly; Precise fits more closely. Smooth favors a gentler curve; Close follows it more tightly. Leave device headroom when applying EQ.</p></div></details>
      </section>
    </div>}
  {consent.dialog}
  </main>;
}
