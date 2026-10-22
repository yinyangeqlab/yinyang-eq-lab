"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { confirmationComplete, parsePersonalRuns, personalFavorite, personalStandings, PERSONAL_KEY, type PersonalRun } from "@/lib/personal-shootout";
import AuraNavLink from "@/components/aura-nav-link";
import "./personal-podium.css";

const THEME_KEY = "target-lab-personal-podium-theme-v1";
const awardNames = ["Gold", "Silver", "Bronze"];
type PodiumTheme = "sport" | "game" | "grove";
export function PersonalPlace({place,medal=true}:{place:number;medal?:boolean}) {
  const award=medal&&place<=3?awardNames[place-1]:null;
  return <span className={`personal-place ${award?`personal-place-${place}`:""}`} aria-label={`Place ${place}${award?` · ${award}`:""}`}>{award&&<svg viewBox="0 0 24 28" aria-hidden="true"><path d="M5 1h6l3 12-7 2ZM13 1h6l-2 14-7-2Z" fill="currentColor" opacity=".7"/><circle cx="12" cy="17" r="9" fill="currentColor"/><circle cx="12" cy="17" r="5" fill="none" stroke="#152027" opacity=".5"/></svg>}<b aria-hidden="true">{place}</b></span>;
}
function PersonalTuningLauncher({id,name,label}:{id:string;name:string;label:string}) {
  const [previewOpen,setPreviewOpen]=useState(false);
  return <span className="personal-tune-launcher" data-preview-open={previewOpen} onPointerEnter={event=>{if(event.pointerType==="mouse")setPreviewOpen(true);}} onPointerLeave={()=>setPreviewOpen(false)} onFocus={()=>setPreviewOpen(true)} onBlur={()=>setPreviewOpen(false)} onKeyDown={event=>{if(event.key==="Escape"){setPreviewOpen(false);event.stopPropagation();}}}>
    <AuraNavLink kind="tuning" href={`/preference-tuning?target=${encodeURIComponent(id)}&from=personal`} label={label} ariaLabel={`${label}: ${name}`} className="personal-curve-tune personal-tune-cta"/>
    <span className="personal-tune-hologram" aria-hidden="true">
      <span className="tune-demo-bar"><span className="tune-demo-dots"><i/><i/><i/></span><span>Preference Tuning</span><span>PREVIEW</span></span>
      <span className="tune-demo-body"><span className="tune-demo-eyebrow">PREFERENCE TUNING LAB</span><strong>Shape the sound you want.</strong><span className="tune-demo-target">Your favorite curve · ready to explore</span>
        <svg className="tune-demo-graph" viewBox="0 0 320 100"><path className="tune-demo-grid" d="M0 25h320M0 50h320M0 75h320M40 0v100M100 0v100M160 0v100M220 0v100M280 0v100"/><path className="tune-demo-base" d="M0 54C40 54 50 69 83 62S135 55 163 39 193 15 214 35 240 60 267 54 299 47 320 55"/><path className="tune-demo-curve" d="M0 45C40 44 50 61 83 56S135 54 163 34 193 20 214 40 240 55 267 47 299 44 320 49"/><circle className="tune-demo-handle" cx="163" cy="34" r="4"/><path className="tune-demo-cursor" d="m163 40 3 15 4-5 6 1Z"/></svg>
        <span className="tune-demo-sliders">{["Bass","Body","Ear gain","Presence","Treble"].map((text,index)=><span className={`tune-demo-slider demo-slider-${index}`} key={text}><span>{text}</span><i><b/></i></span>)}</span>
      </span><span className="tune-demo-caption">Illustrated preview · explore your sound</span>
    </span>
  </span>;
}
export function PersonalTuneLink({id,name,label="Fine-tune",preview=false}:{id:string;name:string;label?:string;preview?:boolean}) {
  if(preview)return <PersonalTuningLauncher id={id} name={name} label={label}/>;
  return <a className="personal-curve-tune" href={`/preference-tuning?target=${encodeURIComponent(id)}&from=personal`} aria-label={`${label}: ${name}`}><span>{label}</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 12 12 4M4 4h8v8"/></svg></a>;
}
function PodiumSky({theme}:{theme:PodiumTheme}) {
  return <svg className="podium-sky" viewBox="0 0 1000 130" aria-hidden="true"><circle cx="865" cy="46" r="27" fill={theme==="sport"?"#f5d16b":"#ffd88c"}/><path d="M55 68h145l-22-21h-33l-19-17-27 17H76Z" fill="#b2dfdc" opacity=".35"/><path d="M655 39h115l-18-17h-30l-14-12-23 12h-15Z" fill="#d1e5e2" opacity=".25"/>{theme==="grove"&&<><path d="m0 130 108-65 63 35 90-70 126 100Z" fill="#487c86"/><path d="m170 130 91-100 40 64 86 36Z" fill="#63989a"/></>}</svg>;
}
function PodiumScene({theme}:{theme:PodiumTheme}) {
  return <svg className="podium-scene" viewBox="0 0 1000 210" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    {theme === "sport" ? <>
      <path d="M0 107 150 88 310 108 460 95 640 110 810 85 1000 104V210H0Z" fill="#46ad87"/>
      <path d="M140 103h720c115 0 115 94 0 94H140c-115 0-115-94 0-94Z" fill="#ba6b59"/>
      <path d="M140 122h720c72 0 72 57 0 57H140c-72 0-72-57 0-57Z" fill="#316b59" stroke="#f0c2a4" strokeWidth="3"/>
      <path d="M140 110h720c101 0 101 81 0 81H140c-101 0-101-81 0-81Z" fill="none" stroke="#f0c2a4" strokeWidth="2"/>
      <rect x="795" y="96" width="24" height="108" fill="#f5f0d9"/>{Array.from({length:18},(_,i)=>{const row=Math.floor(i/2),col=i%2;return (row+col)%2===0?<rect key={i} x={795+col*12} y={96+row*12} width="12" height="12" fill="#263b46"/>:null;})}
      <path d="M0 204h1000v6H0Z" fill="#7dc597"/><path d="M69 162v40m126-40v40m589-40v40" stroke="#86c9df" strokeWidth="4"/>
      <path d="m70 162 44 12-44 14Z" fill="#ff806f"/><path d="m196 162 38 13-38 12Z" fill="#f5ce5d"/><path d="m785 162 44 13-44 14Z" fill="#7cc3f3"/>
    </> : <>
      <path d="m0 150 153-67 146 57 215-66 162 66 183-40 141 34v76H0Z" fill="#3c917c"/>
      <path d="m0 183 178-48 190 50 205-39 190 33 237-22v53H0Z" fill="#68af83"/>
      <path d="m601 130-74 34 57 17-92 29h170l49-28-79-16 26-36Z" fill="#78c7cd"/><path d="m601 130-21 37 50 16-48 27h80l49-28-79-16 26-36Z" fill="#4aa6b8"/>
      <path d="M75 87h12v102H75Zm823 0h12v107h-12Z" fill="#987a61"/>
      <path d="m17 139 64-114 65 114Z" fill="#8bd5a5"/><path d="M81 25v114h65Z" fill="#469a80"/><path d="m27 169 54-100 56 100Z" fill="#65bb91"/><path d="M81 69v100h56Z" fill="#358f79"/>
      <path d="m839 150 65-123 65 123Z" fill="#a1d8b3"/><path d="M904 27v123h65Z" fill="#519f8a"/><path d="m847 182 57-104 58 104Z" fill="#79c5a3"/><path d="M904 78v104h58Z" fill="#3b927e"/>
      <path d="m148 180 31-61 33 61Z" fill="#dbb17b"/><path d="m179 119 33 61h-33Z" fill="#b78b68"/>
      <path d="m740 194 27-53 28 53Z" fill="#b1cb85"/><path d="m767 141 28 53h-28Z" fill="#80a66b"/>
      <path d="m0 199 200-9 170 12 119-8 190 13 141-15 180 8v10H0Z" fill="#91c788"/>
      {[115,242,340,735,816,970].map((x,i)=><g key={x}><path d={`M${x} 208v-13`} stroke="#477b60" strokeWidth="3"/><path d={`m${x} 187 7 7-7 7-7-7Z`} fill={i%2?"#efd17d":"#efaa91"}/></g>)}
    </>}
  </svg>;
}
function PodiumObject({place,neutral,theme}:{place:number;neutral:boolean;theme:PodiumTheme}) {
  return <svg className={`podium-sigil ${neutral ? "neutral" : ""}`} viewBox="0 0 120 130" aria-hidden="true">
    {theme === "sport" && place === 1 && !neutral ? <><path d="M31 29H12v23l17 20h17V58H32L24 48v-7h11Zm58 0h19v23L91 72H74V58h14l8-10v-7H85Z" fill="var(--award-shadow)"/><path d="M30 19h60l-6 48-24 22-24-22Z" fill="var(--award-main)"/><path d="M30 19h30v70L36 67Z" fill="var(--award-light)"/><path d="M54 86h12v22H54Z" fill="var(--award-shadow)"/><path d="M38 107h44l8 13H30Z" fill="var(--award-main)"/><path d="M38 107h22v13H30Z" fill="var(--award-light)"/></> : theme === "sport" ? <><path d="M35 7h22l13 42-24 7Z" fill="#ed8170"/><path d="M63 7h22L73 56l-24-7Z" fill="#72baf0"/><path d="m60 35 29 12 12 29-12 29-29 12-29-12-12-29 12-29Z" fill="var(--award-main)"/><path d="m60 35 29 12 12 29H60Z" fill="var(--award-light)"/><path d="M60 76h41l-12 29-29 12Z" fill="var(--award-shadow)"/><path d="m60 48 20 8 8 20-8 20-20 8-20-8-8-20 8-20Z" fill="var(--award-main)"/></> : <><path d="m60 22 35 16 11 35-17 34-29 13-29-13-17-34 11-35Z" fill="var(--award-main)"/><path d="m60 22 35 16 11 35-46-8Z" fill="var(--award-light)"/><path d="m14 73 46-8v55l-29-13Z" fill="var(--award-shadow)"/><path d="m38 7 20 7-3 18-19-8Z" fill="#9ad9ad"/><path d="m58 14 20-9 7 16-23 11Z" fill="#61ba9d"/></>}
    <text x="60" y={theme === "sport" && place===1 ? "63" : "87"} textAnchor="middle" fill="#263242" fontSize="29" fontWeight="800">{neutral ? "·" : place}</text>
  </svg>;
}
function ArcadeScores({rows,favorite}:{rows:ReturnType<typeof personalStandings>;favorite:string|null}) {
  return <div className="arcade-scores"><svg className="arcade-maze" viewBox="0 0 600 390" preserveAspectRatio="none" aria-hidden="true"><path d="M22 22h122v28H52v66H22Zm434 0h122v94h-30V50h-92ZM22 274h30v64h91v30H22Zm526 0h30v94H456v-30h92ZM174 22h85m81 0h85M174 368h85m81 0h85" fill="none" stroke="#526fd4" strokeWidth="5"/><path d="M80 78h36m368 0h36M80 312h36m368 0h36" stroke="#526fd4" strokeWidth="5"/><path d="M170 38h8v8h-8zm30 0h8v8h-8zm30 0h8v8h-8zm132 0h8v8h-8zm30 0h8v8h-8zm30 0h8v8h-8zM279 344h8v8h-8zm30 0h8v8h-8z" fill="#f4ca5c"/></svg><div className="arcade-topline"><span>1UP</span><span>PERSONAL RESULTS</span><span>TOP 3</span></div><h3 className="arcade-score-title">HIGH SCORES</h3><p className="arcade-score-help">{favorite?"YOUR WINNER & RUNNERS-UP":"YOUR CONTENDERS"}</p><div className="arcade-score-columns" aria-hidden="true"><span>RANK</span><span>TARGET</span><span>PREF / HEARD</span></div>{rows.map((row,index)=>{
    const same=index>0&&Math.abs(rows[index-1].score-row.score)<1e-8, place=rows.findIndex(other=>Math.abs(other.score-row.score)<1e-8)+1;
    return <article className={`arcade-score-row arcade-rank-${place}`} key={row.id}><strong className="arcade-rank">{favorite?String(place).padStart(2,"0"):"—"}</strong><div><h4>{row.name}</h4><PersonalTuneLink id={row.id} name={row.name}/><small>{favorite?`${place===1?"Winner":"Runner-up"} · ${awardNames[place-1]}${same?" · tied":""}`:"Contender"}</small></div><div className="arcade-record"><strong>{String(row.wins).padStart(2,"0")} / {String(row.heard).padStart(2,"0")}</strong><small>{row.ties} ties</small></div></article>;
  })}{!rows.length&&<p className="arcade-empty">PLAY A COMPARISON TO BEGIN</p>}<p className="arcade-bottomline">Order uses opponent-adjusted preferences. Numbers are actual preferred/heard counts, not game points.</p></div>;
}

export default function PersonalPodium({ run, compact = false, afterWinners }: { run: PersonalRun; compact?: boolean; afterWinners?: ReactNode }) {
  const [theme,setTheme] = useState<PodiumTheme>("sport"), [allHistory,setAllHistory] = useState(false);
  useEffect(()=>{try{const saved=localStorage.getItem(THEME_KEY);if(saved === "sport" || saved === "game" || saved === "grove")setTheme(saved);}catch{}},[]);
  const standings = useMemo(()=>personalStandings(run),[run]);
  const active = standings.filter(row=>row.heard>0&&!run.excluded.includes(row.id));
  const rows = active.slice(0,3);
  const fullRows = [...active,...standings.filter(row=>!row.heard&&!run.excluded.includes(row.id)),...standings.filter(row=>run.excluded.includes(row.id))];
  const favorite = useMemo(()=>personalFavorite(run),[run]);
  const history = run.history || [], prior = [...history].reverse().find(h=>h.choices<run.choices.length);
  const isChecked = confirmationComplete(run);
  function chooseTheme(next: PodiumTheme) {setTheme(next);try{localStorage.setItem(THEME_KEY,next);}catch{/* Cosmetic preference only; tournament progress is unaffected. */}}
  return <section className={`personal-podium ${compact ? "compact" : ""}`} data-theme={theme} aria-label="Personal tournament results and history">
    <div className="podium-heading"><div><span className="podium-kicker">YOUR PERSONAL TOURNAMENT</span><h2>{favorite ? "Your Winners" : "Your Shortlist"}</h2><p>{run.label}</p></div><label>Results theme<select value={theme} onChange={event=>chooseTheme(event.target.value as PodiumTheme)}><option value="sport">Field Day</option><option value="game">Retro Arcade</option><option value="grove">Low-Poly Grove</option></select></label></div>
    <p className="podium-note">{favorite ? isChecked ? "Finalist checks completed. Winners reflect your current personal order, not certainty or official awards." : "Provisional winners. Check your finalists on different music before settling on a favorite." : "No clear winner yet. Ties, missing matchups or mixed preferences can leave several good choices; no medals are assigned."}</p>
    {theme==="game" ? <ArcadeScores rows={rows} favorite={favorite}/> : <div className={`podium-stage ${!favorite ? "podium-unresolved" : ""}`}><PodiumSky theme={theme}/><PodiumScene theme={theme}/>{rows.map((row,index)=>{
      const previous = prior?.leaders.findIndex(target=>target.id===row.id) ?? -1;
      const delta = previous < 0 ? null : previous-index;
      // Do not assign an arbitrary silver/bronze ordering to exact fitted ties.
      const sameAsPrevious = index>0 && Math.abs(rows[index-1].score-row.score)<1e-8;
      const place = rows.findIndex(other=>Math.abs(other.score-row.score)<1e-8)+1;
      return <article className={`podium-place podium-place-${favorite ? place : "neutral"}`} key={row.id}>{favorite ? <PodiumObject place={place} neutral={false} theme={theme}/> : <svg className="podium-contender-mark" viewBox="0 0 80 80" fill="none" aria-hidden="true"><circle cx="40" cy="40" r="30"/><path d="M12 44c11 0 12-18 20-18s8 28 16 28 12-18 20-18"/><circle cx="40" cy="40" r="3"/></svg>}<span className="podium-award">{favorite ? `${place===1?"Winner":"Runner-up"} · ${awardNames[place-1]}${sameAsPrevious ? " · tied" : ""}` : "Contender"}</span><h3>{row.name}</h3><PersonalTuneLink id={row.id} name={row.name}/><p>{row.wins} preferred · {row.losses} not preferred · {row.ties} ties</p><small>{!prior ? "First checkpoint" : delta === null ? "New to this shortlist" : delta === 0 ? "Same position as prior checkpoint" : `${Math.abs(delta)} ${delta>0?"place up":"place down"} since prior checkpoint`}</small><div className="podium-step" aria-hidden="true"/></article>;
    })}{!rows.length && <p>Complete a comparison to begin your personal shortlist.</p>}</div>}
    {afterWinners}
    {!compact && <div className="personal-full-standings"><h3>All Your Targets</h3><p>Current order among targets you have heard. Unheard and set-aside targets have no active place; close places can change with more listening.</p><p className="standings-scroll-hint">Swipe or scroll to see every column.</p><div className="podium-history-table" tabIndex={0} role="region" aria-label="All target standings; scroll for more columns"><table><thead><tr><th>Place</th><th>Target</th><th>Preferred / heard</th><th>Status</th></tr></thead><tbody>{fullRows.map(row=>{const index=active.findIndex(r=>r.id===row.id);const place=index<0?null:active.findIndex(r=>Math.abs(r.score-row.score)<1e-8)+1;return <tr key={row.id}><td>{place?<PersonalPlace place={place} medal={!!favorite}/>:"—"}</td><th scope="row"><div className="personal-ranked-target"><span>{row.name}</span><PersonalTuneLink id={row.id} name={row.name}/></div></th><td>{row.wins} / {row.heard}{row.ties>0?` · ${row.ties} ties`:""}</td><td>{run.excluded.includes(row.id)?"Set aside":!row.heard?"Not heard yet":row.benched?"Benched · can return":favorite?(place===1?"Winner":`Runner-up${place&&place<=3?` · ${awardNames[place-1]}`:""}`):"Contender"}</td></tr>;})}</tbody></table></div></div>}
    {!compact && <details className="podium-history"><summary>Current &amp; Long-Term History · {history.length} saved {history.length===1?"checkpoint":"checkpoints"}</summary><p>Compare checkpoints for this exact listening setup. Earlier choices remain in the run; later results can change as you hear more targets and music.</p><div className="podium-history-table"><table><thead><tr><th>Checkpoint</th><th>Progress</th><th>Favorite / shortlist</th></tr></thead><tbody><tr><th>Current</th><td>{run.choices.filter(c=>c.result!=="skip").length} comparisons</td><td>{favorite ? rows.find(row=>row.id===favorite)?.name : rows.map(row=>row.name).join(" · ") || "No choices yet"}</td></tr>{[...history].reverse().slice(0,allHistory?history.length:10).map((h,index)=><tr key={`${h.at}:${index}`}><th>{new Date(h.at).toLocaleString()}</th><td>{h.comparisons} comparisons · {h.explored}/{run.candidates.length} explored</td><td>{h.favorite ? h.leaders.find(row=>row.id===h.favorite)?.name : h.leaders.map(row=>row.name).join(" · ") || "No choices yet"}<small>{h.phase==="confirm"?"Finalist checks":"Explore & compare"}</small></td></tr>)}</tbody></table></div>{history.length>10 && <button type="button" onClick={()=>setAllHistory(!allHistory)}>{allHistory?"Show latest 10":"Show all checkpoints"}</button>}<p>History stays on this browser unless you explicitly Sync or export it. Clearing site data removes it. Changed measurements and catalogs keep separate runs; they should not be treated as directly equivalent tests.</p></details>}
  </section>;
}

export function PersonalResultsSummary() {
  const [runs,setRuns]=useState<PersonalRun[]>([]),[error,setError]=useState("");
  useEffect(()=>{const load=()=>{try{setRuns(parsePersonalRuns(localStorage.getItem(PERSONAL_KEY)));setError("");}catch{setError("Saved personal progress could not be read. Open Personal Tournament to export or manage it.");setRuns([]);}};load();const changed=(event:StorageEvent)=>{if(!event.key||event.key===PERSONAL_KEY||event.key==="yinyang-erasure-event")load();};window.addEventListener("storage",changed);return()=>window.removeEventListener("storage",changed);},[]);
  return <section className="personal-results-summary"><div className="heading-row"><div><h2>Personal Tournament Results</h2><p>Your current winners and checkpoint history, separate from research comparison history.</p></div><a href="/shootout/personal">Open Personal Tournament →</a></div>{error&&<p role="alert">{error}</p>}{[...runs].sort((a,b)=>b.updatedAt-a.updatedAt).map(run=><PersonalPodium key={run.context} run={run}/>)}{!runs.length&&!error&&<p>No personal tournaments saved on this browser yet.</p>}</section>;
}
