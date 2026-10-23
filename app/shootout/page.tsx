"use client";
import "./target-visibility.css";
import "@/components/alpha-audio-workbench.css";
import { saveAdminTestRecord } from "@/lib/admin-test-store";
import Curve from "@/components/target-curve";
import { MatchedPassageFooter, MatchedPassageStrip } from "@/components/matched-passage-control";
import SetupAutoHideNote from "@/components/setup-auto-hide-note";
import BeforeYouListen from "@/components/before-you-listen";
import TournamentModeTabs from "@/components/tournament-mode-tabs";
import ResearchMusicSource from "@/components/research-music-source";
import { ArrowRight, Check, Shuffle, Headphones, AudioLines } from "lucide-react";
import { OwnerUtilityLink } from "@/components/aura-nav-link";
import SiteUtilityLinks from "@/components/site-utility-links";
import { useRouter, useSearchParams } from "next/navigation";
import SongSuggestions from "@/components/song-suggestions";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { curveVersion } from "@/lib/curve-version";
import RankingChangeExplanation from "@/components/ranking-change-explanation";
import MusicPanel, { type MusicPanelHandle } from "@/components/music-panel";
import FeedbackPanel from "@/components/feedback-panel";
import { parseCurve, type Point } from "@/lib/curves";
import { compareTargets } from "@/lib/target-review";
import { screenTargetName } from "@/lib/target-name-policy";
import type { HeadphoneMeasurement } from "@/lib/measurement";
import MeasurementManager from "@/components/measurement-manager";
import TargetLineagePicker from "@/components/target-lineage-picker";
import HeadphonePicker, { MeasurementEntryActions, type CatalogMeasurement } from "@/components/headphone-picker";
import { moderationIndex } from "@/lib/moderation";
import {participationChoiceBody} from "@/lib/participation-choices";
import type {ConsentStudy} from "@/lib/consent-studies";
import DataChoicesEditor from "@/components/data-choices-editor";
import { deleteBrowserTrial, notifySharingChoicesChanged } from "@/lib/browser-data";
import { PersonalResultsSummary } from "@/components/personal-podium";
import ResultsProfile, { type Trial } from "@/components/results-profile";
import { fitAutoEq } from "@/lib/autoeq";
import { importCatalogEntry } from "@/lib/public-measurements";
import { targetHeadphoneType } from "@/lib/target-type";
import { VOTE_DATA_NOTICE_VERSION } from "@/lib/vote-data-notice";
import { ACTIVITY_MONITORING_NOTICE_VERSION } from "@/lib/activity-monitoring";

type Target = { headphoneType?:"ie"|"oe"; referenceSystem?:string; submissionKind?:"target"|"device-eq"; visibility?:"private"|"public"; adminTestOnly?:boolean; id: string; name: string; creator: string; description: string; curveKind?: "original" | "preference"; parentTargetId?: string | null; points: Point[]; rating: number; wins: number; losses: number; status: "approved" | "local" | "pending"; measurement?: HeadphoneMeasurement | null; submissionId?: string };
type Tab = "shootout" | "rankings" | "music" | "upload" | "measurements" | "profile";
type Suggestion = { id: string; title: string; artist: string; album: string; recordingId: string; note: string };
type Ranked = { id: string; name: string; creator: string; rating: number; sd: number; lower: number; upper: number; wins: number; losses: number; ties: number; comparisons: number; listeners: number; effectiveComparisons: number };
type Research = { protocols?:Record<"current"|"legacy",Omit<Research,"protocols">>; random: { rows: Ranked[]; voteCount: number }; bring: { rows: Ranked[]; voteCount: number }; all: { rows: Ranked[]; voteCount: number }; curated: { rows: Ranked[]; voteCount: number; trackCount: number }; verified: { rows: Ranked[]; voteCount: number }; categories: Record<"random" | "bring" | "all" | "curated" | "verified", Record<"ie" | "oe", Ranked[]>> };

function browserVoterId() { let id = localStorage.getItem("target-lab-voter"); if (!id) { id = crypto.randomUUID(); localStorage.setItem("target-lab-voter", id); } return id; }


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

function QuerySection({onChange}:{onChange:(value:Tab)=>void}) {
  const params = useSearchParams();
  const tab = params.get("tab");
  useEffect(()=>{if(tab && ["shootout","rankings","music","upload","measurements","profile"].includes(tab))onChange(tab as Tab);},[tab,onChange]);
  return null;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("shootout");
  const [measurementEditorOpened,setMeasurementEditorOpened] = useState(false);
  useEffect(()=>{if(tab === "measurements")setMeasurementEditorOpened(true);},[tab]);
  const router = useRouter();
  function changeSection(next: Tab) {
    setTab(next);
    const route = new URL(window.location.href);
    route.searchParams.set("tab", next);
    if (next !== "shootout") route.searchParams.delete("mode");
    router.replace(route.pathname + route.search + route.hash, { scroll: false });
  }
  const [setupCollapsed, setSetupCollapsed] = useState(false);
  const [browseRequest,setBrowseRequest] = useState(0);
  function browseMeasurements(){setSoundPrompt(false);pendingSoundAction.current=null;changeSection("shootout");setSetupCollapsed(false);setBrowseRequest(value=>value+1);}

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
  const [targetVisibility,setTargetVisibility]=useState<"private"|"public">("private");
  const [removedLocalTarget,setRemovedLocalTarget] = useState<Target|null>(null);
  const [measurements, setMeasurements] = useState<HeadphoneMeasurement[]>([]);
  const [targetCategory,setTargetCategory]=useState<"ie"|"oe">("ie"),[referenceSystem,setReferenceSystem]=useState("Unknown"),[submissionKind,setSubmissionKind]=useState<"target"|"device-eq">("target"),[targetMeasurementId,setTargetMeasurementId]=useState("");
  const [measurementId, setMeasurementId] = useState("");
  const [measurementEditId, setMeasurementEditId] = useState<string | null>(null);
  const [savedScrollRequest, setSavedScrollRequest] = useState(0);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [researchSharing, setResearchSharing] = useState(false);
  const [shareMusicChecked, setShareMusicChecked] = useState(false);
  const [researchComparisonId,setResearchComparisonId]=useState<string|null>(null);
  const [nickname, setNickname] = useState("");
  const [nicknameChecked, setNicknameChecked] = useState("");
  const [sharedAdmin, setSharedAdmin] = useState(false);
  const [loadingDataChoices, setLoadingDataChoices] = useState(true);
  const [dataChoicesLoadFailed, setDataChoicesLoadFailed] = useState(false);
  const [activityMonitoring, setActivityMonitoring] = useState(false);
  const [activityMonitoringChecked, setActivityMonitoringChecked] = useState(false);
  const [personalResearch,setPersonalResearch]=useState(false),[personalResearchChecked,setPersonalResearchChecked]=useState(false),[communitySharing,setCommunitySharing]=useState(false),[communityChecked,setCommunityChecked]=useState(false),[protectedAccount,setProtectedAccount]=useState(false);
  const [historicalStudies,setHistoricalStudies]=useState<ConsentStudy[]>([]),[historical,setHistorical]=useState<Record<string,boolean>>({});
  const historyChanged=Object.entries(historical).some(([id,value])=>value!==!!historicalStudies.find(study=>study.id===id)?.opted_in);
  const [voteDataAccepted, setVoteDataAccepted] = useState<boolean | null>(null);
  const [voteDataChecked, setVoteDataChecked] = useState(false);
  const [reviewVoteData, setReviewVoteData] = useState(false);
  const [submissionsEnabled, setSubmissionsEnabled] = useState(false);
  const [savingDataChoices, setSavingDataChoices] = useState(false);
  const [dataChoicesError, setDataChoicesError] = useState("");
  async function acceptVoteData() {
    if (savingDataChoices || loadingDataChoices || dataChoicesLoadFailed) return;
    if (!historyChanged && voteDataAccepted === true && voteDataChecked === submissionsEnabled && shareMusicChecked === researchSharing && activityMonitoringChecked === activityMonitoring && personalResearchChecked===personalResearch && communityChecked===communitySharing && nicknameChecked === nickname) { closeVoteData(); return; }
    const participate = voteDataChecked;
    const shareMusic = participate && shareMusicChecked;
    const monitor = participate && activityMonitoringChecked;
    setSavingDataChoices(true); setDataChoicesError("");
    try {
      const response = await fetch("/api/my-data", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(participationChoiceBody({submit:participate,shareMusic,activityMonitoring:monitor,personalResearch:personalResearchChecked,community:communityChecked,historical,...(!sharedAdmin?{nickname:nicknameChecked}:{})})) });
      if (!response.ok) throw new Error((await response.json() as {error:string}).error || "Could not save choices.");
      const saved = await response.json() as {nickname?:string};
      if (saved.nickname !== undefined) {setNickname(saved.nickname);setNicknameChecked(saved.nickname);}
      // The server's saved settings remain authoritative if browser storage is unavailable.
      try {
        if (participate) localStorage.setItem("target-lab-vote-data-agreement", VOTE_DATA_NOTICE_VERSION);
        else localStorage.removeItem("target-lab-vote-data-agreement");
        localStorage.setItem("target-lab-research-sharing", shareMusic ? "true" : "false");
        localStorage.setItem("yinyang-activity-monitoring", monitor ? "true" : "false");
      } catch {}
      setHistoricalStudies(current=>current.map(study=>({...study,opted_in:participate&&historical[study.id]?1:0})));
      setPersonalResearch(participate&&personalResearchChecked);setPersonalResearchChecked(participate&&personalResearchChecked);setCommunitySharing(participate&&communityChecked);setCommunityChecked(participate&&communityChecked);
      setSubmissionsEnabled(participate); setResearchSharing(shareMusic); setShareMusicChecked(shareMusic); setActivityMonitoring(monitor); setActivityMonitoringChecked(monitor);
      try { window.dispatchEvent(new Event("yinyang-monitoring-choice")); } catch {}
      setVoteDataAccepted(participate); setReviewVoteData(false);
      try { notifySharingChoicesChanged(); } catch {}
      if (!participate) {
        musicPanelRef.current?.stop(); setPair(null); setTrialId(null); setPreviewMode(null); setSoundPrompt(false);
        window.location.assign("/my-data?participation=off");
        return;
      }
      await refresh();
    } catch (cause) {setDataChoicesError(cause instanceof Error?cause.message:"Could not save choices.");}
    finally {setSavingDataChoices(false);}
  }
  function changeResearchSharing(enabled: boolean) { setShareMusicChecked(enabled); }
  function closeVoteData() {
    if (savingDataChoices) return;
    if (!sharedAdmin && voteDataAccepted !== true) { window.location.assign("/"); return; }
    setVoteDataChecked(submissionsEnabled);
    setShareMusicChecked(researchSharing);
    setActivityMonitoringChecked(activityMonitoring);setPersonalResearchChecked(personalResearch);setCommunityChecked(communitySharing);
    setHistorical(Object.fromEntries(historicalStudies.map(study=>[study.id,study.opted_in===1])));
    setNicknameChecked(nickname);
    setDataChoicesError("");
    setReviewVoteData(false);
  }
  useEffect(()=>{const refreshErased=()=>{void refresh();};window.addEventListener("yinyang-server-erased",refreshErased);return()=>window.removeEventListener("yinyang-server-erased",refreshErased);},[]);
  function removeBrowserTrial(id: string) {
    try { deleteBrowserTrial(id); setTrials(current=>current.filter(row=>row.id!==id)); }
    catch {setMessage("Could not delete the saved browser copy.");}
  }
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const musicPanelRef = useRef<MusicPanelHandle>(null);
  const [listenSide, setListenSide] = useState<0 | 1>(0);
  const [edgeExpanded, setEdgeExpanded] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicSourceReady, setMusicSourceReady] = useState(false);
  const [musicWasPlayed, setMusicWasPlayed] = useState(false);
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
    } else {neverSoundPromptRef.current=false;localStorage.removeItem("target-lab-sound-check-skip");}
    setSoundPrompt(false);
    const action=pendingSoundAction.current;
    pendingSoundAction.current=null;
    action?.();
  }
  const [researchPassageRequired,setResearchPassageRequired]=useState(true);
  const [openPassageRequired,setOpenPassageRequired]=useState(false);
  const [testMode, setTestMode] = useState<"blind" | "bring" | "open">("blind");
  const passageRequired=testMode==="open"?openPassageRequired:researchPassageRequired;
  function changePassageRequirement(required:boolean){
    if(busy)return;
    musicPanelRef.current?.stop();resetFeedback();setResearchComparisonId(null);setRevealed(false);
    if(required){musicPanelRef.current?.reset();setHeard([0,0]);setCommonHeard(0);}
    if(testMode==="open")setOpenPassageRequired(required);
    else{setResearchPassageRequired(required);setTrialId(null);if(required)setPair(null);setSessionId(crypto.randomUUID());setSessionFinished(false);setSessionExpired(false);}
    setMessage(required?"Matched-passage listening is required for future choices. Past private choices stay private.":"Free listening: no minimum before voting. Consented comparisons still enter research with their actual timing and free-listening label.");
  }
  const [lastResearchSource,setLastResearchSource]=useState<"blind"|"bring">("blind");
  const [previewMode, setPreviewMode] = useState<"blind" | "bring" | "open" | null>(null);
  const visibleMode=previewMode ?? testMode;
  const switchingResearchSource=testMode!=="open" && previewMode!==null && previewMode!=="open" && previewMode!==testMode;
  const modePreview=previewMode!==null && previewMode!==testMode && !switchingResearchSource;
  const [loudnessTarget, setLoudnessTarget] = useState<"-14" | "-16" | "-18" | "off">("-16");
  const [rankProtocol,setRankProtocol]=useState<"all"|"current"|"legacy">("current");
  const [commonHeard,setCommonHeard] = useState(0);
  const [heard, setHeard] = useState<[number, number]>([0, 0]);
  const [showCurves, setShowCurves] = useState(false);
  function toggleCurves() { setShowCurves(current => { localStorage.setItem("target-lab-show-curves", String(!current)); return !current; }); }
  const [rankMode, setRankMode] = useState<"random" | "bring" | "all" | "verified">("all");
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
    let live = true; const controller = new AbortController(); const timeout = window.setTimeout(()=>controller.abort(),10000);
    const initial = voteDataAccepted === null;
    setLoadingDataChoices(true);setDataChoicesLoadFailed(false);
    void fetch("/api/my-data", { cache:"no-store", signal:controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Open My data to verify your sharing settings.");
      const privacy = await response.json() as {historicalStudies?:ConsentStudy[];personalResearchEnabled?:boolean;communityEnabled?:boolean;protectedAccount?:boolean;submissionsEnabled:boolean;shareMusic:boolean;agreementVersion:string|null;activityMonitoringEnabled?:boolean;activityMonitoringVersion?:string|null;nickname?:string;sharedAdmin?:boolean;testOnly?:boolean};
      if (!live) return;
      setHistoricalStudies(privacy.historicalStudies||[]);setHistorical(Object.fromEntries((privacy.historicalStudies||[]).map(study=>[study.id,study.opted_in===1])));
      setNickname(privacy.nickname || "");setNicknameChecked(privacy.nickname || "");setSharedAdmin(privacy.sharedAdmin === true||privacy.testOnly===true);
      const accepted = privacy.submissionsEnabled && privacy.agreementVersion === VOTE_DATA_NOTICE_VERSION;
      setPersonalResearch(accepted&&privacy.personalResearchEnabled===true);setPersonalResearchChecked(accepted&&privacy.personalResearchEnabled===true);setCommunitySharing(accepted&&privacy.communityEnabled===true);setCommunityChecked(accepted&&privacy.communityEnabled===true);setProtectedAccount(privacy.protectedAccount===true);
      setSubmissionsEnabled(accepted); setVoteDataChecked(accepted);
      setResearchSharing(privacy.shareMusic && accepted); setShareMusicChecked(privacy.shareMusic && accepted);
      const monitorAccepted = privacy.activityMonitoringEnabled === true && privacy.activityMonitoringVersion === ACTIVITY_MONITORING_NOTICE_VERSION;
      setActivityMonitoring(monitorAccepted); setActivityMonitoringChecked(monitorAccepted);
      try { localStorage.setItem("yinyang-activity-monitoring", monitorAccepted ? "true" : "false"); } catch {}
      try { window.dispatchEvent(new Event("yinyang-monitoring-choice")); } catch {}
      setVoteDataAccepted(accepted);
      if (!accepted && !privacy.sharedAdmin && !privacy.testOnly) {musicPanelRef.current?.stop();setPair(null);setTrialId(null);setPreviewMode(null);}
    }).catch(()=>{if(!live)return;setDataChoicesLoadFailed(true);if(initial){setSubmissionsEnabled(false);setVoteDataAccepted(false);}setDataChoicesError("Your saved choices could not be refreshed. Close and reopen this window to retry, or open My data.");}).finally(()=>{window.clearTimeout(timeout);if(live)setLoadingDataChoices(false);});
    return ()=>{live=false;controller.abort();window.clearTimeout(timeout);};
  }, [reviewVoteData]);
  useEffect(() => { try { const saved=JSON.parse(localStorage.getItem("target-lab-page-state") || "{}");  if(typeof saved.researchPassageRequired==="boolean")setResearchPassageRequired(saved.researchPassageRequired);if(typeof saved.openPassageRequired==="boolean")setOpenPassageRequired(saved.openPassageRequired);if (typeof saved.setupCollapsed === "boolean") setSetupCollapsed(saved.setupCollapsed); if (["blind","bring","open"].includes(saved.testMode)) setTestMode(saved.testMode); if (["blind","bring"].includes(saved.researchSource))setLastResearchSource(saved.researchSource);else if(["blind","bring"].includes(saved.testMode))setLastResearchSource(saved.testMode); if (["-14","-16","-18","off"].includes(saved.loudnessTarget)) setLoudnessTarget(saved.loudnessTarget); if (localStorage.getItem("target-lab-ranking-layout-v2") && ["random","bring","all","verified"].includes(saved.rankMode)) setRankMode(saved.rankMode); else setRankMode("all"); localStorage.setItem("target-lab-ranking-layout-v2", "true"); if (["ie","oe"].includes(saved.rankType)) setRankType(saved.rankType); if (["ie","oe"].includes(saved.headphoneType)) setHeadphoneType(saved.headphoneType); const expired=saved.testMode!=="open" && saved.sessionFinished!==true && Array.isArray(saved.pair) && (typeof saved.lastActiveAt!=="number" || Date.now()-saved.lastActiveAt>=600000 || saved.sessionExpired===true); setSessionId(typeof saved.sessionId==="string" && saved.sessionId ? saved.sessionId : crypto.randomUUID());setSessionFinished(saved.sessionFinished===true); if (expired) {setPair(null);setSessionExpired(true);} else if (Array.isArray(saved.pair) && saved.pair.length===2 && saved.pair.every((id: unknown)=>typeof id==="string") && (saved.testMode==="open" || typeof saved.trialId==="string")) {setPair(saved.pair);setTrialId(typeof saved.trialId==="string"?saved.trialId:null);} setRevealed(!expired && saved.revealed===true); const activity=typeof saved.lastActiveAt==="number"?saved.lastActiveAt:Date.now();lastActivityRef.current=activity;lastPersistedRef.current=activity;setLastActivity(activity);setSessionNow(Date.now()); } catch {} try { setLocalTargets(JSON.parse(localStorage.getItem("target-lab-private-targets") || "[]")); } catch { setLocalTargets([]); } try { setMeasurements(JSON.parse(localStorage.getItem("target-lab-measurements") || "[]")); } catch { setMeasurements([]); } try { const browserReviews = moderationIndex(JSON.parse(localStorage.getItem("target-lab-browser-reviews") || "[]")); setTrials((JSON.parse(localStorage.getItem("target-lab-trials") || "[]") as Trial[]).filter(row => browserReviews.get(`browser:${row.id}`)?.action !== "remove")); } catch { setTrials([]); } setMeasurementId(localStorage.getItem("target-lab-active-measurement") || ""); setShowCurves(localStorage.getItem("target-lab-show-curves") === "true"); const routeParams=new URLSearchParams(window.location.search); const routeTab=routeParams.get("tab"); if(routeTab && ["shootout","rankings","music","upload","measurements","profile"].includes(routeTab))setTab(routeTab as Tab); if(routeTab==="measurements"&&window.location.hash==="#saved-measurements")setSavedScrollRequest(value=>value+1); const routeMode=routeParams.get("mode"); if(routeMode && ["blind","bring","open"].includes(routeMode)){let storedMode="";try{storedMode=JSON.parse(localStorage.getItem("target-lab-page-state")||"{}").testMode;}catch{}if(routeMode!==storedMode)beginTestMode(routeMode as "blind"|"bring"|"open");setTab("shootout");} setRestored(true); void refresh(); }, []);
  useEffect(() => { if (restored) localStorage.setItem("target-lab-page-state",JSON.stringify({tab,testMode,researchPassageRequired,openPassageRequired,researchSource:lastResearchSource,setupCollapsed,loudnessTarget,rankMode,rankType,headphoneType,pair,trialId,revealed,lastActiveAt:lastActivity,sessionExpired,sessionId,sessionFinished})); }, [restored,tab,testMode,researchPassageRequired,openPassageRequired,lastResearchSource,setupCollapsed,loudnessTarget,rankMode,rankType,headphoneType,pair,trialId,revealed,lastActivity,sessionExpired,sessionId,sessionFinished]);
  useEffect(() => { if (restored) window.dispatchEvent(new CustomEvent("yinyang-activity", { detail: { eventType: "shootout_tab" } })); }, [restored, tab]);
  const monitoringTestActive = Boolean(pair && !sessionExpired && !sessionFinished);
  const monitoringTestActiveRef = useRef(false);
  useEffect(() => {
    if (!restored) return;
    if (monitoringTestActive !== monitoringTestActiveRef.current) {
      monitoringTestActiveRef.current = monitoringTestActive;
      window.dispatchEvent(new CustomEvent("yinyang-activity", { detail: { eventType: monitoringTestActive ? "test_started" : "test_ended" } }));
    }
  }, [restored, monitoringTestActive]);
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
  function resetFeedback(){setResearchComparisonId(null);openFeedbackIdRef.current=crypto.randomUUID();setFeedbackNonce(value=>value+1);setDescribeOpen(false);}
  function requireMeasurement() { if (selectedMeasurement) return true; setMessage("Select a headphone measurement before starting a test."); return false; }
  function startNewBlindTest() { if (requireMeasurement()) requestSoundCheck(beginNewBlindTest,true); }
  function beginNewBlindTest() {autoCollapseSetupRef.current=false;setSetupCollapsed(false);resetFeedback();const now=Date.now();setSessionId(crypto.randomUUID());setSessionFinished(false);lastActivityRef.current=now;lastPersistedRef.current=now;setLastActivity(now);setSessionExpired(false);setPair(null);setTrialId(null);setRevealed(false);setHeard([0,0]);setMessage("");}
  function changeTestMode(mode: "blind" | "bring" | "open") { if(busy)return; if (!sharedAdmin && !submissionsEnabled) {setMessage("Review the required comparison-data agreement to use listening tools.");setReviewVoteData(true);return;}if(mode===testMode){setPreviewMode(null);return;}setPreviewMode(mode);setMessage("");}
  function startTestMode(mode: "blind" | "bring" | "open") { if(busy)return; if (!sharedAdmin && !submissionsEnabled) {setMessage("Review the required comparison-data agreement to use listening tools.");setReviewVoteData(true);return;}if (!selectedMeasurement) {setPreviewMode(null);setMessage("Select a headphone measurement before starting a test.");window.requestAnimationFrame(()=>document.querySelector<HTMLInputElement>(".headphone-search input")?.focus());return;}requestSoundCheck(() => beginTestMode(mode),true);}
  function beginTestMode(mode: "blind" | "bring" | "open") {const route=new URL(window.location.href);route.searchParams.set("mode",mode);route.searchParams.delete("tab");window.history.replaceState(null,"",route.pathname+route.search+route.hash);if(mode!=="open")setLastResearchSource(mode);autoCollapseSetupRef.current=false;setSetupCollapsed(false);musicPanelRef.current?.stop();musicPanelRef.current?.reset();setCommonHeard(0);setPreviewMode(null);setTestMode(mode);setPickA("");setPickB("");const now=Date.now();if(mode!=="open"){setSessionId(crypto.randomUUID());lastActivityRef.current=now;lastPersistedRef.current=now;setLastActivity(now);}setSessionFinished(false);setSessionExpired(false);setPair(null);setTrialId(null);setRevealed(false);setHeard([0,0]);resetFeedback();setMessage("");}
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
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== "target-lab-trials" && event.key !== "target-lab-browser-reviews") return;
      try { const reviews = moderationIndex(JSON.parse(localStorage.getItem("target-lab-browser-reviews") || "[]")); setTrials((JSON.parse(localStorage.getItem("target-lab-trials") || "[]") as Trial[]).filter(row=>reviews.get(`browser:${row.id}`)?.action!=="remove")); } catch { setTrials([]); }
    };
    window.addEventListener("storage",sync); return ()=>window.removeEventListener("storage",sync);
  }, []);
  function removePrivateTarget(row:Target){try{savePrivate(localTargets.filter(t=>t.id!==row.id));setRemovedLocalTarget(row);}catch{setMessage("Could not remove the local copy. Your target was kept.");}}
  function undoPrivateTargetRemoval(){if(!removedLocalTarget)return;try{if(!localTargets.some(t=>t.id===removedLocalTarget.id))savePrivate([...localTargets,removedLocalTarget]);setRemovedLocalTarget(null);}catch{setMessage("Could not restore the local target. Try Undo again.");}}
  function savePrivate(rows: Target[]) { localStorage.setItem("target-lab-private-targets", JSON.stringify(rows)); setLocalTargets(rows); }
  function saveTrial(row: Trial) {
    setTrials(current => {
      const next = [...current.filter(item => item.id !== row.id), row];
      const stored = JSON.parse(localStorage.getItem("target-lab-trials") || "[]") as Trial[];
      localStorage.setItem("target-lab-trials", JSON.stringify([...stored.filter(item => item.id !== row.id), row]));
      return next;
    });
  }
  function clearCurrentPair() {musicPanelRef.current?.stop();musicPanelRef.current?.reset();setPair(null);setTrialId(null);setPickA("");setPickB("");setHeard([0,0]);setRevealed(false);resetFeedback();}
  function showSavedMeasurements() { setMeasurementEditId(null); setSavedScrollRequest(value => value + 1); changeSection("measurements"); }
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
    if (!sharedAdmin && (!submissionsEnabled || voteDataAccepted !== true)) return;
    if (testMode === "open") { setPair([openTargets[0].id, openTargets[1].id]); return; }
    if(sharedAdmin||!passageRequired){const first=Math.floor(Math.random()*testPool.length);const others=testPool.filter((_,index)=>index!==first);setTrialId(null);setPair([testPool[first].id,others[Math.floor(Math.random()*others.length)].id]);return;}
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
  }, [restored, selectedMeasurement, testPool, pair, testMode, headphoneType, sessionExpired, sessionFinished, submissionsEnabled, voteDataAccepted,passageRequired,sharedAdmin]);
  function nextPair() { if(sessionExpired||sessionFinished||!requireMeasurement())return;if(testMode==="open"){advancePair();return;}requestSoundCheck(advancePair); }
  function advancePair() { touchBlind(); const choices: [string,string][]=[];const pool=testPool;for(let i=0;i<pool.length;i++)for(let j=i+1;j<pool.length;j++){const ids: [string,string]=[pool[i].id,pool[j].id];if(!pair||!ids.every(id=>pair.includes(id)))choices.push(ids);}if(!choices.length && pair)choices.push(testMode === "open" ? [pair[1],pair[0]] : pair);const chosen: [string,string]=testMode!=="open" && sessionTrials.length>=1 && Math.random()<.15 ? (()=>{const id=pool[Math.floor(Math.random()*pool.length)].id;return [id,id] as [string,string];})() : choices[Math.floor(Math.random()*choices.length)];if (!chosen) return; if (testMode === "open") { applyOpenPair(chosen);return; } setPair(null);setTrialId(null);setHeard([0,0]);resetFeedback();setRevealed(false);setMessage("");musicPanelRef.current?.stop(); }
  function applyOpenPair(next: [string, string]) {setPair(next);setPickA(next[0]);setPickB(next[1]);resetFeedback();setHeard([0,0]);setRevealed(false);setMessage("");}
  function randomOpenPair(): [string,string] | null {const currentA=pickA||pair?.[0],currentB=pickB||pair?.[1];const options: [string,string][]=[];for(const a of openTargets)for(const b of openTargets)if(a.id!==b.id&&a.id!==currentA&&b.id!==currentB)options.push([a.id,b.id]);return options.length ? options[Math.floor(Math.random()*options.length)] : null;}
  function flashApplyNotice(kind: "selected" | "random") {const id=Date.now()+Math.random();setApplyNotice({kind,id});window.setTimeout(()=>setApplyNotice(current=>current?.id===id?null:current),4200);}
  function randomizeDraftBoth() {const next=randomOpenPair();if(!next)return;setPickA(next[0]);setPickB(next[1]);setMessage("");}
  function randomizeAndCompare() {const next=randomOpenPair();if(!next)return;applyOpenPair(next);flashApplyNotice("random");}
  function onMusicPlayback(playing:boolean){setMusicPlaying(playing);if(playing)setMusicWasPlayed(true);if(playing&&!autoCollapseSetupRef.current){autoCollapseSetupRef.current=true;setSetupCollapsed(true);}}
  function toggleSetup(){autoCollapseSetupRef.current=true;setSetupCollapsed(value=>!value);}
  async function listenToSide(side: 0 | 1) {
    if (!requireMeasurement()) return;
    if (!skipSoundPromptRef.current) {
      requestSoundCheck(() => { void listenToSide(side); });
      return;
    }
    touchBlind();
    const started=await musicPanelRef.current?.listen(side);
    if(!started){setMessage(testMode === "bring" ? "Choose your own stereo song below, then click the A or B card." : "Choose a stereo music folder below, then click the A or B card.");document.querySelector(".music-panel")?.scrollIntoView({behavior:"smooth",block:"center"});}
    else setMessage("");
  }
  function onComparisonShortcut(side: 0 | 1) {
    if (tab !== "shootout" || modePreview || sessionExpired || sessionFinished || !pair || testPool.length < 2) return;
    return listenToSide(side);
  }
  async function switchSide() {await listenToSide(listenSide===0?1:0);}
  async function listenToPassage() {
    if (!requireMeasurement() || !pair || busy || revealed) return;
    if (!skipSoundPromptRef.current) { requestSoundCheck(() => { void listenToPassage(); }); return; }
    touchBlind();
    const started = await musicPanelRef.current?.playPassage();
    setMessage(started ? "" : "Choose a stereo song at least 5 seconds long, then play both targets.");
  }

  useEffect(()=>{const timer=window.setInterval(()=>setCommonHeard(musicPanelRef.current?.snapshot()?.overlapSeconds||0),250);return ()=>clearInterval(timer);},[]);
  const passageQualified=heard[0]>=5&&heard[1]>=5&&commonHeard>=5;
  const voteLocked = passageRequired && (!passageQualified || testMode!=="open"&&!sharedAdmin&&!trialId);
  async function vote(i: number) {
    if (!sharedAdmin && (!submissionsEnabled || voteDataAccepted !== true)) {setReviewVoteData(true);return;}
    if (!requireMeasurement()) return;
    touchBlind();
    if (!pair || busy || revealed || sessionExpired || sessionFinished || (passageRequired && testMode !== "open" && !sharedAdmin && !trialId)) return;
    const elapsed=musicPanelRef.current?.heard() ?? [0,0];
    if (!headphoneType) { setMessage("Choose In-Ear or Over-Ear before saving your comparison."); return; }
    if (passageRequired && (elapsed[0] < 5 || elapsed[1] < 5)) { setMessage("Listen to at least 5 seconds of A and B before choosing."); return; }
    if (passageRequired && testMode !== "open" && musicPanelRef.current?.isHashing()) { setMessage("Please wait for local file hashing to finish."); return; }
    if(passageRequired && (musicPanelRef.current?.snapshot()?.overlapSeconds||0)<5){setMessage("Replay the same passage under A and B until at least 5 seconds overlap.");return;}
    const selected = pair.map(id => allTargets.find(t => t.id === id));
    const context=musicPanelRef.current?.finish();
    const completedRunId = testMode === "open" ? openFeedbackId() : crypto.randomUUID();
    const raw: Point[]=selectedMeasurement?.points||[[20,0],[20000,0]];
    const fits=selected.map(t=>fitAutoEq(raw,t!.points));const catchTrial=pair[0]===pair[1];const eqFits=fits.map(f=>({bands:f.filters.length,rms:+f.rms.toFixed(2),preamp:+f.preamp.toFixed(2)}));
    const trial = (recorded: boolean, researchRecorded = false): Trial => ({id:completedRunId,adminTestOnly:sharedAdmin,serverTrialId:trialId || undefined,result:i===2?"tie":i===0?"a":"b",catchTrial,sessionId:testMode!=="open"?sessionId:undefined,createdAt:Date.now(),pair,pairNames:[selected[0]?.name||"A",selected[1]?.name||"B"],winnerId:i===2?"":pair[i],winnerName:i===2?"Tie":selected[i]?.name||"",loserName:i===2?"":selected[1-i]?.name||"",recorded,researchRecorded,matchedPassageRequired:passageRequired,matchedPassage:(context?.heardA||0)>=5&&(context?.heardB||0)>=5&&(context?.overlapSeconds||0)>=5,mode:testMode,reasonSide:"a",reasonTags:[],otherReason:"",type:headphoneType||"unknown",measurementName:selectedMeasurement?.name||null,device:selectedMeasurement?.device||null,rig:selectedMeasurement?.rig||null,heardA:context?.heardA||0,heardB:context?.heardB||0,overlapSeconds:context?.overlapSeconds||0,songTitle:context?.songTitle||"",eqFits});
    // Completing a comparison and publishing a ranked vote are separate outcomes.
    // Keep the answer and reveal the targets even when either write is unavailable.
    saveTrial(trial(false));
    setRevealed(true);
    if(sharedAdmin){saveAdminTestRecord("comparison",trial(false));setMessage("Private test only · saved in this browser. No research or public-ranking submission was made.");return;}
    if (testMode === "open" && selected.some(target => target?.status !== "approved")) {
      setMessage("Private-target comparison saved only to My results in this browser. It was not submitted to owner research or public rankings.");
      return;
    }

    setBusy(true);
    try {
      const runResponse = await fetch("/api/listening-runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        id: completedRunId, voterId: browserVoterId(), trialId: testMode === "open" ? null : trialId, testMode, headphoneType,
        targetAId: pair[0], targetBId: pair[1], targetAName: selected[0]?.name ?? "", targetBName: selected[1]?.name ?? "",
        measurementId: selectedMeasurement?.id ?? null, result: i === 2 ? "tie" : i === 0 ? "a" : "b",
        intervals: context?.intervals ?? [], matchedPassageRequired:passageRequired,
        researchContext:{targetVersions:await Promise.all(selected.map(t=>t?curveVersion(t.points):null)),rig:selectedMeasurement?.rig,measurementType:selectedMeasurement?.type,eqFits,normalizationStatus:context?.normalizationStatus,loudnessTarget:context?.loudnessTarget,recordingId:context?.recordingId,sha256:context?.sha256,audioFormat:context?.audioFormat,sampleRate:context?.sampleRate,bitrate:context?.bitrate,duration:context?.duration},
        shareSong: context?.consent === true, songTitle: context?.songTitle, songArtist: context?.songArtist, songAlbum: context?.songAlbum, recordingId: context?.recordingId,
        voteDataNoticeVersion: VOTE_DATA_NOTICE_VERSION,
      }) });
      if (!runResponse.ok) throw new Error((await runResponse.json() as { error?: string }).error ?? "Listening record could not be saved.");
      setResearchComparisonId(completedRunId);
      saveTrial(trial(false, true));
    } catch (error) {
      setBusy(false); setMessage(`Comparison saved to My results in this browser. Research submission failed: ${error instanceof Error ? error.message : "Listening record could not be saved."}`); return;
    }
    setBusy(false);
    if(!passageRequired){setMessage("Free-listening comparison saved to My results and research, with actual timing. It remains separate from controlled public-ranking evidence.");return;}
    if (testMode === "open") {
      if (selected.every(target => target?.status === "approved")) {
        try {
          const response=await fetch("/api/comparison-choices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({comparisonId:completedRunId,participantId:browserVoterId(),testMode:"open",headphoneType,targetAId:pair[0],targetBId:pair[1],result:i===2?"tie":i===0?"a":"b",shareSong:context?.consent===true,songTitle:context?.songTitle,songArtist:context?.songArtist,songAlbum:context?.songAlbum,voteDataNoticeVersion:VOTE_DATA_NOTICE_VERSION})});
          setMessage(response.ok ? "Open comparison saved to My results and private owner research. Public rankings are unchanged." : "Open comparison saved to My results; private research submission could not be saved.");
        } catch { setMessage("Open comparison saved to My results; private research submission could not be saved."); }
      } else setMessage("Private-target comparison saved only to My results in this browser.");
      return;
    }
    if (selected.some(t => t?.status !== "approved") || i === 2 || catchTrial) {
      setMessage(catchTrial ? `Same-filter check saved. ${i === 2 ? "Tie was the expected answer." : "Your answer is kept as a diagnostic; it does not weight your other preferences."}` : i === 2 ? "Tie saved to My results and included as a half-preference for each target in the exploratory rankings." : "Private-target comparison saved to My results.");
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
    saveTrial(trial(true, true));
    setMessage("Comparison counted toward the rankings and saved to My results.");
    await refresh();
    } catch {
      setMessage("Comparison saved to My results. Could not confirm the public ranking submission; check your connection before continuing.");
    } finally {
      setBusy(false);
    }
  }
  async function upload(e: React.FormEvent) {
    e.preventDefault(); setMessage("");
    try {
      if (screenTargetName(name).blocked) throw Error("Choose a target name without profanity or abusive language.");
      const points = parseCurve(csv);
      const matches = compareTargets(name, points, allTargets);
      const targetMeasurement=measurements.find(m=>m.id===targetMeasurementId) ?? null;
      if(submissionKind==="device-eq"&&!targetMeasurement)throw Error("Device-specific EQ needs a saved upload or catalog measurement.");
      if(targetMeasurement&&targetMeasurement.type!==targetCategory)throw Error("Measurement and target headphone categories must match.");
      if (curveKind === "preference" && !targets.some(target => target.id === parentTargetId)) throw Error("Select the available target your preference curve is based on.");
      const row: Target = { adminTestOnly:sharedAdmin, id: crypto.randomUUID(), name:name.trim(), creator:creator.trim(), description:description.trim(), curveKind, parentTargetId:curveKind === "preference" ? parentTargetId : null, points, measurement:targetMeasurement, headphoneType:targetCategory, referenceSystem:referenceSystem.trim()||"Unknown", submissionKind, visibility:sharedAdmin?"private":targetVisibility, rating:1500, wins:0, losses:0, status:"local" };
      if (!row.name || !row.creator) throw Error("Name and creator are required.");
      const reference = allTargets.find(target => !targetHeadphoneType(target) || targetHeadphoneType(target) === targetCategory);
      if(sharedAdmin)saveAdminTestRecord("target",row);
      const saved=[...localTargets, row];
      savePrivate(saved);
      if(row.visibility==="public")void submitTarget(row,saved);
      setHeadphoneType(targetCategory);setRankType(targetCategory);
      beginTestMode("open");
      if (reference) applyOpenPair([row.id, reference.id]);
      setName(""); setDescription(""); setCurveKind("original"); setParentTargetId(""); setCsv(""); setFileName(""); setTargetVisibility("private"); changeSection("shootout");
      setMessage(row.visibility==="public"?"Target ready for Open comparison. Sending it to the owner for public review; it stays private to you until approved.":matches.length ? `Private target ready. Possible ${matches.map(x => `${x.kind} with ${x.name}`).join("; ")}. Owner review is required for rankings.` : "Private target ready for Open comparison. Owner review is required for rankings.");
    } catch(error) {setMessage(error instanceof Error ? error.message : "Upload failed.");}
  }
  async function submitTarget(row: Target, base: Target[] = localTargets) {
    if(sharedAdmin){saveAdminTestRecord("target",row);setMessage("Admin test target saved privately. It was not submitted for public approval.");return;}
    if (screenTargetName(row.name).blocked) { setMessage("Choose a target name without profanity or abusive language."); return; }
    if(!targetHeadphoneType(row)){setMessage("Choose this target’s headphone category in Your private targets before submitting for review.");return;}
    const matches=compareTargets(row.name,row.points,allTargets.filter(t=>t.id!==row.id));
    if(matches.length && !window.confirm(`Possible duplicate or similar target: ${matches.map(x=>`${x.kind} with ${x.name}`).join("; ")}. Submit for manual owner review?`)) return;
    setBusy(true);
    try {
      const r=await fetch("/api/targets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:row.name,creator:row.creator,description:row.description,curveKind:row.curveKind ?? "original",parentTargetId:row.parentTargetId ?? null,measurement:row.measurement,headphoneType:row.headphoneType ?? targetHeadphoneType(row),referenceSystem:row.referenceSystem??"Unknown",submissionKind:row.submissionKind??"target",visibility:"public",csv:row.points.map(p=>p.join(",")).join("\n")})});
      const result=await r.json() as { error?: string; id?: string };if(!r.ok || !result.id)throw Error(result.error||"Submission failed.");
      savePrivate(base.map(t=>t.id===row.id?{...t,status:"pending",visibility:"public",submissionId:result.id}:t));
      setMessage("Submitted for owner review. No votes on this curve are collected until approval.");
    } catch(error) {setMessage(error instanceof Error?error.message:"Submission failed.");} finally {setBusy(false);}
  }
  async function withdrawTarget(row: Target) {
    if (!row.submissionId) return;
    if (!window.confirm(`Withdraw "${row.name}" from public review? It goes back to a private target on this device; nothing is deleted from your browser.`)) return;
    setBusy(true);
    try {
      const r = await fetch("/api/targets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.submissionId }) });
      const result = await r.json().catch(() => ({})) as { error?: string };
      if (!r.ok) throw Error(result.error || "Withdrawal failed.");
      savePrivate(localTargets.map(t => t.id === row.id ? { ...t, status: "local", visibility: "private", submissionId: undefined } : t));
      setMessage("Submission withdrawn. The target is private again and was removed from the owner's review queue.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Withdrawal failed."); } finally { setBusy(false); }
  }
  return <main className="shell alpha-listening" data-listening-section={tab}><Suspense fallback={null}><QuerySection onChange={setTab}/></Suspense><div className="site-contents" inert={!sharedAdmin && voteDataAccepted !== true || reviewVoteData || soundPrompt}><header className="topbar compact-header"><a className="brand" href="/home" aria-label="YinYang EQ home"><span className="brand-icon" aria-hidden="true"/> <span className="brand-name">YinYang <span className="brand-light">EQ</span></span></a><SiteUtilityLinks onReviewData={() => setReviewVoteData(true)}/><OwnerUtilityLink /></header>
  <div className={`content ${tab === "shootout" ? "shootout-content" : tab === "rankings" ? "rankings-content" : ""}`}>{tab === "rankings" && <div className="eyebrow"><span className="status-dot" /> OPEN EXPERIMENT · RESEARCH RANKINGS</div>}
  <div className="shootout-view" data-mode={testMode} hidden={tab !== "shootout"}>{sharedAdmin&&<p className="admin-test-notice" role="status">Private Test Mode · choices, descriptions and uploads are private tests. Public rankings never include them. <a href="/test-history">Review or clear local tests →</a></p>}<section className={`shootout-setup ${setupCollapsed ? "is-collapsed" : ""}`}><div className="shootout-setup-control"><button type="button" className="shootout-setup-toggle" aria-expanded={!setupCollapsed} aria-controls="shootout-setup-panel" title={setupCollapsed ? "Show comparison choices, headphones and loudness controls." : "Hide comparison choices, headphones and loudness controls. Click again to show them."} aria-describedby="setup-auto-hide-note" onClick={toggleSetup}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6" /></svg><span>{setupCollapsed ? "Show test options" : "Hide test options"}</span></button><button type="button" className="listening-reminder-link" onClick={()=>{musicPanelRef.current?.stop();pendingSoundAction.current=null;setDontShowSoundPrompt(false);setSoundPrompt(true);}}>Before You Listen</button><SetupAutoHideNote/></div>{setupCollapsed && <div className="alpha-setup-summary" aria-label="Current comparison setup"><strong>{selectedMeasurement?.name || "Choose your headphones"}</strong>{selectedMeasurement && <span>{selectedMeasurement.type === "ie" ? "In-Ear" : "Over-Ear"}</span>}<span>{testMode === "open" ? loudnessTarget === "off" ? "Normalization off" : `${loudnessTarget} LUFS` : "−16 LUFS · locked"}</span></div>}<div id="shootout-setup-panel" className="shootout-setup-panel" aria-hidden={setupCollapsed} inert={setupCollapsed}><div className="shootout-setup-content"><div className="heading-row shootout-heading-row"><div><h1>Which do you prefer?</h1>{!sharedAdmin && !submissionsEnabled && <p role="status">Agreement to comparison-data collection is required. <button type="button" onClick={()=>setReviewVoteData(true)}>Change data settings</button></p>}<p className="alpha-setup-intro">{sharedAdmin ? "Private Test Mode: comparisons stay private in this browser and never affect research or public rankings." : !passageRequired ? "Free listening with no minimum before voting. Consented choices and actual timing enter research, separately from controlled rankings." : testMode === "open" ? "Compare named targets with matched listening. Eligible choices enter private owner research; public rankings stay blind." : testMode === "bring" ? "Blind Research with your own stereo song. Choices contribute to Bring Your Own and Combined Research Rankings." : "Blind Research with a track from the Listening Pool. Choices contribute to Listening Pool and Combined Research Rankings."}</p></div><div className="shootout-status-slot">{message && <div className="message heading-message" role="status">{message}</div>}</div><div className="shootout-heading-aside"><span className="count-pill pool-count"><span className="pool-count-main">{testPool.length} TARGETS IN THE POOL</span><span className="pool-count-detail">{poolCountDetail}</span></span><section className={`loudness-control ${testMode === "open" ? "adjustable" : "locked"}`} aria-label="Track loudness" title={testMode === "open" ? "Choose the track loudness target. Matching source loudness helps comparisons; turning it off can produce large level differences." : "Blind Research uses a fixed −16 LUFS source loudness target for every track."}><strong>Loudness</strong>{testMode === "open" ? <><div className="loudness-select-wrap"><span className="loudness-selected-label">{loudnessTarget === "off" ? "Normalization off" : `−${loudnessTarget.slice(1)} LUFS`}</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 6 5 5 5-5"/></svg><select value={loudnessTarget} onChange={e=>setLoudnessTarget(e.target.value as "-14"|"-16"|"-18"|"off")} aria-label="Track loudness target"><option value="-14">−14 LUFS</option><option value="-16">−16 LUFS</option><option value="-18">−18 LUFS</option><option value="off">Normalization off</option></select></div><span>{loudnessTarget === "off" ? "Normalization is off." : `Tracks matched to ${loudnessTarget} LUFS.`}</span>{loudnessTarget === "off" && <span className="loudness-warning" role="alert">Warning: track levels may be very different or loud.</span>}</> : <><div className="loudness-locked-value"><b>−16 LUFS</b><span className="loudness-lock-status"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><small>Locked</small></span></div><span>Blind tests use the same loudness for every track.</span></>}</section></div></div><TournamentModeTabs active={visibleMode==="open"?"open":"research"} onResearch={()=>changeTestMode(testMode==="open"?lastResearchSource:testMode)} onOpen={()=>changeTestMode("open")}/><HeadphonePicker browseRequest={browseRequest} rows={measurements} selectedId={measurementId} headphoneType={headphoneType} onType={chooseHeadphoneType} onSelect={chooseMeasurement} onClear={clearMeasurement} onImport={importCatalogMeasurement} onUpload={()=>{setMeasurementEditId(null);changeSection("measurements");}} onEdit={id=>{setMeasurementEditId(id);changeSection("measurements");window.scrollTo({top:0,behavior:"smooth"});}} onDelete={deleteMeasurement} />{testMode === "open" && !previewMode && selectedMeasurement && <div className="channel-match-choice"><label>Channel balance <select aria-label="Open comparison channel balance" value={selectedMeasurement.channelMatchMode === "custom" ? "custom" : "auto"} onChange={e=>updateMeasurement({...selectedMeasurement,channelMatchMode:e.target.value as "auto"|"custom"})}><option value="auto">Auto Match</option><option value="custom" disabled={!selectedMeasurement.channelMatchPreset}>My PEQdB preset</option></select></label>{!selectedMeasurement.channelMatchPreset && <button type="button" onClick={()=>changeSection("measurements")}>Add your channel-match preset</button>}</div>}</div></div></section>{modePreview && previewMode ? <div className="empty compact mode-preview"><h2>{previewMode === "open" ? "Open Comparison" : `Blind Research · ${previewMode==="bring"?"Bring Your Own":"Listening Pool"}`}</h2><p>Your current test stays in place while you look at this mode. Starting fresh resets its listening progress; completed results stay saved.</p><div className="mode-preview-actions"><button type="button" className="primary" onClick={() => startTestMode(previewMode)}>Start {previewMode === "open" ? "open comparison" : "new blind test"}</button><button type="button" onClick={() => setPreviewMode(null)}>Return to current test</button></div></div> : <>{testMode !== "open" && <div className="session-strip"><span>{sessionTrials.length} completed {sessionTrials.length===1?"trial":"trials"} · minimum 2 to see results</span>{sessionTrials.length>=2 && !sessionFinished && <button type="button" onClick={finishBlindTest} disabled={busy}>Finish &amp; see results</button>}{!sessionExpired && !sessionFinished && pair && sessionNow-lastActivityRef.current>=480000 && <strong role="status">Idle test expires in {Math.max(1,Math.ceil((600000-(sessionNow-lastActivityRef.current))/60000))} min</strong>}</div>}{testMode === "open" && !sessionExpired && !sessionFinished && testPool.length >= 2 && <div className={`pair-picker ${draftPending ? "has-pending" : ""}`}><div className="alpha-target-fields" role="group" aria-label="Choose comparison targets"><TargetSearchField label="Target A" targets={openTargets} selectedId={pickA || pair?.[0] || ""} listId="target-a-options" onSelect={setPickA} /><TargetSearchField label="Target B" targets={openTargets} selectedId={pickB || pair?.[1] || ""} listId="target-b-options" onSelect={setPickB} /></div><div className="alpha-target-actions" role="group" aria-label="Apply or randomize targets"><button type="button" className="compare-button alpha-primary-action" onClick={()=>{if(!requireMeasurement())return;const a=pickA||pair?.[0],b=pickB||pair?.[1];if(!a||!b||a===b||!openTargets.some(t=>t.id===a)||!openTargets.some(t=>t.id===b)){setMessage("Choose two different targets for this headphone type.");return;}applyOpenPair([a,b]);flashApplyNotice("selected");}}><span className="action-icon" aria-hidden="true"><Check size={17} strokeWidth={2.4}/></span><span>Apply targets</span>{applyNotice?.kind === "selected" && <span key={applyNotice.id} className="apply-toast" role="status">Applied selected targets</span>}</button><button type="button" className="randomize-button" onClick={randomizeDraftBoth} title="Shuffle the target selections without changing playback. Choose Apply targets when ready."><span className="action-icon" aria-hidden="true"><Shuffle size={17} strokeWidth={2.2}/></span><span>Shuffle targets</span>{draftPending && <span className="pending-indicator">Not applied yet</span>}</button><button type="button" className="compare-random-button" onClick={randomizeAndCompare} title="Choose and apply two random targets while playback continues.">Shuffle &amp; apply{applyNotice?.kind === "random" && <span key={applyNotice.id} className="apply-toast" role="status">Applied random targets</span>}</button></div></div>}{!sessionExpired && !sessionFinished && pair && <FeedbackPanel freeListening={!passageRequired} researchComparisonId={researchComparisonId} adminTestOnly={sharedAdmin} submissionsEnabled={sharedAdmin||submissionsEnabled} key={`${testMode}:${trialId ?? pair.join(":")}:${feedbackNonce}`} open={describeOpen} pair={pair} trialId={trialId} testMode={testMode} headphoneType={headphoneType} approved={pair.every(id=>targets.some(target=>target.id===id))} music={musicPanelRef} getComparisonId={openFeedbackId} />}{testMode!=="open" && sessionExpired ? <div className="empty compact"><h2>Blind test paused</h2><p>10 minutes passed without activity. Start a new test to continue.</p><button className="primary" onClick={startNewBlindTest}>Start new blind test</button></div> : testMode!=="open" && sessionFinished ? <div className="session-results"><h2>Your blind test results</h2><p>{sessionTrials.length} completed trials · {sessionSummary.length} targets tested · same-filter accuracy {checkRate===null?"—":`${Math.round(checkRate*100)}%`} {checkSd===null?"":`(SD ${checkSd.toFixed(3)})`}</p><div className="session-result-list">{sessionSummary.map(row=><div key={row.id}><strong>{row.name}</strong><span>{row.wins} preferred / {row.n} heard · {row.ties} ties · SD {row.sd===null?"—":row.sd.toFixed(3)}</span></div>)}</div><p className="footnote">SD is the sample standard deviation of preference scores: 1 preferred, 0 not preferred, 0.5 tie. It describes the spread of these answers, not ranking certainty or listener skill. Consistent ties can have zero spread.</p><button className="primary" onClick={startNewBlindTest}>Start new blind test</button></div> : !selectedMeasurement ? <div className="empty compact"><h2>Select your headphones first</h2><p>Choose a saved measurement above, or upload your own, before starting any comparison.</p><div className="empty-measurement-actions"><button className="primary" onClick={() => {setMeasurementEditId(null);setTab("measurements");}}>Upload a measurement →</button><button type="button" className="saved-measurements-link" onClick={showSavedMeasurements}>View saved measurements ↓</button></div></div> : testPool.length < 2 ? <div className="empty"><span>◌</span><h2>The tournament needs two targets</h2><p>Upload a frequency response CSV to help start the community pool.</p><button className="primary" onClick={() => setTab("upload")}>Upload a target →</button></div> : <><div className="cards">{pair?.map((id, i) => { const target = allTargets.find(t => t.id === id); return target && <div className="card listen-card" key={`${id}-${i}`} role="button" tabIndex={0} aria-label={`Play Sample ${i ? "B" : "A"}`} onClick={()=>void listenToSide(i as 0 | 1)} onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==="Enter"||e.key===" ")){e.preventDefault();void listenToSide(i as 0 | 1);}}}><div className="chart"><div className={`curve-frame listen-surface ${testMode !== "open" && !revealed ? "blind-masked" : showCurves ? "" : "spoiled"}`} >{(testMode === "open" || revealed) && <><Curve points={target.points} color={i ? "#48b8ff" : "#ff526f"} /></>}<canvas className="waveform" data-waveform={i} width={560} height={210} role="img" aria-label={`Live layered spectrum for Sample ${i ? "B" : "A"}`} /><span className="curve-hover-choice" aria-hidden="true">Play {i ? "B" : "A"}</span>{(testMode === "open" || revealed) && <button type="button" className="spoiler-toggle" onClick={e=>{e.stopPropagation();toggleCurves();}}>{showCurves ? "Hide curves" : "Show curves"}</button>}</div><div className="level-meter" data-meter={i} role="meter" aria-label={`Clipping safety meter for Sample ${i ? "B" : "A"}`} aria-valuemin={-60} aria-valuemax={0} aria-valuetext="Idle"><span className="meter-clip" data-clip>CLIP!</span><div className="level-track"><i data-level-fill /></div></div><div className="chart-labels"><span>20 Hz</span><span>200 Hz</span><span>2 kHz</span><span>20 kHz</span></div></div><div className="card-bottom"><div><strong>{testMode === "open" || revealed ? target.name : `Target ${i ? "B" : "A"}`}</strong><small>{testMode === "open" || revealed ? `by ${target.creator}${target.measurement?.type === "ie" ? " · In-Ear" : target.measurement?.type === "oe" ? " · Over-Ear" : ""}` : "Identity hidden until you vote"}</small></div></div></div>; })}</div></>}</>}</div><div className={`music-panel-host ${tab === "shootout" && !modePreview ? "" : `persistent ${edgeExpanded ? "edge-expanded" : "edge-collapsed"}`}`} data-playing={musicPlaying} hidden={(tab !== "shootout" || modePreview) && !(musicSourceReady && musicWasPlayed)}><button type="button" className="edge-panel-toggle" aria-label={edgeExpanded ? "Collapse playback panel" : "Expand playback panel"} aria-expanded={edgeExpanded} onClick={()=>setEdgeExpanded(value=>!value)}><span className="edge-spectrum" aria-hidden="true"><i/><i/><i/><i/></span><span className="alpha-edge-label">{edgeExpanded ? "Hide playback" : `Playback · ${musicPlaying ? "playing" : "paused"}`}</span><span className="edge-collapse-arrow" aria-hidden="true">›</span></button><MusicPanel compareControls={tab === "shootout" && !(modePreview && previewMode) && !(testMode !== "open" && (sessionExpired || sessionFinished)) && !!selectedMeasurement && testPool.length >= 2 && pair && <div className="shootout-view shootout-compare" data-mode={testMode}>{pair&&(revealed?<MatchedPassageFooter heard={heard} required={passageRequired} qualified={passageQualified} showMeters={false}><button type="button" className={`single-listen ${listenSide === 0 ? "switch-to-b" : "switch-to-a"}`} onClick={()=>void switchSide()} disabled={busy}>Switch {listenSide === 0 ? "B" : "A"}</button></MatchedPassageFooter>:<MatchedPassageStrip heard={heard} required={passageRequired} qualified={passageQualified} onRequiredChange={changePassageRequirement} disabled={busy} hostId="ranked-passage-actions" switchControl={<button type="button" className="strip-switch" data-next={listenSide === 0 ? "b" : "a"} onClick={()=>void switchSide()} disabled={busy}>Switch {listenSide === 0 ? "B" : "A"}</button>}/>)}</div>} choiceControls={tab === "shootout" && !(modePreview && previewMode) && !(testMode !== "open" && (sessionExpired || sessionFinished)) && !!selectedMeasurement && testPool.length >= 2 && pair && <div className="shootout-view shootout-vote-actions" data-mode={testMode}><div className="voting-row"><div className="vote-decision"><div className="shootout-controls"><div className="choice-controls" title={voteLocked ? "Listen to at least 5 seconds per side and 5 seconds of the same passage to vote" : undefined}><button type="button" className="choice-a" data-locked={voteLocked} aria-describedby={testMode === "open" ? undefined : "listen-progress"} disabled={busy || revealed || voteLocked} onClick={()=>void vote(0)}>Prefer A</button><button type="button" className="choice-tie" data-locked={voteLocked} aria-describedby={testMode === "open" ? undefined : "listen-progress"} disabled={busy || revealed || voteLocked} title={testMode === "open" ? "Choose this when you cannot decide. Open comparisons never affect public rankings." : "Choose this when you cannot decide. Ties count as half-preferences in exploratory rankings; comparisons with identical EQ help check listening consistency and do not affect target rankings."} onClick={()=>void vote(2)}>Unsure / Tie</button><button type="button" className="choice-b" data-locked={voteLocked} aria-describedby={testMode === "open" ? undefined : "listen-progress"} disabled={busy || revealed || voteLocked} onClick={()=>void vote(1)}>Prefer B</button></div>{revealed && <button type="button" className="continue-button" disabled={busy} aria-busy={busy} onClick={nextPair}><span>{busy ? "Saving…" : "Continue test"}</span><span className="continue-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M4 12h15m-6-6 6 6-6 6" /></svg></span></button>}</div><div className="vote-secondary-actions"><button type="button" className="describe-toggle-inline" aria-expanded={describeOpen} onClick={()=>setDescribeOpen(value=>!value)}>Describe (optional) <span aria-hidden="true">{describeOpen ? "▴" : "▾"}</span></button></div>{!revealed && <p className="tie-help">{sharedAdmin ? "Choose freely for testing. All test-account answers stay local, including matched passages and ties." : !passageRequired ? "Can’t decide? Choose Unsure / Tie. Consented free-listening choices and descriptions enter research with their actual timing." : testMode === "open" ? "Can’t decide? Choose Unsure / Tie. Results using site-approved targets are saved for admin-only research and do not affect public rankings. If either target is not approved for shared tests, the result stays in this browser and is not sent to the site for research." : "Can’t decide? Choose Unsure / Tie. A tie counts as half a preference for each target in exploratory rankings. When A and B use identical EQ, your answer helps check listening consistency. These checks do not affect target rankings."}</p>}</div></div></div>} sourceControls={visibleMode==="open"?<div className="alpha-song-action" role="group" aria-label="Change comparison music"><button type="button" className="random-song-button" onClick={async ()=>{const changed=await musicPanelRef.current?.randomSong();if(!changed)setMessage("Could not load a random song. Try again.");else setMessage("");}} title="Shuffle to another song without changing targets"><Shuffle size={14} aria-hidden="true" /><span>Shuffle song</span></button></div>:<ResearchMusicSource source={visibleMode==="bring"?"bring":"blind"} activeSource={testMode==="open"?null:testMode} disabled={busy || !sharedAdmin && !submissionsEnabled} onChange={changeTestMode} onStart={()=>startTestMode(visibleMode==="bring"?"bring":"blind")} onCancel={()=>setPreviewMode(null)}/>} ref={musicPanelRef} passageControlsHostId={tab === "shootout" && !modePreview && pair && !revealed && !sessionExpired && !sessionFinished ? "ranked-passage-actions" : undefined} pair={pair} testMode={testMode} loudnessTarget={testMode === "open" ? loudnessTarget : "-16"} targets={allTargets} suggestions={suggestions} measurement={selectedMeasurement} consent={researchSharing} onDataSettings={()=>setReviewVoteData(true)} onPassagePlay={()=>void listenToPassage()} comparisonComplete={revealed} onSideChange={setListenSide} onHeard={handleHeard} onPlaybackChange={onMusicPlayback} onSourceReadyChange={setMusicSourceReady} onListenShortcut={onComparisonShortcut} /></div>
  {tab === "rankings" && (() => { const view=rankProtocol==="all"?research:research?.protocols?.[rankProtocol]; const rows = view?.categories[rankMode][rankType] ?? []; const countComparisons = (entries: Ranked[] = []) => entries.reduce((n, row) => n + row.comparisons, 0) / 2; const voteCount = countComparisons(rows); const verifiedCount = countComparisons(view?.categories.verified[rankType]); const descriptions = { random: "Blind comparisons using recordings from the Listening Pool.", bring: "Blind comparisons using listeners’ own stereo music. Audio stays on their device; sharing song details is optional.", all: "Combined blind votes from both music sources. Accepted comparisons include repeats and ties. Each participant group has bounded total influence; checks are diagnostics.", verified: "Blind comparisons using the same file across at least two participant groups, identified by valid SHA-256 fingerprints. Song tags and chosen passages may differ." }; return <><div className="ranking-heading"><div className="ranking-title-row"><h1>Research Rankings</h1><nav aria-label="Related research"><a className="ranking-related-link" href="/community-preferences"><span><strong>Community Preferences</strong><small>Personal contributions &amp; reference checks</small></span><ArrowRight size={20} aria-hidden="true"/></a></nav></div><div className="heading-row ranking-intro"><div><p>Shared target-curve results from Blind Research. Your Personal Tournament results are separate; Community Preferences is a separate validation pilot.</p><p>{descriptions[rankMode]}</p></div><span className="count-pill">{voteCount} QUALIFIED {voteCount === 1 ? "COMPARISON" : "COMPARISONS"}</span></div><RankingChangeExplanation/></div><div className="ranking-filters"><div className="ranking-filter-group ranking-protocol">
    <label htmlFor="ranking-protocol">Test version</label>
    <select id="ranking-protocol" aria-describedby="ranking-protocol-help" value={rankProtocol} onChange={e=>setRankProtocol(e.target.value as typeof rankProtocol)}>
      <option value="current">Matched A/B passage · recommended</option>
      <option value="all">All test versions · exploratory</option>
      <option value="legacy">Earlier tests · exploratory</option>
    </select>
    <p id="ranking-protocol-help">{rankProtocol === "current" ? "Recommended research view. At least 5 seconds on A and B, with 5 seconds of the same source audio. Different listeners may choose different passages." : rankProtocol === "legacy" ? "Earlier tests did not require the same audio passage on both sides." : "Includes both matched A/B passage and earlier tests."}</p>
  </div><div className="ranking-filter-group"><span>Listener-selected headphone type</span><div className="rank-tabs"><button className={rankType === "ie" ? "active" : ""} onClick={()=>setRankType("ie")}>In-Ear</button><button className={rankType === "oe" ? "active" : ""} onClick={()=>setRankType("oe")}>Over-Ear</button></div></div><div className="ranking-filter-group"><span>Music source</span><div className="rank-tabs"><button className={rankMode === "all" ? "active" : ""} onClick={() => setRankMode("all")}>Combined</button><button className={rankMode === "random" ? "active" : ""} onClick={() => setRankMode("random")}>Listening Pool</button><button className={rankMode === "bring" ? "active" : ""} onClick={() => setRankMode("bring")}>Bring Your Own</button></div></div></div>{rankProtocol === "current" && <aside className="ranking-protocol-note" aria-label="Why we recommend matched A/B passages"><h2>Matched A/B passage — recommended research view</h2><p>We prioritize these comparisons because A and B include the same musical passage, providing better control over differences caused by the music. This follows the matched-material and time-alignment principles used in controlled listening tests.</p><p>Our five-second minimum is a practical site rule, not a research-validated guarantee of accuracy. Results remain exploratory.</p><details><summary>Research basis and limits</summary><p><a href="https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1116-3-201502-I%21%21PDF-E.pdf" target="_blank" rel="noreferrer">ITU-R BS.1116-3, §4.2 and §6</a> recommends closely time-aligned stimuli and rapid switching, and describes typical excerpts of 10–25 seconds. We apply the principle of matching the material; this community preference test does not implement the complete ITU procedure or claim ITU compliance. <a href="https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1284-2-201901-I%21%21PDF-E.pdf" target="_blank" rel="noreferrer">ITU-R BS.1284-2, §5.2.1</a> also describes paired comparisons using repeated presentations of the same programme sequence. These recommendations support our design rationale, rather than validating this website’s particular threshold or scoring model. Playback records cannot verify attention, headphone use, or listening conditions. Earlier tests remain available through the other filter options.</p></details></aside>}<p className="ranking-summary-note">Exploratory results. Small samples may not establish a clear order; score ranges depend on the model.</p><details className="ranking-research" open={rankMode === "verified"}><summary>Research subsets</summary><p>These filters include eligible comparisons from both Listening Pool and Bring Your Own, including ties. “Same file across listeners” requires matching valid SHA-256 file fingerprints across at least two participant groups. Song tags and recording IDs are descriptive; missing or different tags do not prevent a file match. “Matched A/B passage” checks common source audio within each comparison. All counts follow the selected test version and headphone type; different listeners may choose different passages.</p><div className="rank-tabs"><button className={rankMode === "verified" ? "active" : ""} onClick={() => setRankMode("verified")}>Same file across listeners · {verifiedCount} {verifiedCount === 1 ? "comparison" : "comparisons"}</button></div></details><details className="ranking-method"><summary>How these exploratory scores work</summary><p>Targets are ordered by estimated score. The fractional Bradley–Terry scoring model starts at 1500 with a 350 SD prior. Within each participant group and target pair, all repeats enter an average and ties count one half. Each participant group has total weight one, shared across its distinct pairs. Check outcomes are diagnostic and do not weight preferences.</p><p>Authenticated account ownership groups sessions where available; older records fall back to browser IDs. Admin and hidden test activity is excluded. None of these groups establishes a unique person. The displayed SD and model range are conditional on this scoring method and prior. They are not listener-cluster confidence intervals, do not establish a population preference, and do not resolve headphone, recording or listening-condition differences.</p><p>Earlier tests remain available as exploratory data. The matched A/B passage view requires a matching completed listening record, at least five seconds per side and five seconds of common source audio. Recorded playback still cannot prove attention or headphone use.</p></details><div className="ranking-head"><span>RANK / TARGET</span><span>RECORD</span><span>SCORE ± MODEL SD</span></div><div className="ranking-list">{rows.length ? rows.map((t, i) => <div className="ranking-row" key={t.id}><div className="rank-name"><span className="rank-number">{String(i + 1).padStart(2, "0")}</span><div><strong>{t.name}</strong><small>by {t.creator} </small></div></div><span className="record">{t.wins} W / {t.losses} L / {t.ties} T<small className="ranking-provisional">{t.listeners} participant group{t.listeners === 1 ? "" : "s"} · {t.comparisons} comparison{t.comparisons===1?"":"s"}</small></span><strong className="rating">{Math.round(t.rating)}<small className="ranking-deviation">± {Math.round(t.sd)} SD</small>{t.listeners < 20 && <small className="ranking-provisional">Exploratory · limited groups</small>}</strong></div>) : <div className="empty compact">No votes meet this ranking’s criteria yet.</div>}</div><p className="footnote">{rankMode === "verified" ? "Same file means matching valid SHA-256 file fingerprints across at least two participant groups, including eligible ties. Song tags and recording IDs do not have to match. It matches file bytes, not audio across different encodings: re-encoding or changing embedded tags can change the hash. It does not require the same passage across groups or prove that distinct people listened." : "Model uncertainty is approximate; more independent participant groups usually narrow model SD. A smaller SD does not prove universal preference."}</p></>; })()}
  {tab === "music" && <><a className="alpha-legacy-library-link" href="/music-library?view=suggestions">Open song suggestions in Music library →</a><SongSuggestions testOnly={sharedAdmin} ready={voteDataAccepted !== null} /></>}
  {(tab === "upload" || tab === "measurements") && <section className="alpha-collection-heading"><div><h1>My space</h1><p>Your headphone measurements and private target curves.</p></div><a href="/my-data">Data &amp; sharing →</a><nav aria-label="My space collections"><button type="button" aria-pressed={tab === "measurements"} onClick={()=>changeSection("measurements")}><Headphones size={17} aria-hidden="true"/>Headphone measurements</button><button type="button" aria-pressed={tab === "upload"} onClick={()=>changeSection("upload")}><AudioLines size={17} aria-hidden="true"/>Target curves</button></nav></section>}
  {tab === "upload" && <section className="alpha-collection-panel"><div className="heading-row"><div><h2>Add your target</h2><p>Try a curve privately, or share it for public review. Only owner-approved targets enter shared rankings.</p></div></div><div className="upload-layout"><form className="upload-form" onSubmit={e => void upload(e)}><label>Target name<input required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Warm reference v2" />{screenTargetName(name).blocked && <small role="alert" className="name-screen-warning">Choose a name without profanity or abusive language.</small>}</label><label>Creator or Source <small className="field-description">Your name/handle or source/reviewer name</small><input required maxLength={60} value={creator} onChange={e => setCreator(e.target.value)} placeholder="Name, handle, or reviewer" /></label><TargetLineagePicker targets={targets} kind={curveKind} parentId={parentTargetId} onKind={setCurveKind} onParent={setParentTargetId} /><div className="target-context-grid"><label>Submission type<select value={submissionKind} onChange={e=>setSubmissionKind(e.target.value as "target"|"device-eq")}><option value="target">Target curve</option><option value="device-eq">Device-specific target (derived from EQ)</option></select></label><label>Intended headphone category<select value={targetCategory} onChange={e=>{setTargetCategory(e.target.value as "ie"|"oe");setTargetMeasurementId("");}}><option value="ie">In-Ear</option><option value="oe">Over-Ear</option></select></label><label>Measurement / reference system<input required maxLength={120} value={referenceSystem} onChange={e=>setReferenceSystem(e.target.value)} placeholder="e.g. IEC 60318-4, B&K 5128, or Unknown"/><small>The reference the curve was designed for. Select Unknown when unspecified. Upload a resulting frequency-response target, not a parametric filter list.</small></label><label>Source headphone measurement <small>{submissionKind==="device-eq"?"required for device-specific EQ":"optional for target curves"}</small><select value={targetMeasurementId} required={submissionKind==="device-eq"} onChange={e=>setTargetMeasurementId(e.target.value)}><option value="">No measurement attached</option>{measurements.filter(m=>m.type===targetCategory).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select><small>Use Measurements to save an upload or catalog measurement first.</small></label></div><label>Description <span>optional</span><textarea maxLength={240} value={description} onChange={e => setDescription(e.target.value)} placeholder="What makes this target different?" /></label><label className="file-label">Frequency response CSV<input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={async e => { const f=e.target.files?.[0]; if(f){if(f.size>200_000){setMessage("Target file exceeds 200 KB.");setCsv("");setFileName("");e.target.value="";return;}setFileName(f.name);setCsv(await f.text());} }} /><span className="drop-zone">↥<strong>{fileName || "Choose a CSV or TXT file"}</strong><small>Frequency (Hz), gain (dB) · up to 200 KB</small></span></label><fieldset className="target-visibility"><legend>Who can use this target?</legend><label><input type="radio" name="target-visibility" value="private" checked={targetVisibility==="private"||sharedAdmin} onChange={()=>setTargetVisibility("private")}/><span><strong>Private</strong><small>Only you. The curve stays in this browser (and your synced devices if you use Sync). The owner never sees it.</small></span></label><label><input type="radio" name="target-visibility" value="public" disabled={sharedAdmin} checked={targetVisibility==="public"&&!sharedAdmin} onChange={()=>setTargetVisibility("public")}/><span><strong>Share for public review <em className="target-visibility-badge">Suggested</em></strong><small>Send it to the owner for review. It is private to you until approved; approved targets join shared rankings with the creator name you entered.</small></span></label><p className="target-visibility-summary" role="status" data-choice={targetVisibility==="public"&&!sharedAdmin?"public":"private"}>{targetVisibility==="public"&&!sharedAdmin?"You are sharing this target for public review. The owner will see its name, creator and curve.":"You are keeping this target private. Only you can use it; the owner never sees it."}</p></fieldset><button className="primary" disabled={busy || !csv}>{busy ? "Working…" : targetVisibility==="public"&&!sharedAdmin ? "Try and submit for review →" : "Try privately →"}</button></form><aside className="format-card"><span className="mini-label">FILE FORMAT</span><h2>Two columns. One curve.</h2><p>Choose a clear, respectful target name and identify its intended headphone category and reference system. A raw headphone measurement is optional for target curves; device-specific EQ requires one. The optional attachment documents the curve’s development. Listening uses the headphone measurement and channel-matching settings selected in the player. Export your target as frequency and gain values. Headers are fine. Comma, tab, space, and semicolon separators work.</p><pre>{"frequency,gain\n20,3.2\n50,3.7\n100,4.1\n1000,0.0\n10000,-2.1"}</pre><p>Include at least 10 distinct points from 20 Hz to 20 kHz. Private curves and choices stay in this browser unless you copy saved data using browser sync. Submit a curve for owner review after testing it.</p></aside></div><div className="private-list"><h2>Your private targets</h2>{removedLocalTarget&&<p role="status">Removed the local copy of {removedLocalTarget.name}. Server submissions and saved comparisons are unchanged. <button type="button" onClick={undoPrivateTargetRemoval}>Undo local removal</button><small>Undo is available until this page reloads; only the most recent removal can be undone.</small></p>}{localTargets.length ? localTargets.map(t=><div className="private-row" key={t.id}><span><strong>{t.name}</strong><small>{t.curveKind === "preference" ? `Preference based on ${targets.find(parent => parent.id === t.parentTargetId)?.name ?? "selected target"} · ` : "Original curve · "}{t.status === "pending" ? "Shared for public review · pending owner approval" : "Private · browser only"}</small></span>{t.status!=="pending"&&!targetHeadphoneType(t)&&<label>Headphone category<select aria-label={`Headphone category for ${t.name}`} value="" onChange={e=>{const type=e.target.value;if(type==="ie"||type==="oe")savePrivate(localTargets.map(row=>row.id===t.id?{...row,headphoneType:type}:row));}}><option value="">Choose category</option><option value="ie">In-Ear</option><option value="oe">Over-Ear</option></select></label>}{t.status !== "pending" && <button type="button" disabled={busy} onClick={()=>void submitTarget(t)}>Submit for review →</button>}{t.status === "pending" && (targets.some(x => x.id === t.submissionId) ? <small className="footnote">Approved and public. Removal requests for approved targets are coming in a later update.</small> : <button type="button" disabled={busy} onClick={()=>void withdrawTarget(t)}>Withdraw submission</button>)}<button type="button" disabled={busy} onClick={()=>removePrivateTarget(t)}>Remove local copy</button></div>) : <p className="footnote">None yet.</p>}</div></section>}
  <section className="alpha-collection-panel" hidden={tab !== "measurements"}>{measurementEditorOpened && <MeasurementManager key={measurementEditId ?? "new"} embedded adminTestOnly={sharedAdmin} rows={measurements} selectedId={measurementId} editId={measurementEditId} onAdd={addMeasurement} onUpdate={updateMeasurement} onDelete={deleteMeasurement} onSelect={id=>{chooseMeasurement(id);changeSection("shootout");}} />}</section>{tab === "profile" && <><PersonalResultsSummary/><ResultsProfile trials={trials} onDeleteBrowser={removeBrowserTrial}/></>}
  {message && tab !== "shootout" && <div className="message" role="status">{message}</div>}</div><footer><span>YinYang EQ</span><span>Built for curious ears. Blind votes shape the rankings.</span></footer></div>{!sharedAdmin && voteDataAccepted === false || reviewVoteData ? <DataChoicesEditor forceReview onClose={closeVoteData} onSaved={()=>window.location.reload()} /> : voteDataAccepted === null ? <div className="vote-data-backdrop" aria-hidden="true" /> : null}{soundPrompt && (sharedAdmin || voteDataAccepted === true && submissionsEnabled) && !reviewVoteData && tab === "shootout" && <BeforeYouListen onMeasurementChoice={kind=>{setSoundPrompt(false);pendingSoundAction.current=null;if(kind==="database")browseMeasurements();else if(kind==="saved")showSavedMeasurements();else{setMeasurementEditId(null);changeSection("measurements");}}} skip={dontShowSoundPrompt} onSkipChange={setDontShowSoundPrompt} onReady={acknowledgeSoundCheck}/>}</main>;
}
