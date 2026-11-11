import { type PointerEvent, useRef } from "react";
import type { PeqFilter } from "@/lib/autoeq";
import type { EarSweep } from "@/lib/ear-tuning-audio";
import { boundedQ, halfGainEdges, maxQ, minQ, qForEdge } from "./adjustment-width";
import PeakDipIcon from "./peak-dip-icon";

export type Adjustment = PeqFilter & { id: string; kind: "peak" | "dip" };
export type AdjustmentEditor = {
  bands: Adjustment[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onChange: (id: string, update: Partial<Pick<Adjustment, "gain" | "q">>) => void;
};

export const gainLimit = (band: Adjustment) => band.kind === "peak" ? 12 : 6;
const label = (band: Adjustment, index: number) => `${band.kind === "peak" ? "Peak" : "Dip"} ${index + 1}`;
const formatHz = (hz: number) => Math.round(hz).toLocaleString("en-US") + " Hz";
const percent = (position: number) => `${Math.max(0, Math.min(1, position)) * 100}%`;

type HandleDrag = {
  pointerId: number;
  lastPosition: number;
  value: number;
  unitsPerPixel: number;
  apply: (value: number) => void;
  min: number;
  max: number;
};

export default function AdjustmentHandles({ editor, range, x, centerY, gainSpan }: {
  editor: AdjustmentEditor;
  range: EarSweep;
  x: (hz: number) => number;
  centerY: (band: Adjustment) => number;
  gainSpan: number;
}) {
  const chart = useRef<HTMLDivElement>(null);
  const drag = useRef<HandleDrag | null>(null);
  const { bands, selectedId, onSelect, onChange } = editor;
  const selected = bands.find(band => band.id === selectedId) ?? bands[0];
  if (!selected) return null;
  const [start, end] = halfGainEdges(selected.hz, selected.q);
  const setGain = (band: Adjustment, gain: number) => {
    const strength = Math.round(gain * 2) / 2;
    onChange(band.id, { gain: band.kind === "peak" ? Math.max(-gainLimit(band), Math.min(0, strength)) : Math.min(gainLimit(band), Math.max(0, strength)) });
  };

  function dragHandle(axis: "x" | "y", value: number, units: number, min: number, max: number, apply: HandleDrag["apply"]) {
    const position = (event: PointerEvent<HTMLDivElement>) => axis === "x" ? event.clientX : event.clientY;
    const move = (event: PointerEvent<HTMLDivElement>) => {
      const active = drag.current;
      if (active?.pointerId !== event.pointerId) return;
      const next = position(event);
      if (next === active.lastPosition) return;
      const delta = (next - active.lastPosition) * active.unitsPerPixel * (event.shiftKey ? .2 : 1);
      active.value = Math.max(active.min, Math.min(active.max, active.value + delta));
      active.lastPosition = next;
      active.apply(active.value);
    };
    const endDrag = (event: PointerEvent<HTMLDivElement>) => {
      if (drag.current?.pointerId === event.pointerId) drag.current = null;
    };
    return {
      onPointerDown(event: PointerEvent<HTMLDivElement>) {
        if (!event.isPrimary || event.button !== 0 || drag.current) return;
        const bounds = chart.current?.getBoundingClientRect();
        const size = axis === "x" ? bounds?.width : bounds?.height;
        if (!size) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { pointerId: event.pointerId, lastPosition: position(event), value, unitsPerPixel: units / size, min, max, apply };
      },
      onPointerMove: move,
      onPointerUp(event: PointerEvent<HTMLDivElement>) { move(event); endDrag(event); },
      onPointerCancel: endDrag,
      onLostPointerCapture: endDrag,
    };
  }

  return <div className="ear-band-overlay" ref={chart}>
    <div className="ear-band-span" aria-hidden="true" style={{ left: percent(x(start)), right: percent(1 - x(end)) }}/>
    {bands.map((band, index) => {
      const active = band.id === selected.id;
      const cut = band.kind === "peak";
      const min = cut ? -gainLimit(band) : 0;
      const max = cut ? 0 : gainLimit(band);
      return <div className="ear-band-handle ear-band-gain" data-active={active} data-kind={band.kind} key={band.id}
        role="slider" aria-label={`${label(band, index)} gain at ${formatHz(band.hz)}`} tabIndex={active ? 0 : -1}
        aria-orientation="vertical" aria-valuemin={min} aria-valuemax={max} aria-valuenow={band.gain}
        aria-valuetext={`${Math.abs(band.gain)} dB ${cut ? "cut" : "boost"}`}
        style={{ left: percent(x(band.hz)), top: percent(centerY(band)) }}
        onFocus={() => onSelect(band.id)}
        onKeyDown={event => {
          const step = event.shiftKey ? 1 : .5;
          const next = { ArrowUp: band.gain + step, ArrowDown: band.gain - step, Home: min, End: max }[event.key];
          if (next === undefined) return;
          event.preventDefault();
          event.stopPropagation();
          setGain(band, next);
        }}
        {...dragHandle("y", band.gain, -gainSpan, min, max, value => setGain(band, value))}>
        <PeakDipIcon kind={band.kind}/>
      </div>;
    })}
    {[start, end].map((hz, index) => {
      const lower = index === 0;
      const name = lower ? "Start" : "End";
      const [wideStart, wideEnd] = halfGainEdges(selected.hz, minQ);
      const [narrowStart, narrowEnd] = halfGainEdges(selected.hz, maxQ);
      const min = lower ? wideStart : narrowEnd;
      const max = lower ? narrowStart : wideEnd;
      const setEdge = (frequency: number) => onChange(selected.id, { q: qForEdge(selected.hz, frequency, lower) });
      return <div className="ear-band-handle ear-band-edge" data-edge={lower ? "start" : "end"} key={name}
        role="slider" tabIndex={0} aria-label={`${name} edge`} aria-valuemin={min} aria-valuemax={max}
        aria-valuenow={hz} aria-valuetext={`${formatHz(hz)}, Q ${selected.q}`} title={`${name} edge · ${formatHz(hz)}`}
        style={{ left: percent(x(hz)) }}
        onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          event.stopPropagation();
          if (event.key === "Home" || event.key === "End") {
            onChange(selected.id, { q: event.key === (lower ? "Home" : "End") ? minQ : maxQ });
          } else {
            const towardCenter = event.key === (lower ? "ArrowRight" : "ArrowLeft");
            const step = event.shiftKey ? .01 : .1;
            onChange(selected.id, { q: boundedQ(selected.q + (towardCenter ? step : -step)) });
          }
        }}
        {...dragHandle("x", Math.log(hz), Math.log(range.to / range.from), Math.log(min), Math.log(max), value => setEdge(Math.exp(value)))}>
        <span aria-hidden="true">{lower ? "‹" : "›"}</span>
      </div>;
    })}
  </div>;
}

export function AdjustmentSelection({ editor }: { editor: AdjustmentEditor }) {
  const active = editor.bands.find(band => band.id === editor.selectedId) ?? editor.bands[0];
  if (!active) return null;
  const [start, end] = halfGainEdges(active.hz, active.q);
  return <div className="ear-band-selection">
    <div role="group" aria-label="Select an adjustment">
      {editor.bands.map((band, index) => <button key={band.id} type="button" aria-pressed={band.id === active.id}
        onClick={() => editor.onSelect(band.id)}><PeakDipIcon kind={band.kind}/>{label(band, index)} · {formatHz(band.hz)}</button>)}
    </div>
    <small>Start {formatHz(start)} · End {formatHz(end)} · Q {active.q} · {Math.abs(active.gain)} dB {active.kind === "peak" ? "cut" : "boost"}</small>
  </div>;
}
