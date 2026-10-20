"use client";

import "./tournament-mode-tabs.css";
import { Trophy, FlaskConical, SlidersHorizontal } from "lucide-react";
type Mode="personal"|"research"|"open";
export default function TournamentModeTabs({active,onResearch,onOpen}:{active:Mode;onResearch?:()=>void;onOpen?:()=>void}) {
  const modes=[{id:"personal" as const,label:"Personal Tournament",hint:"Find your favorite",Icon:Trophy,href:"/shootout/personal"},{id:"research" as const,label:"Blind Research",hint:"Contribute comparisons",Icon:FlaskConical,href:"/shootout?mode=blind"},{id:"open" as const,label:"Open Comparison",hint:"Explore freely · Unranked",Icon:SlidersHorizontal,href:"/shootout?mode=open"}];
  return <nav className="tournament-modes" aria-label="Tournament modes">{modes.map(({id,label,hint,Icon,href})=>{const contents=<><span className="mode-hover-halo" aria-hidden="true"/><span className="mode-hover-ripple" aria-hidden="true"/><span className="mode-hover-spark spark-one" aria-hidden="true"/><span className="mode-hover-spark spark-two" aria-hidden="true"/><Icon size={20} strokeWidth={1.7} aria-hidden="true"/><span className="tournament-mode-copy"><span className="tournament-mode-label">{label}</span><small>{hint}</small></span>{id==="personal"&&<small className="tournament-mode-suggestion">Suggested</small>}</>;const onClick=id==="research"?onResearch:id==="open"?onOpen:undefined;return onClick?<button key={id} type="button" className={`tournament-mode mode-${id}`} aria-pressed={active===id} onClick={onClick}>{contents}</button>:<a key={id} className={`tournament-mode mode-${id}`} href={href} aria-current={active===id?"page":undefined}>{contents}</a>;})}</nav>;
}
