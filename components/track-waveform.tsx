"use client";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { adjustComparisonPassage, adjustResizablePassage, type ComparisonPassage } from "@/lib/comparison-passage";
import type { TrackAnalysis } from "@/lib/loudness";
import { previewDynamics } from "@/lib/dynamics-preview";
import "./passage-selection.css";
import {useWaveformPeaks} from "@/components/use-waveform-peaks";
import {peakColumns} from "@/lib/waveform-peaks";

function seekClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total % 3600 / 60);
  const rest = String(total % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

type Props = { playing?:boolean; getPlaybackPosition?:()=>number; deferDetail?:boolean; sourceUrl?:string; resizablePassage?: boolean; viewCenter?:number|null; maxZoom?:number; onPassageChange?: (passage: ComparisonPassage) => void; passage?: ComparisonPassage | null; passageActive?: boolean; analysis: Pick<TrackAnalysis, "waveform"> | null; position: number; duration: number; onSeek: (seconds: number) => void; dynamicRange: number; onDynamicRangeChange: (amount: number) => void; dynamicSliderEnabled?: boolean; dynamicRangeDisabled?: boolean; compact?: boolean; placeholder?: string; zoom?: number; onZoom?: (value: number) => void; hideZoom?: boolean; hideHeading?: boolean; displayOnly?: boolean };

export default function TrackWaveform({ playing=false, getPlaybackPosition, analysis:sourceAnalysis, sourceUrl, deferDetail=false, position, duration, onSeek, dynamicRange, onDynamicRangeChange, dynamicSliderEnabled = false, dynamicRangeDisabled = false, compact = false, placeholder = "Waveform appears after a stereo track is analyzed.", zoom: controlledZoom, onZoom, hideZoom = false, hideHeading = false, displayOnly = false, passage = null, passageActive = false, onPassageChange, resizablePassage=false, viewCenter=null, maxZoom=8 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playedCanvasRef = useRef<HTMLCanvasElement>(null);
  const playedLayerRef = useRef<HTMLSpanElement>(null);
  const playheadRef = useRef<HTMLSpanElement>(null);
  const paintPlayheadRef = useRef<(() => void) | null>(null);
  const playbackPositionRef = useRef(position);
  const playbackClockRef = useRef(getPlaybackPosition);
  useEffect(() => { playbackPositionRef.current=position; playbackClockRef.current=getPlaybackPosition; paintPlayheadRef.current?.(); }, [position,getPlaybackPosition]);
  const [zoomAnchor,setZoomAnchor]=useState(position);
  const [plotWidth,setPlotWidth]=useState(1024);
  const [visible,setVisible]=useState(false);
  const seekGuideRef = useRef<HTMLSpanElement>(null);
  const seekTimeRef = useRef<HTMLSpanElement>(null);
  const dragging = useRef(false);
  const passageDrag = useRef<{ pointerId: number; x: number; secondsPerPixel: number; range: ComparisonPassage; mode: "move" | "start" | "end"; dragged: boolean; threshold: number } | null>(null);
  const keyboardSeekPosition = useRef(position);
  const keyboardRepeat = useRef<{ key: string; timer: ReturnType<typeof setTimeout> | null } | null>(null);
  const stopKeyboardSeek = () => {
    if (keyboardRepeat.current?.timer) clearTimeout(keyboardRepeat.current.timer);
    keyboardRepeat.current = null;
  };
  useEffect(() => {
    window.addEventListener("blur", stopKeyboardSeek);
    document.addEventListener("visibilitychange", stopKeyboardSeek);
    return () => {
      stopKeyboardSeek();
      window.removeEventListener("blur", stopKeyboardSeek);
      document.removeEventListener("visibilitychange", stopKeyboardSeek);
    };
  }, []);
  useEffect(() => { keyboardSeekPosition.current = position; }, [position]);
  const seekTo = (seconds: number) => {
    const next = Math.max(0, Math.min(duration, seconds));
    keyboardSeekPosition.current = next;
    setZoomAnchor(next);
    onSeek(next);
  };
  const currentSeek = useRef(seekTo);
  useEffect(() => { currentSeek.current = seekTo; });
  const seekAtPointer = (clientX: number, focusCanvas = true) => {
    const canvas = canvasRef.current, rect = canvas?.getBoundingClientRect();
    if (!canvas || !rect?.width || !duration || displayOnly) return;
    seekTo(start + (clientX - rect.left) / rect.width * span);
    if (focusCanvas) canvas.focus({ preventScroll: true });
  };
  const [internalZoom, setInternalZoom] = useState(1);
  const zoom = controlledZoom ?? internalZoom;
  const setZoom = onZoom ?? setInternalZoom;
  useEffect(() => { setZoomAnchor(playbackClockRef.current?.()??playbackPositionRef.current); }, [zoom,duration]);
  const span = duration / zoom;
  const start = zoom === 1 ? 0 : Math.max(0, Math.min(duration - span, (viewCenter??zoomAnchor) - span / 2));
  const {waveform:detailed,status:detailStatus}=useWaveformPeaks(!deferDetail||visible?sourceUrl:undefined,plotWidth*zoom);
  const analysis=detailed??sourceAnalysis;
  useEffect(()=>{const canvas=canvasRef.current;if(!canvas)return;const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting),{rootMargin:"100px"});observer.observe(canvas);return()=>observer.disconnect();},[]);
  useEffect(()=>{const canvas=canvasRef.current;if(!canvas)return;const observer=new ResizeObserver(entries=>{ if(seekTimeRef.current){seekTimeRef.current.style.visibility="hidden";seekTimeRef.current.style.left="0px";} if(seekGuideRef.current){seekGuideRef.current.style.visibility="hidden";seekGuideRef.current.style.left="0px";} setPlotWidth(Math.max(1,Math.ceil(entries[0].contentRect.width*(window.devicePixelRatio||1)))); });observer.observe(canvas);return()=>observer.disconnect();},[]);
  const rangeText = dynamicRange > .01 ? `Expand +${Math.round(dynamicRange * 100)}%` : dynamicRange < -.01 ? `Compress ${Math.round(-dynamicRange * 100)}%` : "Dynamics 0%";
  const adjusted = Math.abs(dynamicRange) >= .0001 && !dynamicRangeDisabled;
  const expanding = adjusted && dynamicRange > 0;
  const preview = useMemo(() => analysis && duration && adjusted ? previewDynamics(analysis.waveform, dynamicRange, duration) : analysis?.waveform, [analysis, duration, dynamicRange, adjusted]);
  function beginPassageDrag(event: ReactPointerEvent<HTMLButtonElement>, mode: "move" | "start" | "end") {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!passage || !onPassageChange || !rect?.width) return;
    event.currentTarget.focus({ preventScroll: true });
    event.preventDefault(); event.stopPropagation();
    passageDrag.current = { pointerId: event.pointerId, x: event.clientX, secondsPerPixel: span / rect.width, range: passage, mode, dragged: false, threshold: event.pointerType === "touch" ? 8 : 4 };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function dragPassage(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = passageDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    const pixels = event.clientX - drag.x;
    if (!drag.dragged && Math.abs(pixels) < drag.threshold) return;
    drag.dragged = true;
    onPassageChange?.((resizablePassage?adjustResizablePassage:adjustComparisonPassage)(drag.range, drag.mode, pixels * drag.secondsPerPixel, duration));
  }
  function endPassageDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = passageDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    passageDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    // A tap on even overlapping handles seeks; only deliberate horizontal drags edit.
    if (event.type === "pointerup" && !drag.dragged) seekAtPointer(event.clientX, false);
  }
  function passageKey(event: ReactKeyboardEvent<HTMLButtonElement>, mode: "move" | "start" | "end") {
    if (!passage || !onPassageChange) return;
    const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!direction) return;
    event.preventDefault(); event.stopPropagation();
    onPassageChange((resizablePassage?adjustResizablePassage:adjustComparisonPassage)(passage, mode, direction * (event.shiftKey ? 2 : .5), duration));
  }
  useEffect(() => { passageDrag.current = null; }, [duration]);
  const moveRange = (clientY: number, control: HTMLElement) => {
    const rect = control.parentElement?.getBoundingClientRect();
    if (rect) onDynamicRangeChange(Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - clientY) / (rect.height * .3))));
  };
  useEffect(() => {
    const canvas=canvasRef.current,playedCanvas=playedCanvasRef.current;
    if(!canvas||!playedCanvas)return;
    const drawLayer = (target:HTMLCanvasElement,played:boolean) => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(rect.width * scale)), height = Math.max(1, Math.round(rect.height * scale));
      if (target.width !== width || target.height !== height) { target.width = width; target.height = height; }
      const pen = target.getContext("2d");
      if (!pen) return;
      pen.clearRect(0, 0, width, height);
      pen.fillStyle = "#071522"; pen.fillRect(0, 0, width, height);
      if (!analysis || !duration) return;
      pen.lineWidth=1;
      const waves = preview || analysis.waveform;
      const count = waves.minL.length;
      const columns=peakColumns(waves,start/duration,(start+span)/duration,width);
      if (adjusted) {
        pen.strokeStyle = expanding ? "rgba(102, 182, 226, .58)" : "rgba(196, 208, 218, .42)";
        for (let x = 0; x < width; x++) {
          const from = Math.max(0, Math.min(count - 1, Math.floor((start + x / width * span) / duration * count)));
          const to = Math.max(from + 1, Math.min(count, Math.ceil((start + (x + 1) / width * span) / duration * count)));
          for (const [min, max, center] of [[analysis.waveform.minL, analysis.waveform.maxL, .25], [analysis.waveform.minR, analysis.waveform.maxR, .75]] as const) {
            let low = 1, high = -1;
            for (let i = from; i < to; i++) { low = Math.min(low, min[i]); high = Math.max(high, max[i]); }
            const referenceScale = .21;
            pen.beginPath(); pen.moveTo(x + .5, height * (center - high * referenceScale)); pen.lineTo(x + .5, height * (center - low * referenceScale)); pen.stroke();
          }
        }
      }
      for (let x = 0; x < width; x++) {
        const [lowL,highL,lowR,highR]=columns.subarray(x*4,x*4+4);
        // Use the same amplitude scale for original and processed previews.
        // Downward expansion lowers quiet material; it does not grow peaks.
        pen.strokeStyle = expanding ? (played ? "#ff8997" : "#ba6575") : (played ? "#59b8ff" : "#3a7197");
        pen.beginPath(); pen.moveTo(x + .5, height * (.25 - highL * .21)); pen.lineTo(x + .5, height * (.25 - lowL * .21)); pen.stroke();
        pen.strokeStyle = expanding ? (played ? "#ffadba" : "#a66a7b") : (played ? "#90d2ff" : "#486f99");
        pen.beginPath(); pen.moveTo(x + .5, height * (.75 - highR * .21)); pen.lineTo(x + .5, height * (.75 - lowR * .21)); pen.stroke();
      }
      pen.strokeStyle = "rgba(194, 203, 210, .82)";
      pen.lineWidth = scale;
      for (const center of [.25, .75]) {
        const y = Math.round(height * center) + .5;
        pen.beginPath(); pen.moveTo(0, y); pen.lineTo(width, y); pen.stroke();
      }
    };
    const draw=()=>{drawLayer(canvas,false);drawLayer(playedCanvas,true);paintPlayheadRef.current?.();};
    const observer=new ResizeObserver(draw);observer.observe(canvas);draw();
    return()=>observer.disconnect();
  }, [analysis,preview,adjusted,expanding,dynamicRange,duration,span,start]);
  useEffect(() => {
    const line=playheadRef.current,layer=playedLayerRef.current,canvas=canvasRef.current;
    if(!line||!layer||!canvas)return;
    let frame=0;
    const paint=()=>{
      const seconds=playbackClockRef.current?.()??playbackPositionRef.current;
      const progress=duration>0&&span>0?(seconds-start)/span:NaN;
      const bounded=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
      layer.style.clipPath=`inset(0 ${(1-bounded)*100}% 0 0)`;
      line.style.visibility=Number.isFinite(progress)&&progress>=0&&progress<=1?"visible":"hidden";
      line.style.transform=`translate3d(${Math.max(0,Math.min(canvas.clientWidth-2,bounded*canvas.clientWidth))}px,0,0)`;
    };
    paintPlayheadRef.current=paint;paint();
    if(playing){const tick=()=>{paint();frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);}
    return()=>{cancelAnimationFrame(frame);if(paintPlayheadRef.current===paint)paintPlayheadRef.current=null;};
  }, [playing,duration,start,span]);
  const exactClock=(seconds:number)=>`${Math.floor(seconds/60)}:${(seconds%60).toFixed(2).padStart(5,"0")}`;
  const passageFacts=passage?`Start ${exactClock(passage.start)} · End ${exactClock(passage.end)} · ${(passage.end-passage.start).toFixed(2)} seconds`:"";
  return <div data-waveform-detail={detailStatus} title={detailStatus==="loading"?"Loading finer waveform detail":detailStatus==="unavailable"?"Detailed waveform unavailable; showing the available overview":"Peak-preserving source waveform"} className={`track-waveform ${resizablePassage?"resizable-passage":""} ${compact ? "compact" : ""} ${displayOnly ? "display-only" : ""}`} onPointerMove={displayOnly ? undefined : event => {
    if (passageDrag.current?.dragged) {
      if (seekGuideRef.current) seekGuideRef.current.style.visibility = "hidden";
      if (seekTimeRef.current) seekTimeRef.current.style.visibility = "hidden";
      return;
    }
    const rect = canvasRef.current?.getBoundingClientRect(), guide = seekGuideRef.current, time = seekTimeRef.current;
    if (!rect || !guide || !time || !duration || !rect.width || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      if (guide) guide.style.visibility = "hidden";
      if (time) time.style.visibility = "hidden";
      return;
    }
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    guide.style.left = `${x}px`;
    guide.style.visibility = "visible";
    time.textContent = exactClock(Math.max(0, Math.min(duration, start + x / rect.width * span)));
    time.style.left = `${Math.max(time.offsetWidth / 2 + 4, Math.min(rect.width - time.offsetWidth / 2 - 4, x))}px`;
    time.style.top = `${Math.min(rect.height, Math.max(27, event.clientY - rect.top - 8))}px`;
    time.style.visibility = "visible";
  }} onPointerLeave={displayOnly ? undefined : () => {
    if (seekGuideRef.current) seekGuideRef.current.style.visibility = "hidden";
    if (seekTimeRef.current) seekTimeRef.current.style.visibility = "hidden";
  }}>
    {!displayOnly && !hideHeading && <div className="waveform-head"><span>{adjusted ? "DYNAMICS PREVIEW" : "SOURCE WAVEFORM"} <small>{expanding ? "Red: extension beyond scaled blue source" : adjusted ? "Blue: estimated output · gray: source" : "L / R · pre-EQ · click to seek · ←/→ fine seek"}</small></span>{!hideZoom && <div className="waveform-zoom"><button type="button" disabled={zoom === 1 || !analysis} onClick={() => setZoom(Math.max(1, zoom / 2))} aria-label="Zoom waveform out">−</button><span>{zoom}×</span><button type="button" disabled={zoom === maxZoom || !analysis} onClick={() => setZoom(Math.min(maxZoom, zoom * 2))} aria-label="Zoom waveform in">+</button></div>}</div>}
    <div className="waveform-canvas-area"><canvas ref={canvasRef} aria-label={displayOnly ? "Stereo waveform showing left and right channels and playback position" : hideHeading ? "Seek in stereo waveform" : "Stereo source waveform, click to seek"} role={displayOnly ? "img" : "slider"} aria-valuemin={displayOnly ? undefined : 0} aria-valuemax={displayOnly ? undefined : duration} aria-valuenow={displayOnly ? undefined : position} aria-valuetext={displayOnly ? undefined : `${exactClock(position)} of ${exactClock(duration)}`} aria-description={displayOnly ? undefined : "Click anywhere, including the green segment, to seek. Left and right arrows seek 0.25 seconds; hold to repeat. Shift plus arrow seeks 1 second. Drag a segment handle to edit the selection."} title={displayOnly ? undefined : "Click to seek · ←/→ 0.25 seconds · Shift + ←/→ 1 second · hold to repeat"} tabIndex={displayOnly ? undefined : duration ? 0 : -1} onClick={displayOnly ? undefined : event => seekAtPointer(event.clientX)} onKeyDown={displayOnly ? undefined : event => {
      if (!duration || event.altKey || event.ctrlKey || event.metaKey) return;
      const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!direction && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault(); event.stopPropagation();
      if (event.repeat || keyboardRepeat.current?.key === event.key) return;
      stopKeyboardSeek();
      if (!direction) { seekTo(event.key === "Home" ? 0 : duration); return; }
      const step = direction * (event.shiftKey ? 1 : .25);
      seekTo(keyboardSeekPosition.current + step);
      const held = { key: event.key, timer: null as ReturnType<typeof setTimeout> | null };
      keyboardRepeat.current = held;
      const repeat = () => {
        if (keyboardRepeat.current !== held) return;
        currentSeek.current(keyboardSeekPosition.current + step);
        held.timer = setTimeout(repeat, 100);
      };
      held.timer = setTimeout(repeat, 300);
    }} onKeyUp={event => { if (event.key === keyboardRepeat.current?.key) stopKeyboardSeek(); }} onBlur={stopKeyboardSeek} />
    <span className="waveform-played-layer" ref={playedLayerRef} aria-hidden="true"><canvas ref={playedCanvasRef}/></span>
    <span className="waveform-playhead" ref={playheadRef} aria-hidden="true"/>
    {passage && duration > 0 && passage.end > start && passage.start < start + span && <span className={`wf-passage ${resizablePassage?"is-resizable":"is-fixed"} ${passageActive ? "is-active" : ""} ${onPassageChange ? "is-editable" : ""}`} style={{ left: `${Math.max(0, (passage.start - start) / span * 100)}%`, width: `${(Math.min(start + span, passage.end) - Math.max(start, passage.start)) / span * 100}%` }} role="group" aria-label={`Comparison passage from ${seekClock(passage.start)} to ${seekClock(passage.end)}`} title={resizablePassage?passageFacts:undefined}>
      <button type="button" className="wf-move" role="slider" aria-label="Move comparison passage" aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={Math.max(0, duration - (passage.end - passage.start) - .1)} aria-valuenow={passage.start} aria-valuetext={resizablePassage?passageFacts:`${seekClock(passage.start)} to ${seekClock(passage.end)}`} disabled={!onPassageChange} title="Click to seek; drag to move the passage. When this handle is focused, arrow keys move the segment by half a second; Shift + arrow moves it by two seconds." onPointerDown={event => beginPassageDrag(event, "move")} onPointerMove={dragPassage} onPointerUp={endPassageDrag} onPointerCancel={endPassageDrag} onKeyDown={event => passageKey(event, "move")}><span className="wf-grip" aria-hidden="true"><svg viewBox="0 0 40 22" width="40" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11h26M12 6.5 7 11l5 4.5M28 6.5l5 4.5-5 4.5"/></svg></span></button>
      <button type="button" className="wf-edge wf-edge-start" data-at-boundary={passage.start<=start+span*.025} style={{ visibility:passage.start < start ? "hidden" : undefined }} role="slider" aria-label="Passage start" aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={Math.max(0,resizablePassage?passage.end-5:duration-5)} aria-valuenow={passage.start} aria-valuetext={seekClock(passage.start)} disabled={!onPassageChange} title={resizablePassage?`${passageFacts}. Click to seek; drag this edge to resize, minimum five seconds.`:"Click to seek; drag to move the fixed five-second passage."} onPointerDown={event => beginPassageDrag(event, "start")} onPointerMove={dragPassage} onPointerUp={endPassageDrag} onPointerCancel={endPassageDrag} onKeyDown={event => passageKey(event, "start")}><span className="wf-edge-knob" aria-hidden="true"/></button>
      <button type="button" className="wf-edge wf-edge-end" data-at-boundary={passage.end>=start+span*.975} style={{ visibility:passage.end > start + span ? "hidden" : undefined }} role="slider" aria-label="Passage end" aria-orientation="horizontal" aria-valuemin={Math.min(resizablePassage?passage.start+5:5,duration)} aria-valuemax={Math.max(0, duration - .1)} aria-valuenow={passage.end} aria-valuetext={seekClock(passage.end)} disabled={!onPassageChange} title={resizablePassage?`${passageFacts}. Click to seek; drag this edge to resize, minimum five seconds.`:"Click to seek; drag to move the fixed five-second passage."} onPointerDown={event => beginPassageDrag(event, "end")} onPointerMove={dragPassage} onPointerUp={endPassageDrag} onPointerCancel={endPassageDrag} onKeyDown={event => passageKey(event, "end")}><span className="wf-edge-knob" aria-hidden="true"/></button>
      <span className="wf-time" data-align={(() => { const mid = ((Math.max(start, passage.start) + Math.min(start + span, passage.end)) / 2 - start) / span * 100; return mid < 14 ? "start" : mid > 86 ? "end" : "center"; })()} aria-hidden="true"><b>{exactClock(passage.start)}</b><i>→</i><b>{exactClock(passage.end)}</b><em>= {Number((passage.end-passage.start).toFixed(2))} seconds</em></span>
    </span>}
    <span className="waveform-channel-label waveform-channel-left" aria-hidden="true">L</span><span className="waveform-channel-label waveform-channel-right" aria-hidden="true">R</span>
    {!displayOnly && duration > 0 && <span ref={seekGuideRef} className="waveform-seek-guide" aria-hidden="true" />}
    {!displayOnly && duration > 0 && <span ref={seekTimeRef} className="waveform-seek-time" aria-hidden="true" />}
    {duration > 0 && dynamicSliderEnabled && !dynamicRangeDisabled && <span className="waveform-center-guide" aria-hidden="true" />}
    {duration > 0 && dynamicSliderEnabled && !dynamicRangeDisabled && <div className={`dynamic-range-control ${dynamicRange !== 0 ? "adjusted" : ""}`} style={{ top: `${50 - dynamicRange * 30}%` }} role="slider" tabIndex={0} title={expanding ? "Drag down to compress peaks. Red shows only the expansion outside the scaled blue source reference." : "Drag up to expand quiet parts; drag down to compress peaks. Blue estimates compressed output; gray is the original."} aria-label="Track dynamic range" aria-valuemin={-100} aria-valuemax={100} aria-valuenow={Math.round(dynamicRange * 100)} aria-valuetext={rangeText} onPointerDown={event => { event.preventDefault(); dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); moveRange(event.clientY, event.currentTarget); }} onPointerMove={event => { if (dragging.current) moveRange(event.clientY, event.currentTarget); }} onPointerUp={event => { dragging.current = false; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { dragging.current = false; }} onDoubleClick={() => onDynamicRangeChange(0)} onKeyDown={event => { const delta = event.key === "ArrowUp" ? .05 : event.key === "ArrowDown" ? -.05 : 0; if (delta || event.key === "Home") { event.preventDefault(); event.stopPropagation(); onDynamicRangeChange(event.key === "Home" ? 0 : Math.round(Math.max(-1, Math.min(1, dynamicRange + delta)) * 100) / 100); } }}><span className="dynamic-range-line" /><span className="dynamic-range-brackets" aria-hidden="true">↕</span><span className="dynamic-range-readout" aria-hidden="true">{rangeText}</span></div>}
    {!analysis && <span className="waveform-placeholder">{placeholder}</span>}</div>
  </div>;
}
