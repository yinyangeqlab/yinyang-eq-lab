"use client";

import { useState } from "react";
import { checkReliability } from "@/lib/preference-ranking";

export type Trial = {
  id: string; serverTrialId?: string; sessionId?: string; result?: "a" | "b" | "tie"; catchTrial?: boolean; createdAt: number; pair: [string, string]; pairNames: [string, string]; winnerId: string;
  winnerName: string; loserName: string; recorded: boolean; mode?: "blind" | "bring" | "open"; type: string;
  reasonSide?: "a" | "b"; reasonTags?: string[]; otherReason?: string;
  measurementName: string | null; device: string | null; rig: string | null;
  heardA: number; heardB: number; overlapSeconds: number; songTitle: string;
  eqFits?: { bands: number; rms: number; preamp: number }[];
};

export default function ResultsProfile({ trials, onDeleteBrowser }: { trials: Trial[]; onDeleteBrowser?: (id:string)=>void }) {
  const [selectedModel, setSelectedModel] = useState("");
  const rows = [...trials].reverse(), recorded = rows.filter(row => row.recorded);
  const models = [...new Map(rows.filter(row => row.device?.trim()).map(row => [row.device!.trim().toLowerCase(), row.device!.trim()])).values()].sort((a,b)=>a.localeCompare(b));
  const activeModel = models.includes(selectedModel) ? selectedModel : models[0] ?? "";
  const modelTrials = rows.filter(row => row.device?.trim().toLowerCase() === activeModel.toLowerCase() && !row.catchTrial && row.pair?.length === 2 && row.pair[0] !== row.pair[1]);
  const modelTallies = new Map<string, { id: string; name: string; wins: number; losses: number; ties: number }>();
  for (const row of modelTrials) {
    for (const [index, id] of row.pair.entries()) {
      const tally = modelTallies.get(id) ?? { id, name: row.pairNames[index] || id, wins: 0, losses: 0, ties: 0 };
      if (row.result === "tie") tally.ties++;
      else if (row.winnerId === id) tally.wins++;
      else if (row.pair.includes(row.winnerId)) tally.losses++;
      modelTallies.set(id, tally);
    }
  }
  const modelRanking = [...modelTallies.values()].sort((a,b)=>{
    const aTotal=a.wins+a.losses+a.ties,bTotal=b.wins+b.losses+b.ties;
    const aRate=aTotal?(a.wins+a.ties*.5)/aTotal:0,bRate=bTotal?(b.wins+b.ties*.5)/bTotal:0;
    return bRate-aRate || bTotal-aTotal || a.name.localeCompare(b.name);
  });
  const checks=rows.filter(row=>row.catchTrial),correct=checks.filter(row=>row.result==="tie").length;
  const checkRate=checks.length?correct/checks.length:null;
  const checkSd=checks.length>1?Math.sqrt(checkRate!*(1-checkRate!)*checks.length/(checks.length-1)):null;
  const groups = new Map<string, Trial[]>();
  for (const row of rows) { const key = `${row.mode || "open"}|${[...row.pair].sort().join("|")}`; groups.set(key, [...(groups.get(key) ?? []), row]); }
  const repeated = [...groups.values()].filter(group => group.length > 1 && !group[0].catchTrial);
  const agreement = repeated.length ? repeated.reduce((sum, group) => {
    const counts = [group.filter(row=>row.result==="tie").length,group.filter(row=>row.result!=="tie"&&row.winnerId===group[0].pair[0]).length,group.filter(row=>row.result!=="tie"&&row.winnerId===group[0].pair[1]).length];
    return sum + Math.max(...counts) / group.length;
  }, 0) / repeated.length : null;
  const calibrationChecks = rows.filter(row => row.mode !== "open" && row.pair?.[0] === row.pair?.[1]);
  const calibration = checkReliability(calibrationChecks.filter(row => row.result === "tie").length, calibrationChecks.length);
  return <><div className="heading-row"><div><h1>My results</h1><p>This profile stays in this browser. Expand a trial to inspect the answer, measurement, listening time, and repeat consistency.</p></div></div>
    <div className="metric-grid"><div><strong>{rows.length}</strong><span>Total trials</span></div><div><strong>{recorded.length}</strong><span>Recorded votes</span></div><div><strong>{rows.length - recorded.length}</strong><span>Private trials</span></div><div><strong>{agreement === null ? "—" : `${Math.round(agreement * 100)}%`}</strong><span>Repeated pair agreement</span></div></div><p className="footnote">Same-filter checks: {checks.length} · correct tie answers: {checkRate===null?"—":`${Math.round(checkRate*100)}%`} · accuracy SD: {checkSd===null?"—":checkSd.toFixed(3)}.</p>
    <p className="footnote">Identical-target check reliability: {calibrationChecks.length ? `${Math.round(calibration.mean * 100)}% ± ${Math.round(calibration.sd * 100)} percentage points SD` : "Not calibrated yet"} ({calibrationChecks.length} checks; Beta(2, 2) prior). This estimates check performance, not whether your preferences are correct. New check results change the influence of future decisive ranked answers.</p>
    <p className="footnote">Repeated pair agreement is the average majority choice rate for pairs tried more than once.</p>
    <section className="private-list personal-model-ranking"><h2>Your target preferences by headphone model</h2><p className="footnote">Private to this browser. These are your answered trials with that model, across blind and Open modes. Each tie counts as half a preference for each target; repeated choices are included. This is your tally, not a public rating.</p>{models.length ? <><label>Headphone model <select value={activeModel} onChange={event=>setSelectedModel(event.target.value)}>{models.map(model=><option key={model} value={model}>{model}</option>)}</select></label><p className="footnote">{modelTrials.length} comparisons for {activeModel}. Scores with fewer than 10 comparisons are provisional.</p><div className="personal-model-head"><span>Target</span><span>Wins / losses / ties</span><span>Preference</span></div>{modelRanking.map((target,index)=>{const total=target.wins+target.losses+target.ties;return <div className="personal-model-row" key={target.id}><span><b>{index+1}. {target.name}</b>{total<10&&<small>Provisional</small>}</span><span>{target.wins} / {target.losses} / {target.ties}</span><strong>{total?`${Math.round((target.wins+target.ties*.5)/total*100)}%`:"—"}</strong></div>;})}</> : <p className="footnote">No answered trials have a saved headphone model yet.</p>}</section>
    <div className="private-list"><h2>Trials and results</h2><p className="footnote"><a href="/my-data">Manage or permanently delete your submitted data</a>. Browser copies and submitted records are managed separately.</p>{rows.length ? rows.map(row => {
      const group = groups.get(`${row.mode || "open"}|${[...row.pair].sort().join("|")}`)!;
      const scores=group.map(x=>x.result==="tie"?.5:x.winnerId===row.pair[0]?1:0),rate=scores.reduce<number>((n,x)=>n+x,0)/scores.length;
      const sd=group.length>1?Math.sqrt(scores.reduce<number>((n,x)=>n+(x-rate)**2,0)/(scores.length-1)):0;
      return <details className="trial-row" key={row.id}><summary><strong>{new Date(row.createdAt).toLocaleString()}</strong> · {row.result === "tie" ? "Unsure / tie" : `${row.winnerName} preferred over ${row.loserName}`} <span>{row.mode === "blind" ? "Random blind" : row.mode === "bring" ? "Own music blind" : "Open"} · {row.catchTrial ? "Same-filter check" : row.recorded ? "Ranked" : "Private"} · {row.type === "ie" ? "In ear" : row.type === "oe" ? "Over ear" : "Unclassified"}</span></summary><div className="trial-detail">
        <div className="trial-data-actions"><a href={`/my-data?trial=${encodeURIComponent(row.id)}`}>Delete / manage submitted comparison</a>{onDeleteBrowser && <button type="button" onClick={()=>{if(window.confirm("Permanently delete this trial and its local notes from this browser? Server submissions will remain."))onDeleteBrowser(row.id);}}>Delete browser copy</button>}</div>
        <p><b>Trial:</b> {row.pairNames[0]} (A) vs {row.pairNames[1]} (B). Answer: {row.result === "tie" ? "Unsure / tie" : row.winnerId === row.pair[0] ? "A" : "B"}. {row.catchTrial ? "Both sides used the same EQ filters; tie is the accuracy answer." : ""}</p>
        <p><b>Reasons for {row.reasonSide?.toUpperCase() || "selected side"}:</b> {row.reasonTags?.length ? row.reasonTags.join(", ") : "None selected"}{row.otherReason ? ` · ${row.otherReason}` : ""}</p>
        <p><b>Measurement:</b> {row.measurementName || "None"} · {row.device || "Unknown headphone"} · {row.rig || "Unknown rig"}</p>
        <p><b>Listening:</b> A {row.heardA}s, B {row.heardB}s, overlap {row.overlapSeconds}s. {row.songTitle || "No song title"}.</p>
        <p><b>EQ fit:</b> A {row.eqFits?.[0]?.bands ?? "—"} bands, {row.eqFits?.[0]?.rms ?? "—"} dB RMS; B {row.eqFits?.[1]?.bands ?? "—"} bands, {row.eqFits?.[1]?.rms ?? "—"} dB RMS; shared preamp {Math.min(row.eqFits?.[0]?.preamp ?? 0, row.eqFits?.[1]?.preamp ?? 0)} dB.</p>
        {row.catchTrial ? <p><b>Accuracy check:</b> {row.result === "tie" ? "Correct tie response." : "A/B preference on identical filters."}</p> : <p><b>Pair consistency:</b> {group.length} trials; A preference score {Math.round(rate * 100)}%; sample SD {sd.toFixed(3)}.</p>}
      </div></details>;
    }) : <p className="footnote">No answered trials yet.</p>}</div>
  </>;
}
