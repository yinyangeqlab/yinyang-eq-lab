"use client";
import { Shuffle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import MusicPanel, { type MusicPanelHandle } from "@/components/music-panel";
import FeedbackPanel from "@/components/feedback-panel";
import { parseCurve, type Point } from "@/lib/curves";
import { compareTargets } from "@/lib/target-review";
import { screenTargetName } from "@/lib/target-name-policy";
import type { HeadphoneMeasurement } from "@/lib/measurement";
import MeasurementManager from "@/components/measurement-manager";
import TargetLineagePicker from "@/components/target-lineage-picker";
import HeadphonePicker, { type CatalogMeasurement } from "@/components/headphone-picker";
import ResultsProfile, { type Trial } from "@/components/results-profile";
import { fitAutoEq } from "@/lib/autoeq";
import { importCatalogEntry } from "@/lib/public-measurements";
import { targetHeadphoneType } from "@/lib/target-type";
import { VOTE_DATA_NOTICE_VERSION } from "@/lib/vote-data-notice";

type Target = { id: string; name: string; creator: string; description: string; curveKind?: "original" | "preference"; parentTargetId?: string | null; points: Point[]; rating: number; wins: number; losses: number; status: "approved" | "local" | "pending"; measurement?: HeadphoneMeasurement | null; submissionId?: string };
type Tab = "shootout" | "rankings" | "music" | "upload" | "measurements" | "profile";
type Suggestion = { id: string; title: string; artist: string; album: string; recordingId: string; note: string };
type Ranked = { id: string; name: string; creator: string; rating: number; sd: number; lower: number; upper: number; wins: number; losses: number; ties: number; comparisons: number; listeners: number; effectiveComparisons: number };
type Research = { random: { rows: Ranked[]; voteCount: number }; bring: { rows: Ranked[]; voteCount: number }; all: { rows: Ranked[]; voteCount: number }; curated: { rows: Ranked[]; voteCount: number; trackCount: number }; verified: { rows: Ranked[]; voteCount: number }; categories: Record<"random" | "bring" | "all" | "curated" | "verified", Record<"ie" | "oe", Ranked[]>> };

function browserVoterId() { let id = localStorage.getItem("target-lab-voter"); if (!id) { id = crypto.randomUUID(); localStorage.setItem("target-lab-voter", id); } return id; }

function curveReference(points: Point[]) {
  if (!points.length) return 0;
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  if (sorted[0][0] >= 1000) return sorted[0][1];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i][0] >= 1000) {
      const [lowHz, lowDb] = sorted[i - 1], [highHz, highDb] = sorted[i];
      const fraction = highHz === lowHz ? 0 : Math.log(1000 / lowHz) / Math.log(highHz / lowHz);
      return lowDb + (highDb - lowDb) * fraction;
    }
  }
  return sorted[sorted.length - 1][1];
}

const CURVE_VIEW = { min: 55, max: 95 } as const;

function Curve({ points, color }: { points: Point[]; color: string }) {
  const reference = curveReference(points);
  const plotX = (hz: number) => 64 + Math.log10(hz / 20) / 3 * 482;
  const plotY = (db: number) => 17 + (CURVE_VIEW.max - db) * 176 / (CURVE_VIEW.max - CURVE_VIEW.min);
  const alignedPoints: Point[] = points.map(([hz, db]) => [hz, db - reference + 75]);
  const fallbackPoint: Point = [20, 75];
  const safePoints = alignedPoints.length ? alignedPoints : [fallbackPoint];
  const path = safePoints.map(([hz, db], i) => `${i ? "L" : "M"}${plotX(hz)},${plotY(db)}`).join(" ");
  const lowPoint = safePoints.reduce((low, point) => point[1] < low[1] ? point : low, safePoints[0] ?? fallbackPoint);
  const highPoint = safePoints.reduce((high, point) => point[1] > high[1] ? point : high, safePoints[0] ?? fallbackPoint);
  const anchorX = plotX(1000);
  const anchorY = plotY(75);
  const clipId = `curve-plot-${color.replace("#", "")}`;
  return <svg className="curve" viewBox="0 0 560 210" preserveAspectRatio="none" role="img" aria-label={`Frequency response curve, 1 kHz at 75 dB, displayed from ${CURVE_VIEW.min} to ${CURVE_VIEW.max} dB; arrows mark values outside this view`}>
    <defs><clipPath id={clipId}><rect x="64" y="17" width="482" height="176" /></clipPath></defs>
    <line x1="54" x2="54" y1="17" y2="193" stroke="#71838d" strokeWidth="1" />
    {[17, anchorY, 193].map(y => <line key={y} x1="51" x2="57" y1={y} y2={y} stroke="#71838d" strokeWidth="1" />)}
    <path d={path} clipPath={`url(#${clipId})`} fill="none" stroke={color} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    <circle cx={anchorX} cy={anchorY} r="4" fill={color} stroke="#090e12" strokeWidth="1.5" />
    {lowPoint[1] < CURVE_VIEW.min && <text x={plotX(lowPoint[0])} y="190" textAnchor="middle" fill={color} fontSize="15" fontWeight="900">↓</text>}
    {highPoint[1] > CURVE_VIEW.max && <text x={plotX(highPoint[0])} y="31" textAnchor="middle" fill={color} fontSize="15" fontWeight="900">↑</text>}
    <text x="46" y="20" textAnchor="end" fill="#8fa3ad" fontSize="10" fontWeight="700">{CURVE_VIEW.max} dB</text>
    <text x="46" y={anchorY + 4} textAnchor="end" fill="#b9cbd2" fontSize="11" fontWeight="700">75 dB</text>
    <text x="46" y="197" textAnchor="end" fill="#8fa3ad" fontSize="10" fontWeight="700">{CURVE_VIEW.min} dB</text>
  </svg>;
}

function TargetSearchField({ label, targets, selectedId, listId, onSelect }: { label: string; targets: Target[]; selectedId: string; listId: string; onSelect: (id: string) => void }) {
  const selected = targets.find(target => target.id === selectedId);
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  useEffect(() => { if (selected) setQuery(selected.name); else if (!selectedId) setQuery(""); }, [selected?.id, selectedId]);
  const filtered = targets.filter(target => `${target.name} ${target.creator}`.toLowerCase().includes(query.trim().toLowerCase()));
  function choose(target: Target) { setQuery(target.name); onSelect(target.id); setOpen(false); }
  return <label className="target-search-field">{label}<div className="target-search">
    <input id={`${listId}-input`} className="target-search-input" type="search" role="combobox" aria-label={`Search ${label}`} aria-autocomplete="list" aria-expanded={open} aria-controls={listId} autoComplete="off" value={query} onFocus={event => { event.currentTarget.select(); setOpen(true); }} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onChange={event => { setQuery(event.target.value); onSelect("__searching__"); setOpen(true); }} onKeyDown={event => {
      if (event.key === "Escape") { setQuery(selected?.name ?? ""); onSelect(selected?.id ?? ""); setOpen(false); }
      if (event.key === "Enter" && open && filtered.length) { event.preventDefault(); choose(filtered[0]); }
    }} />
    <div id={listId} className="target-search-results" role="listbox" hidden={!open}>
      {filtered.length ? filtered.map(target => <button type="button" role="option" aria-selected={target.id === selectedId} className="target-search-result" key={target.id} onMouseDown={event => event.preventDefault()} onClick={() => choose(target)}><span>{target.name}{target.status === "approved" ? "" : " · private"}</span><small>{target.creator}</small></button>) : <p>No matching targets.</p>}
    </div>
  </div></label>;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("shootout");
  const [setupCollapsed, setSetupCollapsed] = useState(false);
  const autoCollapseSetupRef = useRef(false);
  const [restored, setRestored] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [sessionFinished, setSessionFinished] = useState(false);
  const [lastActivity, setLastActivity] = useState(0);
  const lastActivityRef = useRef(0);
  const lastPersistedRef = useRef(0);
  const lastHeardRef = useRef<[number,number]>([0,0]);
  const [sessionNow, setSessionNow] = useState(0);
  const [targets, setTargets] = useState<Target[]>([]);
  const [localTargets, setLocalTargets] = useState<Target[]>([]);
  const [measurements, setMeasurements] = useState<HeadphoneMeasurement[]>([]);
  const [measurementId, setMeasurementId] = useState("");
  const [measurementEditId, setMeasurementEditId] = useState<string | null>(null);
  const [savedScrollRequest, setSavedScrollRequest] = useState(0);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [researchSharing, setResearchSharing] = useState(false);
  const [voteDataAccepted, setVoteDataAccepted] = useState<boolean | null>(null);
  const [voteDataChecked, setVoteDataChecked] = useState(false);
  const [reviewVoteData, setReviewVoteData] = useState(false);
  function acceptVoteData() {
    if (!voteDataChecked) return;
    localStorage.setItem("target-lab-vote-data-agreement", VOTE_DATA_NOTICE_VERSION);
    setVoteDataAccepted(true);
    setReviewVoteData(false);
  }
  function stopParticipating() {
    musicPanelRef.current?.stop();
    localStorage.removeItem("target-lab-vote-data-agreement");
    window.location.assign("/shootout");
  }
  function changeResearchSharing(enabled: boolean) {
    localStorage.setItem("target-lab-research-sharing", enabled ? "true" : "false");
    setResearchSharing(enabled);
  }
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songNote, setSongNote] = useState("");
  const [songAlbum, setSongAlbum] = useState("");
  const [songRecordingId, setSongRecordingId] = useState("");
  const musicPanelRef = useRef<MusicPanelHandle>(null);
  const [listenSide, setListenSide] = useState<0 | 1>(0);
  const [edgeExpanded, setEdgeExpanded] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [feedbackNonce,setFeedbackNonce]=useState(0);
  const [describeOpen,setDescribeOpen]=useState(false);
  const openFeedbackIdRef=useRef("");
  function openFeedbackId() { if (!openFeedbackIdRef.current) openFeedbackIdRef.current=crypto.randomUUID(); return openFeedbackIdRef.current; }
  const [soundPrompt,setSoundPrompt]=useState(false);
  const [dontShowSoundPrompt,setDontShowSoundPrompt]=useState(false);
  const skipSoundPromptRef=useRef(false);
  const neverSoundPromptRef=useRef(false);
  const pendingSoundAction=useRef<(() => void) | null>(null);
  function requestSoundCheck(action: () => void, newTest=false) {
    if (newTest && !neverSoundPromptRef.current) {
      skipSoundPromptRef.current=false;
      sessionStorage.removeItem("target-lab-sound-check-acknowledged");
    }
    if (skipSoundPromptRef.current) { action(); return; }
    pendingSoundAction.current=action;
    setDontShowSoundPrompt(false);
    setSoundPrompt(true);
  }
  function acknowledgeSoundCheck() {
    skipSoundPromptRef.current=true;
    sessionStorage.setItem("target-lab-sound-check-acknowledged", "true");
    if (dontShowSoundPrompt) {
      neverSoundPromptRef.current=true;
      localStorage.setItem("target-lab-sound-check-skip", "true");
    }
    setSoundPrompt(false);
    const action=pendingSoundAction.current;
    pendingSoundAction.current=null;
    action?.();
  }
  const [testMode, setTestMode] = useState<"blind" | "bring" | "open">("blind");
  const [previewMode, setPreviewMode] = useState<"blind" | "bring" | "open" | null>(null);
  const [loudnessTarget, setLoudnessTarget] = useState<"-14" | "-16" | "-18" | "off">("-16");
  const [heard, setHeard] = useState<[number, number]>([0, 0]);
  const [showCurves, setShowCurves] = useState(false);
  function toggleCurves() { setShowCurves(current => { localStorage.setItem("target-lab-show-curves", String(!current)); return !current; }); }
  const [rankMode, setRankMode] = useState<"random" | "bring" | "all" | "curated" | "verified">("all");
  const [rankType, setRankType] = useState<"ie" | "oe">("ie");
  const [headphoneType, setHeadphoneType] = useState<"ie" | "oe" | null>(null);
  const [research, setResearch] = useState<Research | null>(null);
  const [pair, setPair] = useState<[string, string] | null>(null);
  const [trialId, setTrialId] = useState<string | null>(null);
  const [pickA,setPickA]=useState("");
  const [applyNotice,setApplyNotice]=useState<{kind:"selected"|"random";id:number}|null>(null);
  const [pickB,setPickB]=useState("");
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [creator, setCreator] = useState("");
  const [curveKind, setCurveKind] = useState<"original" | "preference">("original");
  const [parentTargetId, setParentTargetId] = useState("");
  const [description, setDescription] = useState("");
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  async function refresh() {
    try { const r = await fetch("/api/targets", { cache: "no-store" }); if (!r.ok) throw new Error("Could not load targets."); const approved: Target[] = await r.json(); setTargets(approved); setLocalTargets(current => { const next=current.filter(t=>!approved.some(a=>a.id===t.submissionId)); if(next.length!==current.length)localStorage.setItem("target-lab-private-targets",JSON.stringify(next)); return next; }); const suggestionsResponse = await fetch("/api/suggestions", { cache: "no-store" }); if (suggestionsResponse.ok) setSuggestions(await suggestionsResponse.json()); const researchResponse = await fetch("/api/research", { cache: "no-store" }); if (researchResponse.ok) setResearch(await researchResponse.json()); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Could not load targets."); }
  }
  useEffect(() => {
    neverSoundPromptRef.current=localStorage.getItem("target-lab-sound-check-skip") === "true";
    skipSoundPromptRef.current=neverSoundPromptRef.current || sessionStorage.getItem("target-lab-sound-check-acknowledged") === "true";
    setResearchSharing(localStorage.getItem("target-lab-research-sharing") === "true");
    setVoteDataAccepted(localStorage.getItem("target-lab-vote-data-agreement") === VOTE_DATA_NOTICE_VERSION);
  }, []);
  useEffect(() => { try { const saved=JSON.parse(localStorage.getItem("target-lab-page-state") || "{}"); if (["shootout","rankings","music","upload","measurements","profile"].includes(saved.tab)) setTab(saved.tab); if (typeof saved.setupCollapsed === "boolean") setSetupCollapsed(saved.setupCollapsed); if (["blind","bring","open"].includes(saved.testMode)) setTestMode(saved.testMode); if (["-14","-16","-18","off"].includes(saved.loudnessTarget)) setLoudnessTarget(saved.loudnessTarget); if (localStorage.getItem("target-lab-ranking-layout-v2") && ["random","bring","all","verified"].includes(saved.rankMode)) setRankMode(saved.rankMode); else setRankMode("all"); localStorage.setItem("target-lab-ranking-layout-v2", "true"); if (["ie","oe"].includes(saved.rankType)) setRankType(saved.rankType); if (["ie","oe"].includes(saved.headphoneType)) setHeadphoneType(saved.headphoneType); const expired=saved.testMode!=="open" && saved.sessionFinished!==true && Array.isArray(saved.pair) && (typeof saved.lastActiveAt!=="number" || Date.now()-saved.lastActiveAt>=600000 || saved.sessionExpired===true); setSessionId(typeof saved.sessionId==="string" && saved.sessionId ? saved.sessionId : crypto.randomUUID());setSessionFinished(saved.sessionFinished===true); if (expired) {setPair(null);setSessionExpired(true);} else if (Array.isArray(saved.pair) && saved.pair.length===2 && saved.pair.every((id: unknown)=>typeof id==="string") && (saved.testMode==="open" || typeof saved.trialId==="string")) {setPair(saved.pair);setTrialId(typeof saved.trialId==="string"?saved.trialId:null);} setRevealed(!expired && saved.revealed===true); const activity=typeof saved.lastActiveAt==="number"?saved.lastActiveAt:Date.now();lastActivityRef.current=activity;lastPersistedRef.current=activity;setLastActivity(activity);setSessionNow(Date.now()); } catch {} try { setLocalTargets(JSON.parse(localStorage.getItem("target-lab-private-targets") || "[]")); } catch { setLocalTargets([]); } try { setMeasurements(JSON.parse(localStorage.getItem("target-lab-measurements") || "[]")); } catch { setMeasurements([]); } try { setTrials(JSON.parse(localStorage.getItem("target-lab-trials") || "[]")); } catch { setTrials([]); } setMeasurementId(localStorage.getItem("target-lab-active-measurement") || ""); setShowCurves(localStorage.getItem("target-lab-show-curves") === "true"); setRestored(true); void refresh(); }, []);
  useEffect(() => { if (restored) localStorage.setItem("target-lab-page-state",JSON.stringify({tab,testMode,setupCollapsed,loudnessTarget,rankMode,rankType,headphoneType,pair,trialId,revealed,lastActiveAt:lastActivity,sessionExpired,sessionId,sessionFinished})); }, [restored,tab,testMode,setupCollapsed,loudnessTarget,rankMode,rankType,headphoneType,pair,trialId,revealed,lastActivity,sessionExpired,sessionId,sessionFinished]);
  function touchBlind() {
    if (testMode === "open" || sessionExpired || sessionFinished || !pair) return;
    const now=Date.now();lastActivityRef.current=now;
    if (now-lastPersistedRef.current>=1000) {lastPersistedRef.current=now;setLastActivity(now);}
  }
  function handleHeard(next: [number,number]) {
    const previous=lastHeardRef.current;lastHeardRef.current=next;setHeard(next);
    if (next[0]+next[1]>previous[0]+previous[1]+.05) touchBlind();
  }
  useEffect(() => {
    if (!restored) return;
    const activity=()=>touchBlind();
    window.addEventListener("pointerdown",activity);window.addEventListener("keydown",activity);
    const timer=window.setInterval(() => {
      const now=Date.now();setSessionNow(now);
      if (testMode!=="open" && pair && !sessionExpired && !sessionFinished && now-lastActivityRef.current>=600000) {
        musicPanelRef.current?.stop();setSessionExpired(true);setPair(null);setHeard([0,0]);
        setMessage("Your unfinished blind pairing expired after 10 minutes without activity. Start a new test when ready.");
      }
    },1000);
    return () => {window.removeEventListener("pointerdown",activity);window.removeEventListener("keydown",activity);clearInterval(timer);};
  },[restored,testMode,pair,revealed,sessionExpired]);
  function resetFeedback(){openFeedbackIdRef.current=crypto.randomUUID();setFeedbackNonce(value=>value+1);setDescribeOpen(false);}
  function requireMeasurement() { if (selectedMeasurement) return true; setMessage("Select a headphone measurement before starting a test."); return false; }
  function startNewBlindTest() { if (requireMeasurement()) requestSoundCheck(beginNewBlindTest,true); }
  function beginNewBlindTest() {autoCollapseSetupRef.current=false;setSetupCollapsed(false);resetFeedback();const now=Date.now();setSessionId(crypto.randomUUID());setSessionFinished(false);lastActivityRef.current=now;lastPersistedRef.current=now;setLastActivity(now);setSessionExpired(false);setPair(null);setTrialId(null);setRevealed(false);setHeard([0,0]);setMessage("");}
  function changeTestMode(mode: "blind" | "bring" | "open") {if(mode===testMode){setPreviewMode(null);return;}setPreviewMode(mode);setMessage("");}
  function startTestMode(mode: "blind" | "bring" | "open") {if (!selectedMeasurement) {setPreviewMode(null);setMessage("Select a headphone measurement before starting a test.");window.requestAnimationFrame(()=>document.querySelector<HTMLInputElement>(".headphone-search input")?.focus());return;}requestSoundCheck(() => beginTestMode(mode),true);}
  function beginTestMode(mode: "blind" | "bring" | "open") {autoCollapseSetupRef.current=false;setSetupCollapsed(false);musicPanelRef.current?.stop();setPreviewMode(null);setTestMode(mode);setPickA("");setPickB("");const now=Date.now();if(mode!=="open"){setSessionId(crypto.randomUUID());lastActivityRef.current=now;lastPersistedRef.current=now;setLastActivity(now);}setSessionFinished(false);setSessionExpired(false);setPair(null);setTrialId(null);setRevealed(false);setHeard([0,0]);resetFeedback();setMessage("");}
  const sessionTrials=trials.filter(row=>row.mode===testMode && row.sessionId===sessionId);
  function finishBlindTest() {if(sessionTrials.length<2 || busy)return;musicPanelRef.current?.stop();setSessionFinished(true);setPair(null);setTab("shootout");setMessage("");}
  const checks=sessionTrials.filter(row=>row.catchTrial), checkCorrect=checks.filter(row=>row.result==="tie").length;
  const checkRate=checks.length?checkCorrect/checks.length:null;
  const checkSd=checks.length>1?Math.sqrt(checkRate!*(1-checkRate!)*checks.length/(checks.length-1)):null;
  const sessionSummary=Object.entries(sessionTrials.reduce<Record<string,{name:string,wins:number,n:number,sum:number,sumSq:number,ties:number}>>((out,row)=>{if(row.catchTrial)return out;row.pair.forEach((id,index)=>{const name=row.pairNames[index];out[id]??={name,wins:0,n:0,sum:0,sumSq:0,ties:0};const score=row.result==="tie"?.5:id===row.winnerId?1:0;out[id].n++;out[id].sum+=score;out[id].sumSq+=score*score;if(score===1)out[id].wins++;if(score===.5)out[id].ties++;});return out;},{})).map(([id,row])=>({id,...row,sd:row.n>1?Math.sqrt(Math.max(0,(row.sumSq-row.sum*row.sum/row.n)/(row.n-1))):null})).sort((a,b)=>b.sum/b.n-a.sum/a.n);
  const allTargets = useMemo(() => [...targets, ...localTargets], [targets, localTargets]);
  const openTargets = useMemo(() => allTargets.filter(target => !headphoneType || !targetHeadphoneType(target) || targetHeadphoneType(target) === headphoneType), [allTargets, headphoneType]);
  const rankedTargets = useMemo(() => targets.filter(target => target.status === "approved" && (!headphoneType || !targetHeadphoneType(target) || targetHeadphoneType(target) === headphoneType)), [targets, headphoneType]);
  const testPool = testMode !== "open" ? rankedTargets : openTargets;
  const draftPending = testMode === "open" && !!pair && ((pickA || pair[0]) !== pair[0] || (pickB || pair[1]) !== pair[1]);
  const poolIE = testPool.filter(target => targetHeadphoneType(target) === "ie").length;
  const poolOE = testPool.filter(target => targetHeadphoneType(target) === "oe").length;
  const poolBoth = testPool.length - poolIE - poolOE;
  const poolCountDetail = headphoneType ? `${headphoneType === "ie" ? `${poolIE} IE` : `${poolOE} OE`} + ${poolBoth} BOTH` : `${poolIE} IE + ${poolOE} OE + ${poolBoth} BOTH`;
  function savePrivate(rows: Target[]) { localStorage.setItem("target-lab-private-targets", JSON.stringify(rows)); setLocalTargets(rows); }
  function saveTrial(row: Trial) {
    setTrials(current => {
      const next = [...current.filter(item => item.id !== row.id), row];
      localStorage.setItem("target-lab-trials", JSON.stringify(next));
      return next;
    });
  }
  function clearCurrentPair() {musicPanelRef.current?.stop();musicPanelRef.current?.reset();setPair(null);setTrialId(null);setPickA("");setPickB("");setHeard([0,0]);setRevealed(false);resetFeedback();}
  function showSavedMeasurements() { setMeasurementEditId(null); setSavedScrollRequest(value => value + 1); setTab("measurements"); }
  useEffect(() => { if (tab === "measurements" && savedScrollRequest) { document.getElementById("saved-measurements")?.scrollIntoView({ behavior: "smooth", block: "start" }); setSavedScrollRequest(0); } }, [tab, savedScrollRequest]);
  function chooseMeasurement(id: string) { const chosen=measurements.find(m=>m.id===id);if(!chosen)return;setHeadphoneType(chosen.type);setRankType(chosen.type);setMeasurementId(id);localStorage.setItem("target-lab-active-measurement",id);clearCurrentPair();setMessage(""); }
  function clearMeasurement() { setMeasurementId(""); localStorage.removeItem("target-lab-active-measurement"); clearCurrentPair(); setMessage(""); }
  function chooseHeadphoneType(type: "ie" | "oe") {setHeadphoneType(type);setRankType(type);setMeasurementId("");localStorage.removeItem("target-lab-active-measurement");clearCurrentPair();}
  function addMeasurement(row: HeadphoneMeasurement) {const next=[...measurements,row];localStorage.setItem("target-lab-measurements",JSON.stringify(next));setMeasurements(next);setHeadphoneType(row.type);setRankType(row.type);setMeasurementId(row.id);localStorage.setItem("target-lab-active-measurement",row.id);clearCurrentPair();}
  function updateMeasurement(row: HeadphoneMeasurement) {const next=measurements.map(item=>item.id===row.id?row:item);localStorage.setItem("target-lab-measurements",JSON.stringify(next));setMeasurements(next);if(measurementId===row.id){setHeadphoneType(row.type);setRankType(row.type);clearCurrentPair();}}
  function deleteMeasurement(id: string) {const next=measurements.filter(item=>item.id!==id);localStorage.setItem("target-lab-measurements",JSON.stringify(next));setMeasurements(next);if(measurementId===id){setMeasurementId("");localStorage.removeItem("target-lab-active-measurement");clearCurrentPair();setMessage("Select another headphone measurement before starting a test.");}}
  async function importCatalogMeasurement(entry: CatalogMeasurement) {addMeasurement(await importCatalogEntry(entry));}
  const selectedMeasurement=measurements.find(m=>m.id===measurementId);
  useEffect(() => { if (selectedMeasurement) setHeadphoneType(selectedMeasurement.type); }, [selectedMeasurement]);
  useEffect(() => { if (restored && !selectedMeasurement && pair) clearCurrentPair(); }, [restored, selectedMeasurement, pair]);
  useEffect(() => { if (restored && pair && pair.some(id => !testPool.some(target => target.id === id))) clearCurrentPair(); }, [restored, pair, testPool]);
  useEffect(() => {
    if (!restored || !selectedMeasurement || sessionExpired || sessionFinished || pair || testPool.length < 2) return;
    if (testMode === "open") { setPair([openTargets[0].id, openTargets[1].id]); return; }
    let cancelled = false;
    async function issue() {
      try {
        const response = await fetch("/api/trials", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({voterId:browserVoterId(),testMode,headphoneType,voteDataNoticeVersion:VOTE_DATA_NOTICE_VERSION}) });
        const result = await response.json() as { trialId?: string; pair?: [string,string]; error?: string };
        if (cancelled) return;
        if (response.status === 429) { setMessage("Thanks for listening! You’ve reached a temporary submission limit. Please come back again later."); return; }
        if (!response.ok || !result.trialId || !Array.isArray(result.pair) || result.pair.length !== 2) throw new Error(result.error ?? "Could not start a ranked pairing.");
        setTrialId(result.trialId); setPair(result.pair); setMessage("");
      } catch (error) { if (!cancelled) setMessage(error instanceof Error ? error.message : "Could not start a ranked pairing."); }
    }
    void issue();
    return () => { cancelled = true; };
  }, [restored, selectedMeasurement, testPool, pair, testMode, headphoneType, sessionExpired, sessionFinished]);
  function nextPair() { if(sessionExpired||sessionFinished||!requireMeasurement())return;if(testMode==="open"){advancePair();return;}requestSoundCheck(advancePair); }
  function advancePair() { touchBlind(); const choices: [string,string][]=[];const pool=testPool;for(let i=0;i<pool.length;i++)for(let j=i+1;j<pool.length;j++){const ids: [string,string]=[pool[i].id,pool[j].id];if(!pair||!ids.every(id=>pair.includes(id)))choices.push(ids);}if(!choices.length && pair)choices.push(pair);const chosen: [string,string]=testMode!=="open" && sessionTrials.length>=1 && Math.random()<.15 ? (()=>{const id=pool[Math.floor(Math.random()*pool.length)].id;return [id,id] as [string,string];})() : choices[Math.floor(Math.random()*choices.length)];if (testMode === "open") { applyOpenPair(chosen);return; } setPair(null);setTrialId(null);setHeard([0,0]);resetFeedback();setRevealed(false);setMessage("");musicPanelRef.current?.stop(); }
  function applyOpenPair(next: [string, string]) {setPair(next);setPickA(next[0]);setPickB(next[1]);resetFeedback();setHeard([0,0]);setRevealed(false);setMessage("");}
  function randomOpenPair(): [string,string] | null {const currentA=pickA||pair?.[0],currentB=pickB||pair?.[1];const options: [string,string][]=[];for(const a of openTargets)for(const b of openTargets)if(a.id!==b.id&&a.id!==currentA&&b.id!==currentB)options.push([a.id,b.id]);return options.length ? options[Math.floor(Math.random()*options.length)] : null;}
  function flashApplyNotice(kind: "selected" | "random") {const id=Date.now()+Math.random();setApplyNotice({kind,id});window.setTimeout(()=>setApplyNotice(current=>current?.id===id?null:current),4200);}
  function randomizeDraftBoth() {const next=randomOpenPair();if(!next)return;setPickA(next[0]);setPickB(next[1]);setMessage("");}
  function randomizeAndCompare() {const next=randomOpenPair();if(!next)return;applyOpenPair(next);flashApplyNotice("random");}
  async function listenToSide(side: 0 | 1) {
    if (!requireMeasurement()) return;
    if (!skipSoundPromptRef.current) {
      requestSoundCheck(() => { void listenToSide(side); });
      return;
    }
    if (!autoCollapseSetupRef.current) { autoCollapseSetupRef.current=true;setSetupCollapsed(true); }
    touchBlind();
    const started=await musicPanelRef.current?.listen(side);
    if(!started){setMessage(testMode === "bring" ? "Choose your own stereo song below, then click the A or B card." : "Choose a stereo music folder below, then click the A or B card.");document.querySelector(".music-panel")?.scrollIntoView({behavior:"smooth",block:"center"});}
    else setMessage("");
  }
  async function switchSide() {await listenToSide(listenSide===0?1:0);}
  const voteLocked = testMode !== "open" && (heard[0] < 5 || heard[1] < 5 || !trialId);
  async function vote(i: number) {
    if (!requireMeasurement()) return;
    touchBlind();
    if (!pair || busy || revealed || sessionExpired || sessionFinished || (testMode !== "open" && !trialId)) return;
    const elapsed=musicPanelRef.current?.heard() ?? [0,0];
    if (!headphoneType) { setMessage("Choose In-Ear or Over-Ear before saving your comparison."); return; }
    if (testMode !== "open" && (elapsed[0] < 5 || elapsed[1] < 5)) { setMessage("Listen to at least 5 seconds of A and B before choosing."); return; }
    if (testMode !== "open" && musicPanelRef.current?.isHashing()) { setMessage("Please wait for local file hashing to finish."); return; }
    const selected = pair.map(id => allTargets.find(t => t.id === id));
    const context=musicPanelRef.current?.finish();
    const completedRunId = crypto.randomUUID();
    const raw: Point[]=selectedMeasurement?.points||[[20,0],[20000,0]];
    const fits=selected.map(t=>fitAutoEq(raw,t!.points));const catchTrial=pair[0]===pair[1] || (fits[0].filters.length===fits[1].filters.length && fits[0].filters.every((f,j)=>Math.abs(f.hz-fits[1].filters[j].hz)<.01&&Math.abs(f.q-fits[1].filters[j].q)<.0001&&Math.abs(f.gain-fits[1].filters[j].gain)<.0001));const eqFits=fits.map(f=>({bands:f.filters.length,rms:+f.rms.toFixed(2),preamp:+f.preamp.toFixed(2)}));
    const trial = (recorded: boolean): Trial => ({id:completedRunId,result:i===2?"tie":i===0?"a":"b",catchTrial,sessionId:testMode!=="open"?sessionId:undefined,createdAt:Date.now(),pair,pairNames:[selected[0]?.name||"A",selected[1]?.name||"B"],winnerId:i===2?"":pair[i],winnerName:i===2?"Tie":selected[i]?.name||"",loserName:i===2?"":selected[1-i]?.name||"",recorded,mode:testMode,reasonSide:"a",reasonTags:[],otherReason:"",type:headphoneType||"unknown",measurementName:selectedMeasurement?.name||null,device:selectedMeasurement?.device||null,rig:selectedMeasurement?.rig||null,heardA:context?.heardA||0,heardB:context?.heardB||0,overlapSeconds:context?.overlapSeconds||0,songTitle:context?.songTitle||"",eqFits});
    // Completing a comparison and publishing a ranked vote are separate outcomes.
    // Keep the answer and reveal the targets even when either write is unavailable.
    saveTrial(trial(false));
    setRevealed(true);
    setBusy(true);
    try {
      const runResponse = await fetch("/api/listening-runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        id: completedRunId, voterId: browserVoterId(), trialId: testMode === "open" ? null : trialId, testMode, headphoneType,
        targetAId: pair[0], targetBId: pair[1], targetAName: selected[0]?.name ?? "", targetBName: selected[1]?.name ?? "",
        measurementId: selectedMeasurement?.id ?? null, result: i === 2 ? "tie" : i === 0 ? "a" : "b",
        intervals: context?.intervals ?? [],
        shareSong: context?.consent === true, songTitle: context?.songTitle, songArtist: context?.songArtist, songAlbum: context?.songAlbum, recordingId: context?.recordingId,
        voteDataNoticeVersion: VOTE_DATA_NOTICE_VERSION,
      }) });
      if (!runResponse.ok) throw new Error((await runResponse.json() as { error?: string }).error ?? "Listening record could not be saved.");
    } catch (error) {
      setBusy(false); setMessage(`Comparison saved to My results in this browser. Research submission failed: ${error instanceof Error ? error.message : "Listening record could not be saved."}`); return;
    }
    setBusy(false);
    if (testMode === "open") {
      if (selected.every(target => target?.status === "approved")) {
        try {
          const response=await fetch("/api/comparison-choices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({comparisonId:openFeedbackId(),participantId:browserVoterId(),testMode:"open",headphoneType,targetAId:pair[0],targetBId:pair[1],result:i===2?"tie":i===0?"a":"b",shareSong:context?.consent===true,songTitle:context?.songTitle,songArtist:context?.songArtist,songAlbum:context?.songAlbum,voteDataNoticeVersion:VOTE_DATA_NOTICE_VERSION})});
          setMessage(response.ok ? "Open comparison saved to My results and private owner research. Public rankings are unchanged." : "Open comparison saved to My results; private research submission could not be saved.");
        } catch { setMessage("Open comparison saved to My results; private research submission could not be saved."); }
      } else setMessage("Private-target comparison saved to My results and private owner research.");
      return;
    }
    if (selected.some(t => t?.status !== "approved") || i === 2 || catchTrial) {
      setMessage(catchTrial ? `Same-filter check saved. ${i === 2 ? "Tie was the expected answer." : "Your answer helps estimate check reliability."}` : i === 2 ? "Undecided answer saved to My results. Global ratings and their uncertainty are unchanged." : "Private-target comparison saved to My results.");
      await refresh();
      return;
    }
    setBusy(true); setMessage("");
    const voterId = browserVoterId();
    try {
    const r = await fetch("/api/votes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ winnerId: pair[i], loserId: pair[1-i], voterId, trialId, testMode, headphoneType, reasonSide:"a",reasonTags:[],otherReason:"", ...(testMode === "blind" ? { songTitle: context?.songTitle, songArtist: context?.songArtist, songAlbum: context?.songAlbum, recordingId: context?.recordingId } : context?.consent ? context : {}), intervals: context?.intervals ?? [], heardA: context?.heardA, heardB: context?.heardB, voteDataNoticeVersion:VOTE_DATA_NOTICE_VERSION }) });
    const result = await r.json() as { error?: string };
    if (!r.ok) {
      setMessage(`Comparison saved to My results. Public ranking unchanged: ${result.error ?? "Vote failed."}`);
      return;
    }
    saveTrial(trial(true));
    setMessage("Comparison counted toward the rankings and saved to My results.");
    await refresh();
    } catch {
      setMessage("Comparison saved to My results. Could not confirm the public ranking submission; check your connection before continuing.");
    } finally {
      setBusy(false);
    }
  }
  async function suggest(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: songTitle, artist: songArtist, album: songAlbum, recordingId: songRecordingId, note: songNote }) });
      const result = await r.json() as { error?: string }; if (!r.ok) throw new Error(result.error ?? "Could not add suggestion.");
      setSongTitle(""); setSongArtist(""); setSongAlbum(""); setSongRecordingId(""); setSongNote(""); await refresh(); setMessage("Song suggestion added.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not add suggestion."); }
    finally { setBusy(false); }
  }
  async function upload(e: React.FormEvent) {
    e.preventDefault(); setMessage("");
    try {
      if (screenTargetName(name).blocked) throw Error("Choose a target name without profanity or abusive language.");
      const points = parseCurve(csv);
      const matches = compareTargets(name, points, allTargets);
      if (!selectedMeasurement) throw Error("Choose a saved raw headphone measurement first.");
      if (curveKind === "preference" && !targets.some(target => target.id === parentTargetId)) throw Error("Select the available target your preference curve is based on.");
      const row: Target = { id: crypto.randomUUID(), name:name.trim(), creator:creator.trim(), description:description.trim(), curveKind, parentTargetId:curveKind === "preference" ? parentTargetId : null, points, measurement:selectedMeasurement, rating:1500, wins:0, losses:0, status:"local" };
      if (!row.name || !row.creator) throw Error("Name and creator are required.");
      savePrivate([...localTargets,row]); setName("");setDescription("");setCurveKind("original");setParentTargetId("");setCsv("");setFileName("");if (allTargets.length) {const next: [string,string]=[row.id,allTargets[0].id];setPair(next);setPickA(next[0]);setPickB(next[1]);}setTestMode("open");setPreviewMode(null);setHeard([0,0]);setRevealed(false);setTab("shootout");
      setMessage(matches.length ? `Private target ready. Possible ${matches.map(x => `${x.kind} with ${x.name}`).join("; ")}. Owner review is required for rankings.` : "Private target ready. Its comparisons will not be collected.");
    } catch(error) {setMessage(error instanceof Error ? error.message : "Upload failed.");}
  }
  async function submitTarget(row: Target) {
    if (screenTargetName(row.name).blocked) { setMessage("Choose a target name without profanity or abusive language."); return; }
    const matches=compareTargets(row.name,row.points,allTargets.filter(t=>t.id!==row.id));
    if(matches.length && !window.confirm(`Possible duplicate or similar target: ${matches.map(x=>`${x.kind} with ${x.name}`).join("; ")}. Submit for manual owner review?`)) return;
    setBusy(true);
    try {
      const r=await fetch("/api/targets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:row.name,creator:row.creator,description:row.description,curveKind:row.curveKind ?? "original",parentTargetId:row.parentTargetId ?? null,measurement:row.measurement,csv:row.points.map(p=>p.join(",")).join("\n")})});
      const result=await r.json() as { error?: string; id?: string };if(!r.ok || !result.id)throw Error(result.error||"Submission failed.");
      savePrivate(localTargets.map(t=>t.id===row.id?{...t,status:"pending",submissionId:result.id}:t));
      setMessage("Submitted for owner review. No votes on this curve are collected until approval.");
    } catch(error) {setMessage(error instanceof Error?error.message:"Submission failed.");} finally {setBusy(false);}
  }
  return <main className="shell"><div className="site-contents" inert={voteDataAccepted !== true || reviewVoteData}><header className="topbar"><a className="brand" href="/home" aria-label="YinYang EQ League home"><span className="brand-icon" aria-hidden="true"/> <span className="brand-name">YinYang <span className="brand-light">EQ League</span></span></a><nav aria-label="Main navigation">{(["shootout", "rankings", "music", "upload", "measurements", "profile"] as Tab[]).map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => { touchBlind(); if (item === "measurements") setMeasurementEditId(null); setTab(item); setMessage(""); }}>{item === "upload" ? "Upload target" : item === "music" ? "Song suggestions" : item === "profile" ? "My results" : item[0].toUpperCase() + item.slice(1)}</button>)}</nav><a className="top-note owner-link" href="/">Welcome</a><a className="top-note owner-link" href="/preference-tuning">Preference Tuning</a><a className="top-note owner-link" href="/music-library">Music library</a><a className="top-note owner-link" href="/owner-research">Owner view</a><button type="button" className="vote-data-review-link" onClick={() => setReviewVoteData(true)}>Data collection &amp; opt-out</button></header>
  <div className={`content ${tab === "shootout" ? "shootout-content" : ""}`}><div className="eyebrow"><span className="status-dot" /> OPEN EXPERIMENT · COMMUNITY RANKINGS</div>
  <div className="shootout-view" data-mode={testMode} hidden={tab !== "shootout"}><section className={`shootout-setup ${setupCollapsed ? "is-collapsed" : ""}`}><button type="button" className="shootout-setup-toggle" aria-expanded={!setupCollapsed} aria-controls="shootout-setup-panel" aria-label={setupCollapsed ? "Expand shootout setup" : "Collapse shootout setup"} onClick={() => setSetupCollapsed(value => !value)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6" /></svg></button><div id="shootout-setup-panel" className="shootout-setup-panel" aria-hidden={setupCollapsed} inert={setupCollapsed}><div className="shootout-setup-content"><div className="heading-row shootout-heading-row"><div><h1>Which curve wins?</h1><p>{testMode === "open" ? "Compare named targets freely. Approved-target choices enter private owner research; public rankings stay blind." : testMode === "bring" ? "Blind target test with your own stereo song. Votes enter the Bring your music ranking." : "Random blind target test. A stereo song is selected automatically; votes enter the Random music ranking."}</p></div><div className="shootout-status-slot">{message && <div className="message heading-message" role="status">{message}</div>}</div><div className="shootout-heading-aside"><span className="count-pill pool-count"><span className="pool-count-main">{testPool.length} TARGETS IN THE POOL</span><span className="pool-count-detail">{poolCountDetail}</span></span><section className={`loudness-control ${testMode === "open" ? "adjustable" : "locked"}`} aria-label="Track loudness"><strong>TRACK LOUDNESS</strong>{testMode === "open" ? <><div className="loudness-select-wrap"><span className="loudness-selected-label">{loudnessTarget === "off" ? "Normalization off" : `−${loudnessTarget.slice(1)} LUFS`}</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 6 5 5 5-5"/></svg><select value={loudnessTarget} onChange={e=>setLoudnessTarget(e.target.value as "-14"|"-16"|"-18"|"off")} aria-label="Track loudness target"><option value="-14">−14 LUFS</option><option value="-16">−16 LUFS</option><option value="-18">−18 LUFS</option><option value="off">Normalization off</option></select></div><span>{loudnessTarget === "off" ? "Normalization is off." : `Tracks matched to ${loudnessTarget} LUFS.`}</span>{loudnessTarget === "off" && <span className="loudness-warning" role="alert">Warning: track levels may be very different or loud.</span>}</> : <><div className="loudness-locked-value"><b>−16 LUFS</b><span className="loudness-lock-status"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><small>Locked</small></span></div><span>Blind tests use the same loudness for every track.</span></>}</section></div></div><div className="rank-tabs test-tabs"><button type="button" className={(previewMode ?? testMode) === "blind" ? "active" : ""} aria-pressed={(previewMode ?? testMode) === "blind"} onClick={() => changeTestMode("blind")}>Random music · Blind Ranked</button><button type="button" className={(previewMode ?? testMode) === "bring" ? "active" : ""} aria-pressed={(previewMode ?? testMode) === "bring"} onClick={() => changeTestMode("bring")}>Bring your music · Blind Ranked</button><button type="button" className={(previewMode ?? testMode) === "open" ? "active" : ""} aria-pressed={(previewMode ?? testMode) === "open"} onClick={() => changeTestMode("open")}>Open comparison · Unranked</button></div><HeadphonePicker rows={measurements} selectedId={measurementId} headphoneType={headphoneType} onType={chooseHeadphoneType} onSelect={chooseMeasurement} onClear={clearMeasurement} onImport={importCatalogMeasurement} onUpload={()=>{setMeasurementEditId(null);setTab("measurements");}} onEdit={id=>{setMeasurementEditId(id);setTab("measurements");window.scrollTo({top:0,behavior:"smooth"});}} onDelete={deleteMeasurement} />{testMode === "open" && !previewMode && selectedMeasurement && <div className="channel-match-choice"><label>Channel balance <select aria-label="Open comparison channel balance" value={selectedMeasurement.channelMatchMode === "custom" ? "custom" : "auto"} onChange={e=>updateMeasurement({...selectedMeasurement,channelMatchMode:e.target.value as "auto"|"custom"})}><option value="auto">Auto Match</option><option value="custom" disabled={!selectedMeasurement.channelMatchPreset}>My PEQdB preset</option></select></label>{!selectedMeasurement.channelMatchPreset && <button type="button" onClick={()=>setTab("measurements")}>Add your channel-match preset</button>}</div>}</div></div></section>{previewMode && previewMode !== testMode ? <div className="empty compact mode-preview"><h2>{previewMode === "blind" ? "Random blind test" : previewMode === "bring" ? "Bring your music" : "Open comparison"}</h2><p>Your {testMode === "blind" ? "random blind test" : testMode === "bring" ? "bring-your-music test" : "open comparison"} is still active. Its playback and trials continue while you look at this mode.</p><div className="mode-preview-actions"><button type="button" className="primary" onClick={() => startTestMode(previewMode)}>Start {previewMode === "open" ? "open comparison" : "new blind test"}</button><button type="button" onClick={() => setPreviewMode(null)}>Return to current test</button></div></div> : <>{testMode !== "open" && <div className="session-strip"><span>{sessionTrials.length} completed {sessionTrials.length===1?"trial":"trials"} · minimum 2 to see results</span>{sessionTrials.length>=2 && !sessionFinished && <button type="button" onClick={finishBlindTest} disabled={busy}>Finish &amp; see results</button>}{!sessionExpired && !sessionFinished && pair && sessionNow-lastActivityRef.current>=480000 && <strong role="status">Idle test expires in {Math.max(1,Math.ceil((600000-(sessionNow-lastActivityRef.current))/60000))} min</strong>}</div>}{testMode === "open" && !sessionExpired && !sessionFinished && testPool.length >= 2 && <div className={`pair-picker ${draftPending ? "has-pending" : ""}`}><TargetSearchField label="Target A" targets={openTargets} selectedId={pickA || pair?.[0] || ""} listId="target-a-options" onSelect={setPickA} /><TargetSearchField label="Target B" targets={openTargets} selectedId={pickB || pair?.[1] || ""} listId="target-b-options" onSelect={setPickB} /><button type="button" className="compare-button" onClick={()=>{if(!requireMeasurement())return;const a=pickA||pair?.[0],b=pickB||pair?.[1];if(!a||!b||a===b||!openTargets.some(t=>t.id===a)||!openTargets.some(t=>t.id===b)){setMessage("Choose two different targets for this headphone type.");return;}applyOpenPair([a,b]);flashApplyNotice("selected");}}><span className="action-icon" aria-hidden="true">⇄</span><span>Compare</span>{applyNotice?.kind === "selected" && <span key={applyNotice.id} className="apply-toast" role="status">Applied selected targets</span>}</button><button type="button" className="randomize-button" onClick={randomizeDraftBoth} title="Choose random A and B targets without changing playback"><span className="action-icon" aria-hidden="true">↻</span><span>Random</span>{draftPending && <span className="pending-indicator">Not applied yet</span>}</button><button type="button" className="random-song-button" onClick={async ()=>{const changed=await musicPanelRef.current?.randomSong();if(!changed)setMessage("Could not load a random song. Try again.");else setMessage("");}} title="Shuffle to another song without changing targets"><Shuffle size={14} aria-hidden="true" /><span>Shuffle Song</span></button><button type="button" className="compare-random-button" onClick={randomizeAndCompare} title="Randomize and apply A and B while playback continues">Randomize &amp; compare{applyNotice?.kind === "random" && <span key={applyNotice.id} className="apply-toast" role="status">Applied random targets</span>}</button></div>}{!sessionExpired && !sessionFinished && pair && <FeedbackPanel key={`${testMode}:${trialId ?? pair.join(":")}:${feedbackNonce}`} open={describeOpen} pair={pair} trialId={trialId} testMode={testMode} headphoneType={headphoneType} approved={pair.every(id=>targets.some(target=>target.id===id))} music={musicPanelRef} getComparisonId={openFeedbackId} />}{testMode!=="open" && sessionExpired ? <div className="empty compact"><h2>Blind test paused</h2><p>10 minutes passed without activity. Start a new test to continue.</p><button className="primary" onClick={startNewBlindTest}>Start new blind test</button></div> : testMode!=="open" && sessionFinished ? <div className="session-results"><h2>Your blind test results</h2><p>{sessionTrials.length} completed trials · {sessionSummary.length} targets tested · same-filter accuracy {checkRate===null?"—":`${Math.round(checkRate*100)}%`} {checkSd===null?"":`(SD ${checkSd.toFixed(3)})`}</p><div className="session-result-list">{sessionSummary.map(row=><div key={row.id}><strong>{row.name}</strong><span>{row.wins} preferred / {row.n} heard · {row.ties} ties · SD {row.sd===null?"—":row.sd.toFixed(3)}</span></div>)}</div><p className="footnote">SD is the sample standard deviation of preference scores: 1 preferred, 0 not preferred, 0.5 tie.</p><button className="primary" onClick={startNewBlindTest}>Start new blind test</button></div> : !selectedMeasurement ? <div className="empty compact"><h2>Select your headphones first</h2><p>Choose a saved measurement above, or upload your own, before starting any comparison.</p><div className="empty-measurement-actions"><button className="primary" onClick={() => {setMeasurementEditId(null);setTab("measurements");}}>Upload a measurement →</button><button type="button" className="saved-measurements-link" onClick={showSavedMeasurements}>View saved measurements ↓</button></div></div> : testPool.length < 2 ? <div className="empty"><span>◌</span><h2>The shootout needs two targets</h2><p>Upload a frequency response CSV to help start the community pool.</p><button className="primary" onClick={() => setTab("upload")}>Upload a target →</button></div> : <><div className="cards">{pair?.map((id, i) => { const target = allTargets.find(t => t.id === id); return target && <article className="card listen-card" key={`${id}-${i}`} role="button" tabIndex={0} aria-label={`Play Sample ${i ? "B" : "A"}`} onClick={()=>void listenToSide(i as 0 | 1)} onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==="Enter"||e.key===" ")){e.preventDefault();void listenToSide(i as 0 | 1);}}}><div className="chart"><div className={`curve-frame listen-surface ${testMode !== "open" && !revealed ? "blind-masked" : showCurves ? "" : "spoiled"}`} >{(testMode === "open" || revealed) && <><Curve points={target.points} color={i ? "#48b8ff" : "#ff526f"} /></>}<canvas className="waveform" data-waveform={i} width={560} height={210} role="img" aria-label={`Live layered spectrum for Sample ${i ? "B" : "A"}`} /><span className="curve-hover-choice" aria-hidden="true">Play {i ? "B" : "A"}</span>{(testMode === "open" || revealed) && <button type="button" className="spoiler-toggle" onClick={e=>{e.stopPropagation();toggleCurves();}}>{showCurves ? "Hide curves" : "Show curves"}</button>}</div><aside className="level-meter" data-meter={i} role="meter" aria-label={`Clipping safety meter for Sample ${i ? "B" : "A"}`} aria-valuemin={-60} aria-valuemax={0} aria-valuetext="Idle"><span className="meter-clip" data-clip>CLIP!</span><div className="level-track"><i data-level-fill /></div></aside><div className="chart-labels"><span>20 Hz</span><span>200 Hz</span><span>2 kHz</span><span>20 kHz</span></div></div><div className="card-bottom"><div><strong>{testMode === "open" || revealed ? target.name : `Target ${i ? "B" : "A"}`}</strong><small>{testMode === "open" || revealed ? `by ${target.creator}${target.measurement?.type === "ie" ? " · In-Ear" : target.measurement?.type === "oe" ? " · Over-Ear" : ""}` : "Identity hidden until you vote"}</small></div></div></article>; })}</div>{pair && <div className="voting-row"><div className="vote-decision"><div className="shootout-controls"><button type="button" className={`single-listen ${listenSide === 0 ? "switch-to-b" : "switch-to-a"}`} onClick={()=>void switchSide()} disabled={busy}>Switch {listenSide === 0 ? "B" : "A"}</button><button type="button" className="describe-toggle-inline" aria-expanded={describeOpen} onClick={()=>setDescribeOpen(value=>!value)}>Describe (optional) <span aria-hidden="true">{describeOpen ? "▴" : "▾"}</span></button><div className="choice-controls" title={voteLocked ? "Listen to at least 5 seconds of each side to vote" : undefined}><button type="button" className="choice-a" data-locked={voteLocked} aria-describedby={testMode === "open" ? undefined : "listen-progress"} disabled={busy || revealed || voteLocked} onClick={()=>void vote(0)}>A IS BETTER</button><button type="button" className="choice-tie" data-locked={voteLocked} aria-describedby={testMode === "open" ? undefined : "listen-progress"} disabled={busy || revealed || voteLocked} title="Choose this when you cannot decide. Your answer is saved without changing target ratings or their uncertainty." onClick={()=>void vote(2)}>UNKNOWN / TIE</button><button type="button" className="choice-b" data-locked={voteLocked} aria-describedby={testMode === "open" ? undefined : "listen-progress"} disabled={busy || revealed || voteLocked} onClick={()=>void vote(1)}>B IS BETTER</button></div>{revealed && <button type="button" className="continue-button" disabled={busy} onClick={nextPair}>Continue test →</button>}</div>{!revealed && <p className="tie-help">Can’t decide? Choose Unknown / tie. Your answer is saved without changing target rankings. Identical-filter checks help assess listening consistency.</p>}</div>{testMode !== "open" && !revealed && <div className={`listen-progress ${voteLocked ? "waiting" : "ready"}`} id="listen-progress" role="status"><div className="hearing-copy"><strong>{voteLocked ? "5 SECONDS PER SIDE REQUIRED" : "READY TO VOTE"}</strong><span>{voteLocked ? "Keep listening to unlock your vote" : "Choose A, tie, or B"}</span></div><div className="hearing-sides"><label>A <span>{heard[0].toFixed(1)} / 5 sec</span><progress max={5} value={Math.min(5,heard[0])} aria-label="A listening time" /></label><label>B <span>{heard[1].toFixed(1)} / 5 sec</span><progress max={5} value={Math.min(5,heard[1])} aria-label="B listening time" /></label></div></div>}</div>}</>}</>}</div><div className={`music-panel-host ${tab === "shootout" && !previewMode ? "" : `persistent ${edgeExpanded ? "edge-expanded" : "edge-collapsed"}`}`} data-playing={musicPlaying}><button type="button" className="edge-panel-toggle" aria-label={edgeExpanded ? "Collapse playback panel" : "Expand playback panel"} aria-expanded={edgeExpanded} onClick={()=>setEdgeExpanded(value=>!value)}><span className="edge-spectrum" aria-hidden="true"><i/><i/><i/><i/></span><span className="edge-collapse-arrow" aria-hidden="true">›</span></button><MusicPanel ref={musicPanelRef} pair={pair} testMode={testMode} loudnessTarget={testMode === "open" ? loudnessTarget : "-16"} targets={allTargets} suggestions={suggestions} measurement={selectedMeasurement} consent={researchSharing} onConsentChange={changeResearchSharing} onSideChange={setListenSide} onHeard={handleHeard} onPlaybackChange={setMusicPlaying} /></div>
  {tab === "rankings" && (() => { const selected = research?.[rankMode]; const rows = research?.categories[rankMode][rankType] ?? []; const voteCount = rows.reduce((n, t) => n + t.comparisons, 0) / 2; const descriptions = { random: "Blind votes using random stereo music.", bring: "Blind votes using listeners’ own stereo music.", all: "Combined blind votes from both music sources. Every accepted decisive comparison counts, including repeats. Rankings account for uncertainty and same-filter check reliability.", curated: "Blind votes on an owner-curated track after 5 seconds per side count.", verified: "Blind votes with matching file bytes and song tags across at least two browser IDs. This does not verify listening." }; return <><div className="heading-row"><div><h1>Target rankings</h1><p>{descriptions[rankMode]}</p></div><span className="count-pill">{voteCount} QUALIFIED {voteCount === 1 ? "VOTE" : "VOTES"}</span></div><div className="ranking-filter-group"><span>Listener-selected headphone type</span><div className="rank-tabs"><button className={rankType === "ie" ? "active" : ""} onClick={()=>setRankType("ie")}>In-Ear</button><button className={rankType === "oe" ? "active" : ""} onClick={()=>setRankType("oe")}>Over-Ear</button></div></div><div className="ranking-filter-group"><span>Music source</span><div className="rank-tabs"><button className={rankMode === "all" ? "active" : ""} onClick={() => setRankMode("all")}>All blind votes</button><button className={rankMode === "random" ? "active" : ""} onClick={() => setRankMode("random")}>Random music</button><button className={rankMode === "bring" ? "active" : ""} onClick={() => setRankMode("bring")}>Bring your music · Blind Ranked</button></div></div><details className="ranking-research" open={rankMode === "curated" || rankMode === "verified"}><summary>Research subsets</summary><p>These are narrower views of the same blind votes.</p><div className="rank-tabs">{(research?.curated.trackCount ?? 0) > 0 && <button className={rankMode === "curated" ? "active" : ""} onClick={() => setRankMode("curated")}>Curated songs · {research?.categories.curated[rankType].reduce((n, row) => n + row.wins, 0) ?? 0}</button>}<button className={rankMode === "verified" ? "active" : ""} onClick={() => setRankMode("verified")}>Same file across listeners · {research?.categories.verified[rankType].reduce((n, row) => n + row.wins, 0) ?? 0}</button></div></details><details className="ranking-method"><summary>How ranking confidence works</summary><p>Targets are ordered by the lower end of their approximate 95% rating interval (rating − 1.96 × SD). Ratings start with a 1500 ± 350 SD prior. Every accepted decisive blind comparison is included. Unknown / tie answers and same-filter checks leave target ratings and their uncertainty unchanged.</p><p>Same-filter checks estimate check reliability with a Beta(2, 2) prior: correct ties increase influence on future decisive votes, missed checks reduce it, and a few checks never imply certainty. Without checks, reliability starts at 0.5. Preferences themselves have no correct answer.</p><p>Repeated decisive answers from one browser and target pair all enter the preference average. Their combined evidence is reduced to avoid treating one person’s repeated tests as independent listeners. Browser IDs are not verified people.</p><p>This experimental weighted Bradley–Terry model uses a full-Hessian Laplace approximation for SD. The weights and prior are assumptions; SD is conditional on estimated listener reliability and is not a validated guarantee and does not capture all headphone, song, or listener differences. Contradictory preferences may produce a precise estimate near a tie.</p><a href="https://doi.org/10.3758/s13428-021-01714-2" target="_blank" rel="noreferrer">About Bayesian paired comparison models ↗</a></details><div className="ranking-head"><span>RANK / TARGET</span><span>RECORD</span><span>RATING ± SD</span></div><div className="ranking-list">{rows.length ? rows.map((t, i) => <div className="ranking-row" key={t.id}><div className="rank-name"><span className="rank-number">{String(i + 1).padStart(2, "0")}</span><div><strong>{t.name}</strong><small>by {t.creator} </small></div></div><span className="record">{t.wins} W / {t.losses} L<small className="ranking-provisional">{t.listeners} browser{t.listeners === 1 ? "" : "s"} · {t.comparisons} comparisons</small></span><strong className="rating">{Math.round(t.rating)}<small className="ranking-deviation">± {Math.round(t.sd)} SD</small>{t.listeners < 5 && <small className="ranking-provisional">Limited evidence</small>}</strong></div>) : <div className="empty compact">No votes meet this ranking’s criteria yet.</div>}</div><p className="footnote">{rankMode === "verified" ? "Same file means matching SHA-256 bytes and song tags from two browser IDs. It does not prove that two people listened." : rankMode === "curated" ? `${research?.curated.trackCount ?? 0} owner-curated tracks configured. Title, artist and album must match.` : "Model uncertainty is approximate; more independent, reliable evidence usually narrows SD. A smaller SD does not prove universal preference."}</p></>; })()}
  {tab === "music" && <><div className="heading-row"><div><h1>Song suggestions</h1><p>Suggest music that reveals tonal differences. Suggestions are reviewed by the owner before they enter the curated ranking. No audio is uploaded.</p></div></div><div className="upload-layout"><form className="upload-form" onSubmit={e => void suggest(e)}><label>Song title<input required maxLength={120} value={songTitle} onChange={e => setSongTitle(e.target.value)} placeholder="Song title" /></label><label>Artist<input required maxLength={120} value={songArtist} onChange={e => setSongArtist(e.target.value)} placeholder="Artist" /></label><label>Album <span>optional</span><input maxLength={120} value={songAlbum} onChange={e => setSongAlbum(e.target.value)} placeholder="Album" /></label><label>Recording ID / ISRC <span>optional</span><input maxLength={80} value={songRecordingId} onChange={e => setSongRecordingId(e.target.value)} placeholder="ID or ISRC" /></label><label>What should listeners notice? <span>optional</span><textarea maxLength={240} value={songNote} onChange={e => setSongNote(e.target.value)} placeholder="Bass texture, vocals, cymbals…" /></label><button className="primary" disabled={busy}>Suggest song →</button></form><aside className="format-card"><span className="mini-label">LISTENING IDEAS</span><h2>Try a familiar track.</h2><p>Use music you know well and listen at a comfortable, consistent volume. The file stays on your device.</p></aside></div><div className="suggestions-list">{suggestions.length ? suggestions.map(item => <article className="suggestion" key={item.id}><strong>{item.title}</strong><span>{item.artist}</span>{item.note && <p>{item.note}</p>}</article>) : <p className="footnote">No suggestions yet. Add the first one.</p>}</div></>}
  {tab === "upload" && <><div className="heading-row"><div><h1>Add your target</h1><p>Try a curve privately. Only owner-approved targets enter shared rankings.</p></div></div><div className="upload-layout"><form className="upload-form" onSubmit={e => void upload(e)}><label>Target name<input required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Warm reference v2" />{screenTargetName(name).blocked && <small role="alert" className="name-screen-warning">Choose a name without profanity or abusive language.</small>}</label><label>Creator or Source <small className="field-description">Your name/handle or source/reviewer name</small><input required maxLength={60} value={creator} onChange={e => setCreator(e.target.value)} placeholder="Name, handle, or reviewer" /></label><TargetLineagePicker targets={targets} kind={curveKind} parentId={parentTargetId} onKind={setCurveKind} onParent={setParentTargetId} /><label>Source headphone measurement<select value={measurementId} required onChange={e=>{setMeasurementId(e.target.value);localStorage.setItem("target-lab-active-measurement",e.target.value);}}><option value="">Choose a measurement</option>{measurements.map(m=><option key={m.id} value={m.id}>{m.name} · {m.type === "ie" ? "In-Ear" : "Over-Ear"}</option>)}</select></label><label>Description <span>optional</span><textarea maxLength={240} value={description} onChange={e => setDescription(e.target.value)} placeholder="What makes this target different?" /></label><label className="file-label">Frequency response CSV<input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={async e => { const f=e.target.files?.[0]; if(f){if(f.size>200_000){setMessage("Target file exceeds 200 KB.");setCsv("");setFileName("");e.target.value="";return;}setFileName(f.name);setCsv(await f.text());} }} /><span className="drop-zone">↥<strong>{fileName || "Choose a CSV or TXT file"}</strong><small>Frequency (Hz), gain (dB) · up to 200 KB</small></span></label><button className="primary" disabled={busy || !csv}>{busy ? "Working…" : "Try privately →"}</button></form><aside className="format-card"><span className="mini-label">FILE FORMAT</span><h2>Two columns. One curve.</h2><p>Choose a clear, respectful target name and associate it with a raw headphone measurement. If that measurement has separate Left and Right files, their measured channel differences are balanced before this target EQ is applied to both channels. Export your target as frequency and gain values. Headers are fine. Comma, tab, space, and semicolon separators work.</p><pre>{"frequency,gain\n20,3.2\n50,3.7\n100,4.1\n1000,0.0\n10000,-2.1"}</pre><p>Include at least 10 distinct points from 20 Hz to 20 kHz. Private curves and choices stay in this browser. Submit a curve for owner review after testing it.</p></aside></div><div className="private-list"><h2>Your private targets</h2>{localTargets.length ? localTargets.map(t=><div className="private-row" key={t.id}><span><strong>{t.name}</strong><small>{t.curveKind === "preference" ? `Preference based on ${targets.find(parent => parent.id === t.parentTargetId)?.name ?? "selected target"} · ` : "Original curve · "}{t.status === "pending" ? "Submitted for owner review" : "Browser only"}</small></span>{t.status !== "pending" && <button type="button" disabled={busy} onClick={()=>void submitTarget(t)}>Submit for review →</button>}</div>) : <p className="footnote">None yet.</p>}</div></>}
  {tab === "measurements" && <MeasurementManager rows={measurements} selectedId={measurementId} editId={measurementEditId} onAdd={addMeasurement} onUpdate={updateMeasurement} onDelete={deleteMeasurement} onSelect={id=>{chooseMeasurement(id);setTab("shootout");}} />}{tab === "profile" && <ResultsProfile trials={trials} />}
  {message && tab !== "shootout" && <div className="message" role="status">{message}</div>}</div><footer><span>YinYang EQ League</span><span>Built for curious ears. Blind votes shape the rankings.</span></footer></div>{voteDataAccepted === false || reviewVoteData ? <div className="vote-data-backdrop"><section className="vote-data-dialog" role="dialog" aria-modal="true" aria-labelledby="vote-data-title"><span className="mini-label">VOTE DATA</span><h2 id="vote-data-title">Before you participate</h2><p>Completed comparisons in every mode are collected to run the shootout and research. To participate, please acknowledge the data needed for those activities.</p><ul><li>A random ID saved in this browser links your trials, prevents repeated votes on the same pair, and limits abuse.</li><li>We store the targets shown, your choice, headphone type, each A/B playback segment and duration, and when a completed comparison happened. This includes blind ranked, bring-your-music, Open, tie, and private-target comparisons.</li><li>For site-selected songs, song tags may be stored with a comparison. For music you choose on your device, song tags and a file fingerprint are shared only if you turn on the separate music-sharing option. Audio files stay on your device.</li><li>Public rankings show combined results. Individual records can be viewed by the site owner and retained for rankings and research. Raw headphone measurement files are stored separately only when you choose to contribute them for research.</li></ul>{voteDataAccepted ? <div className="vote-data-actions"><button type="button" className="vote-data-secondary" onClick={stopParticipating}>Stop participating on this browser</button><button type="button" onClick={() => setReviewVoteData(false)}>Done</button></div> : <><label className="vote-data-agreement"><input type="checkbox" checked={voteDataChecked} onChange={event => setVoteDataChecked(event.target.checked)} />I understand the vote data described above is required to participate.</label><button type="button" className="vote-data-continue" disabled={!voteDataChecked} onClick={acceptVoteData}>Continue to site</button><small>You can leave without participating. This acknowledgment is saved in this browser.</small></>}</section></div> : voteDataAccepted === null ? <div className="vote-data-backdrop" aria-hidden="true" /> : null}{soundPrompt && tab === "shootout" && <div className="sound-check-backdrop"><section className="sound-check-dialog" role="dialog" aria-modal="true" aria-labelledby="sound-check-title"><h2 id="sound-check-title">Before you listen</h2><p>Turn off system and device EQ, sound enhancements, and device channel matching. The website applies its own channel match when paired Left/Right measurements are available; Open comparison can use your saved custom match instead.</p><p>Set your system volume or gain to any comfortable listening level. You can adjust it during the test.</p><label className="sound-check-skip"><input type="checkbox" checked={dontShowSoundPrompt} onChange={event=>setDontShowSoundPrompt(event.target.checked)} />Don’t show again</label><small className="sound-check-repeat-note">Otherwise, this reminder returns when you start a new test.</small><button type="button" onClick={acknowledgeSoundCheck}>I’m ready to listen</button></section></div>}</main>;
}
