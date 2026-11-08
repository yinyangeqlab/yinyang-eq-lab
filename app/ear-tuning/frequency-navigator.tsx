"use client";

import { type KeyboardEvent, type PointerEvent, useId, useMemo, useRef, useState } from "react";
import type { Point } from "@/lib/curves";
import { EAR_HIGH_HZ, EAR_LOW_HZ, sweepFrequency } from "@/lib/ear-tuning-audio";
import "./frequency-navigator.css";

type Props = {
  frequency: number;
  points?: readonly Point[];
  onSeek: (hz: number) => void;
};

type Drag = { pointerId: number; lastX: number; position: number; width: number; frequency: number };

const ticks = [40, 100, 250, 1000, 4000, 16000];
const fineSpeed = .18;
const range = { from: EAR_LOW_HZ, to: EAR_HIGH_HZ };
const clampPosition = (position: number) => Math.min(1, Math.max(0, position));
const frequencyPosition = (hz: number) => Math.log(hz / EAR_LOW_HZ) / Math.log(EAR_HIGH_HZ / EAR_LOW_HZ);
const boundHz = (hz: number) => Number.isFinite(hz) ? Math.min(EAR_HIGH_HZ, Math.max(EAR_LOW_HZ, Math.round(hz))) : EAR_LOW_HZ;
const frequencyAt = (position: number) => boundHz(sweepFrequency(range, position));

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

function measurementPlot(points?: readonly Point[]) {
  const unique = new Map<number, number>();
  for (const point of points ?? []) {
    if (!Array.isArray(point)) continue;
    const [hz, db] = point;
    if (Number.isFinite(hz) && hz >= 20 && hz <= 20000 && Number.isFinite(db) && db >= -200 && db <= 200) {
      unique.set(hz, db);
    }
  }
  const sorted = [...unique].sort(([a], [b]) => a - b);
  const visible = sorted.filter(([hz]) => hz >= EAR_LOW_HZ && hz <= EAR_HIGH_HZ);
  const left = responseAt(sorted, EAR_LOW_HZ);
  const right = responseAt(sorted, EAR_HIGH_HZ);
  if (left !== undefined && visible[0]?.[0] !== EAR_LOW_HZ) visible.unshift([EAR_LOW_HZ, left]);
  if (right !== undefined && visible[visible.length - 1]?.[0] !== EAR_HIGH_HZ) visible.push([EAR_HIGH_HZ, right]);

  let min = visible[0]?.[1] ?? -6;
  let max = visible[0]?.[1] ?? 6;
  for (const [, db] of visible) {
    min = Math.min(min, db);
    max = Math.max(max, db);
  }
  const margin = Math.max(.5, (max - min) * .08);
  const y = (db: number) => 100 * (max + margin - db) / (max - min + 2 * margin);
  const path = visible.map(([hz, db], index) =>
    `${index ? "L" : "M"}${(frequencyPosition(hz) * 1000).toFixed(2)} ${y(db).toFixed(2)}`).join(" ");
  return { visible, y, path, zero: min <= 0 && max >= 0 ? y(0) : undefined };
}

export default function FrequencyNavigator({ frequency, points, onSeek }: Props) {
  const drag = useRef<Drag | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const hintId = useId();
  const legendId = useId();
  const hz = boundHz(frequency);
  const position = frequencyPosition(hz);
  const plot = useMemo(() => measurementPlot(points), [points]);
  const measured = plot.visible.length > 0;
  const response = measured ? responseAt(plot.visible, hz) : 0;
  const singlePoint = plot.visible.length === 1 ? plot.visible[0] : undefined;

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || drag.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width) return;
    const relativeX = event.clientX - bounds.left;
    const nearPlayhead = Math.abs(relativeX - position * bounds.width) <= 12;
    const start = nearPlayhead || event.shiftKey ? position : clampPosition(relativeX / bounds.width);
    const next = frequencyAt(start);
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, lastX: event.clientX, position: start, width: bounds.width, frequency: next };
    onSeek(next);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    // Apply the current speed only to new movement, so pressing Shift never shifts the playhead by itself.
    const delta = (event.clientX - active.lastX) / active.width;
    active.lastX = event.clientX;
    active.position = clampPosition(active.position + delta * (event.shiftKey ? fineSpeed : 1));
    const next = frequencyAt(active.position);
    if (next !== active.frequency) {
      active.frequency = next;
      onSeek(next);
    }
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }

  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 1 / 96 : 1 / 12;
    let next: number;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown": next = hz * 2 ** -step; break;
      case "ArrowRight":
      case "ArrowUp": next = hz * 2 ** step; break;
      case "PageDown": next = hz / 2; break;
      case "PageUp": next = hz * 2; break;
      case "Home": next = EAR_LOW_HZ; break;
      case "End": next = EAR_HIGH_HZ; break;
      default: return;
    }
    event.preventDefault();
    event.stopPropagation();
    // Rounding to whole hertz must not trap fine arrow movement at the bottom of the range.
    const rounded = next === hz ? hz : next < hz ? Math.min(hz - 1, Math.round(next)) : Math.max(hz + 1, Math.round(next));
    onSeek(boundHz(rounded));
  }

  function commitInput() {
    const next = draft?.trim() ? Number(draft) : NaN;
    if (Number.isFinite(next)) onSeek(boundHz(next));
    setDraft(null);
  }

  return <div className="ear-frequency-navigator">
    <div className="ear-frequency-heading">
      <div>
        <strong>Frequency navigator</strong>
        <div className="ear-frequency-legend" id={legendId}>
          <i data-measured={measured} aria-hidden="true"/>
          <span>{measured ? "Saved headphone response" : "Flat guide"}</span>
          {measured && response === undefined && <span className="ear-frequency-outside">Outside measured range</span>}
        </div>
      </div>
      <label className="ear-frequency-entry">Exact frequency (Hz)
        <input type="number" inputMode="numeric" min={EAR_LOW_HZ} max={EAR_HIGH_HZ} step={1} value={draft ?? hz}
          onChange={event => setDraft(event.currentTarget.value)} onBlur={commitInput} onKeyDown={event => {
            if (event.key !== "Enter" && event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            if (event.key === "Enter") commitInput();
            else setDraft(null);
          }}/>
      </label>
    </div>
    <div className="ear-frequency-chart">
      <div className="ear-frequency-plot" role="slider" tabIndex={0} aria-label="Frequency navigator" aria-describedby={`${legendId} ${hintId}`}
        aria-orientation="horizontal" aria-valuemin={EAR_LOW_HZ} aria-valuemax={EAR_HIGH_HZ} aria-valuenow={hz}
        aria-valuetext={`${hz.toLocaleString("en-US")} hertz`}
        onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={event => { moveDrag(event); endDrag(event); }}
        onPointerCancel={endDrag} onLostPointerCapture={endDrag} onKeyDown={handleKeys}>
        <svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
          {ticks.map(tick => {
            const x = frequencyPosition(tick) * 1000;
            return <line key={tick} x1={x} x2={x} y1={0} y2={100} className="ear-frequency-grid" vectorEffect="non-scaling-stroke"/>;
          })}
          {plot.zero !== undefined && <line x1={0} x2={1000} y1={plot.zero} y2={plot.zero}
            className="ear-frequency-reference" vectorEffect="non-scaling-stroke"/>}
          {plot.visible.length > 1 && <path d={plot.path} className="ear-frequency-curve" vectorEffect="non-scaling-stroke"/>}
        </svg>
        {singlePoint && <span className="ear-frequency-sample" aria-hidden="true"
          style={{ left: `${frequencyPosition(singlePoint[0]) * 100}%`, top: `${plot.y(singlePoint[1])}%` }}/>}
        <span className="ear-frequency-playhead" style={{ left: `${position * 100}%` }} aria-hidden="true"/>
        {response !== undefined && <span className="ear-frequency-marker" aria-hidden="true"
          style={{ left: `${position * 100}%`, top: `${plot.y(response)}%` }}/>}
      </div>
      <div className="ear-frequency-axis" aria-hidden="true">
        {ticks.map(tick => <span key={tick} style={{ left: `${frequencyPosition(tick) * 100}%` }}>
          {tick < 1000 ? tick : `${tick / 1000}k`}{tick === EAR_HIGH_HZ ? " Hz" : ""}
        </span>)}
      </div>
    </div>
    <p className="ear-frequency-hint" id={hintId}>Tap or drag to seek. Use the arrow keys or hold Shift while dragging for finer control.</p>
  </div>;
}
