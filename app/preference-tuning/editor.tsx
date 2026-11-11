"use client";
import { PERSONAL_AREA_TITLE } from "@/lib/personal-area";
import { graphColor } from "@/lib/graph-theme";
import { shortcutDecision } from "@/lib/playback-shortcuts";
import { usePlaybackShortcutContext } from "@/lib/use-playback-shortcut-context";
import { useConsentPrompt } from "@/components/use-consent-prompt";
import "@/components/alpha-audio-workbench.css";
import AutoEqCurveStatus from "@/components/autoeq-curve-status";
import { useAutoEqSourceCurves } from "@/lib/use-autoeq-source-curves";
import { autoEqPickerTargets, autoEqTargetStorageKey, isLocalAutoEqTarget, isSourceAutoEqTarget, readLocalAutoEqTargets } from "@/lib/autoeq-target-sources";
import { searchRows } from "@/lib/search";
import { recordAdminTestIfNeeded } from "@/lib/admin-test-store";
import {musicDisplayTitle} from "@/lib/music-display";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUpRight, AudioLines, BookOpen, ChevronDown, FileAudio, FolderOpen, Repeat, RotateCcw, Redo2, Shuffle, SlidersHorizontal, Trash2, Undo2, Upload, Volume2, X } from "lucide-react";
import { parseCurve, type Point } from "@/lib/curves";
import { packRegionLabels, placeMarkerLabels } from "@/lib/curve-label-layout";
import { peakingHalfGainEdges, presetFilterResponse, tuningFilterEffectRange, type PresetFilter } from "@/lib/peq-preset";
import { fitAutoEqAsync } from "@/lib/autoeq-client";
import EqCandidateResults from "@/components/eq-candidate-results";
import { useGeneratedEqResults } from "@/lib/use-generated-eq-results";
import { generateEqCandidates } from "@/lib/eq-candidates";
import FitterControls from "@/components/fitter-controls";
import { useFitterSettings } from "@/lib/use-fitter-settings";
import { FIT_CANDIDATE_COUNT, fitterLabel } from "@/lib/fitter-settings";
import type { AutoEqFit } from "@/lib/autoeq-fit";
import { replaceEqStage, safeGain, watchAudioInterruptions, type EqStage } from "@/lib/eq-playback";
import { exportPeq, exportEqualizerApo, exportEasyEffects, exportQudelixGuide, type FinalizedVariant } from "@/lib/preference-finalize";
import type { HeadphoneMeasurement } from "@/lib/measurement";
import HeadphonePicker, { type CatalogMeasurement } from "@/components/headphone-picker";
import MeasurementManager from "@/components/measurement-manager";
import { importCatalogEntry } from "@/lib/public-measurements";
import { measurementChannelMatch, readLibraryEqs, saveLibraryEq, type LibraryEq } from "@/lib/music-library-eq";
import SoundSetup, { type SoundMode } from "@/components/sound-setup";
import { PlaybackTime, playbackClock } from "@/components/playback-transport";
import { measurementResponsePoints, tuningResponsePlot } from "@/lib/eq-response";
import { downloadChannelMatch } from "@/lib/channel-match-export";
import MusicTrackPicker from "@/components/music-track-picker";
import PlaybackEdgeToggle from "@/components/playback-edge-toggle";
import TrackWaveform from "@/components/track-waveform";
import { analyzeTrack, type TrackAnalysis } from "@/lib/loudness";
import { EQ_COMPARISON_PLAY_EVENT } from "@/lib/blind-eq-audio";
import { listeningPool as curatedMusic } from "@/lib/music-catalog";
import TuningGuide, { type GuideTopic } from "./guide";
import { FIRST_CUT_DB, LOOP_DEFAULT_SECONDS, LOOP_MIN_SECONDS, LOUDNESS_MIN_FRAMES, SILENCE_POWER, accumulateBandPowers, boundedLoop, curveFingerprint, flippedGain, loopAt, loudnessBands, matchTrims, optionLevel, poolBandPowers, slewTrim, trimDb, type LoopPassage, type LoudnessBands } from "./listening";
import "./style.css";

type Target = { id: string; name: string; creator: string; points: Point[] };
type GainKey = "sub" | "bass" | "body" | "ear" | "air" | "treble";
type FilterType = PresetFilter["type"];
type FocusedFilter = Pick<PresetFilter, "hz" | "gain" | "q">;
type DragPreview = { delta: number } & ({ filter: FocusedFilter } | { bandIndex: number });
type Settings = Record<GainKey | `${GainKey}Q`, number> & Record<`${GainKey}Type`, FilterType> & { bassHz: number; earHz: number; trebleHz: number; focused: FocusedFilter[] };
const SHELF_MAX_Q = Math.SQRT1_2;
const FOCUSED_Q = 4;
const FOCUSED_FILTER_LIMIT = 4;
const defaults: Settings = {
  sub: 0, bass: 0, ear: 0, treble: 0, body: 0, air: 0, bassHz: 105, earHz: 2800, trebleHz: 6500,
  subType: "PK", bassType: "LSC", bodyType: "PK", earType: "PK", airType: "PK", trebleType: "HSC",
  subQ: 1.5, bassQ: SHELF_MAX_Q, bodyQ: .8, earQ: .9, airQ: 1.5, trebleQ: SHELF_MAX_Q,
  focused: [],
};
const CURVE_VIEW = { min: 55, max: 90, anchor: 75 } as const;
const EXPANDED_GAIN_LIMIT = 20;
const MAX_VIEW_HZ = 22000;
const TUNING_LOOP_BOUNDS = { minimum: LOOP_MIN_SECONDS, endPadding: 0 };
type AxisView = { freqMin: number; freqMax: number; dbMin: number; dbMax: number; autoDb: boolean; width: number; height: number };
const defaultAxis: AxisView = { freqMin: 20, freqMax: 20000, dbMin: 55, dbMax: 90, autoDb: true, width: 100, height: 0 };
const formatHz = (hz: number) => hz >= 1000 ? `${hz / 1000}k` : String(hz);
const formatHzWithUnit = (hz: number) => hz >= 1000 ? `${hz / 1000} kHz` : `${hz} Hz`;
const formatGraphGain = (gain: number) => `${gain > 0 ? "+" : ""}${gain.toFixed(2)} dB`;
function formatToneGain(value: number) {
  const gain = Math.round(value * 10) / 10;
  return `${gain > 0 ? "+" : ""}${gain}`;
}
const fallback: Target = { id: "flat", name: "Flat reference", creator: "Reference", points: [[20, 0], [20000, 0]] };
type EditSnapshot = { settings: Settings; selected: string; expanded: boolean };
type PlacementKey = "bassHz" | "earHz" | "trebleHz";
const GAIN_CONTROLS: { key: GainKey; limit: number; hint: string; placement?: PlacementKey; fixed?: number }[] = [
  { key: "sub", limit: 12, hint: "Deep rumble and the lowest bass notes", fixed: 40 },
  { key: "bass", limit: 12, hint: "Weight and drum impact", placement: "bassHz" },
  { key: "body", limit: 6, hint: "Fullness in voices and instruments", fixed: 320 },
  { key: "ear", limit: 10, hint: "How forward voices and instruments feel", placement: "earHz" },
  { key: "air", limit: 6, hint: "Crisp sounds and sharp “s” sounds", fixed: 6500 },
  { key: "treble", limit: 12, hint: "Brightness and cymbal detail", placement: "trebleHz" },
];
/** Tone is the everyday view: broad gains. Filters is the exact view: shape, frequency, Q and narrow corrections. */
type EditorView = "tone" | "filters";
const PRIMARY_TONES: readonly GainKey[] = ["bass", "ear", "treble"];
function finishNumberEdit(event: ReactKeyboardEvent<HTMLInputElement>) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.value = event.currentTarget.defaultValue;
    event.currentTarget.blur();
  } else if (event.key === "Enter") {
    event.currentTarget.blur();
  }
}
const shownToneGain = (value: number) => String(Number(value.toFixed(2)));
/**
 * Boost/cut switch beside a signed dB field, for phone keyboards with no minus key.
 * It keeps focus where it was on press, so a value still being typed is flipped and committed as one undo step rather than two.
 */
function SignButton({ name, disabled, buttonRef, onFlip, onLeave }: { name: string; disabled?: boolean; buttonRef?: import("react").Ref<HTMLButtonElement>; onFlip: () => void; onLeave?: (next: EventTarget | null) => void }) {
  return <button ref={buttonRef} type="button" className="pt-sign-button" disabled={disabled} aria-label={`Switch ${name} between boost and cut`} title={`Switch between boost (+) and cut (−). From 0 dB it starts a ${FIRST_CUT_DB} dB cut.`}
    onMouseDown={event => event.preventDefault()} onClick={onFlip} onBlur={event => onLeave?.(event.relatedTarget)}><span aria-hidden="true">±</span></button>;
}
/** Keep a valid, bounded value pending when focus moves from the number to its sign button. */
function prepareGainSign(input: HTMLInputElement, shown: string, limit: number) {
  const value = input.valueAsNumber;
  if (!Number.isFinite(value)) input.value = shown;
  else if (Math.abs(value) > limit) input.value = String(Math.sign(value) * limit);
}
/** Typed gain for a Filters row, with a ± switch. Commits on Enter or blur; the rounded text stands for the full saved value until it is changed. */
function SignedGainInput({ label, value, limit, step, onCommit }: { label: string; value: number; limit: number; step: string; onCommit: (gain: number) => void }) {
  const field = useRef<HTMLInputElement>(null), sign = useRef<HTMLButtonElement>(null);
  const shown = Number(value.toFixed(2));
  // Undo, redo and graph drags change the gain from outside this field.
  useEffect(() => { if (field.current) field.current.value = String(shown); }, [shown]);
  const bounded = (gain: number) => Math.round(Math.max(-limit, Math.min(limit, gain)) * 1000) / 1000;
  function commit() {
    const input = field.current;
    if (!input) return;
    const typed = input.valueAsNumber;
    input.value = String(shown);
    if (Number.isFinite(typed) && typed !== shown) onCommit(bounded(typed));
  }
  function flip() {
    const input = field.current;
    if (!input) return;
    const typed = input.valueAsNumber;
    const next = bounded(flippedGain(!Number.isFinite(typed) || typed === shown ? value : typed));
    input.value = String(shown);
    if (next !== value) onCommit(next);
  }
  return <span className="pt-fx-signed">
    <input ref={field} type="number" inputMode="decimal" aria-label={label} min={-limit} max={limit} step={step} defaultValue={shown}
      onKeyDown={event => {
        if (event.key !== "Escape") { finishNumberEdit(event); return; }
        event.preventDefault(); event.stopPropagation();
        event.currentTarget.value = String(shown); event.currentTarget.blur();
      }}
      onBlur={event => {
        if (event.relatedTarget === sign.current) prepareGainSign(event.currentTarget, String(shown), limit);
        else commit();
      }}/>
    <SignButton name={label} buttonRef={sign} onFlip={flip} onLeave={next => { if (next !== field.current) commit(); }}/>
  </span>;
}
/** Seconds field for a loop bound. Valid entries apply as they are typed or stepped; anything else is dropped on leaving the field. */
function SecondsField({ label, value, min, max, onCommit }: { label: string; value: number; min: number; max?: number; onCommit: (seconds: number) => void }) {
  const [text, setText] = useState<string | null>(null);
  return <label className="pt-loop-field"><span>{label}</span><input type="number" inputMode="decimal" aria-label={`${label}, seconds`} min={Number(min.toFixed(1))} max={max === undefined ? undefined : Number(max.toFixed(1))} step=".1" value={text ?? value.toFixed(1)}
    onChange={event => {
      setText(event.target.value);
      const seconds = event.target.valueAsNumber;
      if (Number.isFinite(seconds) && seconds >= min - .05 && (max === undefined || seconds <= max + .05)) onCommit(seconds);
    }}
    onKeyDown={event => { if (event.key === "Enter" || event.key === "Escape") { event.preventDefault(); event.stopPropagation(); event.currentTarget.blur(); } }}
    onBlur={() => setText(null)}/></label>;
}
/** Typed gain for one Tone band. Commits on Enter or blur, steps live with the arrow keys, and never rewrites a saved value the listener did not change. */
function ToneGainField({ name, value, limit, disabled, onSelect, onCommit, onStepStart, onStepEnd }: { name: string; value: number; limit: number; disabled: boolean; onSelect: () => void; onCommit: (gain: number) => void; onStepStart: () => void; onStepEnd: () => void }) {
  const field = useRef<HTMLInputElement>(null), sign = useRef<HTMLButtonElement>(null);
  const shown = shownToneGain(value);
  // Undo, redo, sliders and graph drags change the gain from outside this field.
  useEffect(() => { if (field.current) field.current.value = shown; }, [shown]);
  const bounded = (gain: number) => Math.round(Math.max(-limit, Math.min(limit, gain)) * 1000) / 1000;
  /** The rounded text stands for the full saved value until the listener types something different. */
  const typedGain = (input: HTMLInputElement) => { const typed = input.valueAsNumber; return !Number.isFinite(typed) || typed === Number(shown) ? null : typed; };
  function commit(input: HTMLInputElement) {
    const typed = typedGain(input);
    if (typed === null) { input.value = shown; return; }
    const next = bounded(typed);
    input.value = shownToneGain(next);
    onCommit(next);
  }
  /** Flips what is in the field, typed or saved, and commits it once. */
  function flip() {
    const input = field.current;
    if (!input) return;
    const next = bounded(flippedGain(typedGain(input) ?? value));
    input.value = shown;
    onSelect();
    if (next !== value) onCommit(next);
  }
  return <span className="pt-signed"><label className="pt-tone-value" title={`−${limit} to +${limit} dB`}>
    <input ref={field} type="number" aria-label={`${name} dB value`} min={-limit} max={limit} step="any" defaultValue={shown} disabled={disabled} autoComplete="off"
      onFocus={onSelect}
      onKeyDown={event => {
        const input = event.currentTarget;
        if (event.key === "Enter") { event.preventDefault(); commit(input); input.select(); }
        else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); input.value = shown; input.select(); }
        else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          const next = bounded((typedGain(input) ?? value) + (event.key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? .1 : .5));
          input.value = shownToneGain(next);
          onStepStart();
          if (next !== value) onCommit(next);
        }
      }}
      onKeyUp={onStepEnd}
      onBlur={event => {
        // Moving to the ± button keeps the typed text pending, so the flip commits it once.
        if (event.relatedTarget === sign.current) prepareGainSign(event.currentTarget, shown, limit);
        else commit(event.currentTarget);
        onStepEnd();
      }}/>
    <span aria-hidden="true">dB</span>
  </label><SignButton name={`${name} gain`} disabled={disabled} buttonRef={sign} onFlip={flip} onLeave={next => { if (next !== field.current && field.current) commit(field.current); }}/></span>;
}
const PLACEMENTS = {
  bassHz: { band: "Bass", gain: "bass", tag: "B", min: 60, max: 250, step: 5 },
  earHz: { band: "Ear gain", gain: "ear", tag: "EG", min: 1500, max: 4500, step: 50 },
  trebleHz: { band: "Treble", gain: "treble", tag: "T", min: 3500, max: 10000, step: 100 },
} as const;
const FILTER_SHAPE = { PK: "Peak", LSC: "Low shelf", HSC: "High shelf" } as const;
const FILTER_RELATION = { PK: "Around", LSC: "Below", HSC: "Above" } as const;
const maxQ = (type: FilterType) => type === "PK" ? 20 : SHELF_MAX_Q;
const boundedQ = (q: number, type: FilterType) => Math.max(.1, Math.min(maxQ(type), q));
const placementName = (key: PlacementKey, settings: Settings) => {
  const placement = PLACEMENTS[key];
  return `${placement.band} ${settings[`${placement.gain}Type`] === "PK" ? "center" : "transition"}`;
};
const BANDS = [
  { name: "Sub", short: "SUB", range: "20–60 Hz", example: "808 sustain, subwoofer rumble, the lowest kick fundamentals", effect: "More feels deeper and heavier; less tightens rumble that masks bass notes.", low: 20, high: 60, color: "#4fdac8", lightColor: "#08695a" },
  { name: "Bass", short: "BASS", range: "60–250 Hz", example: "Kick punch, bass guitar fundamentals, low piano and cello", effect: "More adds impact and weight; too much can blur rhythm.", low: 60, high: 250, color: "#65c9ff", lightColor: "#145f9d" },
  { name: "Low mids", short: "BODY", range: "250–800 Hz", example: "Vocal chest, guitar and brass body, piano warmth", effect: "More adds fullness; less clears mud but can make music thin.", low: 250, high: 800, color: "#e9b66a", lightColor: "#80551d" },
  { name: "Mids & ear gain", short: "VOICE", range: "800 Hz–4 kHz", example: "Vocal intelligibility, flute, guitar attack, brass presence", effect: "More brings voices forward; too much can sound shouty.", low: 800, high: 4000, color: "#b3a0ff", lightColor: "#65429b" },
  { name: "Sharpness", short: "EDGE", range: "4–8 kHz", example: "Consonants, snare snap, pick noise and sibilance", effect: "More adds definition; less softens sharpness and hiss.", low: 4000, high: 8000, color: "#ffb66f", lightColor: "#a14922" },
  { name: "Treble", short: "TREBLE", range: "8–22 kHz", example: "Cymbal shimmer, room air and breath detail", effect: "More brings out cymbal and breath detail. Too much can make bright recordings sound harsh.", low: 8000, high: MAX_VIEW_HZ, color: "#79e5b2", lightColor: "#2d6a3d" },
] as const;
function regionIndexAt(hz: number) {
  const index = BANDS.findIndex(band => hz < band.high);
  return index < 0 ? BANDS.length - 1 : index;
}
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
  ...GAIN_CONTROLS.map(({ key, placement, fixed }) => ({
    type: s[`${key}Type`], hz: placement ? s[placement] : fixed!, gain: s[key], q: s[`${key}Q`],
  })),
  ...s.focused.map(filter => ({ ...filter, type: "PK" as const })),
];
const audibleToneFilters = (filters: PresetFilter[], enabled: boolean, rate: number) => enabled
  ? filters.filter(filter => filter.gain !== 0).map(filter => ({ ...filter, hz: Math.min(filter.hz, rate * .49) }))
  : [];
const previewGain = (filters: PresetFilter[], rate: number) => {
  if (!filters.length) return 1;
  const frequencies = [
    ...Array.from({ length: 241 }, (_, i) => 20 * (Math.min(22000, rate / 2) / 20) ** (i / 240)),
    ...filters.map(filter => Math.min(filter.hz, rate * .49)),
    0, rate / 2,
  ];
  const peak = Math.max(0, ...frequencies.map(hz => filters.reduce((sum, filter) => sum + presetFilterResponse(hz, filter, rate), 0)));
  return 10 ** (-peak / 20);
};
type CurveOverlay = { key: "raw" | "after" | "target"; label: string; points?: Point[]; color: string; dash?: string };
function CurveChart({ mode, points, curveBase, overlays = [], saved = false, editable = true, idleNote, settings, expanded, axis, sampleRate = 48000, analyser, playing, fitterControls, onBandSelect, selectedGraphBand, selectedFocusHz, onFocusSelection, onGraphBandChange, onWheelQ, onFocusedChange, onDragStart, onDrag, onDragEnd }: { mode: EditorView; points: Point[]; curveBase?: Point[]; overlays?: CurveOverlay[]; saved?: boolean; editable?: boolean; idleNote?: string; settings: Settings; expanded: boolean; axis: AxisView; sampleRate?: number; analyser: AnalyserNode | null; playing: boolean; fitterControls?: import("react").ReactNode; onBandSelect: (index: number) => void; selectedGraphBand: GainKey | null; selectedFocusHz: number | null; onFocusSelection: (hz: number | null) => void; onGraphBandChange: (key: GainKey | null) => void; onWheelQ: (key: GainKey, delta: number) => void; onFocusedChange: (filter: FocusedFilter) => void; onDragStart: () => void; onDrag: (key: keyof Settings, value: number) => void; onDragEnd: () => void }) {
  const surface = useRef<HTMLDivElement>(null);
  const [comparison, setComparison] = useState({ raw: false, after: false, target: false });
  const [size, setSize] = useState({ width: 800, height: 230 });
  const selectedRegionIndex = editable && selectedGraphBand ? GAIN_CONTROLS.findIndex(control => control.key === selectedGraphBand) : -1;
  const selectedRegion = selectedRegionIndex < 0 ? null : BANDS[selectedRegionIndex];
  const [hover, setHover] = useState<{ hz: number; shift: boolean } | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const drag = useRef<{ key: GainKey; bandIndex: number; startY: number; startGain: number; focused?: FocusedFilter; height: number; scale: number; plotHeight: number; limit: number } | null>(null);
  const markerDrag = useRef<{key: "bassHz" | "earHz" | "trebleHz"; min: number; max: number; step: number} | null>(null);
  useEffect(() => {
    const node = surface.current;
    // The wheel edits Q only in the Filters view, so everyday Tone edits never capture page scrolling.
    if (!node || !editable || mode !== "filters" || selectedGraphBand === null) return;
    const changeQ = (event: WheelEvent) => {
      if (!event.cancelable || event.ctrlKey || event.metaKey || event.shiftKey || drag.current || markerDrag.current || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1);
      onWheelQ(selectedGraphBand, Math.max(-160, Math.min(160, pixels)));
    };
    node.addEventListener("wheel", changeQ, { passive: false });
    return () => node.removeEventListener("wheel", changeQ);
  }, [editable, mode, onWheelQ, selectedGraphBand]);
  useEffect(() => {
    const shift = (event: KeyboardEvent) => {
      if (event.key !== "Shift") return;
      const pressed = event.type === "keydown";
      setHover(current => current && current.shift !== pressed ? { ...current, shift: pressed } : current);
    };
    const blur = () => setHover(null);
    window.addEventListener("keydown", shift); window.addEventListener("keyup", shift); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", shift); window.removeEventListener("keyup", shift); window.removeEventListener("blur", blur); };
  }, []);
  function selectGraphBand(index: number) {
    const { key } = GAIN_CONTROLS[index];
    onBandSelect(index);
    onGraphBandChange(key);
  }
  useEffect(() => {
    const node = surface.current;
    if (!node) return;
    const update = () => { const bounds = node.getBoundingClientRect(); const width = Math.round(bounds.width), height = Math.round(bounds.height); if (width && height) setSize(current => current.width === width && current.height === height ? current : { width, height }); };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const filters = useMemo(() => filtersFor(settings), [settings]);
  const frequencies = useMemo(() => [...new Set([
    ...Array.from({ length: 961 }, (_, i) => 20 * (MAX_VIEW_HZ / 20) ** (i / 960)),
    ...(curveBase ?? points).map(([hz]) => hz),
    ...settings.focused.flatMap(filter => [filter.hz, ...peakingHalfGainEdges(Math.min(filter.hz, sampleRate * .49), filter.q, sampleRate)]),
  ])].filter(hz => hz >= 20 && hz <= MAX_VIEW_HZ).sort((a, b) => a - b), [curveBase, points, settings.focused, sampleRate]);
  const baseAt = useCallback((hz: number) => curveBase ? at(curveBase, hz) : at(points, hz) - at(points, 1000) + CURVE_VIEW.anchor, [curveBase, points]);
  const base = useMemo(() => frequencies.map(baseAt), [frequencies, baseAt]);
  const visibleOverlays = overlays.filter(row => comparison[row.key] && row.points?.length);
  const adjusted = useMemo(() => frequencies.map((hz, i) => base[i] + filters.reduce((sum, filter) => sum + presetFilterResponse(hz, filter, sampleRate), 0)), [base, filters, frequencies, sampleRate]);
  const visible = frequencies.flatMap((hz, i) => hz >= axis.freqMin && hz <= axis.freqMax ? [base[i], adjusted[i]] : []);
  const measured = [...(visible.length ? visible : [...base, ...adjusted]), ...visibleOverlays.flatMap(row => [at(row.points!, axis.freqMin), at(row.points!, axis.freqMax), ...row.points!.filter(([hz]) => hz >= axis.freqMin && hz <= axis.freqMax).map(([, db]) => db)])];
  const viewMin = axis.autoDb ? Math.min(CURVE_VIEW.min, Math.floor((Math.min(...measured) - 2) / 5) * 5) : axis.dbMin;
  const viewMax = axis.autoDb ? Math.max(CURVE_VIEW.max, Math.ceil((Math.max(...measured) + 2) / 5) * 5) : axis.dbMax;
  const plotLeft = 48, plotRight = size.width - 17, plotBottom = size.height - 38;
  const plotWidth = plotRight - plotLeft;
  const x = useCallback((hz: number) => plotLeft + plotWidth * Math.log(hz / axis.freqMin) / Math.log(axis.freqMax / axis.freqMin), [plotLeft, plotWidth, axis.freqMin, axis.freqMax]);
  const visibleBands = BANDS.filter(b => b.high > axis.freqMin && b.low < axis.freqMax);
  const regionLabels = packRegionLabels(visibleBands.map(b => ({ x: x(Math.sqrt(Math.max(b.low, axis.freqMin) * Math.min(b.high, axis.freqMax))), width: b.name.length * 7.7 + 4 })), plotLeft, plotRight);
  const plot = { left: plotLeft, right: plotRight, top: 25 + Math.max(0, ...regionLabels.map(label => label.row)) * 16, bottom: plotBottom };
  const plotHeight = plot.bottom - plot.top;
  const y = useCallback((db: number) => plot.top + (viewMax - db) * plotHeight / (viewMax - viewMin), [plot.top, plotHeight, viewMin, viewMax]);
  const tickStep = viewMax - viewMin > 55 ? 10 : 5;
  const ticks = Array.from({ length: Math.floor((viewMax - viewMin) / tickStep) + 1 }, (_, i) => viewMin + i * tickStep);
  const standardTicks = (size.width < 650 ? [20, 100, 500, 2000, 10000, 20000] : [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]).filter(hz => hz > axis.freqMin && hz < axis.freqMax);
  const frequencyTicks = [axis.freqMin, ...standardTicks.filter(hz => x(hz) - plot.left > 32 && plot.right - x(hz) > 32), axis.freqMax];
  const path = useCallback((dbs: number[]) => dbs.map((db, i) => `${i ? "L" : "M"}${x(frequencies[i]).toFixed(2)} ${y(db).toFixed(2)}`).join(" "), [frequencies, x, y]);
  const paths = useMemo(() => ({ base: path(base), adjusted: path(adjusted) }), [path, base, adjusted]);
  const adjustedAt = (hz: number) => baseAt(hz) + filters.reduce((sum, filter) => sum + presetFilterResponse(hz, filter, sampleRate), 0);
  const placementMarkers = [
    { key: "bassHz" as const, min: 60, max: 250, step: 5, name: placementName("bassHz", settings), tag: "B", hz: settings.bassHz, color: graphColor(BANDS[1].color, BANDS[1].lightColor) },
    { key: "earHz" as const, min: 1500, max: 4500, step: 50, name: placementName("earHz", settings), tag: "EG", hz: settings.earHz, color: graphColor(BANDS[3].color, BANDS[3].lightColor) },
    { key: "trebleHz" as const, min: 3500, max: 10000, step: 100, name: placementName("trebleHz", settings), tag: "T", hz: settings.trebleHz, color: graphColor(BANDS[5].color, BANDS[5].lightColor) },
  ];
  const visibleMarkers = placementMarkers.filter(marker => marker.hz >= axis.freqMin && marker.hz <= axis.freqMax).map(marker => ({ ...marker, x: x(marker.hz), y: Math.max(plot.top + 3, Math.min(plot.bottom - 3, y(adjustedAt(marker.hz)))), width: marker.tag === "EG" ? 30 : 24 }));
  const markerLabels = placeMarkerLabels(visibleMarkers, { left: plot.left, right: plot.right, top: plot.top, bottom: plot.bottom });
  function pointerFrequency(event: ReactPointerEvent<SVGRectElement>) {
    const bounds = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const xx = (event.clientX - bounds.left) * size.width / bounds.width;
    return axis.freqMin * (axis.freqMax / axis.freqMin) ** Math.max(0, Math.min(1, (xx - plot.left) / plotWidth));
  }
  function focusedAt(hz: number): FocusedFilter {
    const nearest = settings.focused.reduce<FocusedFilter | undefined>((best, filter) =>
      Math.abs(x(filter.hz) - x(hz)) < 12 && (!best || Math.abs(x(filter.hz) - x(hz)) < Math.abs(x(best.hz) - x(hz))) ? filter : best, undefined);
    return nearest ?? { hz: Math.round(Math.max(20, Math.min(20000, sampleRate * .49, hz))), gain: 0, q: FOCUSED_Q };
  }
  function finishDrag() {
    if (!drag.current) return;
    drag.current = null;
    setDragPreview(null);
    onDragEnd();
  }
  const selectedFocus = settings.focused.find(filter => filter.hz === selectedFocusHz);
  let inspectedRegionIndex = -1;
  let focusPreview: FocusedFilter | undefined;
  if (dragPreview) {
    if ("bandIndex" in dragPreview) inspectedRegionIndex = dragPreview.bandIndex;
    else focusPreview = dragPreview.filter;
  } else if (hover) {
    if ((mode === "tone") !== hover.shift) inspectedRegionIndex = regionIndexAt(hover.hz);
    else focusPreview = focusedAt(hover.hz);
  } else if (selectedFocus) {
    focusPreview = selectedFocus;
  } else {
    inspectedRegionIndex = selectedRegionIndex;
  }
  const inspectedRegion = inspectedRegionIndex < 0 ? null : { ...BANDS[inspectedRegionIndex], filter: filters[inspectedRegionIndex] };
  const minimumChangeDb = .1;
  const inspectedFilter: PresetFilter | undefined = focusPreview ? { type: "PK", ...focusPreview } : inspectedRegion?.filter;
  const effectEdges = inspectedFilter ? tuningFilterEffectRange(inspectedFilter, axis.freqMin, axis.freqMax, minimumChangeDb, sampleRate) : null;
  const formatRange = (edges: [number, number]) => edges.map(hz => formatHzWithUnit(Number(hz.toPrecision(3)))).join("–");
  const hoverHz = hover || dragPreview ? focusPreview?.hz ?? hover?.hz : undefined;
  const focusFull = focusPreview && settings.focused.length >= FOCUSED_FILTER_LIMIT && !settings.focused.some(filter => filter.hz === focusPreview.hz);
  return <div className="pt-chart-wrap"><div className="pt-chart-surface" ref={surface} onPointerLeave={() => setHover(null)} style={{ width: `${axis.width}%`, height: axis.height || undefined }}><svg viewBox={`0 0 ${size.width} ${size.height}`} role="group" aria-label={`${saved ? "Saved EQ settings" : "Starting target"} in gray and region colored adjusted curve with optional headphone response overlays, plotted from ${axis.freqMin} to ${axis.freqMax} hertz and ${viewMin} to ${viewMax} dB`}>
    <defs><clipPath id="pt-plot-clip"><rect x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} /></clipPath></defs>
    {selectedRegion && selectedRegion.high > axis.freqMin && selectedRegion.low < axis.freqMax && <rect
      className="pt-wheel-region" aria-hidden="true" pointerEvents="none"
      x={x(Math.max(selectedRegion.low, axis.freqMin))} y={plot.top}
      width={x(Math.min(selectedRegion.high, axis.freqMax)) - x(Math.max(selectedRegion.low, axis.freqMin))} height={plotHeight}
      fill={graphColor(selectedRegion.color, selectedRegion.lightColor)} fillOpacity=".05"
    />}
    {/* The active band is a faint tint with a thin colored bar between its label and the plot. */}
    {selectedRegion && selectedRegion.high > axis.freqMin && selectedRegion.low < axis.freqMax && <line
      className="pt-wheel-region-edge" aria-hidden="true" pointerEvents="none"
      x1={x(Math.max(selectedRegion.low, axis.freqMin)) + 1} x2={x(Math.min(selectedRegion.high, axis.freqMax)) - 1} y1={plot.top - 2.5} y2={plot.top - 2.5}
      stroke={graphColor(selectedRegion.color, selectedRegion.lightColor)} strokeWidth="2" strokeOpacity=".85" strokeLinecap="round"
    />}
    {ticks.map(db => <g key={db}><line className="pt-grid-line" x1={plot.left} x2={plot.right} y1={y(db)} y2={y(db)} stroke={db === CURVE_VIEW.anchor ? "rgba(160,185,190,.30)" : db % 10 === 0 ? "rgba(130,160,175,.16)" : "rgba(130,160,175,.10)"} strokeWidth={db === CURVE_VIEW.anchor ? .8 : db % 10 === 0 ? .7 : .6} vectorEffect="non-scaling-stroke" /><text x={plot.left - 9} y={y(db) + 3.5} textAnchor="end" fill="#8ca4ab" fontSize="10">{db}</text></g>)}
    {BANDS.slice(1).filter(b => b.low > axis.freqMin && b.low < axis.freqMax).map(b => <line className="pt-region-grid-line" key={b.name} x1={x(b.low)} x2={x(b.low)} y1={plot.top} y2={plot.bottom} stroke="rgba(130,160,175,.14)" strokeWidth=".65" vectorEffect="non-scaling-stroke"/>)}
    <path d={paths.base} clipPath="url(#pt-plot-clip)" fill="none" stroke={graphColor("#8a999c", "#56656d")} strokeWidth="2" strokeDasharray={saved ? undefined : "1 5"} strokeLinecap="round" />
    {visibleBands.map((b, index) => <g key={b.name}><text className="pt-region-label" x={regionLabels[index].x} y={16 + regionLabels[index].row * 16} textAnchor="middle" fill={graphColor(b.color, b.lightColor)} fontSize="11" fontWeight="700">{b.name}</text><clipPath id={`pt-region-${b.short}`}><rect x={x(Math.max(b.low, axis.freqMin))} y={plot.top} width={x(Math.min(b.high, axis.freqMax))-x(Math.max(b.low, axis.freqMin))} height={plotHeight} /></clipPath><path d={paths.adjusted} clipPath={`url(#pt-region-${b.short})`} fill="none" stroke={b.color} strokeWidth="8" strokeOpacity=".23" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 7px ${b.color})` }}/><path d={paths.adjusted} clipPath={`url(#pt-region-${b.short})`} fill="none" stroke={b.color} strokeWidth="3" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${b.color})` }}/></g>)}
    {visibleOverlays.map(row => <path key={row.key} d={row.points!.map(([hz, db], index) => `${index ? "L" : "M"}${x(hz).toFixed(2)} ${y(db).toFixed(2)}`).join(" ")} clipPath="url(#pt-plot-clip)" fill="none" stroke={row.color} className={`pt-overlay pt-overlay-${row.key}`} strokeWidth={row.key === "after" ? "3" : "1.8"} strokeDasharray={row.dash} strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>)}
    {frequencyTicks.map(hz => <text key={hz} x={x(hz)} y={plot.bottom + 16} textAnchor="middle" fill={graphColor("#91a8ae", "#435e68")} fontSize="10">{formatHz(hz)}</text>)}
    <text x={plot.right} y={size.height - 5} textAnchor="end" fill={graphColor("#91a8ae", "#435e68")} fontSize="10">Frequency (Hz) · level (dB)</text>
    <g clipPath="url(#pt-plot-clip)" pointerEvents="none" aria-hidden="true">
      {settings.focused.map(filter => <circle key={filter.hz} cx={x(filter.hz)} cy={y(adjustedAt(filter.hz))} r="5" fill="#fff" stroke="#061116" strokeWidth="2"/>)}
      {effectEdges && <rect className={focusPreview ? "pt-focus-range" : "pt-region-preview"}
        x={x(effectEdges[0])} y={plot.top} width={x(effectEdges[1]) - x(effectEdges[0])} height={plotHeight}
        fill={graphColor("#fff", "#314d5d")} fillOpacity=".035" stroke={graphColor("#fff", "#314d5d")} strokeOpacity=".36" strokeWidth="1" strokeDasharray="2 5" vectorEffect="non-scaling-stroke"/>}
      {hoverHz !== undefined && <line className="pt-hover-line" x1={x(hoverHz)} x2={x(hoverHz)} y1={plot.top} y2={plot.bottom} stroke="#fff" strokeWidth="1" vectorEffect="non-scaling-stroke"/>}
    </g>
    {hoverHz !== undefined && <text pointerEvents="none" x={Math.max(plot.left + 3, Math.min(plot.right - 3, x(hoverHz)))} y={plot.top + 12} textAnchor={x(hoverHz) > (plot.left + plot.right) / 2 ? "end" : "start"} fill="#fff" stroke="#061116" strokeWidth="3" paintOrder="stroke" fontSize="11">{Math.round(hoverHz)} Hz</text>}
    <rect x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} fill="transparent" className="pt-curve-drag" aria-hidden="true" onPointerDown={event => {
      if (!editable || event.button > 0) return;
      const hz = pointerFrequency(event);
      const index = regionIndexAt(hz);
      const control = GAIN_CONTROLS[index];
      selectGraphBand(index);
      // Tone drags move the whole region; Filters drags place a narrow correction. Shift swaps the two.
      const focused = (mode === "filters") !== event.shiftKey ? focusedAt(hz) : undefined;
      if (focused && !settings.focused.some(filter => filter.hz === focused.hz) && settings.focused.length >= FOCUSED_FILTER_LIMIT) return;
      const bounds = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
      drag.current = {
        key: control.key, bandIndex: index, startY: event.clientY, startGain: focused?.gain ?? settings[control.key], focused,
        height: bounds.height, scale: viewMax - viewMin, plotHeight,
        limit: expanded ? EXPANDED_GAIN_LIMIT : focused ? 12 : control.limit,
      };
      setDragPreview(focused ? { filter: focused, delta: 0 } : { bandIndex: index, delta: 0 });
      event.currentTarget.setPointerCapture(event.pointerId);
      onDragStart();
    }} onPointerMove={event => {
      const active = drag.current;
      if (event.pointerType === "mouse") {
        const bounds = event.currentTarget.getBoundingClientRect();
        const inside = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
        setHover(inside ? { hz: pointerFrequency(event), shift: event.shiftKey } : null);
      }
      if (!active) return;
      const delta = (active.startY - event.clientY) * size.height / active.height * active.scale / active.plotHeight;
      const gain = Math.round(Math.max(-active.limit, Math.min(active.limit, active.startGain + delta)) * 1000) / 1000;
      if (active.focused) {
        const filter = { ...active.focused, gain };
        onFocusSelection(filter.hz);
        setDragPreview({ filter, delta: gain - active.startGain });
        onFocusedChange(filter);
      } else {
        onFocusSelection(null);
        setDragPreview({ bandIndex: active.bandIndex, delta: gain - active.startGain });
        onDrag(active.key, gain);
      }
    }} onPointerUp={event => {
      if (!drag.current) return;
      finishDrag(); event.currentTarget.releasePointerCapture(event.pointerId);
    }} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}/>
    {(editable ? visibleMarkers : []).map((marker, index) => { const mx = marker.x, my = marker.y; const label = markerLabels[index]; const labelCenter = label.x + label.width / 2; const labelEdge = my < label.y ? label.y : label.y + label.height; return <g key={marker.name} className="pt-placement-marker" role="slider" tabIndex={0} aria-label={marker.name} aria-valuemin={marker.min} aria-valuemax={marker.max} aria-valuenow={marker.hz} aria-valuetext={`${marker.hz} hertz`} aria-orientation="horizontal" aria-keyshortcuts="ArrowLeft ArrowRight Home End" onKeyDown={event => { let next = marker.hz; if (event.key === "ArrowLeft") next -= marker.step; else if (event.key === "ArrowRight") next += marker.step; else if (event.key === "Home") next = marker.min; else if (event.key === "End") next = marker.max; else return; event.preventDefault(); event.stopPropagation(); onDragStart(); onDrag(marker.key, Math.max(marker.min, Math.min(marker.max, next))); }} onKeyUp={onDragEnd} onBlur={onDragEnd} onPointerDown={event => { if (event.button > 0) return; event.stopPropagation(); const key = PLACEMENTS[marker.key].gain; selectGraphBand(GAIN_CONTROLS.findIndex(control => control.key === key)); markerDrag.current = marker; event.currentTarget.setPointerCapture(event.pointerId); onDragStart(); }} onPointerMove={event => { const active = markerDrag.current; const svg = event.currentTarget.ownerSVGElement; if (!active || !svg) return; const bounds = svg.getBoundingClientRect(); const xx = (event.clientX - bounds.left) * size.width / bounds.width; const frequency = axis.freqMin * (axis.freqMax / axis.freqMin) ** Math.max(0, Math.min(1, (xx - plot.left) / plotWidth)); onDrag(active.key, Math.max(active.min, Math.min(active.max, Math.round(frequency / active.step) * active.step))); }} onPointerUp={event => { if (markerDrag.current) { markerDrag.current = null; event.currentTarget.releasePointerCapture(event.pointerId); onDragEnd(); } }} onPointerCancel={() => { markerDrag.current = null; onDragEnd(); }}><title>{`${marker.name}: drag left or right, or use arrow keys`}</title><circle className="pt-marker-halo" cx={mx} cy={my} r="12" fill={marker.color} fillOpacity=".12" stroke={marker.color} strokeOpacity=".35"/><line x1={mx} x2={labelCenter} y1={my} y2={labelEdge} stroke={marker.color} strokeWidth="1" opacity=".7"/><circle cx={mx} cy={my} r="5" fill={marker.color} stroke="#041013" strokeWidth="1.5"/><rect className="pt-marker-tag" x={label.x} y={label.y} width={label.width} height={label.height} rx="4" fill="#061116" stroke={marker.color} strokeWidth="1"/><text x={labelCenter} y={label.y + 12} textAnchor="middle" fill={marker.color} fontSize="11" fontWeight="800" letterSpacing=".5">{marker.tag}</text></g>; })}
  </svg><LiveSpectrum analyser={analyser} playing={playing} size={size} plot={plot} freqMin={axis.freqMin} freqMax={axis.freqMax}/></div>
  <div className="pt-graph-footer">
    <p className="pt-graph-readout"><output aria-label="Graph focus">
      {inspectedFilter ? <>
        <strong>{focusPreview ? formatHzWithUnit(focusPreview.hz) : inspectedRegion?.name}</strong>
        {effectEdges ? <> · ≥{minimumChangeDb} dB change: {formatRange(effectEdges)}</> : <> · Under {minimumChangeDb} dB change across this view</>}
        {(mode === "filters" || focusPreview) && <> · Q {Number(inspectedFilter.q.toFixed(4))}</>}
        {" · "}{formatGraphGain(inspectedFilter.gain)} gain
        {hoverHz !== undefined && <> · {formatGraphGain(presetFilterResponse(hoverHz, inspectedFilter, sampleRate))} at {formatHzWithUnit(Math.round(hoverHz))}</>}
      </> : hoverHz !== undefined ? `${Math.round(hoverHz)} Hz` : editable ? "Hover to inspect a frequency" : idleNote ?? "Choose a saved EQ to start"}
      {dragPreview && <> · change {formatGraphGain(dragPreview.delta)}</>}
      {focusFull && " · Remove a narrow correction to add another"}
    </output></p>
    {editable && <p className="pt-graph-hint" id="pt-curve-drag-help">{mode === "tone"
      ? "Drag a region of the graph up or down to change its gain."
      : "Drag at a frequency to add a narrow cut or boost, or drag a white point to adjust it. The dashed area shows changes of at least 0.1 dB. Scroll over the graph to change the selected band’s Q."}<span className="pt-graph-hint-keys"> Shift-drag {mode === "tone" ? "adds a narrow correction" : "moves the whole region"}.</span></p>}
    {mode === "filters" && selectedRegion && selectedGraphBand && <p className="pt-wheel-band" role="status">Scroll adjusts {BANDS[selectedRegionIndex].name} Q · {Number(settings[`${selectedGraphBand}Q`].toFixed(4))}</p>}
    <div className="pt-graph-keys"><div className="pt-legend"><span><i className={saved ? "baseline saved" : "baseline"}/>{saved ? "Saved EQ" : "Starting target"}</span><span><i className="adjusted"/>Your curve</span><span>Live spectrum when music plays</span></div><div className="pt-response-overlays" role="group" aria-label="Optional response overlays">{overlays.map(row => <label key={row.key}><input type="checkbox" checked={comparison[row.key]} disabled={!row.points?.length} onChange={event => setComparison(state => ({ ...state, [row.key]: event.target.checked }))}/><i style={{ background: row.color }}/>{row.label}</label>)}</div></div>
    {fitterControls}
  </div></div>;
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
      const light = document.documentElement.dataset.siteTheme === "light";
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
  }, [analyser, playing, size.width, size.height, plot.left, plot.right, plot.top, plot.bottom, freqMin, freqMax]);
  return <canvas ref={canvas} className="pt-spectrum" aria-label="Live music spectrum across the labeled frequency regions" role="img"/>;
}
/** Which sound is playing: the live tuning, the starting sound, or a saved snapshot. A snapshot only counts for the starting sound it was saved with. */
type SlotId = "A" | "B" | "C";
const SLOT_IDS: readonly SlotId[] = ["A", "B", "C"];
type TuningSnapshot = { slot: SlotId; name: string; settings: Settings };
type Audition = { key: "live" | "start" | SlotId; scope: string | null };
const LIVE_AUDITION: Audition = { key: "live", scope: null };
const NO_SNAPSHOTS: TuningSnapshot[] = [];
const SNAPSHOT_STORE = "preference-tuning-snapshots-v1";
const SNAPSHOT_NAME_LIMIT = 24;
const cloneSettings = (settings: Settings): Settings => ({ ...settings, focused: settings.focused.map(filter => ({ ...filter })) });
const snapshotName = (name: unknown, slot: SlotId) => (typeof name === "string" ? name.trim().slice(0, SNAPSHOT_NAME_LIMIT) : "") || `Snapshot ${slot}`;
/** Strict check for stored snapshot settings: every value must be present, finite and inside the editor's own ranges, or the snapshot is rejected. */
function validSnapshotSettings(value: unknown): Settings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const within = (entry: unknown, min: number, max: number) => typeof entry === "number" && Number.isFinite(entry) && entry >= min && entry <= max ? entry : null;
  const settings: Settings = { ...defaults, focused: [] };
  for (const { key, placement } of GAIN_CONTROLS) {
    const typeKey = `${key}Type` as const, qKey = `${key}Q` as const;
    const type = raw[typeKey];
    if (typeof type !== "string" || !Object.hasOwn(FILTER_SHAPE, type)) return null;
    const shape = type as FilterType;
    const gain = within(raw[key], -EXPANDED_GAIN_LIMIT, EXPANDED_GAIN_LIMIT), q = within(raw[qKey], .1, maxQ(shape) + 1e-9);
    if (gain === null || q === null) return null;
    settings[key] = gain; settings[typeKey] = shape; settings[qKey] = boundedQ(q, shape);
    if (placement) {
      const hz = within(raw[placement], PLACEMENTS[placement].min, PLACEMENTS[placement].max);
      if (hz === null) return null;
      settings[placement] = hz;
    }
  }
  if (!Array.isArray(raw.focused) || raw.focused.length > FOCUSED_FILTER_LIMIT) return null;
  for (const item of raw.focused as unknown[]) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const hz = within(row.hz, 20, 20000), gain = within(row.gain, -EXPANDED_GAIN_LIMIT, EXPANDED_GAIN_LIMIT), q = within(row.q, .1, 20);
    if (hz === null || gain === null || gain === 0 || q === null || settings.focused.some(filter => filter.hz === hz)) return null;
    settings.focused.push({ hz, gain, q });
  }
  settings.focused.sort((a, b) => a.hz - b.hz);
  return settings;
}
/** Reads the snapshot store. Missing, legacy or damaged data reads as empty; unavailable storage throws nothing. */
function readSnapshotStore(): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SNAPSHOT_STORE) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch { return {}; }
}
function readSnapshots(scope: string): TuningSnapshot[] {
  const entry = readSnapshotStore()[scope];
  const stored = entry && typeof entry === "object" ? (entry as { rows?: unknown }).rows : null;
  if (!Array.isArray(stored)) return [];
  const rows: TuningSnapshot[] = [];
  for (const item of stored as unknown[]) {
    if (!item || typeof item !== "object") continue;
    const { slot, name, settings } = item as Record<string, unknown>;
    const id = SLOT_IDS.find(candidate => candidate === slot), valid = validSnapshotSettings(settings);
    if (id && valid && !rows.some(row => row.slot === id)) rows.push({ slot: id, name: snapshotName(name, id), settings: valid });
  }
  return rows.sort((a, b) => a.slot.localeCompare(b.slot));
}
/** Updates one starting sound's snapshots without replacing other sounds' slots. */
function writeSnapshots(scope: string, rows: TuningSnapshot[]) {
  const store = readSnapshotStore();
  if (rows.length) store[scope] = { rows }; else delete store[scope];
  localStorage.setItem(SNAPSHOT_STORE, JSON.stringify(store));
}
type LoudnessInfo = { state: "pending" | "ready" | "unavailable"; cut: number };
type LoudnessEstimate = { rate: number; bands: LoudnessBands; mean: Float64Array; frame: Float64Array; frames: number; quiet: number };
type AudioGraph = { context: AudioContext; input: GainNode; level: GainNode; levelValue: number; levelKey: string; taps?: AnalyserNode[]; toneInput: GainNode; toneOutput: GainNode; tone: EqStage; toneKey: string; toneGain: number; toneChangedAt: number; fit: EqStage; balance: EqStage; fitKey?: string; fitAbort?: AbortController; fitPromise?: Promise<AutoEqFit[]>; prepared?: AutoEqFit; appliedFitKey?: string; fitReady?: boolean; output: GainNode; spectrum: AnalyserNode; media?: MediaElementAudioSourceNode; dynamics?: AudioWorkletNode; dynamicsLoading?: boolean; playbackInitialized?: boolean; stopInterruptions?: () => void; volumeGain: GainNode };
function sameEdit(a: EditSnapshot, b: EditSnapshot) {
  return a.selected === b.selected && a.expanded === b.expanded &&
    (Object.keys(defaults) as (keyof Settings)[]).every(key => key === "focused" || a.settings[key] === b.settings[key]) &&
    JSON.stringify(a.settings.focused) === JSON.stringify(b.settings.focused);
}
const TUNING_ROUTE = "/preference-tuning";
/**
 * Tells the persistent editor that the site route or query changed. It renders nothing and sits in its own Suspense boundary,
 * so reading the query never suspends or hides the audio subtree.
 */
function RouteWatcher({ onRoute }: { onRoute: () => void }) {
  const pathname = usePathname(), query = useSearchParams()?.toString() ?? "";
  useEffect(() => { onRoute(); }, [pathname, query, onRoute]);
  return null;
}
/**
 * The whole Tuning page. The site keeps one instance mounted across client navigation (see components/tuning-session.tsx):
 * `visible` is false on other routes, where the page is hidden but the audio element, Web Audio graph and all editing state live on,
 * and the mini-player appears there once a song is loaded.
 */
export default function TuningEditor({ visible = true }: { visible?: boolean }) {
  const consent = useConsentPrompt("Tuning needs no agreement. Viewing or exporting your EQ keeps the file, curve and settings for private research, so we ask once, here.");
  const [targetQuery, setTargetQuery] = useState("");
  const [targets, setTargets] = useState<Target[]>([fallback]);
  const [curatedRanking, setCuratedRanking] = useState<{ id: string; name: string; rank: number }[]>([]);
  const curatedLeader = curatedRanking.find(row => row.rank === 1) ?? null;
  const [selected, setSelected] = useState("flat");
  const [settings, setSettings] = useState<Settings>(defaults);
  const [expanded, setExpanded] = useState(false);
  const [axis, setAxis] = useState<AxisView>(defaultAxis);
  const [axisOpen, setAxisOpen] = useState(false);
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
  const lastWheelEdit = useRef<{ key: GainKey; at: number } | null>(null);
  const [measurements, setMeasurements] = useState<HeadphoneMeasurement[]>([]);
  const [measurementId, setMeasurementId] = useState("");
  const [headphoneType, setHeadphoneType] = useState<"ie" | "oe" | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [activeBand, setActiveBand] = useState(3);
  const [selectedGraphBand, setSelectedGraphBand] = useState<GainKey | null>(null);
  const [selectedFocusHz, setSelectedFocusHz] = useState<number | null>(null);
  const [view, setView] = useState<EditorView>("tone");
  const [allTones, setAllTones] = useState(false);
  const [newFocus, setNewFocus] = useState({ hz: "", gain: "-3", q: String(FOCUSED_Q) });
  /** The sound being auditioned. "start" mutes only the added tuning, keeping the target fit or saved EQ; a slot plays a saved snapshot without touching the live draft. */
  const [audition, setAudition] = useState<Audition>(LIVE_AUDITION);
  /** Last snapshot action, shown beside the snapshots of the starting sound it happened on. */
  const [snapshotNote, setSnapshotNote] = useState<{ scope: string | null; text: string }>({ scope: null, text: "" });
  /** Snapshot names and actions are revealed on request, and straight after a save so the new snapshot can be named. */
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [namingSlot, setNamingSlot] = useState<SlotId | null>(null);
  const snapshotGroup = useRef<HTMLDivElement>(null);
  /** The Playback card is a thin strip until expanded. Only the layout changes; the audio element and its state sit outside the expanding part. */
  const [playerOpen, setPlayerOpen] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [trackError, setTrackError] = useState("");
  const playerToggle = useRef<HTMLButtonElement>(null);
  const musicChooser = useRef<HTMLDivElement>(null);
  const [snapshotState, setSnapshotState] = useState<{ scope: string | null; rows: TuningSnapshot[] }>({ scope: null, rows: NO_SNAPSHOTS });
  /** Loop passage in seconds on the current track, or null for normal playback. */
  const [loop, setLoop] = useState<LoopPassage | null>(null);
  const loopRef = useRef<LoopPassage | null>(null);
  /** When the loop was last heard playing (performance.now), used to tell a loop reaching the track end from the track simply ending. */
  const loopInside = useRef(false);
  /** Optional A/B loudness matching: attenuation only, estimated from the playing track. */
  const [matchLoudness, setMatchLoudness] = useState(false);
  const [loudnessInfo, setLoudnessInfo] = useState<LoudnessInfo>({ state: "pending", cut: 0 });
  const loudnessEstimate = useRef<LoudnessEstimate | null>(null);
  const setupMissingSeen = useRef<boolean | null>(null);
  const soundBar = useRef<HTMLButtonElement>(null);
  const [message, setMessage] = useState("");
  const [storageNotice, setStorageNotice] = useState("");
  const sourceGeneration = useRef(0);
  const playbackIntent = useRef(0);
  const analysisRequest = useRef<AbortController | null>(null);
  const [measurementAttention, setMeasurementAttention] = useState(0);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  /** The guide topic to open first, and the control that opened the guide so focus can return to it. */
  const [guideTopic, setGuideTopic] = useState<GuideTopic | null>(null);
  const instructionsOpener = useRef<HTMLElement | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  /** The headphone and target or saved-EQ chooser stays mounted while collapsed, so its search and selection state survive. */
  const [setupOpen, setSetupOpen] = useState(false);
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
  const shell = useRef<HTMLElement>(null);
  const [dockOpen, setDockOpen] = useState(false);
  /** The status line as it stood on leaving Tuning, so the mini-player only reports what happened since. */
  const [awayMessage, setAwayMessage] = useState("");
  const [seenVisible, setSeenVisible] = useState(visible);
  // Leaving Tuning closes its modal dialogs so they cannot hold focus out of sight. Everything else is kept.
  if (seenVisible !== visible) {
    setSeenVisible(visible);
    if (!visible) { setAwayMessage(message); setResetOpen(false); setInstructionsOpen(false); }
  }
  /** Site location last reported by the router, and the ?target= it carried. */
  const [route, setRoute] = useState<{ key: string; target: string | null } | null>(null);
  const [targetsReady, setTargetsReady] = useState(false);
  const seenRoute = useRef<string | null>(null);
  const pendingTarget = useRef<string | null>(null);
  /** Set when the browser's back or forward button caused the route change being handled. */
  const historyNav = useRef(false);
  const noteRoute = useCallback(() => {
    const key = window.location.pathname + window.location.search;
    const requested = new URLSearchParams(window.location.search).get("target");
    setRoute(current => current?.key === key ? current : { key, target: requested });
  }, []);
  useEffect(() => {
    // Back and forward return to a page already visited, so its ?target= is not a new request. Hash-only moves are not route changes.
    const mark = () => { if (window.location.pathname + window.location.search !== seenRoute.current) historyNav.current = true; };
    window.addEventListener("popstate", mark);
    return () => window.removeEventListener("popstate", mark);
  }, []);
  useEffect(() => {
    if (visible) {
      // The playhead is only tracked to the second while away.
      const audio = media.current;
      if (audio) setPosition(audio.currentTime || 0);
      return;
    }
    // Leaving: commit a value still being typed and close any open slider or keyboard gesture as one undo step.
    const active = document.activeElement;
    if (active instanceof HTMLElement && shell.current?.contains(active)) active.blur();
    const start = gestureRef.current;
    gestureRef.current = null;
    if (start && !sameEdit(start, editRef.current)) { setPast(rows => [...rows, start]); setFuture([]); }
  }, [visible]);
  useEffect(() => {
    // Give a newly started player the audio output, including comparisons that use Web Audio directly.
    const yieldPlayback = () => {
      playbackIntent.current++;
      if (media.current && !media.current.paused) media.current.pause();
      setPlaying(false);
    };
    const onMediaPlay = (event: Event) => {
      const other = event.target;
      if (other instanceof HTMLMediaElement && other !== media.current && !other.muted && other.volume > 0) yieldPlayback();
    };
    document.addEventListener("play", onMediaPlay, true);
    window.addEventListener(EQ_COMPARISON_PLAY_EVENT, yieldPlayback);
    return () => {
      document.removeEventListener("play", onMediaPlay, true);
      window.removeEventListener(EQ_COMPARISON_PLAY_EVENT, yieldPlayback);
    };
  }, []);
  useEffect(() => {
    const refresh = () => {
      setPresets(readLibraryEqs());
      try { const rows = JSON.parse(localStorage.getItem("target-lab-measurements") || "[]"); if (Array.isArray(rows)) setMeasurements(rows); } catch {}
    }; refresh();
    window.addEventListener("library-eqs-changed", refresh); window.addEventListener("storage", refresh); window.addEventListener("yinyang-data-changed", refresh);
    return () => { window.removeEventListener("library-eqs-changed", refresh); window.removeEventListener("storage", refresh); window.removeEventListener("yinyang-data-changed", refresh); };
  }, []);
  useEffect(() => { const current = graph.current; if (current) current.volumeGain.gain.setTargetAtTime(volume, current.context.currentTime, .01); }, [volume]);
  const showEdit = useCallback((next: EditSnapshot) => { setAudition(LIVE_AUDITION); lastWheelEdit.current = null; editRef.current = next; setSettings(next.settings); setSelected(next.selected); setExpanded(next.expanded); }, []);
  const applyEdit = useCallback((next: EditSnapshot, groupWithLast = false) => {
    const previous = editRef.current;
    if (sameEdit(next, previous)) return;
    if (!gestureRef.current && !groupWithLast) { setPast(rows => [...rows, previous]); setFuture([]); }
    showEdit(next);
  }, [showEdit]);
  const adjustQFromWheel = useCallback((key: GainKey, delta: number) => {
    const current = editRef.current;
    const qKey = `${key}Q` as const;
    const q = boundedQ(Number((current.settings[qKey] * 2 ** (-delta / 500)).toFixed(4)), current.settings[`${key}Type`]);
    if (q === current.settings[qKey]) return;
    const at = performance.now(), last = lastWheelEdit.current;
    applyEdit({ ...current, settings: { ...current.settings, [qKey]: q } }, last?.key === key && at - last.at < 300);
    lastWheelEdit.current = { key, at };
  }, [applyEdit]);

  useEffect(() => {
    try {
      const savedText = localStorage.getItem("personal-tuning-v1");
      hadSavedSelection.current = Boolean(savedText);
      const saved = JSON.parse(savedText || "{}");
      const restoredSettings: Settings = { ...defaults, ...saved.settings };
      restoredSettings.focused = Array.isArray(saved.settings?.focused) ? saved.settings.focused.filter((filter: FocusedFilter) =>
        filter && Number.isFinite(filter.hz) && filter.hz >= 20 && filter.hz <= 20000 && Number.isFinite(filter.gain) &&
        filter.gain !== 0 && Math.abs(filter.gain) <= EXPANDED_GAIN_LIMIT && Number.isFinite(filter.q) && filter.q >= .1 && filter.q <= 20,
      ).slice(0, FOCUSED_FILTER_LIMIT).map(({ hz, gain, q }: FocusedFilter) => ({ hz, gain, q })) : [];
      restoredSettings.focused = [...new Map(restoredSettings.focused.map(filter => [filter.hz, filter])).values()].sort((a, b) => a.hz - b.hz);
      for (const { key } of GAIN_CONTROLS) {
        const typeKey = `${key}Type` as const, qKey = `${key}Q` as const;
        if (!Object.hasOwn(FILTER_SHAPE, restoredSettings[typeKey])) restoredSettings[typeKey] = defaults[typeKey];
        const q = restoredSettings[qKey];
        restoredSettings[qKey] = boundedQ(Number.isFinite(q) ? q : defaults[qKey], restoredSettings[typeKey]);
      }
      const restored = { settings: restoredSettings, selected: typeof saved.selected === "string" ? saved.selected : "flat", expanded: saved.expanded === true };
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
        let approved: Target[] = [];
        try { const response = await fetch("/api/targets"); if (response.ok) approved = await response.json(); } catch { /* Saved targets are available without the shared pool. */ }
        let privateTargets: Target[] = [], localAutoEqTargets: Target[] = [];
        try { privateTargets = JSON.parse(localStorage.getItem("target-lab-private-targets") || "[]"); } catch {}
        try { localAutoEqTargets = readLocalAutoEqTargets(localStorage.getItem(autoEqTargetStorageKey)); } catch {}
        if (stopped) return;
        const available=[fallback, ...approved.filter(t => Array.isArray(t.points)), ...privateTargets.filter(t => Array.isArray(t.points)), ...autoEqPickerTargets, ...localAutoEqTargets];
        setTargets(available);
        // A ?target= deep link is applied by the route effect below once the targets are in; it also outranks the default leader.
        if (new URLSearchParams(window.location.search).get("target")) hadSavedSelection.current = true;
        setTargetsReady(true);
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
  }, []);
  // An explicit ?target= link loads that target when Tuning is entered or its query changes. A plain return, including back and forward, changes nothing.
  useEffect(() => {
    if (!route) return;
    if (seenRoute.current !== route.key) {
      seenRoute.current = route.key;
      pendingTarget.current = visible && !historyNav.current ? route.target : null;
      historyNav.current = false;
    }
    const id = pendingTarget.current;
    if (!id || !visible || !targetsReady) return;
    pendingTarget.current = null;
    hadSavedSelection.current = true;
    const requested = targets.find(row => row.id === id);
    if (!requested) {
      setMessage("The requested curve is unavailable. Your existing tuning is unchanged; choose a target or import its curve.");
      return;
    }
    if (soundMode !== "target") {
      // Same hand-over as the Target / Saved EQ switch: keep the saved-EQ draft and start the target's history afresh.
      modeDrafts.current[soundMode] = { ...settings };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- An explicit router deep link changes the sound mode.
      setSoundMode("target"); setSelectedGraphBand(null); setSelectedFocusHz(null);
      showEdit({ ...editRef.current, settings: { ...modeDrafts.current.target } }); setPast([]); setFuture([]);
    }
    applyEdit({ selected: requested.id, settings: { ...defaults }, expanded: false });
    setMessage(`Loaded ${requested.name} for fine-tuning with neutral adjustments. Undo restores your previous tuning.`);
  }, [route, visible, targetsReady, targets, soundMode, settings, showEdit, applyEdit]);
  // A failed external storage write needs immediate visible feedback; editing remains available.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!axisLoaded || soundMode !== "target") return; try { localStorage.setItem("personal-tuning-v1", JSON.stringify({ settings, selected, expanded })); } catch { setStorageNotice("Browser storage is unavailable. Tuning still works in this tab; changes will not be saved when you leave."); } }, [settings, selected, expanded, axisLoaded, soundMode]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Report an external storage failure.
  useEffect(() => { if (axisLoaded) try { localStorage.setItem("preference-tuning-axis-v1", JSON.stringify(axis)); } catch { setStorageNotice("Browser storage is unavailable. Tuning still works in this tab; changes will not be saved when you leave."); } }, [axis, axisLoaded]);
  const selectedTarget = targets.find(t => t.id === selected) || fallback;
  const sourceCurves = useAutoEqSourceCurves(soundMode === "target" ? [selectedTarget.id] : []);
  const target = useMemo(() => sourceCurves.resolve(selectedTarget), [selectedTarget, sourceCurves]);
  const localAutoEq = isSourceAutoEqTarget(target.id);
  useEffect(() => {
    if (soundMode === "target" && !sourceCurves.ready) media.current?.pause();
  }, [soundMode, sourceCurves.ready]);
  const normalized = useMemo(() => [...target.points].sort((a, b) => a[0] - b[0]), [target]);
  const curatedRanks = useMemo(() => new Map(curatedRanking.map(row => [row.id, row.rank])), [curatedRanking]);
  const targetOptions = useMemo(() => [...targets].sort((a, b) => (curatedRanks.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (curatedRanks.get(b.id) ?? Number.MAX_SAFE_INTEGER)), [targets, curatedRanks]);
  const filters = useMemo(() => filtersFor(settings), [settings]);
  const savedEq = presets.find(eq => eq.id === presetId);
  const measurement = measurements.find(row => row.id === (soundMode === "saved" ? savedEq?.measurementId : measurementId));
  const activeMatch = useMemo(() => soundMode === "saved" ? savedEq?.channelMatch : measurementChannelMatch(measurement), [soundMode, savedEq, measurement]);
  const matchHeadphone = measurement?.device || measurement?.name || savedEq?.headphone;
  const tweaksChanged = filters.some(filter => Math.abs(filter.gain) > .0001);
  const eqAvailable = soundMode === "target" ? sourceCurves.ready : !!savedEq;
  const eqOn = !bypass && eqAvailable;
  // Snapshots belong to one starting sound: the target (by id and curve content) with its headphone measurement, or one saved EQ.
  const shownTargetOptions = targetQuery.trim() ? searchRows(targetOptions, targetQuery, row => [row.name, row.creator]) : targetOptions;
  const targetPrint = useMemo(() => curveFingerprint(normalized), [normalized]);
  const snapshotScope = soundMode === "saved" ? savedEq ? `eq:${savedEq.id}` : null : `target:${target.id}:${targetPrint}:${measurement?.id ?? "none"}`;
  const snapshots = snapshotState.scope === snapshotScope && snapshotScope ? snapshotState.rows : NO_SNAPSHOTS;
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Load this starting sound's snapshots from browser storage.
  useEffect(() => { setSnapshotState({ scope: snapshotScope, rows: snapshotScope ? readSnapshots(snapshotScope) : NO_SNAPSHOTS }); }, [snapshotScope]);
  const canCompare = eqOn && (tweaksChanged || snapshots.length > 0);
  const auditionSlot = eqOn && audition.key !== "live" && audition.key !== "start" && audition.scope === snapshotScope ? snapshots.find(row => row.slot === audition.key) : undefined;
  const comparing = audition.key === "start" && canCompare;
  /** What is audible right now. Editing is paused only while a snapshot plays. */
  const heardKey: Audition["key"] = comparing ? "start" : auditionSlot ? auditionSlot.slot : "live";
  const toneOn = eqOn && audition.key !== "start";
  const heardFilters = useMemo(() => auditionSlot ? filtersFor(auditionSlot.settings) : filters, [auditionSlot, filters]);
  /** Every sound offered for comparison, for loudness matching. With EQ off they are all the original sound. */
  const loudnessOptions = useMemo(() => [
    { key: "start", filters: [] as PresetFilter[] },
    { key: "live", filters: eqOn ? filters : [] },
    ...snapshots.map(row => ({ key: row.slot as string, filters: eqOn ? filtersFor(row.settings) : [] })),
  ], [eqOn, filters, snapshots]);
  const [fit, setFit] = useState<AutoEqFit | null>(null);
  const basePreamp = soundMode === "saved" ? savedEq?.preamp ?? 0 : fit?.preamp ?? 0;
  const responseRaw = useMemo(() => measurementResponsePoints(measurement), [measurement]);
  // The predicted response follows the filters that are actually audible; the editable curve stays on the live draft.
  const responsePlot = useMemo(() => tuningResponsePlot(responseRaw, soundMode === "target" ? normalized : savedEq?.target?.points, soundMode === "saved" ? savedEq?.filters ?? [] : fit?.filters ?? [], audibleToneFilters(heardFilters, toneOn, previewRate), previewRate, soundMode === "saved" ? "1khz" : "shootout", eqOn, CURVE_VIEW.anchor, { referenceRaw: measurement?.points, channelMatch: matchEnabled ? activeMatch : undefined }), [responseRaw, measurement, normalized, savedEq, fit, heardFilters, previewRate, soundMode, eqOn, toneOn, matchEnabled, activeMatch]);
  const responseReady = !preparingEq && (soundMode === "saved" ? !!savedEq : !!fit);
  const responseOverlays: CurveOverlay[] = [
    { key: "raw", label: "Raw headphones", points: responsePlot.raw, color: graphColor("#d6e0e7", "#425a6b") },
    { key: "after", label: "Predicted EQ", points: responseReady ? responsePlot.after : undefined, color: graphColor("#a4ffe4", "#086751") },
    ...(soundMode === "saved" ? [{ key: "target" as const, label: "Saved target", points: responsePlot.target, color: graphColor("#aeb7be", "#68727a"), dash: "1 5" }] : []),
  ];
  const preferenceCurve = useMemo<Point[]>(() => {
    const frequencies = [...new Set([
      ...Array.from({ length: 241 }, (_, i) => 20 * 1000 ** (i / 240)),
      ...settings.focused.flatMap(filter => [filter.hz, ...peakingHalfGainEdges(filter.hz, filter.q)]),
    ])].filter(hz => hz >= 20 && hz <= 20000).sort((a, b) => a - b);
    return frequencies.map(hz => [hz, at(normalized, hz) - at(normalized, 1000) + filters.reduce((sum, filter) => sum + presetFilterResponse(hz, filter, 48000), 0)]);
  }, [normalized, filters, settings.focused]);
  const priorFinalizeKey = useMemo(() => JSON.stringify({ selected, settings, measurementId, raw: measurement?.points, target: normalized }), [selected, settings, measurementId, measurement?.points, normalized]);
  const finalizeKey = JSON.stringify([priorFinalizeKey, measurement?.type]);
  useEffect(() => () => { finalizeAbort.current?.abort(); }, [finalizeKey]);
  const { result: previousResults, current: finalized, heading: resultsHeading, save: saveResults, clear: clearResults } = useGeneratedEqResults("tuning", finalizeKey, priorFinalizeKey);
  /** Tuning itself needs no agreement. Viewing the finished EQ or exporting it keeps the file, curve and settings for private research, so that step asks once. */
  async function finalizeCurve() { if (!sourceCurves.ready) return; if (localAutoEq) await runFinalize(); else await consent.ask(runFinalize); }
  async function runFinalize() {
    if (!measurement?.points?.length || finalizing) return;
    finalizeAbort.current?.abort(); const request = new AbortController(); finalizeAbort.current = request;
    setFinalizing(true); setFinalProgress(0);
    const curve = preferenceCurve;
    const variants: FinalizedVariant[] = [];
    try {
      variants.push(...await generateEqCandidates(measurement.points,curve,request.signal,setFinalProgress,measurement.type));
      if (!request.signal.aborted) saveResults(variants);
    } catch (error) { if (!request.signal.aborted) setMessage(error instanceof Error ? error.message : "Could not generate EQ filters."); }
    finally { if (finalizeAbort.current === request) setFinalizing(false); }
  }
  async function downloadText(filename: string, contents: string, type = "text/plain", variant?: FinalizedVariant) { if (!sourceCurves.ready) return; if (localAutoEq) await runDownload(filename, contents, type, variant); else await consent.ask(() => void runDownload(filename, contents, type, variant)); }
  async function runDownload(filename: string, contents: string, type = "text/plain", variant?: FinalizedVariant) {
    const exportKind = variant ? "eq" : filename === "original-target.csv" ? "original-target" : "preference-target";
    const format = filename.endsWith("-equalizerapo.txt") ? "equalizerapo" : filename.endsWith("-easyeffects.txt") ? "easyeffects" : filename.endsWith("-qudelix5k.txt") ? "qudelix5k" : variant ? "txt" : "csv";
    try {
      const adminTestOnly=!localAutoEq && await recordAdminTestIfNeeded("export",{targetName:target.name,exportKind,format,filename,contents,settings,curve:exportKind==="original-target"?normalized:preferenceCurve,variant});
      if(!adminTestOnly && !localAutoEq){
      const response = await fetch("/api/preference-exports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        targetId: target.id, targetName: target.name, targetCreator: target.creator, measurementName: variant ? measurement?.name : null,
        exportKind, format, filename, contents, settings, curve: exportKind === "original-target" ? normalized : preferenceCurve, variant,
      }) });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error || "Export could not be recorded.");
      }
      const url = URL.createObjectURL(new Blob([contents], { type }));
      const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(localAutoEq?"Downloaded on this device.":adminTestOnly?"Admin test download · saved locally; no official contribution was recorded.":"");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Export could not be recorded. Please try again."); }
  }
  /** Loudness trim (≤ 1) for one sound from the captured spectrum, or null while no reliable estimate exists. */
  const targetTrim = useCallback((rate: number, key: string) => {
    const estimate = loudnessEstimate.current;
    if (!matchLoudness || !estimate || estimate.rate !== rate || estimate.frames < LOUDNESS_MIN_FRAMES) return null;
    const trims = matchTrims(loudnessOptions.map(option => {
      const audible = audibleToneFilters(option.filters, true, rate);
      return optionLevel(estimate.bands, estimate.mean, audible, previewGain(audible, rate), rate);
    }));
    const index = loudnessOptions.findIndex(option => option.key === key);
    return trims && index >= 0 ? trims[index] : null;
  }, [matchLoudness, loudnessOptions]);
  /**
   * Sets the separate loudness-match gain. It only ever attenuates, and sits after the EQ output and before the volume control,
   * so headroom, play volume, the graph and exports are untouched. Switching sounds applies the trim at once; estimate updates glide.
   */
  const applyTrim = useCallback((current: AudioGraph, key: string, direct: boolean) => {
    const target = targetTrim(current.context.sampleRate, key);
    const next = Math.min(1, direct ? target ?? 1 : slewTrim(current.levelValue, target ?? 1));
    if (Math.abs(next - current.levelValue) > 1e-4) { safeGain(current.level, next, current.context.currentTime); current.levelValue = next; }
    return target;
  }, [targetTrim]);
  useEffect(() => {
    const current = graph.current;
    if (!current) return;
    const { context } = current;
    const next = audibleToneFilters(heardFilters, toneOn, context.sampleRate);
    const key = JSON.stringify(next);
    const apply = () => {
      if (graph.current !== current) return;
      if (key !== current.toneKey) {
        const gain = previewGain(next, context.sampleRate);
        current.tone = replaceEqStage(context, current.toneInput, current.toneOutput, next, current.tone);
        current.toneGain = gain;
        current.toneKey = key;
        current.toneChangedAt = performance.now();
      }
      safeGain(current.output, (current.fitReady || current.playbackInitialized) ? current.toneGain * 10 ** ((eqOn ? basePreamp : 0) / 20) : 0, context.currentTime);
      applyTrim(current, heardKey, !matchLoudness || current.levelKey !== heardKey || media.current?.paused !== false);
      current.levelKey = heardKey;
    };
    // Keep rapid drags from stacking several 30 ms crossfades.
    const wait = 40 - (performance.now() - current.toneChangedAt);
    if (eqOn && key !== current.toneKey && wait > 0) {
      const timer = setTimeout(apply, wait);
      return () => clearTimeout(timer);
    }
    apply();
  }, [heardFilters, heardKey, eqOn, toneOn, basePreamp, matchLoudness, applyTrim]);
  // A loudness estimate describes one track, one starting sound and one passage. Drop it when any of those change, and never reuse it.
  useEffect(() => {
    loudnessEstimate.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The estimate was discarded with its source.
    setLoudnessInfo(info => info.state === "pending" && info.cut === 0 ? info : { state: "pending", cut: 0 });
    const current = graph.current;
    // Nothing is audible while paused, so the trim can return to unity at once; during playback the sampler glides it back.
    if (current && media.current?.paused !== false && current.levelValue !== 1) { safeGain(current.level, 1, current.context.currentTime); current.levelValue = 1; }
  }, [audioUrl, soundMode, savedEq?.id, measurement?.id, normalized, fit, eqOn, loop, matchLoudness]);
  // While music plays with Match loudness on, sample the pre-tone spectrum four times a second and settle the trim.
  useEffect(() => {
    const current = graph.current;
    if (!matchLoudness || !playing || !current) return;
    const taps = current.taps;
    if (!taps?.length) { setLoudnessInfo(info => info.state === "unavailable" ? info : { state: "unavailable", cut: 0 }); return; }
    const rate = current.context.sampleRate;
    const frames = taps.map(tap => new Float32Array(tap.frequencyBinCount));
    const timer = window.setInterval(() => {
      if (graph.current !== current) return;
      let estimate = loudnessEstimate.current;
      if (!estimate || estimate.rate !== rate) {
        const bands = loudnessBands(rate, taps[0].fftSize);
        estimate = loudnessEstimate.current = { rate, bands, mean: new Float64Array(bands.hz.length), frame: new Float64Array(bands.hz.length), frames: 0, quiet: 0 };
      }
      const audio = media.current;
      if (audio && !audio.paused && !audio.seeking) {
        taps.forEach((tap, index) => tap.getFloatFrequencyData(frames[index]));
        // Silence, fades and unreadable audio are left out, so they cannot drag the estimate around.
        if (poolBandPowers(estimate.bands, frames, estimate.frame) >= SILENCE_POWER) { accumulateBandPowers(estimate.mean, estimate.frame, estimate.frames); estimate.frames++; estimate.quiet = 0; }
        else estimate.quiet++;
      }
      const target = applyTrim(current, heardKey, false);
      const state: LoudnessInfo["state"] = target !== null ? "ready" : estimate.quiet >= 32 ? "unavailable" : "pending";
      const cut = target !== null ? trimDb(current.levelValue) : 0;
      setLoudnessInfo(info => info.state === state && info.cut === cut ? info : { state, cut });
    }, 250);
    return () => window.clearInterval(timer);
  }, [matchLoudness, playing, analyser, heardKey, applyTrim]);
  const ensureGraph = useCallback(() => {
    if (graph.current) return graph.current;
    const context = new AudioContext();
    setPreviewRate(context.sampleRate);
    const input = context.createGain();
    const toneInput = context.createGain(), toneOutput = context.createGain();
    const activeFilters = audibleToneFilters(heardFilters, toneOn, context.sampleRate);
    const output = context.createGain();
    output.gain.value = 0;
    const fitStage = replaceEqStage(context, input, toneInput, []);
    const tone = replaceEqStage(context, toneInput, toneOutput, activeFilters);
    const balance = replaceEqStage(context, toneOutput, output, [], undefined, matchEnabled ? activeMatch : undefined);
    const spectrum = context.createAnalyser(); spectrum.fftSize = 8192; spectrum.smoothingTimeConstant = .78;
    const volumeGain = context.createGain(); volumeGain.gain.value = volume;
    // Loudness matching has its own gain after the EQ output and live spectrum, before volume. It stays at 1 unless matching turns a sound down.
    const level = context.createGain();
    output.connect(spectrum); spectrum.connect(level); level.connect(volumeGain); volumeGain.connect(context.destination);
    let taps: AnalyserNode[] | undefined;
    try {
      // One analyser per stereo channel on the starting sound, ending in a silent sink so every browser keeps them running.
      const splitter = context.createChannelSplitter(2), sink = context.createGain();
      sink.gain.value = 0; sink.connect(context.destination);
      toneInput.connect(splitter);
      taps = [0, 1].map(channel => {
        const tap = context.createAnalyser(); tap.fftSize = 8192; tap.smoothingTimeConstant = 0;
        splitter.connect(tap, channel); tap.connect(sink);
        return tap;
      });
    } catch { taps = undefined; }
    const stopInterruptions = watchAudioInterruptions(context, () => graph.current?.context === context ? media.current : null, () => {
      playbackIntent.current++; setPlaying(false); setMessage("Audio was interrupted. Press Play music to resume.");
    });
    const source = media.current ? context.createMediaElementSource(media.current) : undefined;
    source?.connect(input);
    graph.current = { context, input, level, levelValue: 1, levelKey: "", taps, toneInput, toneOutput, tone, toneKey: JSON.stringify(activeFilters), toneGain: previewGain(activeFilters, context.sampleRate), toneChangedAt: 0, fit: fitStage, balance, output, spectrum, stopInterruptions, volumeGain, media: source };
    setAnalyser(spectrum);
    return graph.current;
  }, [heardFilters, toneOn, volume, matchEnabled, activeMatch, setMessage]);
  useEffect(() => {
    const current = graph.current;
    if (!current) return;
    current.balance = replaceEqStage(current.context, current.toneOutput, current.output, [], current.balance, matchEnabled ? activeMatch : undefined);
  }, [matchEnabled, activeMatch]);
  const preparePreviewFit = useCallback(async (current: AudioGraph) => {
    const raw = measurement?.points;
    const key = JSON.stringify([soundMode, savedEq?.id, savedEq?.filters, savedEq?.preamp, raw, normalized, fitter, measurement?.type, current.context.sampleRate]);
    const apply = (baseFilters: AutoEqFit["filters"], preamp: number) => {
      const appliedKey = JSON.stringify([key, eqOn]);
      if (current.appliedFitKey !== appliedKey) {
        current.fit = replaceEqStage(current.context, current.input, current.toneInput, eqOn ? baseFilters : [], current.fit);
        current.appliedFitKey = appliedKey;
      }
      safeGain(current.output, current.toneGain * 10 ** ((eqOn ? preamp : 0) / 20), current.context.currentTime);
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
      current.fitPromise = fitAutoEqAsync({ raw, targets: [normalized], kind: "shootout", ...fitter, headphoneType: measurement?.type, sampleRate: current.context.sampleRate }, current.fitAbort.signal);
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
  }, [soundMode, savedEq, measurement, normalized, fitter, eqOn, setMessage]);
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
    if (!sourceCurves.ready) return;
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
      // After the track has ended, Play resumes at the loop instead of the top of the track.
      const passage = loopRef.current;
      if (passage && audio.ended) audio.currentTime = passage.start;
      await Promise.all([current.context.resume(), audio.play()]);
      if (intent !== playbackIntent.current || source !== sourceGeneration.current) return;
      setPlaying(!audio.paused); setMessage("");
    } catch { if (intent === playbackIntent.current && source === sourceGeneration.current) setMessage("Playback could not start. Choose another track or check browser audio permissions."); }
  }, [ensureGraph, setupDynamics, preparePreviewFit, measurement, normalized, soundMode, savedEq, fitter, setMessage, sourceCurves.ready]);
  function handleMediaPlay() {
    const current = graph.current, audio = media.current;
    if (!audio) return;
    if (!sourceCurves.ready) { audio.pause(); return; }
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
    // Resuming from the dock hands playback back to Tuning.
    if (!visible) for (const other of document.querySelectorAll("audio")) {
      if (other !== audio && !other.paused && !other.muted && other.volume > 0) other.pause();
    }
    setPlaying(true);
  }
  useEffect(() => {
    const audio = media.current;
    const edited = loopRef.current !== loop;
    loopRef.current = loop;
    if (!audio) return;
    // Whole-track loops use the media element, including tracks shorter than the minimum selection.
    audio.loop = !!loop && duration > 0 && loop.start === 0 && loop.end >= duration;
    if (!loop || audio.loop) { loopInside.current = false; return; }
    // Selecting a range that ends behind the playhead cues its start without starting playback.
    if (edited && !audio.seeking && audio.currentTime >= loop.end) {
      audio.currentTime = loop.start;
      setPosition(loop.start);
    }
    if (!playing) return;
    let last = audio.currentTime;
    const seeked = () => {
      last = audio.currentTime;
      loopInside.current = last >= loop.start && last < loop.end;
    };
    const check = () => {
      if (audio.paused || audio.seeking) return;
      const now = audio.currentTime;
      if (last < loop.end && now >= loop.end) {
        audio.currentTime = loop.start;
        setPosition(loop.start);
        last = loop.start;
      } else {
        loopInside.current = now >= loop.start && now < loop.end;
        last = now;
      }
    };
    seeked();
    audio.addEventListener("seeking", seeked);
    audio.addEventListener("seeked", seeked);
    const timer = window.setInterval(check, 25);
    return () => { window.clearInterval(timer); audio.removeEventListener("seeking", seeked); audio.removeEventListener("seeked", seeked); };
  }, [loop, duration, playing]);
  function toggleLoop() {
    if (loop) { setLoop(null); return; }
    const audio = media.current;
    setLoop(loopAt(audio?.currentTime ?? position, audio && Number.isFinite(audio.duration) ? audio.duration : duration));
  }
  function changeLoop(next: LoopPassage) { setLoop(boundedLoop(next, duration)); }
  /** Moves one loop bound to the playhead. If that would cross the other bound, the loop keeps its length and moves instead. */
  function loopBoundHere(bound: "start" | "end") {
    if (!loop) return;
    const now = media.current?.currentTime ?? position, length = loop.end - loop.start;
    if (bound === "start") changeLoop(now < loop.end - LOOP_MIN_SECONDS ? { start: now, end: loop.end } : { start: now, end: now + length });
    else changeLoop(now > loop.start + LOOP_MIN_SECONDS ? { start: loop.start, end: now } : { start: Math.max(0, now - length), end: Math.max(now, LOOP_MIN_SECONDS) });
  }
  function handleMediaEnded() {
    const passage = loopRef.current, audio = media.current;
    // The loop was playing and ran into the end of the track before the wrap could happen: continue it. Otherwise the track simply ends.
    // (Browsers report "pause" just before "ended", so this goes by when the loop was last heard playing.)
    if (passage && audio && passage.end >= audio.duration && loopInside.current) { audio.currentTime = passage.start; setPosition(passage.start); void play(); return; }
    setPlaying(false);
  }
  async function loadAudio(file: File | undefined) {
    if (!file) return;
    const generation = ++sourceGeneration.current; analysisRequest.current?.abort();
    loopRef.current = null;
    if (media.current) media.current.loop = false;
    setLoop(null);
    stop(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(file);
    if (media.current) { try { ensureGraph(); } catch { /* Play reports unsupported audio initialization. */ } media.current.src = objectUrl.current; media.current.load(); }
    setTrackError("");
    setAudioUrl(objectUrl.current); setAudioName(file.name); setAudioAnalysis(null);
    setPosition(0); setDuration(0); setWaveZoom(1); setMessage("Track ready. Press Play music to hear changes live.");
    void analyzeTrack(file).then(result => { if (generation === sourceGeneration.current) setAudioAnalysis(result); }).catch(() => { if (generation === sourceGeneration.current) setMessage("Track ready; source waveform analysis is unavailable for this format."); });
  }
  function loadCurated(index: number, autoPlay = false) {
    const track = curatedMusic[index]; if (!track) return;
    const generation = ++sourceGeneration.current; analysisRequest.current?.abort();
    const controller = new AbortController(); analysisRequest.current = controller;
    lastCuratedIndex.current = index;
    loopRef.current = null;
    if (media.current) media.current.loop = false;
    setLoop(null);
    stop(); if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = ""; }
    if (media.current) { try { ensureGraph(); } catch { /* Play reports unsupported audio initialization. */ } media.current.src = track.fileUrl; media.current.load(); }
    setTrackError("");
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
  function beginGesture() { lastWheelEdit.current = null; if (!gestureRef.current) gestureRef.current = editRef.current; }
  function endGesture() { const start = gestureRef.current; gestureRef.current = null; if (start && !sameEdit(start, editRef.current)) { setPast(rows => [...rows, start]); setFuture([]); } }
  function finishSliderPointer() { requestAnimationFrame(endGesture); }
  function set<K extends keyof Settings>(key: K, value: Settings[K]) { applyEdit({ ...editRef.current, settings: { ...editRef.current.settings, [key]: value } }); }
  function changeFilterType(key: GainKey, type: FilterType) {
    const settings = editRef.current.settings;
    const qKey = `${key}Q` as const;
    applyEdit({ ...editRef.current, settings: { ...settings, [`${key}Type`]: type, [qKey]: boundedQ(settings[qKey], type) } });
  }
  function changeFocusedFilter(filter: FocusedFilter) {
    const current = editRef.current;
    const existing = current.settings.focused.find(item => item.hz === filter.hz);
    if (!existing && filter.gain !== 0 && current.settings.focused.length >= FOCUSED_FILTER_LIMIT) return;
    const focused = current.settings.focused.filter(item => item.hz !== filter.hz);
    if (filter.gain !== 0) focused.push(filter);
    else if (selectedFocusHz === filter.hz) setSelectedFocusHz(null);
    focused.sort((a, b) => a.hz - b.hz);
    applyEdit({ ...current, settings: { ...current.settings, focused } });
  }
  function toggleExpanded() {
    const next = !editRef.current.expanded;
    const limited = { ...editRef.current.settings };
    if (!next) for (const control of GAIN_CONTROLS) limited[control.key] = Math.max(-control.limit, Math.min(control.limit, limited[control.key]));
    if (!next) limited.focused = limited.focused.map(filter => ({ ...filter, gain: Math.max(-12, Math.min(12, filter.gain)) }));
    applyEdit({ ...editRef.current, expanded: next, settings: limited });
  }
  function changeTarget(id: string) { hadSavedSelection.current = true; applyEdit({ ...editRef.current, selected: id }); }
  function storeSnapshots(rows: TuningSnapshot[]) {
    if (!snapshotScope) return;
    setSnapshotState({ scope: snapshotScope, rows });
    try { writeSnapshots(snapshotScope, rows); }
    catch { setStorageNotice("Browser storage is unavailable. Snapshots work in this tab only; they will not be saved when you leave."); }
  }
  const noteSnapshot = (text: string) => setSnapshotNote({ scope: snapshotScope, text });
  /** Saves the live tuning into a slot, replacing what was there. The live draft and its undo history are untouched. */
  function saveSnapshot(slot: SlotId) {
    const existing = snapshots.find(row => row.slot === slot);
    storeSnapshots([...snapshots.filter(row => row.slot !== slot), { slot, name: existing?.name ?? `Snapshot ${slot}`, settings: cloneSettings(editRef.current.settings) }].sort((a, b) => a.slot.localeCompare(b.slot)));
    // A new snapshot opens its row with the name field ready, so naming is offered at once and never required.
    if (!existing) { setSnapshotsOpen(true); setNamingSlot(slot); }
    noteSnapshot(existing ? `Replaced snapshot ${slot} with your current tuning.` : `Saved your current tuning as snapshot ${slot}. Type a name for it, or keep “Snapshot ${slot}”.`);
  }
  function renameSnapshot(slot: SlotId, name: string) {
    const next = snapshotName(name, slot);
    if (snapshots.some(row => row.slot === slot && row.name !== next)) { storeSnapshots(snapshots.map(row => row.slot === slot ? { ...row, name: next } : row)); noteSnapshot(`Snapshot ${slot} is now named “${next}”.`); }
  }
  function removeSnapshot(slot: SlotId) {
    if (audition.key === slot) setAudition(LIVE_AUDITION);
    if (namingSlot === slot) setNamingSlot(null);
    storeSnapshots(snapshots.filter(row => row.slot !== slot));
    noteSnapshot(`Removed snapshot ${slot}. Its slot is free again.`);
    // The pressed button is gone with its row, so keyboard focus moves to the nearest snapshot control.
    requestAnimationFrame(() => snapshotGroup.current?.querySelector<HTMLElement>(".pt-snapshot-save, .pt-slot")?.focus({ preventScroll: true }));
  }
  /** Copies a snapshot into the live tuning as one undoable step, widening the gain range only if the snapshot needs it. */
  function applySnapshot(row: TuningSnapshot) {
    endGesture();
    const current = editRef.current;
    const wide = GAIN_CONTROLS.some(control => Math.abs(row.settings[control.key]) > control.limit) || row.settings.focused.some(filter => Math.abs(filter.gain) > 12);
    applyEdit({ ...current, settings: cloneSettings(row.settings), expanded: current.expanded || wide });
    setAudition(LIVE_AUDITION);
    noteSnapshot(`Applied snapshot ${row.slot} to your tuning. Undo brings back the previous tuning.`);
  }
  // Focus the name of a snapshot that was just saved.
  useEffect(() => {
    if (!namingSlot) return;
    const field = document.getElementById(`pt-snapshot-name-${namingSlot}`);
    if (field instanceof HTMLInputElement) { field.focus({ preventScroll: true }); field.select(); }
  }, [namingSlot]);
  function openInstructions(topic: GuideTopic | null, opener: HTMLElement | null) {
    instructionsOpener.current = opener;
    setGuideTopic(topic);
    setInstructionsOpen(true);
  }
  function closeInstructions() {
    setInstructionsOpen(false);
    const opener = instructionsOpener.current;
    instructionsOpener.current = null;
    (opener?.isConnected ? opener : instructionsButton.current)?.focus();
  }
  function chooseAnotherTrack() {
    setMusicOpen(true);
    requestAnimationFrame(() => musicChooser.current?.querySelector<HTMLElement>(curatedMusic.length ? "input[role=combobox]" : "input[type=file]")?.focus());
  }
  function togglePlayer() {
    // Collapsing must not leave keyboard focus inside the part being hidden. Playback is not touched either way.
    if (playerOpen) playerToggle.current?.focus({ preventScroll: true });
    setPlayerOpen(open => !open);
  }
  const listenTo = (key: Audition["key"]) => setAudition(key === "live" ? LIVE_AUDITION : { key, scope: snapshotScope });
  const undo = useCallback(() => { if (!past.length) return; const previous = past[past.length - 1]; setPast(past.slice(0, -1)); setFuture([editRef.current, ...future]); showEdit(previous); }, [past, future, showEdit]);
  const redo = useCallback(() => { if (!future.length) return; const next = future[0]; setPast([...past, editRef.current]); setFuture(future.slice(1)); showEdit(next); }, [past, future, showEdit]);
  function closeReset() { setResetOpen(false); resetButton.current?.focus(); }
  function confirmReset() {
    gestureRef.current = null;
    setPast([]); setFuture([]);
    showEdit({ settings: defaults, selected: curatedLeader?.id || "flat", expanded: false });
    setAxis(defaultAxis); setActiveBand(3); setSelectedGraphBand(null); setSelectedFocusHz(null); setBypass(false); finalizeAbort.current?.abort(); clearResults();
    setMessage("Tuning reset. Undo and redo history cleared.");
    closeReset();
  }
  // Tuning's page-wide shortcuts are off while another page is showing.
  useEffect(() => { if (!visible) return; const keydown = (event: KeyboardEvent) => { if (resetOpen || instructionsOpen) return; if (!(event.ctrlKey || event.metaKey) || event.altKey) return; const target = event.target; if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement && ["text", "search", "url"].includes(target.type)) return; if (event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); } else if (event.key.toLowerCase() === "y") { event.preventDefault(); redo(); } }; window.addEventListener("keydown", keydown); return () => window.removeEventListener("keydown", keydown); }, [undo, redo, resetOpen, instructionsOpen, visible]);
  const shortcutContext = usePlaybackShortcutContext(".pt-listen");
  useEffect(() => {
    if (!visible || !audioUrl || resetOpen || instructionsOpen) return;
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
  }, [visible, audioUrl, resetOpen, instructionsOpen, play, shortcutContext]);
  useEffect(() => {
    if (!resetOpen || !visible) return;
    resetNoButton.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") closeReset(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [resetOpen, visible]);
  useEffect(() => {
    if (!instructionsOpen || !visible) return;
    instructionsClose.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") closeInstructions(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [instructionsOpen, visible]);
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
    setSelectedGraphBand(null);
    setSelectedFocusHz(null);
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
      saveLibraryEq(eq); chooseSavedEq(eq.id); setMessage(`Saved a new EQ to ${PERSONAL_AREA_TITLE}. The original EQ is unchanged.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save this EQ."); }
  }
  function selectBand(index: number) {
    setActiveBand(index);
    setSelectedGraphBand(GAIN_CONTROLS[index].key);
    setSelectedFocusHz(null);
  }
  function selectFocusedFilter(hz: number | null) {
    setSelectedFocusHz(hz);
    if (hz !== null) setSelectedGraphBand(null);
  }
  function commitPlacement(key: PlacementKey, value: number) {
    const placement = PLACEMENTS[key];
    if (!Number.isFinite(value) || value < placement.min || value > placement.max) return;
    set(key, Math.round(value / placement.step) * placement.step);
  }
  const focusedGainLimit = expanded ? EXPANDED_GAIN_LIMIT : 12;
  const focusedFull = settings.focused.length >= FOCUSED_FILTER_LIMIT;
  function addFocusedFilter() {
    const hz = Math.round(Number(newFocus.hz)), gain = Number(newFocus.gain), q = Number(newFocus.q);
    if (!newFocus.hz.trim() || ![hz, gain, q].every(Number.isFinite) || hz < 20 || hz > 20000) return;
    if (gain === 0) { setMessage("Enter a gain other than 0 dB. Negative values cut; positive values boost."); return; }
    if (focusedFull && !editRef.current.settings.focused.some(filter => filter.hz === hz)) return;
    changeFocusedFilter({ hz, gain: Math.max(-focusedGainLimit, Math.min(focusedGainLimit, gain)), q: boundedQ(q, "PK") });
    selectFocusedFilter(hz);
    setNewFocus(current => ({ ...current, hz: "" })); setMessage("");
  }
  function moveFocusedFilter(filter: FocusedFilter, value: number) {
    if (!Number.isFinite(value)) return;
    const hz = Math.round(Math.max(20, Math.min(20000, value)));
    const current = editRef.current;
    if (hz === filter.hz) return;
    if (current.settings.focused.some(item => item.hz === hz)) { setMessage(`There is already a narrow correction at ${hz} Hz.`); return; }
    const focused = current.settings.focused.map(item => item.hz === filter.hz ? { ...item, hz } : item).sort((a, b) => a.hz - b.hz);
    selectFocusedFilter(hz);
    applyEdit({ ...current, settings: { ...current.settings, focused } });
  }
  // Links to #tuning-headphones or #saved-eq-listening, from this page or another, open the chooser or the full Playback controls they point at.
  // Client navigation raises no hashchange, so the hash is also read each time Tuning is entered or its route changes.
  useEffect(() => {
    if (!visible) return;
    const openFromHash = () => {
      if (window.location.hash === "#saved-eq-listening") {
        setPlayerOpen(true);
        requestAnimationFrame(() => document.getElementById("saved-eq-listening")?.scrollIntoView({ block: "start" }));
        return;
      }
      if (window.location.hash !== "#tuning-headphones") return;
      setSetupOpen(true);
      // The section may have been hidden or not yet loaded when the browser tried to scroll to it.
      requestAnimationFrame(() => document.getElementById("tuning-headphones")?.scrollIntoView({ block: "start" }));
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [visible, route]);
  function openSetup(focusSearch = false) {
    setSetupOpen(true);
    requestAnimationFrame(() => {
      document.getElementById("tuning-headphones")?.scrollIntoView({ block: focusSearch ? "center" : "start" });
      if (focusSearch) document.querySelector<HTMLInputElement>('.pt-headphones input[type="search"]')?.focus({ preventScroll: true });
    });
  }
  const setupHeadphones = measurement?.name || (soundMode === "saved" ? savedEq?.headphone : undefined);
  const setupSoundMissing = soundMode === "saved" && !savedEq;
  /** What tuning needs before it can start: headphones for a target, or a saved EQ (which stands alone, linked measurement or not). */
  const setupMissing = soundMode === "saved" ? !savedEq : !measurement;
  // Open the chooser once after loading when that selection is missing, and again whenever it is cleared; close it when it is completed.
  // It reacts only to the selection changing, so Close and Change keep working by hand, and other renders never reopen it.
  useEffect(() => {
    if (!axisLoaded) return;
    const before = setupMissingSeen.current;
    setupMissingSeen.current = setupMissing;
    if (before === setupMissing) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Follow a selection that storage or the chooser just changed.
    if (setupMissing) setSetupOpen(true);
    else if (before === true) {
      // Hiding the panel must not drop keyboard focus onto the page; nothing else moves focus.
      if (document.activeElement?.closest("#pt-sound-body")) soundBar.current?.focus({ preventScroll: true });
      setSetupOpen(false);
    }
  }, [axisLoaded, setupMissing]);
  const editLocked = !!auditionSlot;
  const loopLeast = duration > 0 ? Math.min(LOOP_MIN_SECONDS, duration) : LOOP_MIN_SECONDS;
  const loudnessStatus = !matchLoudness ? "" : !eqOn ? "Nothing to match while EQ is off"
    : loudnessInfo.state === "unavailable" ? "Can’t estimate from this track · levels unchanged"
    : loudnessInfo.state === "ready" ? `Estimated from this track${loudnessInfo.cut < 0 ? ` · this sound ${loudnessInfo.cut} dB` : ""}`
    : playing ? "Listening to estimate…" : "Play music to estimate";
  const heardLabel = comparing ? "Starting sound" : auditionSlot ? `Snapshot ${auditionSlot.slot}${auditionSlot.name === `Snapshot ${auditionSlot.slot}` ? "" : ` “${auditionSlot.name}”`}` : "Your tuning";
  const freeSlot = SLOT_IDS.find(slot => !snapshots.some(row => row.slot === slot));
  const fitStatus = soundMode === "saved" ? `Stored EQ · ${savedEq?.source || "original coefficients"}` : `${fitterLabel(fitter)}${preparingEq ? " · preparing replacement; current sound continues" : fit?.fallbackReason ? " · original fitter fallback" : ""}`;
  const otherToneGains = !allTones && GAIN_CONTROLS.some(control => !PRIMARY_TONES.includes(control.key) && settings[control.key] !== 0);
  const activeToneVisible = allTones || PRIMARY_TONES.includes(GAIN_CONTROLS[activeBand].key);
  // While a snapshot plays, the editor is paused so it is never unclear which sound an edit would change.
  const controlsDisabled = (soundMode === "saved" && !savedEq) || editLocked;
  function downloadMatch(format: "txt" | "wav") {
    if (!activeMatch) return;
    try {
      downloadChannelMatch(activeMatch, matchHeadphone || "headphones", format);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not download the channel match.");
    }
  }
  const selectedCuratedIndex = curatedMusic.findIndex(track => track.fileUrl === audioUrl);
  const historyControls = (label: string) => <div className="pt-history" role="group" aria-label={label}><button type="button" disabled={!past.length} onClick={undo} title="Undo (Ctrl/⌘ Z)"><Undo2 size={16}/> Undo {past.length > 0 && <span>{past.length}</span>}</button><button type="button" disabled={!future.length} onClick={redo} title="Redo (Ctrl/⌘ Shift Z)"><Redo2 size={16}/> Redo {future.length > 0 && <span>{future.length}</span>}</button><button type="button" className="pt-reset" aria-haspopup="dialog" aria-expanded={resetOpen} onClick={event => { resetButton.current = event.currentTarget; setResetOpen(true); }}><RotateCcw size={16}/> Reset</button></div>;
  function seekPlayback(seconds: number) {
    if (media.current) media.current.currentTime = seconds;
    setPosition(seconds);
  }
  const trackSource = audioUrl.startsWith("blob:") ? "File on your device" : audioUrl ? "Music library" : "";
  const trackShare = (seconds: number) => duration > 0 ? `${Math.max(0, Math.min(100, seconds / duration * 100)).toFixed(2)}%` : "0%";
  /** The compact scrubber paints its own progress and the loop passage from these values. */
  const scrubStyle = { "--pt-progress": trackShare(position), "--pt-loop-from": trackShare(loop?.start ?? 0), "--pt-loop-to": trackShare(loop?.end ?? 0) } as import("react").CSSProperties;
  const playerNote = trackError ? trackError
    : !audioUrl ? curatedMusic.length ? "" : "Use Choose music to play an audio file or folder from your device."
    : preparingEq ? playing ? "Preparing the new headphone EQ. The current sound keeps playing." : "Preparing headphone EQ. Play is ready in a moment."
    : duration > 0 ? "" : "Loading track…";
  const channelMatchOn = !!activeMatch && matchEnabled;
  const bypassLabel = channelMatchOn ? "EQ off" : "EQ off · original sound";
  const listenNote = <p className="pt-listen-note" role="status" data-comparing={comparing || editLocked}>{!eqAvailable ? "Choose a saved EQ to hear and tune it." : !eqOn ? (channelMatchOn ? "EQ is off. Channel match is on." : "EQ is off. You’re hearing the original sound.") : comparing ? "Hearing the starting sound. Your changes are paused." : auditionSlot ? `Hearing ${heardLabel}. Editing is paused; your tuning is unchanged.` : tweaksChanged ? "Hearing your tuning. Switch to Starting sound to compare." : snapshots.length ? "No changes yet. Move a slider or drag the graph, or listen to a snapshot." : "No changes yet. Move a slider or drag the graph, then compare."}</p>;
  /** A track from the device has no library entry, so both song searches stay empty and the strip names the file instead. */
  const localTrack = !!audioUrl && selectedCuratedIndex < 0;
  const audioFileTypes = "audio/*,.wav,.mp3,.flac,.m4a,.ogg,.opus";
  const musicChoices = <div className="pt-music">
    <div className="pt-music-toolbar">
      <button type="button" className="pt-btn pt-music-toggle" aria-expanded={musicOpen} aria-controls="pt-music-choices" onClick={() => setMusicOpen(open => !open)}>Choose music<ChevronDown size={14} aria-hidden="true"/></button>
      <button type="button" className="pt-btn" disabled={!axisLoaded || (!playing && preparingEq) || !curatedMusic.length} onClick={playRandomCurated} title="Load and play a random song from the music library"><Shuffle size={14} aria-hidden="true"/>Random song</button>
    </div>
    <div className="pt-music-choices" id="pt-music-choices" ref={musicChooser} hidden={!musicOpen}>{musicOpen && <>
      {curatedMusic.length > 0 && <div className="pt-full-group">
        <h4>Music library</h4>
        <div className="pt-music-search" role="group" aria-label="Song search in Music"><MusicTrackPicker tracks={curatedMusic} selectedIndex={selectedCuratedIndex} onSelect={index => loadCurated(index)}/></div>
      </div>}
      <div className="pt-full-group" role="group" aria-labelledby="pt-device-music">
        <h4 id="pt-device-music">From your device</h4>
        <div className="pt-music-actions">
          <label className="pt-btn pt-file-btn"><FileAudio size={14} aria-hidden="true"/>Audio file<input type="file" accept={audioFileTypes} onChange={e => void loadAudio(e.target.files?.[0])}/></label>
          <label className="pt-btn pt-file-btn"><FolderOpen size={14} aria-hidden="true"/>Music folder<input type="file" accept={audioFileTypes} multiple {...{ webkitdirectory: "" }} onChange={e => { const files = Array.from(e.target.files || []).filter(file => /\.(mp3|m4a|flac|wav|ogg|opus|aac)$/i.test(file.name)); setQueue(files); if (files[0]) void loadAudio(files[0]); }}/></label>
        </div>
        {queue.length > 0 && <div className="pt-music-actions pt-music-folder">
          <button type="button" className="pt-btn" onClick={shuffleFolder}><Shuffle size={14} aria-hidden="true"/>Shuffle folder</button>
          <select aria-label="Choose a track from the folder" value="" onChange={e => e.target.value === "shuffle" ? shuffleFolder() : void loadAudio(queue[Number(e.target.value)])}><option value="" disabled hidden>{queue.length} folder tracks</option><option value="shuffle">↝ Shuffle folder tracks</option>{queue.map((file, index) => <option key={index} value={index}>{file.name}</option>)}</select>
        </div>}
        <p className="pt-full-hint">Files play in this browser and stay on your device.</p>
      </div>
    </>}</div>
  </div>;
  const volumePercent = Math.round(volume * 100);
  const dynamicsChanged = Math.abs(dynamicRange) >= .0001;
  /** Time, volume and dynamics in one row directly under the waveform. Volume drives the same Web Audio gain as before. */
  const waveBar = <div className="pt-wave-bar">
    {audioUrl && <div className="pt-wave-clock"><PlaybackTime position={position} duration={duration}/></div>}
    <label className="pt-vol" title="Volume"><Volume2 size={15} aria-hidden="true"/><span className="pt-visually-hidden">Volume</span><input type="range" aria-label="Volume" min={0} max={1} step={.01} value={volume} aria-valuetext={`${volumePercent} percent`} style={{ "--pt-level": `${volumePercent}%` } as import("react").CSSProperties} onChange={event => setVolume(Number(event.target.value))}/><output aria-hidden="true">{volumePercent}%</output></label>
    <div className="pt-wave-dynamics" role="group" aria-label="Dynamics">
      <button type="button" className="pt-chip-toggle" aria-label="Toggle Dynamic Range Compression/Expansion slider" aria-pressed={dynamicSliderEnabled} disabled={!dynamicsReady || !duration} onClick={() => setDynamicSliderEnabled(value => !value)} title="Adjust the difference between quiet and loud moments"><AudioLines size={14} aria-hidden="true"/>Dynamics</button>
      {dynamicsChanged && <button type="button" className="pt-chip-toggle pt-chip-reset" aria-label="Reset track dynamics" title="Back to the original dynamics (0%)" disabled={!dynamicsReady} onClick={() => updateDynamicRange(0)}><RotateCcw size={13} aria-hidden="true"/>Reset · {dynamicRange > 0 ? "+" : ""}{Math.round(dynamicRange * 100)}%</button>}
    </div>
  </div>;
  const dockNotice = message && message !== awayMessage ? message : "";
  const dockSound = !eqOn ? bypassLabel : heardLabel;
  return <><main ref={shell} className="pt-shell alpha-tuning" hidden={!visible}>
    {storageNotice && <p role="status" className="pt-message">{storageNotice}</p>}
    <header className="pt-top"><Link href="/home" prefetch={false} className="pt-brand" aria-label="YinYang EQ home"><span className="pt-brand-mark" aria-hidden="true"/><span>YinYang <em>EQ</em></span></Link><nav aria-label="Main navigation"><Link href="/" prefetch={false}>Home</Link><Link href="/shootout" prefetch={false}>Listen</Link><Link href="/music-library" prefetch={false}>Music library</Link><span aria-current="page">Preference Tuning</span></nav></header>
    <div className="pt-content">
      <div className="pt-heading"><div><div className="pt-eyebrow">PREFERENCE TUNING LAB</div><div className="pt-title-row"><h1>Shape the sound you want.</h1></div></div><div className="pt-header-actions"><button ref={instructionsButton} type="button" className="pt-instructions-button" aria-haspopup="dialog" aria-expanded={instructionsOpen} title="A first pass, then a guide to every control on this page" onClick={event => openInstructions(null, event.currentTarget)}><BookOpen size={16} aria-hidden="true"/> Instructions</button></div></div>
      <div className="pt-workbench">
        <section className="pt-sound-setup" id="tuning-headphones" aria-label="Headphones and starting sound">
          <button ref={soundBar} type="button" className="pt-sound-bar" aria-expanded={setupOpen} aria-controls="pt-sound-body" onClick={() => setSetupOpen(open => !open)}>
            <span className="pt-sound-item" data-empty={!setupHeadphones}><small>Headphones</small><strong>{setupHeadphones || (soundMode === "saved" && savedEq ? "Not linked" : "None chosen")}</strong></span>
            <span className="pt-sound-item" data-empty={setupSoundMissing}><small>{soundMode === "saved" ? "Saved EQ" : "Target"}</small><strong>{soundMode === "saved" ? savedEq?.name || "None chosen" : target.name}</strong></span>
            <span className="pt-sound-action">{setupOpen ? "Close" : setupMissing ? "Choose" : "Change"}<ChevronDown size={14} aria-hidden="true"/></span>
          </button>
          <AutoEqCurveStatus {...sourceCurves}/>
          <div className="pt-sound-body" id="pt-sound-body" hidden={!setupOpen}><SoundSetup mode={soundMode} onMode={changeSoundMode} presets={presets} presetId={presetId} onPreset={chooseSavedEq}
            headphones={<div className="shootout-content pt-headphones"><HeadphonePicker rows={measurements} selectedId={measurementId} headphoneType={headphoneType} onType={type => { setHeadphoneType(type); clearMeasurement(); }} onSelect={chooseMeasurement} onClear={clearMeasurement} onImport={importMeasurement} onUpload={() => { setEditId(null); setManagerOpen(true); }} onEdit={id => { setEditId(id); setManagerOpen(true); }} onDelete={deleteMeasurement} responsiveUploadLabel/></div>}
            target={<><div><label>Find a target<input type="search" value={targetQuery} onChange={event => setTargetQuery(event.currentTarget.value)} placeholder="Search names and sources"/></label><label className="pt-visually-hidden" htmlFor="tuning-target">Target curve</label><div className="sound-source-actions"><select id="tuning-target" aria-label="Target curve" value={selected} onChange={event => changeTarget(event.target.value)}>{targetQuery && !shownTargetOptions.some(row => row.id === selected) && <option value={selected}>{target.name} · selected</option>}{shownTargetOptions.map(row => <option key={row.id} value={row.id}>{row.name} · {isLocalAutoEqTarget(row.id) ? "private copy · " : ""}{row.creator}</option>)}{!shownTargetOptions.length && <option disabled>No matching targets</option>}</select><label className="pt-import" title="Import a target CSV or TXT"><Upload size={15}/><span>Import</span><input type="file" accept=".csv,.txt,text/plain,text/csv" onChange={event => void loadCurve(event.target.files?.[0])}/></label></div><a href="/curve-credits#autoeq-library">AutoEq sources and credits</a></div><p>{measurement ? `Fitted for ${measurement.name}.` : "Choose your headphones to hear this target applied to their measurement."}</p></>}>
            {soundMode === "saved" && savedEq && !measurement && <p className="sound-state">{savedEq.measurementId ? "The linked headphone measurement is unavailable in this browser. Saved filters still work; raw and predicted headphone overlays need that measurement." : "This EQ has no linked headphone measurement. Saved filters still work; headphone response overlays are unavailable."}</p>}
          </SoundSetup></div>
          {managerOpen && <div className="pt-manager"><button type="button" className="pt-reset" onClick={() => setManagerOpen(false)}>Close measurement editor</button><div className="shootout-content"><MeasurementManager key={editId || "new"} rows={measurements} selectedId={measurementId} editId={editId} onAdd={row => { addMeasurement(row); setManagerOpen(false); }} onUpdate={row => { saveMeasurements(measurements.map(item => item.id === row.id ? row : item)); setManagerOpen(false); }} onDelete={deleteMeasurement} onSelect={chooseMeasurement}/></div></div>}
        </section>
        <section className="pt-chart-card" id="tuning-curve"><div className="pt-card-heading">
            <div className="pt-card-title">
              <h2>Tune by ear</h2>
            </div>
            <div className="pt-chart-meta">
              <button type="button" className="pt-axis-button" title="Graph display" aria-expanded={axisOpen} aria-controls="pt-axis-panel" onClick={() => setAxisOpen(open => !open)}><SlidersHorizontal size={13} aria-hidden="true"/><span>Graph display</span></button>
            </div>
          </div>
                    {axisOpen && <div className="pt-axis-panel" id="pt-axis-panel" aria-label="Chart axis and size controls"><div className="pt-axis-fields"><label>Frequency start <span>Hz</span><input type="number" min="20" max="10000" step="10" value={axis.freqMin} onChange={e => setAxis(current => ({ ...current, freqMin: Math.min(current.freqMax / 1.25, Math.max(20, Number(e.target.value) || 20)) }))}/></label><label>Frequency end <span>Hz</span><input type="number" min="40" max={MAX_VIEW_HZ} step="10" value={axis.freqMax} onChange={e => setAxis(current => ({ ...current, freqMax: Math.max(current.freqMin * 1.25, Math.min(MAX_VIEW_HZ, Number(e.target.value) || defaultAxis.freqMax)) }))}/></label><label>Bottom <span>dB</span><input type="number" min="-20" max="110" step="1" value={axis.dbMin} disabled={axis.autoDb} onChange={e => setAxis(current => ({ ...current, dbMin: Math.min(current.dbMax - 5, Math.max(-20, Number(e.target.value) || 0)) }))}/></label><label>Top <span>dB</span><input type="number" min="-10" max="120" step="1" value={axis.dbMax} disabled={axis.autoDb} onChange={e => setAxis(current => ({ ...current, dbMax: Math.max(current.dbMin + 5, Math.min(120, Number(e.target.value) || 90)) }))}/></label><label>Width <span>%</span><input type="number" min="65" max="100" step="1" value={axis.width} onChange={e => setAxis(current => ({ ...current, width: Math.max(65, Math.min(100, Number(e.target.value) || 100)) }))}/></label><label>Height · 0 = auto <span>px</span><input type="number" min="0" max="520" step="10" value={axis.height} onChange={e => setAxis(current => ({ ...current, height: Math.max(0, Math.min(520, Number(e.target.value) || 0)) }))}/></label></div><div className="pt-axis-actions"><label><input type="checkbox" checked={axis.autoDb} onChange={e => setAxis(current => ({ ...current, autoDb: e.target.checked }))}/> Auto-fit dB to curve</label><label className="pt-range-toggle" title="Allow every gain to reach ±20 dB"><input type="checkbox" checked={expanded} disabled={editLocked} onChange={toggleExpanded}/> ±20 dB range</label><button type="button" onClick={() => setAxis(defaultAxis)}>Reset view</button></div></div>}
          <div className="pt-workspace">
          <CurveChart mode={view} points={normalized} curveBase={soundMode === "saved" ? responsePlot.base : undefined} overlays={responseOverlays} saved={soundMode === "saved"} editable={(soundMode === "target" || !!savedEq) && !editLocked} idleNote={editLocked ? `Editing is paused while ${heardLabel} plays` : undefined} settings={settings} expanded={expanded} axis={axis} sampleRate={previewRate} fitterControls={<div className="pt-fitter-row"><p className="pt-fit-status" role="status" title={fitStatus}>{fitStatus}</p>{soundMode === "saved" ? <details className="fitter-controls"><summary>Advanced EQ settings</summary><div className="fitter-panel"><p>Stored base EQ · {savedEq?.fitter ? fitterLabel(savedEq.fitter) : "fitter unrecorded"} · {savedEq?.filters.length ?? 0} stored filters{tweaksChanged ? " + tuning adjustments" : ""}</p></div></details> : <FitterControls advanced value={fitter} defaultValue={defaultFitter} onChange={setFitter} onDefault={saveDefault} notice={fitterNotice}/>}</div>} analyser={analyser} playing={playing && visible} onBandSelect={setActiveBand} selectedGraphBand={selectedGraphBand} selectedFocusHz={selectedFocusHz} onFocusSelection={selectFocusedFilter} onGraphBandChange={setSelectedGraphBand} onWheelQ={adjustQFromWheel} onFocusedChange={changeFocusedFilter} onDragStart={beginGesture} onDrag={(key,value) => { set(key,value); const index = GAIN_CONTROLS.findIndex(control => control.key === key); if (index >= 0) setActiveBand(index); }} onDragEnd={endGesture}/>
          <aside className="pt-panel" aria-label="Tuning controls">
            <section className="pt-panel-block pt-panel-listen" aria-label="Listen and compare">
              {/* One Playback card: a thin strip that expands in place. The audio element is a fixed child of the card, outside the expanding part. */}
              <div className={`pt-listen pt-unified-player pt-playback-card${playing ? " is-playing" : ""}`} id="saved-eq-listening" role="group" aria-label="Playback" data-expanded={playerOpen}>
              <div className={`pt-strip${playing ? " is-playing" : ""}`}>
                <button type="button" className="deck-play" aria-label={playing ? "Pause music" : "Play music"} disabled={!axisLoaded || (!playing && preparingEq) || (!audioUrl && !curatedMusic.length)} title={playing ? "Pause music" : audioUrl ? "Play music" : "Play music · starts a random library song"} onClick={() => { if (!audioUrl) playRandomCurated(); else if (media.current?.paused) void play(); else stop(); }}/>
                {/* A full song search in both states of the card. It shares the loaded track with the search in Music; only the typed text is its own. */}
                <div className="pt-strip-search" role="group" aria-label="Song search beside Play"><MusicTrackPicker tracks={curatedMusic} selectedIndex={selectedCuratedIndex} onSelect={index => loadCurated(index)}/></div>
                {localTrack && !playerOpen && <p className="pt-strip-now" title={`${audioName} · ${trackSource}`}><FileAudio size={13} aria-hidden="true"/><span>{audioName}</span><small>{trackSource}</small></p>}
                {!playerOpen && <div className="pt-strip-seek">
                  <input className="pt-scrub" type="range" min={0} max={duration > 0 ? duration : 1} step={.1} value={duration > 0 ? Math.min(position, duration) : 0} disabled={!audioUrl || !(duration > 0)} aria-label="Seek in track" aria-valuetext={duration > 0 ? `${playbackClock(position)} of ${playbackClock(duration)}` : "No track loaded"} style={scrubStyle} onChange={event => seekPlayback(Number(event.target.value))}/>
                  <span className="pt-strip-time">{!audioUrl ? "No track" : duration > 0 ? `${playbackClock(position)} / ${playbackClock(duration)}` : "–:–– / –:––"}</span>
                </div>}
              </div>
              <div className="pt-full" id="pt-playback-full" role="group" aria-label="Waveform and level" hidden={!playerOpen}>{playerOpen && <>
                {audioUrl ? <div className={`pt-playback-deck${playing ? " is-playing" : ""}`}>
                  <TrackWaveform playing={playing && visible} getPlaybackPosition={()=>media.current?.currentTime??position} compact hideZoom zoom={waveZoom} onZoom={setWaveZoom} analysis={audioAnalysis} sourceUrl={audioUrl} position={position} duration={duration} passage={loop} passageActive={!!loop} resizablePassage passageBounds={TUNING_LOOP_BOUNDS} onPassageChange={changeLoop} onSeek={seekPlayback} dynamicRange={dynamicRange} onDynamicRangeChange={updateDynamicRange} dynamicSliderEnabled={dynamicSliderEnabled} dynamicRangeDisabled={!dynamicsReady} placeholder={trackError ? "This track could not be played" : "Track ready · waveform analysis in progress"}/>
                </div> : <p className="pt-full-hint">Choose a song to see its waveform.</p>}
                {waveBar}
                {dynamicSliderEnabled && <p className="pt-dynamics-note">Drag the Dynamics slider up to expand or down to compress. 0% keeps the original.</p>}
              </>}</div>
              <div className="pt-wave-tools">
                <button ref={playerToggle} type="button" className="pt-strip-expand" aria-expanded={playerOpen} aria-controls="pt-playback-full" onClick={togglePlayer}><ChevronDown size={15} aria-hidden="true"/>{playerOpen ? "Hide waveform" : "Show waveform"}</button>
                {playerOpen && audioUrl && <div className="pt-zoom" role="group" aria-label="Waveform zoom">
                  <button type="button" className="pt-chip-toggle" aria-label="Zoom out of the waveform" disabled={!audioAnalysis || waveZoom <= 1} onClick={() => setWaveZoom(zoom => Math.max(1, zoom / 2))}>−</button>
                  <output aria-label="Waveform zoom level">{Number(waveZoom.toFixed(1))}×</output>
                  <button type="button" className="pt-chip-toggle" aria-label="Zoom in to the waveform" disabled={!audioAnalysis || waveZoom >= 8} onClick={() => setWaveZoom(zoom => Math.min(8, zoom * 2))}>+</button>
                </div>}
              </div>
              <div className="pt-audition">
                <div className="pt-listen-row">
                  <div className="pt-compare" role="group" aria-label="Compare with the starting sound">
                    <button type="button" aria-pressed={heardKey === "live"} disabled={!canCompare} onClick={() => listenTo("live")}>Your tuning</button>
                    <button type="button" className="pt-compare-start" aria-pressed={comparing} disabled={!canCompare} onClick={() => listenTo("start")}>Starting sound</button>
                  </div>
                  <button type="button" className="pt-chip-toggle pt-loop-toggle" aria-pressed={!!loop} disabled={!audioUrl} title={loop ? "Return to normal playback" : `Repeat about ${LOOP_DEFAULT_SECONDS} seconds from the playhead`} onClick={toggleLoop}><Repeat size={13} aria-hidden="true"/>Loop from playhead</button>
                </div>
                {playerOpen && loop && <div className="pt-loop-bounds" role="group" aria-label="Loop passage range">
                  <SecondsField label="Start" value={loop.start} min={0} max={Math.max(0, loop.end - loopLeast)} onCommit={start => changeLoop({ start, end: loop.end })}/>
                  <SecondsField label="End" value={loop.end} min={loop.start + loopLeast} max={duration > 0 ? duration : undefined} onCommit={end => changeLoop({ start: loop.start, end })}/>
                  <output aria-label="Loop length">{(loop.end - loop.start).toFixed(1)} s</output>
                  <button type="button" title="Move the loop start to the playhead" onClick={() => loopBoundHere("start")}>Start here</button>
                  <button type="button" title="Move the loop end to the playhead" onClick={() => loopBoundHere("end")}>End here</button>
                  <button type="button" onClick={() => setLoop(null)}>Clear loop</button>
                  <span>{audioAnalysis ? "Times are in seconds. You can also drag the loop edges on the waveform." : "Type times in seconds, or use the playhead buttons."} The loop keeps repeating while you switch sounds.</span>
                </div>}
              </div>
              {listenNote}
              {matchLoudness && <p className="pt-listen-note pt-loudness-status" role="status">Match loudness · {loudnessStatus}</p>}
              {playerNote && <p className="pt-player-note" role={trackError ? "alert" : "status"} data-error={!!trackError}>{playerNote}{trackError && <> <button type="button" className="pt-link-button" onClick={chooseAnotherTrack}>Choose another track</button></>}</p>}
              {musicChoices}
              {playerOpen && <>
                <div className="pt-full-group" role="group" aria-labelledby="pt-full-sound">
                  <h4 id="pt-full-sound">Selected sound</h4>
                  {audioUrl && <p className="pt-full-track"><strong>{audioName}</strong><span>{trackSource}</span></p>}
                  <p className="pt-active-sound" role="status">{eqOn ? soundMode === "saved" ? `Saved EQ: ${savedEq?.name}` : `Target: ${target.name}${measurement ? ` · ${measurement.name}` : " · choose headphones to apply this target"}` : bypassLabel}{soundMode === "saved" && tweaksChanged ? " · edited, not saved" : ""}{comparing ? " · comparing with the starting sound" : auditionSlot ? ` · playing ${heardLabel}` : ""}{matchEnabled && activeMatch ? " · channel match on" : ""}{matchLoudness && eqOn ? " · loudness match on" : ""}{loop ? " · looping a passage" : ""}{preparingEq ? " · preparing EQ…" : ""}</p>
                </div>
                <div className="pt-full-foot">
                  <p className="pt-playback-shortcut"><kbd>Space</kbd> play / pause · <kbd>←</kbd> <kbd>→</kbd> step back or forward</p>
                  <button type="button" className="pt-link-button pt-help-button" aria-haspopup="dialog" onClick={event => openInstructions("playback", event.currentTarget)}><BookOpen size={13} aria-hidden="true"/>Playback help</button>
                </div>
              </>}
              <audio ref={media} crossOrigin="anonymous" preload="metadata" onLoadedMetadata={() => { const total = media.current?.duration || 0; setDuration(total); setLoop(current => current && total > 0 ? boundedLoop(current, total) : current); if (media.current) media.current.volume = 1; }} onTimeUpdate={() => { const now = media.current?.currentTime || 0; setPosition(visible ? now : Math.floor(now)); }} onPlay={handleMediaPlay} onPause={() => setPlaying(false)} onEnded={handleMediaEnded} onError={() => { setTrackError("This track could not be played in your browser. Choose another track, or try a different file format."); setMessage("This track could not be played in your browser. Try another format or file."); }}/>
              </div>
              {snapshotScope ? <div className="pt-snapshot-card" ref={snapshotGroup} role="group" aria-label="Tuning snapshots">
              <div className="pt-snapshot-head">
                <strong>Snapshots</strong>
                <span>{snapshots.length === 0 ? "None saved yet · 3 slots free" : `${snapshots.length} of ${SLOT_IDS.length} slots used`}</span>
                {snapshots.length > 0 && <button type="button" className="pt-link-button pt-disclosure" aria-expanded={snapshotsOpen} aria-controls="pt-snapshot-manage" onClick={() => setSnapshotsOpen(open => !open)}>{snapshotsOpen ? "Hide names and actions" : "Name, apply, replace or remove"}<ChevronDown size={13} aria-hidden="true"/></button>}
              </div>
              <div className="pt-slot-row" role="group" aria-label="Saved snapshots of your tuning">
                {snapshots.map(row => <button type="button" key={row.slot} className="pt-slot" aria-pressed={heardKey === row.slot} disabled={!eqOn} aria-label={`Listen to snapshot ${row.slot}${row.name === `Snapshot ${row.slot}` ? "" : `, ${row.name}`}`} title={`Listen to ${row.name}`} onClick={() => listenTo(row.slot)}><b aria-hidden="true">{row.slot}</b>{row.name !== `Snapshot ${row.slot}` && <span>{row.name}</span>}</button>)}
                {freeSlot && <button type="button" className="pt-chip-toggle pt-snapshot-save" aria-label={`Save tuning snapshot in slot ${freeSlot}`} title={`Keeps a copy of your current adjustments in slot ${freeSlot}. Your tuning and its undo history are not changed.`} onClick={() => saveSnapshot(freeSlot)}>Save tuning snapshot</button>}
              </div>
              <p className="pt-snapshot-purpose">{snapshots.length === 0
                ? "A snapshot keeps a copy of your current adjustments, so you can carry on editing and listen to it again without losing anything. You can name it as soon as it is saved."
                : freeSlot
                  ? "Press a letter to listen to that snapshot. Editing pauses while it plays and your tuning stays as it is. Save another to compare more versions."
                  : "All 3 slots are in use. Press a letter to listen. To save another version, replace or remove a snapshot."}</p>
              <p className="pt-snapshot-status" role="status">{snapshotNote.scope === snapshotScope ? snapshotNote.text : ""}</p>
              <div className="pt-snapshots" id="pt-snapshot-manage" hidden={!snapshotsOpen || snapshots.length === 0}>
                {snapshots.map(row => <div className="pt-snapshot" key={row.slot} data-active={heardKey === row.slot}>
                  <b aria-hidden="true">{row.slot}</b>
                  <input type="text" id={`pt-snapshot-name-${row.slot}`} key={row.name} defaultValue={row.name} maxLength={SNAPSHOT_NAME_LIMIT} autoComplete="off" aria-label={`Name of snapshot ${row.slot}`} aria-describedby={namingSlot === row.slot ? "pt-snapshot-naming" : undefined}
                    onKeyDown={event => {
                      // Enter keeps the name and moves on to the snapshot's actions; Escape puts the old name back.
                      if (event.key === "Enter") { event.preventDefault(); const next = event.currentTarget.closest(".pt-snapshot")?.querySelector("button"); if (next) next.focus(); else event.currentTarget.blur(); }
                      else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); event.currentTarget.value = row.name; event.currentTarget.blur(); }
                    }}
                    onBlur={event => { setNamingSlot(current => current === row.slot ? null : current); renameSnapshot(row.slot, event.currentTarget.value); }}/>
                  {namingSlot === row.slot && <p className="pt-snapshot-naming" id="pt-snapshot-naming">Type a name of up to {SNAPSHOT_NAME_LIMIT} characters and press Enter, or leave it as it is.</p>}
                  <div className="pt-snapshot-actions">
                    <button type="button" className="pt-link-button" disabled={!eqOn} aria-pressed={heardKey === row.slot} aria-label={`Listen to snapshot ${row.slot}`} title="Plays this snapshot in place of your tuning. Editing is paused while it plays." onClick={() => listenTo(heardKey === row.slot ? "live" : row.slot)}>{heardKey === row.slot ? "Stop listening" : "Listen"}</button>
                    <button type="button" className="pt-link-button pt-apply" aria-label={`Apply snapshot ${row.slot} to tuning`} title="Copies this snapshot into your tuning as one edit. Undo brings back the previous tuning." onClick={() => applySnapshot(row)}>Apply to tuning</button>
                    <button type="button" className="pt-link-button" aria-label={`Replace snapshot ${row.slot} with your current tuning`} title="Overwrites this snapshot with your current tuning and keeps its name." onClick={() => saveSnapshot(row.slot)}>Replace</button>
                    <button type="button" className="pt-link-button pt-danger" aria-label={`Remove snapshot ${row.slot}`} title="Deletes this snapshot and frees its slot." onClick={() => removeSnapshot(row.slot)}><Trash2 size={12} aria-hidden="true"/>Remove</button>
                  </div>
                </div>)}
                <ul className="pt-snapshot-legend">
                  <li><strong>Listen</strong> plays a snapshot in place of your tuning. Editing is paused while it plays, so nothing changes by accident. Choose Your tuning to carry on.</li>
                  <li><strong>Apply to tuning</strong> copies the snapshot’s settings into your tuning as one edit. Undo brings back what you had.</li>
                  <li><strong>Replace</strong> overwrites the snapshot with your current tuning and keeps its name. <strong>Remove</strong> deletes it and frees the slot. Neither can be undone.</li>
                  <li>The three slots (A, B and C) are kept in this browser only, separately for each starting sound. Choosing another target, headphones or saved EQ shows that sound’s own snapshots.</li>
                </ul>
                <button type="button" className="pt-link-button pt-help-button" aria-haspopup="dialog" onClick={event => openInstructions("snapshots", event.currentTarget)}><BookOpen size={13} aria-hidden="true"/>More about snapshots</button>
              </div>
              </div> : <p className="pt-listen-note">Choose a saved EQ to save and compare snapshots.</p>}
              <div className="pt-listening-checks" role="group" aria-label="Listening options">
                <label title="Turns the louder sounds down so they play at about the same level. Nothing is made louder, and your tuning and exports are not changed."><input type="checkbox" checked={matchLoudness} onChange={event => setMatchLoudness(event.target.checked)}/>Match loudness</label>
                <label title="Off bypasses the starting EQ and your tuning. Channel match has its own switch."><input type="checkbox" aria-label="Enable EQ" checked={eqOn} disabled={!eqAvailable} onChange={event => setBypass(!event.target.checked)}/>EQ {eqOn ? "on" : "off"}</label>
                <label title="Evens out left and right using paired measurements or an uploaded preset"><input type="checkbox" aria-label="Enable channel match" checked={!!activeMatch && matchEnabled} disabled={!activeMatch} onChange={event => setMatchEnabled(event.target.checked)}/>Channel match {matchEnabled && activeMatch ? "on" : "off"}</label>
                <button type="button" className="pt-link-button pt-help-button" aria-haspopup="dialog" onClick={event => openInstructions("compare", event.currentTarget)}><BookOpen size={13} aria-hidden="true"/>Listening help</button>
              </div>
            </section>
            {editLocked && <p className="pt-limit-note pt-lock-note" role="status">Editing is paused while {heardLabel} plays, so the snapshot and your tuning both stay as they are. <span className="pt-note-actions"><button type="button" className="pt-link-button" onClick={() => listenTo("live")}>Back to Your tuning</button><button type="button" className="pt-link-button" onClick={() => auditionSlot && applySnapshot(auditionSlot)}>Apply to tuning</button></span></p>}
            <div className="pt-panel-block pt-edit-card">
              <div className="pt-editor-heading">
                <div className="pt-view-switch" role="group" aria-label="Editing view">
                  <button type="button" aria-pressed={view === "tone"} aria-controls="pt-edit-controls" title="Broad gain changes by ear" onClick={() => setView("tone")}>Tone</button>
                  <button type="button" aria-pressed={view === "filters"} aria-controls="pt-edit-controls" title="Exact shape, frequency, Q and narrow corrections" onClick={() => setView("filters")}>Filters{settings.focused.length > 0 && <span aria-hidden="true">{settings.focused.length}</span>}</button>
                </div>
                <div className="pt-editor-actions">
                  {historyControls("Tuning history")}
                  {view === "tone" && <button type="button" className="pt-link-button" aria-expanded={allTones} aria-controls="pt-tone-bands" onClick={() => setAllTones(open => !open)}><SlidersHorizontal size={12} aria-hidden="true"/>{allTones ? "Show main 3" : "All 6 bands"}</button>}
                </div>
              </div>
            {view === "tone" ? <fieldset className="pt-tone-controls" id="pt-edit-controls">
              <legend className="pt-visually-hidden">Added tuning adjustments</legend>
              {!allTones && <p className="pt-tone-intro">Play a familiar passage. Change one slider by 0.5–1 dB, then compare with Starting sound.</p>}
              <div id="pt-tone-bands">
                {allTones && <div className="pt-tone-band-picker" role="group" aria-label="Choose a tone band">
                  {GAIN_CONTROLS.map((control, index) => {
                    const band = BANDS[index], gain = formatToneGain(settings[control.key]);
                    return <button type="button" key={control.key} aria-pressed={activeBand === index}
                      style={{ color: graphColor(band.color, band.lightColor) }} onClick={() => selectBand(index)}>
                      <span>{band.name}</span>{gain !== "0" && <small>{gain} dB</small>}
                    </button>;
                  })}
                </div>}
                <div className="pt-tone-list">{GAIN_CONTROLS.map((control, index) => {
                  if (allTones ? index !== activeBand : !PRIMARY_TONES.includes(control.key)) return null;
                  const band = BANDS[index], filter = filters[index], name = BANDS[index].name;
                  const limit = expanded ? EXPANDED_GAIN_LIMIT : control.limit, value = settings[control.key];
                  return <div className="pt-tone-row" key={control.key} data-active={activeBand === index} style={{ color: graphColor(band.color, band.lightColor) }}>
                    <div className="pt-tone-row-head">
                      <div><strong>{name}</strong><small>{control.hint}</small></div>
                      <ToneGainField name={name} value={value} limit={limit} disabled={controlsDisabled} onSelect={() => selectBand(index)} onCommit={gain => set(control.key, gain)} onStepStart={beginGesture} onStepEnd={endGesture}/>
                      <button type="button" className="pt-tone-zero-button" disabled={controlsDisabled || value === 0} aria-label={`Reset ${name} to 0 dB`} title="Back to 0 dB" onClick={() => { selectBand(index); set(control.key, 0); }}><RotateCcw size={13}/></button>
                    </div>
                    <div className="pt-tone-track">
                      <span aria-hidden="true">−{limit}</span>
                      <input className="pt-tone-slider" type="range" disabled={controlsDisabled} min={-limit} max={limit} step={.5} value={value} aria-label={`${name} gain`} aria-valuetext={`${value} decibels; ${FILTER_RELATION[filter.type].toLowerCase()} ${filter.hz} hertz`} onPointerDown={() => { beginGesture(); selectBand(index); }} onFocus={() => selectBand(index)} onPointerUp={finishSliderPointer} onPointerCancel={finishSliderPointer} onKeyDown={event => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) beginGesture(); }} onKeyUp={endGesture} onBlur={endGesture} onChange={event => set(control.key, Number(event.target.value))}/>
                      <span aria-hidden="true">+{limit}</span>
                    </div>
                  </div>;
                })}</div>
              </div>
              {otherToneGains && <p className="pt-tone-intro">Adjustments to the other bands are still applied.</p>}
              {activeToneVisible && <p className="pt-tone-help" aria-live="polite"><strong style={{ color: graphColor(BANDS[activeBand].color, BANDS[activeBand].lightColor) }}>{BANDS[activeBand].name}</strong> · {FILTER_RELATION[filters[activeBand].type].toLowerCase()} {formatHzWithUnit(filters[activeBand].hz)}. {BANDS[activeBand].effect}</p>}
              {activeToneVisible && !controlsDisabled && !expanded && Math.abs(settings[GAIN_CONTROLS[activeBand].key]) >= GAIN_CONTROLS[activeBand].limit && <p className="pt-limit-note" role="status">{BANDS[activeBand].name} is at its ±{GAIN_CONTROLS[activeBand].limit} dB limit. <button type="button" className="pt-link-button" onClick={toggleExpanded}>Allow ±20 dB</button></p>}
              <details className="pt-help-details pt-tone-guide">
                <summary>What to listen for</summary>
                {allTones && <p>Change one band by 0.5–1 dB, then compare the same passage with Starting sound.</p>}
                <dl>
                  <dt>Bass</dt><dd>Raise for more weight in bass notes and kick drums. Lower if the low end feels boomy.</dd>
                  <dt>Mids &amp; ear gain</dt><dd>Raise if vocals sound distant. Lower if voices or guitars sound too forward.</dd>
                  <dt>Treble</dt><dd>Raise for more shimmer and brightness. Lower if cymbals or bright recordings sound tiring.</dd>
                </dl>
                <p>Gain adds or removes level in dB. Use Undo if you prefer the previous step. Open Filters for an exact frequency, Q, or shape.</p>
              </details>
            </fieldset> : <fieldset className="pt-filter-editors" id="pt-edit-controls" disabled={controlsDisabled}>
              <legend className="pt-visually-hidden">Edit tuning filters</legend>
              <div className="pt-panel-title"><h3>Band filters</h3><span>Changes apply when you leave a field</span></div>
              <div className="pt-fx">
                <div className="pt-fx-head" aria-hidden="true"><span>Band</span><span>Shape</span><span>Hz</span><span>Q</span><span>dB</span></div>
                {GAIN_CONTROLS.map((control, index) => {
                  const band = BANDS[index], filter = filters[index], name = BANDS[index].name, shape = filter.type, placement = control.placement;
                  const shownQ = Number(filter.q.toFixed(4));
                  const limit = expanded ? EXPANDED_GAIN_LIMIT : control.limit;
                  return <div className="pt-fx-row pt-fx-band" key={control.key} data-active={selectedGraphBand === control.key} onFocus={() => selectBand(index)}>
                    <div className="pt-fx-name"><strong style={{ color: graphColor(band.color, band.lightColor) }}>{name}</strong></div>
                    <select aria-label={`${name} filter shape`} value={shape} onChange={event => changeFilterType(control.key, event.target.value as FilterType)}>
                      {(Object.keys(FILTER_SHAPE) as FilterType[]).map(type => <option key={type} value={type}>{FILTER_SHAPE[type]}</option>)}
                    </select>
                    <div className="pt-fx-field"><span aria-hidden="true">Hz</span>{placement ? <input key={filter.hz} aria-label={`${placementName(placement, settings)} frequency`} title={`${PLACEMENTS[placement].min}–${PLACEMENTS[placement].max} Hz`} type="number" inputMode="decimal" min={PLACEMENTS[placement].min} max={PLACEMENTS[placement].max} step={PLACEMENTS[placement].step} defaultValue={filter.hz}
                      onKeyDown={finishNumberEdit}
                      onBlur={event => {
                        const value = event.currentTarget.valueAsNumber;
                        event.currentTarget.value = String(filter.hz);
                        commitPlacement(placement, value);
                      }}/> : <span className="pt-fx-fixed" title={shape === "PK" ? "Fixed center frequency" : "Fixed shelf transition"}>{formatHz(filter.hz)}</span>}</div>
                    <div className="pt-fx-field"><span aria-hidden="true">Q</span><input key={`q${filter.q}`} aria-label={`${name} Q`} type="number" inputMode="decimal" min=".1" max={maxQ(shape)} step="any" defaultValue={shownQ}
                      onKeyDown={finishNumberEdit}
                      onBlur={event => {
                        const value = event.currentTarget.valueAsNumber;
                        event.currentTarget.value = String(shownQ);
                        if (Number.isFinite(value) && value !== shownQ) set(`${control.key}Q`, boundedQ(value, shape));
                      }}/></div>
                    <div className="pt-fx-field"><span aria-hidden="true">dB</span><SignedGainInput label={`${name} gain`} value={settings[control.key]} limit={limit} step=".5" onCommit={gain => set(control.key, gain)}/></div>
                  </div>;
                })}
              </div>
              <div className="pt-panel-title"><h3>Narrow corrections</h3><span>{settings.focused.length} of {FOCUSED_FILTER_LIMIT} used</span></div>
              {settings.focused.length > 0 && <section className="pt-fx" aria-label="Focused peak and dip edits">
                {settings.focused.map(filter => <div className="pt-fx-row" key={filter.hz} data-active={selectedFocusHz === filter.hz} onFocus={() => selectFocusedFilter(filter.hz)}>
                  <div className="pt-fx-name"><strong>{formatHzWithUnit(filter.hz)}</strong><button type="button" className="pt-fx-remove" aria-label={`Remove focused edit at ${filter.hz} Hz`} title="Remove this correction" onClick={() => changeFocusedFilter({ ...filter, gain: 0 })}><X size={14}/></button></div>
                  <span className="pt-fx-fixed">Peak</span>
                  <input type="number" inputMode="decimal" aria-label={`Focused ${filter.hz} Hz frequency`} defaultValue={filter.hz} min="20" max="20000" step="1"
                    onKeyDown={finishNumberEdit}
                    onBlur={event => {
                      const value = event.currentTarget.valueAsNumber;
                      event.currentTarget.value = String(filter.hz);
                      moveFocusedFilter(filter, value);
                    }}/>
                  <input key={`q${filter.q}`} type="number" inputMode="decimal" aria-label={`Focused ${filter.hz} Hz Q`} defaultValue={filter.q} min=".1" max="20" step=".1"
                    onKeyDown={finishNumberEdit}
                    onBlur={event => {
                      const value = event.currentTarget.valueAsNumber;
                      event.currentTarget.value = String(filter.q);
                      if (Number.isFinite(value)) changeFocusedFilter({ ...filter, q: boundedQ(value, "PK") });
                    }}/>
                  <SignedGainInput label={`Focused ${filter.hz} Hz gain`} value={filter.gain} limit={focusedGainLimit} step=".1" onCommit={gain => changeFocusedFilter({ ...filter, gain })}/>
                </div>)}
              </section>}
              <form className="pt-fx-add" aria-label="Add a narrow correction" onSubmit={event => { event.preventDefault(); addFocusedFilter(); }}>
                <label>Frequency (Hz)<input type="number" inputMode="decimal" required min="20" max="20000" step="1" placeholder="e.g. 6200" value={newFocus.hz} onChange={event => setNewFocus(current => ({ ...current, hz: event.target.value }))}/></label>
                <div className="pt-fx-add-gain"><label>Gain (dB)<input type="number" inputMode="decimal" required min={-focusedGainLimit} max={focusedGainLimit} step=".1" value={newFocus.gain} onChange={event => setNewFocus(current => ({ ...current, gain: event.target.value }))}/></label><SignButton name="new correction gain" onFlip={() => setNewFocus(current => ({ ...current, gain: String(Math.max(-focusedGainLimit, Math.min(focusedGainLimit, flippedGain(current.gain.trim() ? Number(current.gain) : 0)))) }))}/></div>
                <label>Q<input type="number" inputMode="decimal" required min=".1" max="20" step=".1" value={newFocus.q} onChange={event => setNewFocus(current => ({ ...current, q: event.target.value }))}/></label>
                <button type="submit" disabled={focusedFull}>Add</button>
              </form>
              <p className="pt-fx-note">{focusedFull ? `All ${FOCUSED_FILTER_LIMIT} corrections are in use. Remove one to add another.` : "Negative gain cuts a peak. Higher Q makes it narrower. You can also drag down at the peak on the graph."}</p>
              <details className="pt-help-details"><summary>Shape and Q help</summary><p><strong>Peak</strong> adjusts around a center frequency. <strong>Low shelf</strong> adjusts below a transition and <strong>high shelf</strong> adjusts above it. Higher <strong>Q</strong> narrows a peak or makes a shelf transition steeper. Shelf Q tops out around 0.707 for a smooth transition. Bass, Mids &amp; ear gain and Treble can move in frequency here or with the B, EG and T markers on the graph.</p></details>
            </fieldset>}
            </div>
            <div className="pt-panel-block pt-panel-foot">
              {soundMode === "saved" ? savedEq
                ? <div className="pt-saved-edit-status"><span>{tweaksChanged ? "Edited · not saved" : "Playing the saved filters"}</span><button type="button" disabled={!tweaksChanged} onClick={saveEditedEq}>Save as new EQ</button></div>
                : <p className="pt-save-line"><span>No saved EQ selected.</span><button type="button" className="pt-link-button" onClick={() => openSetup()}>Choose a saved EQ</button></p>
                : <p className="pt-save-line"><span>Kept in this browser as you go.</span><a className="pt-nav-link" href="#tuning-export">Save &amp; export<ArrowDown size={13} aria-hidden="true"/></a></p>}
            </div>
          </aside>
          </div>
          <section className="pt-match-download" id="tuning-channel-match" aria-label="Channel match">
            <div className="pt-match-heading">
              <strong>Channel match{activeMatch && matchHeadphone ? ` · ${matchHeadphone}` : ""}</strong>
              <span>{activeMatch ? activeMatch.channelMatchMode === "custom" ? "Uploaded left/right preset" : "YinYang AutoMatch from paired measurements" : "Add paired left/right measurements or an uploaded preset."}</span>
              <Link href="/shootout?tab=eqs#channel-matches" prefetch={false} className="pt-nav-link">Saved channel matches<ArrowUpRight size={13} aria-hidden="true"/></Link>
            </div>
            {activeMatch && <div className="pt-match-formats" role="group" aria-label="Download channel match">
              <div>
                <button type="button" onClick={() => downloadMatch("txt")} aria-describedby="pt-match-txt-help">Download TXT (IIR)</button>
                <p id="pt-match-txt-help">Editable left/right parametric EQ settings.{activeMatch.channelMatchMode !== "custom" && " This approximates AutoMatch."}</p>
              </div>
              <div>
                <button type="button" onClick={() => downloadMatch("wav")} aria-describedby="pt-match-wav-help">Download WAV (FIR)</button>
                <p id="pt-match-wav-help">Load this 48 kHz stereo impulse into a convolver to apply the match to your music. It adds about 85 ms of delay.</p>
              </div>
            </div>}
          </section>
          <details className="pt-help-details pt-curve-help"><summary>About the curves on this graph</summary>
          <div className="pt-response-note">
            {!measurement ? <p>{soundMode === "saved" ? "Choose a saved EQ with a linked headphone measurement to see the headphone curves." : "Choose a headphone measurement to see the headphone curves."}</p> : <>
              <p><strong>Raw headphones</strong> shows the measurement before EQ.</p>
              <p><strong>Predicted EQ</strong> {preparingEq ? "will appear when the filters are ready." : "estimates the result on your headphones and follows the EQ switch."}</p>
              {matchEnabled && activeMatch && <p>The prediction includes channel matching. Paired measurements show the left and right average.</p>}
            </>}
            <p><strong>Your curve</strong> shows your tuning settings.{measurement && " The graph leaves out playback volume and headroom."}</p>
            <p>The gray line is the starting sound. Your changes add to it, and <strong>Starting sound</strong> plays it without them.</p>
            {soundMode === "saved" && savedEq && !savedEq.target && <p>This saved EQ has no stored target curve.</p>}
          </div>
          </details>
        </section>
        {soundMode === "target" && <section className="pt-finalize" id="tuning-export" aria-label="Make EQ settings">
          <div className="pt-finalize-intro"><div><span className="pt-step">EXPORT</span><h2>Make EQ settings for my headphones</h2><p>Create settings to use in this site’s music library or a compatible EQ app. Start with the recommended EQ, which favors smaller boosts, especially in deep bass. Listen to the closer fit too when it differs.</p></div><div className="pt-finalize-action">{!measurement?.points?.length && <p key={measurementAttention} className={`pt-measurement-needed${measurementAttention ? " pt-attention" : ""}`} role="note"><strong>Choose a headphone measurement</strong><span>to generate EQ filters.</span></p>}<button ref={finalizeButton} type="button" className={`pt-finalize-button${measurementAttention ? " pt-attention" : ""}`} disabled={finalizing || !sourceCurves.ready} onClick={event => { if (!measurement?.points?.length) { setMessage("Choose a headphone measurement to generate EQ filters."); setMeasurementAttention(value => value + 1); openSetup(true); if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) event.currentTarget.animate([{ transform: "translateX(0)" }, { transform: "translateX(-7px)" }, { transform: "translateX(7px)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }], { duration: 500, easing: "ease-in-out" }); return; } void finalizeCurve(); }}>{finalizing ? `Making EQ settings ${finalProgress} / ${FIT_CANDIDATE_COUNT}…` : !measurement?.points?.length ? "Choose headphones first" : finalized ? "Regenerate EQ settings" : "Make my EQ settings"}</button></div></div>
          {finalized && <a className="eq-results-jump" href="#tuning-eq-results">View generated EQ results</a>}
          <p id="pt-export-disclosure" className="pt-export-disclosure">{localAutoEq ? "Downloads from this local AutoEq curve stay on this device. Saved EQs store filters without the source curve." : "For participating listener accounts, downloading sends the selected target, adjusted curve, settings and exported file for administrator-only research. EQ exports also include the selected measurement name. Admin and hidden test accounts save local tests instead. Music files and raw headphone measurements are not collected here."}</p>
          <div className="pt-curve-downloads"><p>Download curve data</p><div className="pt-export-downloads" role="group" aria-label="Target curve downloads" aria-describedby="pt-export-disclosure"><button type="button" disabled={!sourceCurves.ready} onClick={() => void downloadText("original-target.csv", `frequency_hz,level_db\n${normalized.map(([hz, db]) => `${hz.toFixed(2)},${db.toFixed(3)}`).join("\n")}\n`, "text/csv")}>Starting curve data (CSV)</button><button type="button" disabled={!sourceCurves.ready} onClick={() => void downloadText("preference-target.csv", `frequency_hz,level_db\n${preferenceCurve.map(([hz, db]) => `${hz.toFixed(2)},${db.toFixed(3)}`).join("\n")}\n`, "text/csv")}>My adjusted curve data (CSV)</button></div></div>

          {previousResults && !finalized && <p className="pt-finalize-hint">Your sound or headphones changed. Make updated settings before downloading.</p>}
          {finalized && <section className="eq-results-section" aria-labelledby="tuning-eq-results">
            <header className="eq-results-heading">
              <h2 id="tuning-eq-results" ref={resultsHeading} tabIndex={-1}>EQ results for {measurement?.name}</h2>
              <p>{finalized.saved ? "The last generated set is saved in this browser for this setup." : "These results are available in this tab. Browser storage is unavailable."}</p>
            </header>

            {visible && <EqCandidateResults tuning comparisonContext={{headphones:measurement?.device || measurement?.name || "Selected headphones",target:target.name}} channelMatch={matchEnabled?activeMatch:undefined} onCompare={stop} variants={finalized.variants} raw={measurement!.points} target={preferenceCurve} onDownload={(variant,format)=>{const base=`preference-${variant.bands}band-${variant.method}${variant.reducedBoost ? "-reduced-boost" : ""}`;const content=format==="equalizerapo"?exportEqualizerApo(variant):format==="easyeffects"?exportEasyEffects(variant):format==="qudelix5k"?exportQudelixGuide(variant):exportPeq(variant);void downloadText(`${base}${format==="txt"?"":"-"+format}.txt`,content,"text/plain",variant);}} onSave={variant=>{try { saveLibraryEq({id:crypto.randomUUID(),name:`${measurement?.device || measurement?.name} → ${target.name}`,fitter:{method:variant.method,bands:variant.bands},source:`Tuning · ${variant.bands} bands · ${variant.method}${variant.reducedBoost ? " · reduced boost" : ""}`,engine:variant.engine,engineVersion:variant.engineVersion,filters:variant.filters,preamp:variant.preamp,measurementId:measurement?.id,headphone:measurement?.device || measurement?.name,channelMatch:measurementChannelMatch(measurement),target:localAutoEq?undefined:{id:target.id,name:target.name,points:preferenceCurve}});setMessage(`EQ saved to ${PERSONAL_AREA_TITLE}, Tuning and Music library.`);} catch(error){setMessage(error instanceof Error?error.message:"Could not save this EQ.");}}}/>}

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
    {instructionsOpen && <div className="pt-instructions-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeInstructions(); }}>
      <section className="pt-instructions-dialog" role="dialog" aria-modal="true" aria-labelledby="pt-instructions-title" onKeyDown={event => { if (event.key !== "Tab") return; const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),summary,a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(el=>el.getClientRects().length>0); const first=controls[0],last=controls.at(-1); if (event.shiftKey && document.activeElement===first) {event.preventDefault();last?.focus();} else if (!event.shiftKey && document.activeElement===last) {event.preventDefault();first?.focus();} }}>
        <div className="pt-instructions-header"><div><span className="pt-step">PREFERENCE TUNING LAB</span><h2 id="pt-instructions-title">Instructions</h2><p>Start with the first pass. After that, open any topic to look up a button, switch or gesture.</p></div><button ref={instructionsClose} type="button" aria-label="Close instructions" onClick={closeInstructions}><X size={18} aria-hidden="true"/></button></div>
        <TuningGuide topic={guideTopic}/>
      </section>
    </div>}
  {visible && consent.dialog}
  </main>
  <Suspense fallback={null}><RouteWatcher onRoute={noteRoute}/></Suspense>
  {!visible && audioUrl && <aside
    className={`music-panel-host persistent tuning-dock ${dockOpen ? "edge-expanded" : "edge-collapsed"}`}
    data-playing={playing}
    aria-label="Tuning player"
  >
    <PlaybackEdgeToggle expanded={dockOpen} playing={playing} label="Tuning player" controls="tuning-dock-details" onToggle={() => setDockOpen(open => !open)}/>
    <div className="music-panel">
      <div className={`player-row${playing ? " is-playing" : ""}`}>
        {dockOpen && <TrackWaveform
          playing={playing}
          getPlaybackPosition={() => media.current?.currentTime ?? position}
          compact
          hideZoom
          hideHeading
          analysis={audioAnalysis}
          position={position}
          duration={duration}
          passage={loop}
          passageActive={!!loop}
          resizablePassage
          passageBounds={TUNING_LOOP_BOUNDS}
          onPassageChange={changeLoop}
          onSeek={seekPlayback}
          dynamicRange={dynamicRange}
          onDynamicRangeChange={updateDynamicRange}
          dynamicRangeDisabled={!dynamicsReady}
          placeholder="Preparing waveform…"
        />}
        <button
          type="button"
          className="deck-play"
          aria-label={playing ? "Pause Tuning music" : "Play Tuning music"}
          title={`${playing ? "Pause" : "Play"} Tuning music · ${audioName}`}
          disabled={!playing && preparingEq}
          onClick={() => { if (media.current?.paused) void play(); else stop(); }}
        />
        {/* Track and time sit beside the transport; what is being heard and the loop get their own row of controls below. */}
        <div className="tuning-dock-details" id="tuning-dock-details" hidden={!dockOpen}>
          <strong title={audioName}>{audioName}</strong>
          <span><span className="tuning-dock-time">{playbackClock(position)} / {duration > 0 ? playbackClock(duration) : "–:––"}</span> · {playing ? "Playing" : "Paused"} from Tuning</span>
        </div>
        {dockOpen && <Link href={TUNING_ROUTE} prefetch={false} className="tuning-dock-return" title="Go back to the Tuning page to edit. Music keeps playing.">Return to Tuning<ArrowUpRight size={13} aria-hidden="true"/></Link>}
        {dockOpen && <div className="tuning-dock-actions">
          <div className="tuning-dock-group">
            <span className="tuning-dock-label" id="tuning-dock-sound-label">Hearing</span>
            {canCompare
              ? <div className="tuning-dock-compare" role="group" aria-labelledby="tuning-dock-sound-label">
                <button type="button" aria-pressed={heardKey === "live"} onClick={() => listenTo("live")}>Your tuning</button>
                <button type="button" aria-pressed={comparing} onClick={() => listenTo("start")}>Starting sound</button>
              </div>
              : <strong className="tuning-dock-sound">{dockSound}</strong>}
            {canCompare && auditionSlot && <strong className="tuning-dock-sound">{dockSound}</strong>}
          </div>
          <button type="button" className="tuning-dock-loop" aria-label={loop ? `Loop passage, ${playbackClock(loop.start)} to ${playbackClock(loop.end)}` : "Loop passage"} aria-pressed={!!loop} title={loop ? "Return to normal playback" : "Repeat about 5 seconds from the playhead. Drag its edges on the waveform to resize it."} onClick={toggleLoop}><Repeat size={13} aria-hidden="true"/>{loop ? `Loop passage ${playbackClock(loop.start)}–${playbackClock(loop.end)}` : "Loop passage"}</button>
        </div>}
        {dockOpen && dockNotice && <p className="tuning-dock-notice" role="status">{dockNotice}</p>}
      </div>
    </div>
  </aside>}
  </>;
}
