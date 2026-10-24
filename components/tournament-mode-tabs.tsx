"use client";

import "./tournament-mode-tabs.css";
import ModeIllustration from "./mode-illustration";
type Mode="personal"|"research"|"open";
export default function TournamentModeTabs({active,onResearch,onOpen}:{active:Mode;onResearch?:()=>void;onOpen?:()=>void}) {
  const modes=[{id:"personal" as const,label:"Personal Tournament",hint:"Find your favorite",href:"/shootout/personal"},{id:"research" as const,label:"Blind Research",hint:"Contribute comparisons",href:"/shootout?mode=blind"},{id:"open" as const,label:"Open Comparison",hint:"Explore freely",href:"/shootout?mode=open"}];
  return <nav className="tournament-modes" aria-label="Tournament modes">{modes.map(({id,label,hint,href})=>{const contents=<><span className="mode-hover-halo" aria-hidden="true"/><ModeIllustration kind={id==="research"?"blind":id} compact/><span className="tournament-mode-copy"><span className="tournament-mode-label">{label}</span>{id==="personal"&&<small className="tournament-mode-suggestion">Suggested</small>}{id==="open"&&<small className="tournament-mode-status">Unranked</small>}<small className="tournament-mode-hint">{hint}</small></span></>;const onClick=id==="research"?onResearch:id==="open"?onOpen:undefined;return onClick?<button key={id} type="button" className={`tournament-mode mode-with-art mode-${id}`} aria-pressed={active===id} onClick={onClick}>{contents}</button>:<a key={id} className={`tournament-mode mode-with-art mode-${id}`} href={href} aria-current={active===id?"page":undefined}>{contents}</a>;})}<a className="eq-preset-mode-link" href="/eq-compare">Blind EQ comparison <span>Upload two presets · Private</span></a></nav>;
}
