"use client";
import { PERSONAL_AREA_TITLE } from "@/lib/personal-area";
import { graphColor } from "@/lib/graph-theme";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type {Point} from "@/lib/curves";
import {eqResponse} from "@/lib/eq-response";
import {candidateKey,CLOSE_FIT_RMS_DB,fitsWithinBandLimit,recommendCandidates} from "@/lib/eq-recommendation";
import {FIT_BANDS, fitterLabel, isPeqdbMethod, type FitBands} from "@/lib/fitter-settings";
import { QUDELIX_GUIDE_MAX_BANDS, type FinalizedVariant } from "@/lib/preference-finalize";
import { MAX_MAIN_EQ_BANDS, type EqDeviceLimits } from "@/lib/use-generated-eq-results";
import { downloadChannelMatch, MAX_CHANNEL_MATCH_BANDS } from "@/lib/channel-match-export";
import "./eq-candidate-results.css";
import GeneratedEqComparison, { type GeneratedEqContext } from "./generated-eq-comparison";
import { generatedSignature } from "@/lib/generated-eq-comparison";
import type { ChannelMatch } from "@/lib/channel-balance";
const curveColors = [
  ["#ffdc83", "#805504"], ["#6de7cd", "#00665a"], ["#f3a3e2", "#8a3575"],
  ["#81c6ff", "#165f9c"], ["#f3a176", "#963b21"], ["#c1abfa", "#65449d"],
  ["#b5df80", "#426814"], ["#ff8ea8", "#a32d50"], ["#7edeea", "#146976"],
  ["#f9b7a9", "#8c413b"], ["#9aafff", "#4250a1"], ["#e9cfac", "#745b2f"],
  ["#b9ebc3", "#2f6f47"], ["#ffd8ad", "#9c541e"], ["#b7dafe", "#1c5a84"],
  ["#edbaff", "#76328c"], ["#b2db98", "#3e702b"],
].map(([dark, light]) => graphColor(dark, light));
const targetColor = graphColor("#c0c5cb", "#58656f");
const rawColor = graphColor("#839ba9", "#466170");
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
          <line x1={left} x2={right} y1={y(db)} y2={y(db)} stroke={graphColor("#253946", "#c5d4d5")}/>
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

const mainBandOptions = Array.from({ length: MAX_MAIN_EQ_BANDS }, (_, index) => index + 1);
const channelBandOptions = Array.from({ length: MAX_CHANNEL_MATCH_BANDS }, (_, index) => index + 1);

export function EqDeviceLimitFields({ limits, onChange }: { limits: EqDeviceLimits; onChange: (limits: EqDeviceLimits) => void }) {
  const mainLabel = useId();
  const channelLabel = useId();
  return <fieldset className="eq-device-limits">
    <legend>Device filter limits</legend>
    <label><span id={mainLabel}>Main EQ filter limit</span>
      <select aria-labelledby={mainLabel} value={limits.mainBands} onChange={event => onChange({ ...limits, mainBands: Number(event.target.value) })}>
        {mainBandOptions.map(bands => <option key={bands} value={bands}>{bands === MAX_MAIN_EQ_BANDS ? `${bands} bands or more` : `${bands} ${bands === 1 ? "band" : "bands"}`}</option>)}
      </select>
    </label>
    <label><span id={channelLabel}>Channel Match filter limit</span>
      <select aria-labelledby={channelLabel} value={limits.channelBands} onChange={event => onChange({ ...limits, channelBands: Number(event.target.value) })}>
        <option value={0}>No Channel Match TXT</option>
        {channelBandOptions.map(bands => <option key={bands} value={bands}>{bands} per side</option>)}
      </select>
    </label>
    <p>Enter the filters available for each stage on your playback device.</p>
  </fieldset>;
}

type EqCandidateResultsProps = {
  variants: FinalizedVariant[];
  raw: Point[];
  target: Point[];
  limits: EqDeviceLimits;
  onDownload: (fit: FinalizedVariant, format: string) => void;
  onSave: (fit: FinalizedVariant) => void;
  comparisonContext: GeneratedEqContext;
  channelMatch?: ChannelMatch;
  onCompare?: () => void;
  tuning?: boolean;
};

export default function EqCandidateResults({ variants, raw, target, limits, onDownload, onSave, comparisonContext, channelMatch, onCompare, tuning = false }: EqCandidateResultsProps) {
 const winners = useMemo(() => FIT_BANDS.map(bands => ({ bands, best: fitsWithinBandLimit(variants, bands).best })), [variants]);
 const { best: deviceBest, recommended } = useMemo(() => fitsWithinBandLimit(variants, limits.mainBands), [variants, limits.mainBands]);
 const overall = winners.at(-1)?.best;
 const lowerBoost = useMemo(() => tuning
   ? recommendCandidates(variants.filter(fit => fit.filters.length <= limits.mainBands), { raw, target })?.lowerBoost
   : null, [variants, tuning, raw, target, limits.mainBands]);
 const [selected, setSelected] = useState("");
 const [format, setFormat] = useState("txt");
 const [channelMessage, setChannelMessage] = useState("");
 const [comparison, setComparison] = useState<"pair" | "all" | "smoothing" | null>(null);
 const [comparisonBands, setComparisonBands] = useState<FitBands>();
 const smoothingHeading = useId();
 const smoothingBandLabel = useId();
 const quickPair = deviceBest && lowerBoost ? [deviceBest, lowerBoost] : null;
 const candidates = useMemo(() => lowerBoost?.reducedBoost ? [...variants, lowerBoost] : variants, [lowerBoost, variants]);
 const active = candidates.find(fit => candidateKey(fit) === selected) ?? recommended ?? overall;
 const plots = useMemo(() => candidates.map(fit => ({ fit, rows: eqResponse(raw, target, fit.filters, [], 48000, "1khz") ?? [] })), [candidates, raw, target]);
 if (!overall || !active || !plots[0]?.rows.length) return null;

 const canExport = active.filters.length <= limits.mainBands;
 const wrongGuideFormat = format === "qudelix5k" && active.filters.length > QUDELIX_GUIDE_MAX_BANDS;
 const overallLimit = winners.find(row => row.best === overall)?.bands;
 const availableBands = FIT_BANDS.filter(bands => (["peqdb", "peqdb-smoothed"] as const).every(method =>
   variants.some(fit => fit.bands === bands && fit.method === method && fit.engine === "peqdb")));
 const compareBands = comparisonBands && availableBands.includes(comparisonBands) ? comparisonBands
   : availableBands.includes(active.bands) ? active.bands : availableBands[0];
 const smoothingPair = (["peqdb", "peqdb-smoothed"] as const)
   .map(method => variants.find(fit => fit.bands === compareBands && fit.method === method && fit.engine === "peqdb"))
   .filter((fit): fit is FinalizedVariant => !!fit);
 const listeningFits = comparison === "smoothing" ? smoothingPair : comparison === "pair" && quickPair ? quickPair : variants;
 const signature = comparison ? generatedSignature({ raw, target, comparisonContext, channelMatch }, listeningFits) : "";

 function openComparison(mode: "pair" | "all" | "smoothing") {
   onCompare?.();
   setComparison(mode);
 }
 function downloadMatch() {
   if (!channelMatch) return;
   try {
     downloadChannelMatch(channelMatch, comparisonContext.headphones, "txt", limits.channelBands);
     setChannelMessage("Channel Match TXT downloaded.");
   } catch (error) {
     setChannelMessage(error instanceof Error ? error.message : "Could not download Channel Match.");
   }
 }
 function fitMetrics(fit: FinalizedVariant) {
   return <>
     <span><b>{fit.rms.toFixed(3)} dB RMS</b> fit error</span>
     <span>{fit.filters.length} filters · {fit.preamp.toFixed(1)} dB preamp</span>
   </>;
 }
 return <div className="eq-candidates">
   {comparison && <GeneratedEqComparison
     key={`${comparison}:${signature}`}
     variants={listeningFits}
     quick={comparison === "pair"}
     signature={signature}
     context={comparisonContext}
     sharedMatch={channelMatch}
     onClose={() => setComparison(null)}
     onChoose={fit => { setSelected(candidateKey(fit)); setComparison(null); }}
   />}
   {recommended ? <div className="eq-recommendation-explanation">
     <strong>Recommended for up to {limits.mainBands} bands</strong>
     <button type="button" className="eq-device-recommendation" aria-pressed={active === recommended} onClick={() => setSelected(candidateKey(recommended))}>
       <b>{fitterLabel(recommended)}</b>
       {fitMetrics(recommended)}
     </button>
     {recommended !== deviceBest && <p>This fit uses fewer filters and is within {CLOSE_FIT_RMS_DB.toFixed(2)} dB RMS of the lowest error for your device.</p>}
   </div> : <p className="eq-results-caveat">No generated fit uses {limits.mainBands} filters or fewer.</p>}
   <div className="eq-candidate-grid eq-limit-winners" role="group" aria-label="Lowest RMS by band limit">
     {winners.map(({ bands, best }) => best ? <button
       type="button" key={bands} className={`eq-candidate${bands === overallLimit ? " is-recommended" : ""}`}
       aria-pressed={active === best} onClick={() => setSelected(candidateKey(best))}
     >
       <strong>Up to {bands} bands</strong>
       <small>{fitterLabel(best)}</small>
       {fitMetrics(best)}
       {bands === overallLimit && <span className="eq-gold-badge">Lowest RMS overall</span>}
       {best.filters.length > limits.mainBands && <small>Exceeds device limit</small>}
     </button> : <div key={bands} className="eq-limit-unavailable">
       <strong>Up to {bands} bands</strong><small>No generated fit at this limit</small>
     </div>)}
   </div>
   <div className="eq-results-actions">
     <strong>Selected · {fitterLabel(active)}</strong>
     <label>Download format<select value={format} onChange={event => setFormat(event.target.value)}>
       <option value="txt">EQ TXT</option>
       <option value="equalizerapo">Equalizer APO · Windows</option>
       <option value="easyeffects">EasyEffects · Linux</option>
       <option value="qudelix5k">Qudelix 5K entry guide</option>
     </select></label>
     <button type="button" disabled={!canExport || wrongGuideFormat} onClick={() => onDownload(active, format)}>Download selected EQ</button>
     <button type="button" disabled={!canExport} onClick={() => onSave(active)}>Save selected EQ to {PERSONAL_AREA_TITLE}</button>
   </div>
   {!canExport ? <p className="eq-results-caveat" role="status">This EQ uses {active.filters.length} filters. Select a fit within your {limits.mainBands}-band Main EQ limit to save or download it.</p>
     : wrongGuideFormat && <p className="eq-results-caveat" role="status">The Qudelix entry guide accepts up to {QUDELIX_GUIDE_MAX_BANDS} filters. Select a smaller fit or a different format.</p>}
   {channelMatch && limits.channelBands > 0 && <div className="eq-results-actions eq-channel-export">
     <button type="button" onClick={downloadMatch}>Download Channel Match TXT</button>
     <span>Up to {limits.channelBands} filters per side</span>
     {channelMessage && <p role="status">{channelMessage}</p>}
   </div>}
   <EqResultsPlot plots={plots} active={active}/>
   <details className="eq-results-advanced">
     <summary>Compare all fits</summary>
     <div className="eq-results-audition">
       <button type="button" onClick={() => openComparison("all")}>Listen to {variants.length} generated EQs</button>
       <p>Choose Tie if both fits sound the same to you. If there’s no clear preference, use the recommended fit for your device.</p>
     </div>
     <div className="eq-candidate-grid" role="group" aria-label="All generated fits">
       {variants.map(fit => <button
         type="button" key={candidateKey(fit)} className={`eq-candidate${fit === overall ? " is-recommended" : ""}`}
         aria-pressed={active === fit} onClick={() => setSelected(candidateKey(fit))}
       >
         <strong>{fitterLabel(fit)}</strong>
         {fitMetrics(fit)}
         {fit === overall && <span className="eq-gold-badge">Lowest RMS overall</span>}
         {fit.filters.length > limits.mainBands && <small>Exceeds device limit</small>}
         {isPeqdbMethod(fit.method) && fit.engine !== "peqdb" && <small>Precise fallback · PEQdB unavailable</small>}
       </button>)}
     </div>
     {quickPair && lowerBoost && <section className="eq-results-audition" aria-label="Lower boost comparison">
       <button type="button" onClick={() => setSelected(candidateKey(lowerBoost))}>Select lower boost</button>
       <button type="button" onClick={() => openComparison("pair")}>Listen to both EQs</button>
       <p>{lowerBoost.rms.toFixed(3)} dB RMS · {lowerBoost.peakBoost.toFixed(1)} dB peak boost</p>
     </section>}
 {smoothingPair.length === 2 ? <section className="eq-smoothing-comparison" aria-labelledby={smoothingHeading}>
   <div className="eq-smoothing-header">
     <h3 id={smoothingHeading}>Compare PEQdB smoothing</h3>
     <label><span id={smoothingBandLabel}>Band count</span><select aria-labelledby={smoothingBandLabel} value={compareBands} onChange={event => setComparisonBands(Number(event.target.value) as FitBands)}>
       {availableBands.map(bands => <option key={bands} value={bands}>{bands} bands</option>)}
     </select></label>
   </div>
   <p>Lower fit error means a closer match to your measured target. Lower peak boost needs less headroom.</p>
   <div className="eq-smoothing-choices" role="group" aria-label="PEQdB fits with the same band count">
     {smoothingPair.map((fit, index) => {
       const other = smoothingPair[1 - index];
       const error = fit.rms.toFixed(2), boost = fit.peakBoost.toFixed(1);
       const closer = fit.rms < other.rms;
       const lessBoost = Number(boost) < Number(other.peakBoost.toFixed(1));
       return <button type="button" className="eq-candidate" key={fit.method} aria-pressed={active === fit}
         onClick={() => { setComparisonBands(fit.bands); setSelected(candidateKey(fit)); }}>
         <strong>{index === 0 ? "Unsmoothed" : "Smoothed"}</strong>
         <small>{index === 0 ? "Follows finer details in the measurement." : "Softens narrow peaks and dips before fitting."}</small>
         <span>Full-range fit error <b>{error} dB RMS</b>{closer && <small className="eq-fit-advantage">Closer to target</small>}</span>
         <span>Peak boost <b>{boost} dB</b>{lessBoost && <small className="eq-fit-advantage">Less peak boost</small>}</span>
       </button>;
     })}
   </div>
   <div className="eq-results-audition"><button type="button" onClick={() => openComparison("smoothing")}>Listen to both PEQdB fits</button></div>
 </section> : variants.some(fit => fit.method === "peqdb-smoothed" && fit.engine !== "peqdb") ?
   <p className="eq-results-caveat">PEQdB was unavailable for this generation. The fallback results cannot show the effect of smoothing.</p> :
   <p className="eq-results-caveat">Regenerate EQ settings to compare Smoothed and Unsmoothed PEQdB fits.</p>}
   </details>
   <p className="eq-results-caveat">Preamp values nearer 0 dB need less attenuation. Fit error measures the match to this headphone measurement.</p>
 </div>;
}
