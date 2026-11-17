import { peakingHalfGainEdges } from "@/lib/peq-preset";

const graphRate = 48000;
export const minQ = .1;
export const maxQ = 20;

export const halfGainEdges = (hz: number, q: number) => peakingHalfGainEdges(hz, q, graphRate);

export const boundedQ = (q: number) => Math.max(minQ, Math.min(maxQ, Math.round(q * 100) / 100));

export function qForEdge(hz: number, frequency: number, lower: boolean) {
  if (lower ? frequency >= hz : frequency <= hz) return maxQ;
  if (frequency <= 0 || frequency >= graphRate / 2) return minQ;
  const ratio = Math.tan(Math.PI * frequency / graphRate) / Math.tan(Math.PI * hz / graphRate);
  return boundedQ(1 / Math.abs(ratio - 1 / ratio));
}

function WidthNumber({ label, value, min, max, step, onCommit }: {
  label: string; value: number; min: number; max: number; step: number; onCommit: (value: number) => void;
}) {
  return <label>{label}<input key={value} type="number" inputMode="decimal" min={min} max={max} step={step}
    defaultValue={value} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }}
    onBlur={event => {
      const next = event.currentTarget.valueAsNumber;
      event.currentTarget.value = String(value);
      if (Number.isFinite(next) && next !== value) onCommit(next);
    }}/></label>;
}

export default function AdjustmentWidth({ hz, q, onChange }: { hz: number; q: number; onChange: (q: number) => void }) {
  const [start, end] = halfGainEdges(hz, q);
  const preset = [1.5, 4, 8].includes(q) ? q : "custom";
  const setQ = (value: number) => onChange(boundedQ(value));
  function setEdge(frequency: number, lower: boolean) {
    if (frequency <= 0 || frequency >= graphRate / 2 || (lower ? frequency >= hz : frequency <= hz)) return;
    onChange(qForEdge(hz, frequency, lower));
  }
  return <>
    <label>Width<select value={preset} onChange={event => setQ(Number(event.target.value))}>
      <option value={1.5}>Wide</option><option value={4}>Medium</option><option value={8}>Narrow</option>
      {preset === "custom" && <option value="custom" disabled>Custom</option>}
    </select></label>
    <details className="ear-adjustment-width">
      <summary>Fine-tune Q and edges</summary>
      <div className="ear-adjustment-width-fields">
        <WidthNumber label="Q" value={q} min={minQ} max={maxQ} step={.01} onCommit={setQ}/>
        <WidthNumber label="Start (Hz)" value={Math.round(start * 10) / 10} min={.1} max={hz - .1} step={.1} onCommit={value => setEdge(value, true)}/>
        <WidthNumber label="End (Hz)" value={Math.round(end * 10) / 10} min={hz + .1} max={graphRate / 2 - .1} step={.1} onCommit={value => setEdge(value, false)}/>
      </div>
      <small>Higher Q means a narrower band. The edges show where the cut or boost reaches half its strength. Editing either edge changes the width around the same center.</small>
    </details>
  </>;
}
