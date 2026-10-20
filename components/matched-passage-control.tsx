"use client";
import "./matched-passage-control.css";
import type { ReactNode } from "react";
export function MatchedPassageMeter({side,seconds,required,qualified}:{side:"A"|"B";seconds:number;required:boolean;qualified:boolean}){
  return <div className={`curve-passage-meter ${required?"is-required":"is-optional"} ${qualified?"ready":""}`}><span><b>{side}</b> <span>{seconds.toFixed(1)} / 5 sec</span></span><progress max={5} value={Math.min(5,seconds)} aria-label={`${side} listening time`}/></div>;
}
export function MatchedPassageFooter({heard,required,qualified,children,showMeters=true}:{heard:[number,number];required:boolean;qualified:boolean;children:ReactNode;showMeters?:boolean}){
 return <div className="comparison-listening-footer">{showMeters&&<MatchedPassageMeter side="A" seconds={heard[0]} required={required} qualified={qualified}/>}<div className="comparison-switch">{children}</div>{showMeters&&<MatchedPassageMeter side="B" seconds={heard[1]} required={required} qualified={qualified}/>}</div>;
}
export default function MatchedPassageControl({required,qualified,onChange,disabled=false,hostId}:{required:boolean;qualified:boolean;heard:[number,number];onChange:(value:boolean)=>void;disabled?:boolean;hostId:string}){
  return <section id={hostId==="ranked-passage-actions"?"listen-progress":"personal-listen-progress"} className={`listen-progress matched-passage-box ${qualified?"ready":"waiting"} ${required?"is-required":"is-optional"}`} aria-label="Matched listening passage">
    <label className="matched-passage-toggle"><input type="checkbox" aria-label="Require 5 seconds of the same passage on A and B" checked={required} disabled={disabled} onChange={event=>onChange(event.target.checked)}/><span className="matched-toggle-copy"><strong>Require 5-second comparison</strong></span><b className="matched-requirement-state">{required?"ON":"OFF"}</b></label>
    <div className="hearing-copy"><strong>{required?qualified?"5-second requirement met":"Matched listening required":qualified?"5-second match detected · still optional":"5-second requirement off"}</strong><span>{required?qualified?"The same passage played for at least 5 seconds on A and B. You can now vote.":"Listen to at least 5 seconds of the same passage on A and B before voting.":"Vote anytime. Timing is still tracked; collection follows your consent settings."}</span></div>
    <div id={hostId} className="ranked-passage-actions"/>
    <details className="matched-passage-help"><summary>Timing &amp; research</summary><p>This switch controls whether five matched seconds are required before voting. Timing is tracked in either state. Consented participant comparisons can be collected in both states, with the actual playback times, whether matching was required, and whether it was completed. A green match is a timing check, not proof of hearing or confirmation of upload. Free-listening records remain distinguishable from controlled comparisons for research and ranking eligibility. Personal research sharing follows its separate permission. Admin tests and private-target comparisons remain private. Changing this setting affects future choices; it never uploads old local results.</p></details>
  </section>;
}
