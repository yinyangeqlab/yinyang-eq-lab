"use client";

import { useRef } from "react";

type Source = "blind" | "bring";
export default function ResearchMusicSource({source,activeSource,disabled,onChange,onStart,onCancel}:{source:Source;activeSource:Source|null;disabled:boolean;onChange:(source:Source)=>void;onStart:()=>void;onCancel:()=>void}) {
  const sourceSelect = useRef<HTMLSelectElement>(null);
  function keepCurrentSource() {
    onCancel();
    sourceSelect.current?.focus({preventScroll:true});
  }
  const pending=activeSource!==null && source!==activeSource;
  return <section className="research-music-source" aria-label="Blind Research music source">
    <div className="research-source-fields"><label className="playback-source-choice"><span>Music Source</span><select ref={sourceSelect} aria-label="Research music source" value={source} disabled={disabled} onChange={event=>onChange(event.target.value as Source)}><option value="blind">Listening Pool</option><option value="bring">Use Your Music</option></select></label><p>{source==="blind"?"A random stereo recording from the pool.":"Choose a stereo song below. Audio stays on your device; sharing song details is optional."}</p></div>
    {pending&&<div className="research-source-switch" role="status"><p>{activeSource==="blind"?"Listening Pool":"Bring Your Own"} is still active. Start fresh to use {source==="blind"?"Listening Pool":"Bring Your Own"}; listening progress resets and completed results stay saved.</p><div><button type="button" disabled={disabled} onClick={onStart}>Start fresh with {source==="blind"?"Listening Pool":"Bring Your Own"}</button><button type="button" disabled={disabled} onClick={keepCurrentSource}>Keep current source</button></div></div>}
  </section>;
}
