"use client";
import "./matched-passage-control.css";
import "./compare-strip.css";
import { useId, type ReactNode } from "react";
export function MatchedPassageMeter({side,seconds,required,qualified,variant}:{side:"A"|"B";seconds:number;required:boolean;qualified:boolean;variant?:"strip"}){
  const progress = Number.isFinite(seconds) ? Math.max(0, Math.min(5, seconds)) : 0;
  const displayed = Math.floor((progress + 1e-9) * 10) / 10;
  return <div className={`${variant==="strip"?`strip-meter side-${side.toLowerCase()}`:"curve-passage-meter"} ${required?"is-required":"is-optional"} ${qualified?"ready":""}${variant==="strip"&&progress>=5-1e-6?" is-full":""}`}><span><b>{side}</b> <span>{displayed.toFixed(1)} / 5{variant==="strip"?"s":" sec"}</span></span><progress max={5} value={progress} aria-valuetext={`${displayed.toFixed(1)} of 5 seconds`} aria-label={`${side} listening time in selected passage`}/></div>;
}
export function MatchedPassageFooter({heard,required,qualified,children,showMeters=true}:{heard:[number,number];required:boolean;qualified:boolean;children:ReactNode;showMeters?:boolean}){
 return <div className="comparison-listening-footer">{showMeters&&<MatchedPassageMeter side="A" seconds={heard[0]} required={required} qualified={qualified}/>}<div className="comparison-switch">{children}</div>{showMeters&&<MatchedPassageMeter side="B" seconds={heard[1]} required={required} qualified={qualified}/>}</div>;
}
export default function MatchedPassageControl({required,qualified,onChange,disabled=false,hostId}:{required:boolean;qualified:boolean;heard:[number,number];onChange:(value:boolean)=>void;disabled?:boolean;hostId:string}){
  return <section id={hostId==="ranked-passage-actions"?"listen-progress":"personal-listen-progress"} className={`listen-progress matched-passage-box ${qualified?"ready":"waiting"} ${required?"is-required":"is-optional"}`} aria-label="Matched listening passage">
    <label className="matched-passage-toggle"><input type="checkbox" aria-label="Require 5 seconds of the same passage on A and B" checked={required} disabled={disabled} onChange={event=>onChange(event.target.checked)}/><span className="matched-toggle-copy"><strong>Require 5-second comparison</strong></span><b className="matched-requirement-state">{required?"ON":"OFF"}</b></label>
    <div className="hearing-copy"><strong>{required?qualified?"5-second requirement met":"Listen to the same section twice":qualified?"5-second match detected · still optional":"5-second requirement off"}</strong><span>{required?qualified?"You heard the same section for at least 5 seconds on both sounds. You can now choose.":"Use Play both segments, or listen to the same 5 seconds on A and B, before choosing.":"Vote anytime. Timing is still tracked; collection follows your consent settings."}</span></div>
    <div id={hostId} className="ranked-passage-actions"/>
    <MatchedPassageHelp className="matched-passage-help"/>
  </section>;
}

function MatchedPassageHelp({className,children}:{className:string;children?:ReactNode}){
  return <details className={className}><summary>Why listen to the same section?</summary>{children}<p>The listening mode determines whether five matched seconds are required before voting. Timing is tracked in either state. Consented participant comparisons can be collected in both states, with the actual playback times, whether matching was required, and whether it was completed. A green match is a timing check, not proof of hearing or confirmation of upload. Free-listening records remain distinguishable from controlled comparisons for research and ranking eligibility. Personal research sharing follows its separate permission. Admin tests and private-target comparisons remain private. </p><p>Shuffle passage favors active audio while exploring unselected sections first. It remembers selections per song during this page visit, including across Personal pairings. Quieter sections remain eligible. It does not know which passage is musically best. Small leftover gaps may need some overlap to keep the selected segment length; a fresh cycle starts only after covering the track. This selection history is separate from measured listening time.</p><p>Changing this setting affects future choices; it never uploads old local results.</p></details>;
}

export function BlindListeningMode({ required, onChange, disabled }: { required: boolean; onChange: (value: boolean) => void; disabled: boolean }) {
  const description = useId();
  return <fieldset className="compare-strip-modes" aria-describedby={description} disabled={disabled}>
    <legend>Blind listening mode</legend>
    <label><input type="radio" name={description} checked={required} onChange={() => onChange(true)} />Ranked Blind Shootout</label>
    <label><input type="radio" name={description} checked={!required} onChange={() => onChange(false)} />Rapid Shootout</label>
    <p id={description}>{required ? "Five matched seconds per side. Eligible choices count toward rankings." : "Choose anytime. Eligible choices count toward the Free Listening ranking. Playback timing is recorded."}</p>
  </fieldset>;
}

/** One compact control surface for the five-second comparison: Play/Shuffle, both listening meters, status and the requirement switch. */
export function MatchedPassageStrip({required,qualified,heard,onRequiredChange,disabled=false,hostId,switchControl,showRequirement=true}:{required:boolean;qualified:boolean;heard:[number,number];onRequiredChange:(value:boolean)=>void;disabled?:boolean;hostId:string;switchControl:ReactNode;showRequirement?:boolean}){
  const state=qualified?"ready":required?"waiting":"optional";
  const title=required?qualified?"5-second requirement met":"Listen to the same section twice":qualified?"5-second match detected · still optional":"5-second requirement off";
  const detail=required?qualified?"You heard the same section for at least 5 seconds on both sounds. You can now choose.":"Use Play both segments, or listen to the same 5 seconds on A and B, before choosing.":"Vote anytime. Timing is still tracked; collection follows your consent settings.";
  return <section id={hostId==="ranked-passage-actions"?"listen-progress":"personal-listen-progress"} className={`compare-strip is-${state}`} aria-label="Matched listening passage">
    <div id={hostId} className="compare-strip-actions"/>
    <div className="compare-strip-meters">
      <MatchedPassageMeter variant="strip" side="A" seconds={heard[0]} required={required} qualified={qualified}/>
      <div className="compare-strip-switch">{switchControl}</div>
      <MatchedPassageMeter variant="strip" side="B" seconds={heard[1]} required={required} qualified={qualified}/>
    </div>
    <div className="compare-strip-status">
      <p className="compare-strip-message"><span className="compare-strip-icon" aria-hidden="true"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="9" width="11" height="8" rx="2"/>{qualified||!required?<path d="M7 9V6.5a3 3 0 0 1 5.6-1.5"/>:<path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>}</svg></span><span className="compare-strip-copy"><span className="compare-strip-tag">{qualified?"Ready to choose":required?"Listen before choosing":"Voting open"}</span><strong>{required&&!qualified?"Listen to the selected section on both sounds before choosing":title}</strong></span></p>

      {showRequirement && <label className="compare-strip-toggle"><input type="checkbox" aria-label="Require 5 seconds of the same passage on A and B" checked={required} disabled={disabled} onChange={event=>onRequiredChange(event.target.checked)}/><span className="compare-strip-track" aria-hidden="true"/><span className="compare-strip-toggle-label">Require 5-second comparison</span><b className="compare-strip-toggle-state">{required?"ON":"OFF"}</b></label>}<MatchedPassageHelp className="compare-strip-help"><p>{detail}</p></MatchedPassageHelp>
    </div>
  </section>;
}
