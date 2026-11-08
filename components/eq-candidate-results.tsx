"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type {Point} from "@/lib/curves";
import {eqResponse} from "@/lib/eq-response";
import {candidateKey,deepBassBoost,recommendCandidates} from "@/lib/eq-recommendation";
import {fitterLabel} from "@/lib/fitter-settings";
import type {FinalizedVariant} from "@/lib/preference-finalize";
import "./eq-candidate-results.css";
import GeneratedEqComparison, { type GeneratedEqContext } from "./generated-eq-comparison";
import { generatedSignature } from "@/lib/generated-eq-comparison";
import type { ChannelMatch } from "@/lib/channel-balance";
const curveColors = ["#ffdc83", "#6de7cd", "#f3a3e2", "#81c6ff", "#f3a176", "#c1abfa", "#b5df80",
  "#ff8ea8", "#7edeea", "#f9b7a9", "#9aafff", "#e9cfac", "#b9ebc3"];
const targetColor = "#c0c5cb";
const rawColor = "#839ba9";
type Plot = { fit: FinalizedVariant; rows: NonNullable<ReturnType<typeof eqResponse>> };
type CurveSelection = "selected" | "all" | Set<string>;

function EqResultsPlot({ plots, active }: { plots: Plot[]; active: FinalizedVariant }) {
  const [deviation, setDeviation] = useState(true);
  const [selection, setSelection] = useState<CurveSelection>("selected");
  const surface = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  useEffect(() => {
    const node = surface.current;
    if (!node) return;
    const resize = () => setWidth(Math.round(node.clientWidth) || 720);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const series = plots.map(({ fit, rows }, index) => ({
    id: candidateKey(fit),
    rows,
    rms: fit.rms,
    color: curveColors[index % curveColors.length],
    label: fitterLabel(fit) + (fit.reducedBoost ? " · reduced boost" : fit.fallbackReason ? " · fallback" : ""),
  }));
  const activeKey = candidateKey(active);
  const visible = series.filter(row => selection === "all" || (selection === "selected" ? row.id === activeKey : selection.has(row.id)));
  const base = plots[0].rows;
  const levels = (row: Plot["rows"][number]) => deviation ? row.after - row.target! : row.after;
  let min = 0, max = 0;
  for (const curve of visible) for (const row of curve.rows) {
    const level = levels(row);
    min = Math.min(min, level);
    max = Math.max(max, level);
  }
  if (!deviation) for (const row of base) {
    min = Math.min(min, row.raw, row.target!);
    max = Math.max(max, row.raw, row.target!);
  }

  const extent = Math.max(-min, max);
  const step = deviation
    ? ([.5, 1, 2, 5, 10].find(value => value * 4 >= extent) ?? Math.ceil(extent / 40) * 10)
    : Math.max(5, Math.ceil((max - min + 4) / 45) * 5);
  const limit = Math.max(step * 2, Math.ceil(extent / step) * step);
  const low = deviation ? -limit : Math.floor((min - 2) / step) * step;
  const high = deviation ? limit : Math.ceil((max + 2) / step) * step;
  const ticks = Array.from({ length: Math.round((high - low) / step) + 1 }, (_, i) => low + i * step);
  const left = 40, right = width - 17, top = 18, bottom = 209;
  const x = (hz: number) => left + Math.log(hz / 20) / Math.log(1000) * (right - left);
  const y = (db: number) => top + (high - db) / (high - low) * (bottom - top);
  const path = (rows: Plot["rows"], value: (row: Plot["rows"][number]) => number) =>
    rows.map((row, i) => `${i ? "L" : "M"}${x(row.hz).toFixed(2)} ${y(value(row)).toFixed(2)}`).join(" ");
  const drawn = [...visible.filter(row => row.id !== activeKey), ...visible.filter(row => row.id === activeKey)];

  return <section className="eq-results-plot" aria-label="Generated EQ graph">
    <div className="eq-plot-tools">
      <div role="group" aria-label="Graph view">
        <button type="button" aria-pressed={deviation} onClick={() => setDeviation(true)}>Deviation from target</button>
        <button type="button" aria-pressed={!deviation} onClick={() => setDeviation(false)}>Response</button>
      </div>
      <div role="group" aria-label="Curves to show">
        <button type="button" onClick={() => setSelection("all")}>Show all EQs</button>
        <button type="button" onClick={() => setSelection("selected")}>Show selected EQ</button>
      </div>
    </div>
    <p className="eq-plot-caption">{deviation
      ? "The gray dotted line is the target at 0 dB. Above it means more level than the target. Below it means less."
      : "Compare the solid predictions with the gray dotted target and the muted raw headphone response."}</p>
    <div className="eq-plot-surface" ref={surface}>
      <svg viewBox={`0 0 ${width} 248`} role="img" aria-label={deviation ? "Predicted EQ deviation from the target in decibels" : "Raw response, target and predicted EQ responses"}>
        {ticks.map(db => <g key={db}>
          <line x1={left} x2={right} y1={y(db)} y2={y(db)} stroke="#253946"/>
          <text x={left - 7} y={y(db) + 4} textAnchor="end">{deviation && db > 0 ? "+" : ""}{db}</text>
        </g>)}
        {(width < 380 ? [20, 100, 1000, 5000, 20000] : [20, 100, 1000, 10000, 20000]).map(hz => <text key={hz} x={x(hz)} y="227" textAnchor={hz === 20000 ? "end" : "middle"}>{hz >= 1000 ? `${hz / 1000}k` : hz}</text>)}
        <text x={right} y="244" textAnchor="end">Hz</text>
        <text x={left - 7} y="11" textAnchor="end">dB</text>
        {!deviation && <path d={path(base, row => row.raw)} fill="none" stroke={rawColor} strokeWidth="1.6"/>}
        {drawn.map(row => <path key={row.id} data-eq-curve={row.id} d={path(row.rows, levels)} fill="none"
          stroke={row.color} opacity={row.id === activeKey ? 1 : .88} strokeWidth={row.id === activeKey ? 2.8 : 1.7} strokeLinejoin="round">
          <title>{row.label} · {row.rms.toFixed(2)} dB fit error</title>
        </path>)}
        <path d={deviation ? `M${left} ${y(0)} H${right}` : path(base, row => row.target!)}
          fill="none" stroke={targetColor} strokeWidth="1.8" strokeDasharray="1 5" strokeLinecap="round"/>
      </svg>
    </div>
    <details className="eq-plot-series">
      <summary>Advanced curve selection · {visible.length} of {series.length} shown</summary>
      <div role="group" aria-label="Individual EQ curves">
        {series.map(row => <label key={row.id}>
          <input type="checkbox" checked={visible.includes(row)} onChange={event => {
            const keys = new Set(visible.map(curve => curve.id));
            if (event.target.checked) keys.add(row.id);
            else keys.delete(row.id);
            setSelection(keys);
          }}/>
          <span className="eq-curve-swatch" style={{ backgroundColor: row.color }} aria-hidden="true"/>
          <span>{row.label}<small>{row.rms.toFixed(2)} dB fit error</small></span>
        </label>)}
      </div>
    </details>
  </section>;
}

export default function EqCandidateResults({variants,raw,target,onDownload,onSave,comparisonContext,channelMatch,onCompare,tuning=false}:{variants:FinalizedVariant[];raw:Point[];target:Point[];onDownload:(fit:FinalizedVariant,format:string)=>void;onSave:(fit:FinalizedVariant)=>void;comparisonContext:GeneratedEqContext;channelMatch?:ChannelMatch;onCompare?:()=>void;tuning?:boolean}) {
 const awards=useMemo(()=>recommendCandidates(variants,tuning ? {raw,target} : undefined),[variants,tuning,raw,target]);
 const [selected,setSelected]=useState("");const [format,setFormat]=useState("txt");
 const [comparison,setComparison]=useState<"pair" | "all" | null>(null);
 const quickPair=useMemo(() => awards && awards.recommended !== awards.bestError
   ? [awards.recommended, awards.bestError]
   : null, [awards]);
 const signature=useMemo(()=>generatedSignature({raw,target,comparisonContext,channelMatch},variants),[raw,target,comparisonContext,channelMatch,variants]);
 const candidates=useMemo(() => awards?.recommended.reducedBoost
   ? [awards.recommended, ...variants]
   : variants, [awards, variants]);
 const active=candidates.find(f=>candidateKey(f)===selected)??awards?.recommended;
 const plots=useMemo(()=>candidates.map(fit=>({fit,rows:eqResponse(raw,target,fit.filters,[],48000,"1khz")??[]})),[candidates,raw,target]);
 if(!awards||!active||!plots[0]?.rows.length)return null;
 const exportFormat=format==="qudelix5k"&&active.bands>20?"txt":format;
 function openComparison(mode: "pair" | "all") {
   onCompare?.();
   setComparison(mode);
 }
 const allResultsButton = <div className="eq-results-audition">
   <button type="button" onClick={() => openComparison("all")}>Compare {variants.length} generated EQ results</button>
   <p>Choose which results from this generation to compare by listening.</p>
 </div>;
 const choiceLabel = (fit: FinalizedVariant) =>
   fit === awards.recommended ? "Recommended EQ" : fit === awards.bestError ? "Closer fit" : "EQ selected under Advanced";
 const candidateGrid = <div className="eq-candidate-grid" role="group" aria-label="Generated EQ comparisons">{candidates.map(fit=>{const recommended=fit===awards.recommended,headroom=Math.abs(fit.preamp-awards.leastHeadroom.preamp)<.05;return <button type="button" key={candidateKey(fit)} className={`eq-candidate${recommended?" is-recommended":""}${headroom?" is-headroom":""}`} aria-pressed={active===fit} onClick={()=>setSelected(candidateKey(fit))}><strong>{fitterLabel(fit)}{fit.reducedBoost ? " · reduced boost" : ""}</strong>{recommended&&<span className="eq-gold-badge">Recommended</span>}{headroom&&<span className="eq-headroom-badge">Least preamp reduction</span>}{fit===awards.bestError&&<small>Lowest numerical error</small>}<span>Fit error <b>{fit.rms.toFixed(2)} dB RMS</b></span><span>Preamp <b>{fit.preamp.toFixed(1)} dB</b></span><small>{fit.engine==="peqdb"?"PEQdB engine":fit.method==="peqdb"?"Precise fallback · PEQdB unavailable":"YinYang engine"} · max Q {Math.max(...fit.filters.map(f=>f.q)).toFixed(2)}</small></button>;})}</div>;
 return <div className="eq-candidates">
   {comparison && <GeneratedEqComparison
     key={`${comparison}:${signature}`}
     variants={comparison === "pair" && quickPair ? quickPair : variants}
     quick={comparison === "pair"}
     signature={signature}
     context={comparisonContext}
     sharedMatch={channelMatch}
     onClose={() => setComparison(null)}
     onChoose={fit => { setSelected(candidateKey(fit)); setComparison(null); }}
   />}
   {tuning ? <>
     <div className="eq-recommendation-explanation">
       <strong>Recommended EQ</strong>
       <p>Balances matching your target with keeping boosts smaller, especially in deep bass.</p>
       {awards.recommended.reducedBoost && <p>Uses a smaller adjustment to keep boost within 6 dB in deep bass and 8 dB overall.</p>}
       {!quickPair && <p>This EQ also comes closest to your target among the generated results.</p>}
     </div>
     <div className="eq-tuning-choices" role="group" aria-label="Select an EQ">
       {(quickPair ?? [awards.recommended]).map(fit => <button
         type="button" key={candidateKey(fit)}
         className={`eq-candidate${fit === awards.recommended ? " is-recommended" : ""}`}
         aria-pressed={active === fit} onClick={() => setSelected(candidateKey(fit))}
       >
         <strong>{choiceLabel(fit)}</strong>
         <span>Deep bass boost <b>{deepBassBoost(fit).toFixed(1)} dB</b></span>
         <span>Fit error <b>{fit.rms.toFixed(2)} dB</b></span>
       </button>)}
     </div>
     {quickPair && <div className="eq-results-audition">
       <button type="button" onClick={() => openComparison("pair")}>Listen to both EQs</button>
       <p>Switch between the recommendation and the closer fit while the same music plays.</p>
     </div>}
   </> : <>
     {allResultsButton}
     <div className="eq-recommendation-explanation">
       <strong>Recommended · {fitterLabel(awards.recommended)}</strong>
       <p>Favors fewer bands and less preamp reduction among fits with similar numerical error and moderate filter widths.</p>
     </div>
   </>}
 <EqResultsPlot plots={plots} active={active}/>
 {tuning ? <details className="eq-results-advanced">
   <summary>Advanced EQ results</summary>
   {allResultsButton}
   {candidateGrid}
 </details> : candidateGrid}
 <div className="eq-results-actions"><strong>Selected · {tuning ? choiceLabel(active) : fitterLabel(active)}</strong><label>Download format<select value={exportFormat} onChange={e=>setFormat(e.target.value)}><option value="txt">EQ TXT</option><option value="equalizerapo">Equalizer APO · Windows</option><option value="easyeffects">EasyEffects · Linux</option><option value="qudelix5k" disabled={active.bands>20}>Qudelix 5K · up to 20 bands</option></select></label><button type="button" onClick={()=>onDownload(active,exportFormat)}>Download selected EQ</button><button type="button" onClick={()=>onSave(active)}>Save selected EQ to My space</button></div><p className="eq-results-caveat">Preamp values nearer 0 dB need less attenuation. The graph excludes uniform volume and preamp, so it shows changes in sound balance. Predictions use the uploaded measurement, not a new measurement at your ears. Extra bands and lower errors can also follow measurement artifacts.</p>
 </div>;
}
