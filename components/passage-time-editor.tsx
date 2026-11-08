"use client";
import {useId,useState} from "react";
import type {ComparisonPassage} from "@/lib/comparison-passage";
import {formatPassageTime,parsePassageTime,passageFromTimes} from "@/lib/passage-time";

export default function PassageTimeEditor({passage,duration,disabled,onChange}:{passage:ComparisonPassage;duration:number;disabled:boolean;onChange:(value:ComparisonPassage)=>void}) {
  const id=useId();
  const [draft,setDraft]=useState<{start:string|null;end:string|null}>({start:null,end:null});
  const [error,setError]=useState("");
  const start=draft.start===null?passage.start:parsePassageTime(draft.start),end=draft.end===null?passage.end:parsePassageTime(draft.end);
  const selectedSeconds=start!==null&&end!==null&&end>start?Number((end-start).toFixed(2)):null;
  return <form className="segment-time-editor" data-invalid={!!error} aria-label="Selected segment times" onSubmit={event=>{
    event.preventDefault();if(disabled)return;
    const result=passageFromTimes(draft.start===null?passage.start:parsePassageTime(draft.start),draft.end===null?passage.end:parsePassageTime(draft.end),duration);
    if(result.error){setError(result.error);return;}
    onChange(result.passage!);setDraft({start:null,end:null});setError("");
  }}>
    <label>Start<input aria-label="Segment start time" value={draft.start??formatPassageTime(passage.start)} disabled={disabled} spellCheck={false} autoComplete="off" aria-invalid={!!error} aria-describedby={error?`${id}-error`:undefined} onChange={event=>{setDraft({...draft,start:event.target.value});setError("");}} onKeyDown={event=>{if(event.key==="Escape"){event.stopPropagation();setDraft({start:null,end:null});setError("");}}}/></label>
    <label>End<input aria-label="Segment end time" value={draft.end??formatPassageTime(passage.end)} disabled={disabled} spellCheck={false} autoComplete="off" aria-invalid={!!error} aria-describedby={error?`${id}-error`:undefined} onChange={event=>{setDraft({...draft,end:event.target.value});setError("");}} onKeyDown={event=>{if(event.key==="Escape"){event.stopPropagation();setDraft({start:null,end:null});setError("");}}}/></label>
    <strong className="passage-duration" title={error||undefined}>{error?(selectedSeconds!==null&&selectedSeconds<5?"Minimum 5 seconds":"Check times"):selectedSeconds===null?"Check times":`= ${selectedSeconds} seconds`}</strong>
    <button type="submit" disabled={disabled||draft.start===null&&draft.end===null} aria-label="Apply segment times">Apply</button>
    {error&&<span className="segment-time-error" id={`${id}-error`} role="alert">{error}</span>}
  </form>;
}
