"use client";

import { type KeyboardEvent, type PointerEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { response as filterResponse } from "@/lib/autoeq";
import type { Point } from "@/lib/curves";
import { EAR_HIGH_HZ, EAR_LOW_HZ, sweepFrequency, type EarSweep } from "@/lib/ear-tuning-audio";
import AdjustmentHandles, { AdjustmentSelection, gainLimit, type AdjustmentEditor } from "./adjustment-handles";
import { frequencyForKey } from "./playback-keys";
import "./frequency-navigator.css";

type Props = {
  frequency: number;
  points?: readonly Point[];
  range?: EarSweep;
  legendLabel?: string;
  markers?: readonly number[];
  editor?: AdjustmentEditor;
  onSeek?: (hz: number) => void;
};

type Drag = { pointerId: number; lastX: number; position: number; width: number; frequency: number };

const interiorTicks = [100, 250, 1000, 4000, 500, 2000, 8000, 125, 160, 200, 315, 400, 630, 800, 1250, 1600, 2500, 3150, 5000, 6300, 10000, 12500];
const fineSpeed = .18;
const defaultRange = { from: EAR_LOW_HZ, to: EAR_HIGH_HZ };
const clampPosition = (position: number) => Math.min(1, Math.max(0, position));
const frequencyPosition = (hz: number, { from, to }: EarSweep) => Math.log(hz / from) / Math.log(to / from);
const boundHz = (hz: number, { from, to }: EarSweep) => Number.isFinite(hz) ? Math.min(to, Math.max(from, Math.round(hz))) : from;
const frequencyAt = (position: number, range: EarSweep) => boundHz(sweepFrequency(range, position), range);
const tickLabel = (hz: number) => hz < 1000 ? String(hz) : `${hz / 1000}k`;

function axisLabels(range: EarSweep, width: number) {
  const occupied: [number, number][] = [[0, tickLabel(range.from).length * 7 + 8], [width - (tickLabel(range.to).length + 3) * 7 - 8, width]];
  const labels = [range.from, range.to];
  for (const tick of interiorTicks) {
    if (tick <= range.from || tick >= range.to) continue;
    const x = frequencyPosition(tick, range) * width;
    const radius = tickLabel(tick).length * 3.5 + 5;
    if (occupied.some(([left, right]) => x - radius < right && x + radius > left)) continue;
    occupied.push([x - radius, x + radius]);
    labels.push(tick);
  }
  return labels.sort((a, b) => a - b);
}

function responseAt(points: readonly Point[], hz: number) {
  if (!points.length || hz < points[0][0] || hz > points[points.length - 1][0]) return undefined;
  let low = 0, high = points.length - 1;
  while (high - low > 1) {
    const middle = Math.floor((high + low) / 2);
    if (points[middle][0] <= hz) low = middle;
    else high = middle;
  }
  const [fromHz, fromDb] = points[low];
  const [toHz, toDb] = points[high];
  if (hz === fromHz) return fromDb;
  if (hz === toHz) return toDb;
  const span = Math.log(toHz) - Math.log(fromHz);
  const proportion = span ? (Math.log(hz) - Math.log(fromHz)) / span : (hz - fromHz) / (toHz - fromHz);
  return fromDb * (1 - proportion) + toDb * proportion;
}

function measurementPlot(range: EarSweep, points?: readonly Point[], bands?: AdjustmentEditor["bands"]) {
  const { from, to } = range;
  const unique = new Map<number, number>();
  for (const point of points ?? []) {
    if (!Array.isArray(point)) continue;
    const [hz, db] = point;
    if (Number.isFinite(hz) && hz >= 20 && hz <= 20000 && Number.isFinite(db) && db >= -200 && db <= 200) {
      unique.set(hz, db);
    }
  }
  const sorted = [...unique].sort(([a], [b]) => a - b);
  const visible = sorted.filter(([hz]) => hz >= from && hz <= to);
  const left = responseAt(sorted, from);
  const right = responseAt(sorted, to);
  if (left !== undefined && visible[0]?.[0] !== from) visible.unshift([from, left]);
  if (right !== undefined && visible[visible.length - 1]?.[0] !== to) visible.push([to, right]);

  let min = visible[0]?.[1] ?? -6;
  let max = visible[0]?.[1] ?? 6;
  for (const [, db] of visible) {
    min = Math.min(min, db);
    max = Math.max(max, db);
  }
  const hasAdjustments = !!bands?.length;
  const responseWithEq = (hz: number, before: number) => bands?.reduce((db, band) => db + filterResponse(hz, band), before) ?? before;
  const after: Point[] = [];
  if (hasAdjustments && visible.length !== 1) {
    const fromHz = visible[0]?.[0] ?? from;
    const toHz = visible.at(-1)?.[0] ?? to;
    const frequencies = new Set(Array.from({ length: 401 }, (_, i) => sweepFrequency({ from: fromHz, to: toHz }, i / 400)));
    for (const [hz] of visible) frequencies.add(hz);
    for (const band of bands) if (band.hz >= fromHz && band.hz <= toHz) frequencies.add(band.hz);
    for (const hz of [...frequencies].sort((a, b) => a - b)) {
      const db = responseWithEq(hz, responseAt(visible, hz) ?? 0);
      after.push([hz, db]);
      min = Math.min(min, db);
      max = Math.max(max, db);
    }
  }
  const bandBaseline = (hz: number) => responseAt(visible, hz) ?? visible[hz < (visible[0]?.[0] ?? from) ? 0 : visible.length - 1]?.[1] ?? 0;
  for (const band of bands ?? []) {
    const withoutBand = responseWithEq(band.hz, bandBaseline(band.hz)) - band.gain;
    min = Math.min(min, withoutBand - (band.kind === "peak" ? gainLimit(band) : 0));
    max = Math.max(max, withoutBand + (band.kind === "dip" ? gainLimit(band) : 0));
  }
  const margin = Math.max(.5, (max - min) * .08);
  const gainSpan = max - min + 2 * margin;
  const y = (db: number) => 100 * (max + margin - db) / gainSpan;
  const path = (rows: Point[]) => rows.map(([hz, db], index) =>
    `${index ? "L" : "M"}${(frequencyPosition(hz, range) * 1000).toFixed(2)} ${y(db).toFixed(2)}`).join(" ");
  return {
    visible, y, path: path(visible), after: path(after), gainSpan, min, max,
    centerY: (band: NonNullable<typeof bands>[number]) => y(responseWithEq(band.hz, bandBaseline(band.hz))) / 100,
    zero: min <= 0 && max >= 0 ? y(0) : undefined,
  };
}

export default function FrequencyNavigator({ frequency, points, range = defaultRange, legendLabel, markers, editor, onSeek }: Props) {
  const drag = useRef<Drag | null>(null);
  const axis = useRef<HTMLDivElement>(null);
  const [axisWidth, setAxisWidth] = useState(320);
  const [draft, setDraft] = useState<string | null>(null);
  const hintId = useId();
  const legendId = useId();
  const hz = boundHz(frequency, range);
  const position = frequencyPosition(hz, range);
  const plot = useMemo(() => measurementPlot(range, points, editor?.bands), [points, range, editor?.bands]);
  const ticks = axisLabels(range, axisWidth);
  const measured = plot.visible.length > 0;
  const response = measured ? responseAt(plot.visible, hz) : 0;
  const singlePoint = plot.visible.length === 1 ? plot.visible[0] : undefined;
  const gainTicks = editor ? [Math.ceil(plot.min), ...(plot.zero !== undefined ? [0] : []), Math.floor(plot.max)]
    .filter((db, index, ticks) => ticks.indexOf(db) === index && db >= plot.min && db <= plot.max)
    .filter((db, _, ticks) => db === 0 || !ticks.includes(0) || Math.abs(plot.y(db) - plot.y(0)) >= 14) : [];

  useEffect(() => {
    if (!axis.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setAxisWidth(entry.contentRect.width);
    });
    observer.observe(axis.current);
    return () => observer.disconnect();
  }, []);

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || drag.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width) return;
    const relativeX = event.clientX - bounds.left;
    const nearPlayhead = Math.abs(relativeX - position * bounds.width) <= 12;
    const start = nearPlayhead || event.shiftKey ? position : clampPosition(relativeX / bounds.width);
    const next = frequencyAt(start, range);
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, lastX: event.clientX, position: start, width: bounds.width, frequency: next };
    onSeek?.(next);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    // Apply the current speed only to new movement, so pressing Shift never shifts the playhead by itself.
    const delta = (event.clientX - active.lastX) / active.width;
    active.lastX = event.clientX;
    active.position = clampPosition(active.position + delta * (event.shiftKey ? fineSpeed : 1));
    const next = frequencyAt(active.position, range);
    if (next !== active.frequency) {
      active.frequency = next;
      onSeek?.(next);
    }
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }

  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    const next = frequencyForKey(event.key, hz, event.shiftKey, range);
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    onSeek?.(next);
  }

  function commitInput() {
    const next = draft?.trim() ? Number(draft) : NaN;
    if (Number.isFinite(next)) onSeek?.(boundHz(next, range));
    setDraft(null);
  }

  return <div className="ear-frequency-navigator">
    <div className="ear-frequency-heading">
      <div>
        <strong>{onSeek ? "Frequency navigator" : "EQ adjustment graph"}</strong>
        <div className="ear-frequency-legend" id={legendId}>
          <i data-measured={measured} data-before={!!plot.after} aria-hidden="true"/>
          <span>{legendLabel ?? (measured ? "Saved measurement" : "Flat guide")}</span>
          {plot.after && <><i data-measured="true" aria-hidden="true"/><span>After adjustments</span></>}
          {measured && response === undefined && <span className="ear-frequency-outside">Outside measured range</span>}
        </div>
      </div>
      {onSeek && <label className="ear-frequency-entry">Exact frequency (Hz)
        <input type="number" inputMode="numeric" min={range.from} max={range.to} step={1} value={draft ?? hz}
          onChange={event => setDraft(event.currentTarget.value)} onBlur={commitInput} onKeyDown={event => {
            if (event.key !== "Enter" && event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            if (event.key === "Enter") commitInput();
            else setDraft(null);
          }}/>
      </label>}
    </div>
    <div className="ear-frequency-chart" data-gain-axis={!!editor}>
      <div className="ear-frequency-stage" data-editing={!!editor?.bands.length}>
        <div className="ear-frequency-plot" data-seek={!!onSeek} {...(onSeek && {
          role: "slider", tabIndex: 0, "aria-label": "Frequency navigator", "aria-describedby": `${legendId} ${hintId}`,
          "aria-orientation": "horizontal", "aria-valuemin": range.from, "aria-valuemax": range.to, "aria-valuenow": hz,
          "aria-valuetext": `${hz.toLocaleString("en-US")} hertz`,
          onPointerDown: beginDrag, onPointerMove: moveDrag,
          onPointerUp: (event: PointerEvent<HTMLDivElement>) => { moveDrag(event); endDrag(event); },
          onPointerCancel: endDrag, onLostPointerCapture: endDrag, onKeyDown: handleKeys,
        })}>
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
            {ticks.map(tick => {
              const x = frequencyPosition(tick, range) * 1000;
              return <line key={tick} x1={x} x2={x} y1={0} y2={100} className="ear-frequency-grid" vectorEffect="non-scaling-stroke"/>;
            })}
            {plot.zero !== undefined && <line x1={0} x2={1000} y1={plot.zero} y2={plot.zero}
              className="ear-frequency-reference" vectorEffect="non-scaling-stroke"/>}
            {plot.visible.length > 1 && <path d={plot.path} className="ear-frequency-curve" data-before={!!plot.after} vectorEffect="non-scaling-stroke"/>}
            {plot.after && <path d={plot.after} className="ear-frequency-curve" vectorEffect="non-scaling-stroke"/>}
          </svg>
          {singlePoint && <span className="ear-frequency-sample" aria-hidden="true"
            style={{ left: `${frequencyPosition(singlePoint[0], range) * 100}%`, top: `${plot.y(singlePoint[1])}%` }}/>}
          <span className="ear-frequency-playhead" style={{ left: `${position * 100}%` }} aria-hidden="true"/>
          {response !== undefined && <span className="ear-frequency-marker" aria-hidden="true"
            style={{ left: `${position * 100}%`, top: `${plot.y(response)}%` }}/>}
          {markers?.map((marker, index) => <span className="ear-frequency-reveal-marker" aria-hidden="true" key={marker}
            style={{ left: `${frequencyPosition(marker, range) * 100}%`, top: `${plot.y(responseAt(plot.visible, marker) ?? 0)}%` }}>{index + 1}</span>)}
          {markers && [...new Set([plot.min, 0, plot.max])].map(gain => <span className="ear-frequency-gain-label" aria-hidden="true" key={gain}
            style={{ top: `${plot.y(gain)}%` }}>{gain > 0 ? "+" : ""}{gain.toFixed(1)} dB</span>)}
        </div>
        {gainTicks.map(db => <span key={db} className="ear-frequency-edit-gain-label" aria-hidden="true"
          style={{ top: `${plot.y(db)}%` }}>{db > 0 ? "+" : ""}{db}{db === 0 ? " dB" : ""}</span>)}
        {editor && <AdjustmentHandles editor={editor} range={range} x={hz => frequencyPosition(hz, range)}
          centerY={plot.centerY} gainSpan={plot.gainSpan}/>}
      </div>
      <div className="ear-frequency-axis" ref={axis} aria-hidden="true">
        {ticks.map(tick => <span key={tick} style={{ left: `${frequencyPosition(tick, range) * 100}%` }}>
          {tickLabel(tick)}{tick === range.to ? " Hz" : ""}
        </span>)}
      </div>
    </div>
    {onSeek && <p className="ear-frequency-hint" id={hintId}>Tap or drag the playhead to seek. Use the arrow keys or hold Shift while dragging for finer control.</p>}
    {editor && editor.bands.length > 0 && <>
      <AdjustmentSelection editor={editor}/>
      <p className="ear-frequency-hint">Drag a peak or dip marker up or down to change its gain. Drag either edge to change width while the center stays fixed.</p>
    </>}
  </div>;
}
