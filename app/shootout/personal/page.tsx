"use client";
import { MAX_PERSONAL_CANDIDATES } from "@/lib/personal-shootout";
import {navigateFresh} from "@/lib/browser-navigation";
import { useConsentPrompt } from "@/components/use-consent-prompt";
import PersonalTargetPicker from "@/components/personal-target-picker";
import { MIN_CUSTOM_POOL, PRIVATE_TARGETS_KEY, TARGET_POOL_KEY, parseLocalTargets, parsePoolChoice, personalPool, poolHasLocalTargets, type PoolChoice } from "@/lib/personal-target-pool";
import "@/components/alpha-audio-workbench.css";
import { saveAdminTestRecord } from "@/lib/admin-test-store";

import { MatchedPassageStrip } from "@/components/matched-passage-control";
import SetupAutoHideNote from "@/components/setup-auto-hide-note";
import BeforeYouListen from "@/components/before-you-listen";
import { useListeningReminder } from "@/components/use-listening-reminder";
import TournamentModeTabs from "@/components/tournament-mode-tabs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ModeIllustration from "@/components/mode-illustration";
import TournamentHeader from "@/components/tournament-header";
import {COMMUNITY_NOTICE_VERSION} from "@/lib/community-notice";
import PersonalResearchSharing, { type PersonalSharing } from "@/components/personal-research-sharing";
import type { PassageShuffleBook } from "@/lib/comparison-passage";
import { personalContributionStatus } from "@/lib/personal-contribution-status";
import { PERSONAL_RESEARCH_NOTICE_VERSION } from "@/lib/personal-research-notice";
import { DEFAULT_PERSONAL_PLAYBACK, PERSONAL_PLAYBACK_KEY, parsePersonalPlayback, personalPlaybackMeasurement, personalPlaybackProtocol, type PersonalPlayback } from "@/lib/personal-playback";
import { personalMusicToken } from "@/lib/personal-music";
import { parseChannelMatchPreset } from "@/lib/peq-preset";
import { Upload } from "lucide-react";
import { createPersonalExample } from "@/lib/personal-example";
import Curve from "@/components/target-curve";
import PersonalPodium, { PersonalPlace, PersonalTuneLink } from "@/components/personal-podium";
import MusicPanel, { type MusicPanelHandle } from "@/components/music-panel";
import HeadphonePicker, { type CatalogMeasurement } from "@/components/headphone-picker";
import { importCatalogEntry } from "@/lib/public-measurements";
import { parseMeasurement, type HeadphoneMeasurement } from "@/lib/measurement";

import type { Point } from "@/lib/curves";
import { musicDisplayTitle } from "@/lib/music-display";
import { listeningPool } from "@/lib/music-catalog";
import { checkpointPersonalRun, confirmationComplete, confirmationEvidence, createPersonalRun, nextPersonalPair, parsePersonalRuns, personalFavorite, personalStandings, PERSONAL_KEY, recordPersonalChoice, targetFamily, type PersonalRun, type PersonalMusic } from "@/lib/personal-shootout";
import "./personal.css";
import { focusComparisonPlayback } from "@/lib/comparison-focus";
import { personalStartBlock, retainedSongFor } from "@/lib/personal-start-status";
import PersonalThemePicker from "@/components/personal-theme-picker";

type Target = { id: string; name: string; points: Point[]; parentTargetId?: string | null; measurement?: HeadphoneMeasurement | null };
const emptyPair: [number, number] = [0, 0];
async function fingerprint(value: unknown) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
function download(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}
function recordingFamily(id: string) { const track = listeningPool.find(track => track.url === id); return track?.songFamily || id; }

export default function PersonalShootout() {
  const listeningReminder=useListeningReminder();
  const [sampleRequested,setSampleRequested]=useState(false);
  const [playback,setPlayback]=useState<PersonalPlayback>(DEFAULT_PERSONAL_PLAYBACK);
  const consent = useConsentPrompt("Browsing needs no agreement. Starting a tournament saves your choices on this device and asks what you are happy to share, so we ask once, here.");
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [targets, setTargets] = useState<Target[]>([]), [measurements, setMeasurements] = useState<HeadphoneMeasurement[]>([]);
  const [localRaw, setLocalRaw] = useState<string | null>(null), [poolChoice, setPoolChoice] = useState<PoolChoice>({ mode: "all" });
  const [measurementId, setMeasurementId] = useState(""), [headphoneType, setHeadphoneType] = useState<"ie" | "oe">("oe");
  const [runs, setRuns] = useState<PersonalRun[]>([]), [ready, setReady] = useState(false), [context, setContext] = useState("");
  const [error, setError] = useState(""), [storageError, setStorageError] = useState(""), [notice, setNotice] = useState("");
  const [budget, setBudget] = useState(20), [results, setResults] = useState(false), [heard, setHeard] = useState<[number,number]>(emptyPair);
  const [draftMusic, setDraftMusic] = useState<PersonalMusic>({mode:"pool",ids:[]});
  const [communitySharing,setCommunitySharing]=useState<PersonalSharing>({enabled:false,token:null,state:"checking"});
  const communityChanged=useCallback((value:PersonalSharing)=>setCommunitySharing(value),[]);
  const [sharing,setSharing] = useState<PersonalSharing>({enabled:false,token:null,state:"checking"}), [researchStatus,setResearchStatus] = useState("");
  const [listenSide,setListenSide]=useState<0|1>(0);
  const [adminTesting,setAdminTesting]=useState<boolean|null>(null);
  const [ownerProfile,setOwnerProfile]=useState(false);
  const sharingChanged=useCallback((choice:PersonalSharing)=>{setSharing(choice);if(typeof choice.testOnly==="boolean")setAdminTesting(choice.testOnly);if(typeof choice.ownerProfile==="boolean")setOwnerProfile(choice.ownerProfile);},[]);
  const [songSearch, setSongSearch] = useState("");
  const [setupCollapsed, setSetupCollapsed] = useState(false);
  const [browseRequest,setBrowseRequest] = useState(0);
  function browseMeasurements(){setSetupCollapsed(false);setBrowseRequest(value=>value+1);}

  const autoCollapseSetupRef=useRef(false);
  function onMusicPlayback(playing:boolean){if(playing&&!autoCollapseSetupRef.current){autoCollapseSetupRef.current=true;setSetupCollapsed(true);}}
  function toggleSetup(){autoCollapseSetupRef.current=true;setSetupCollapsed(value=>!value);}
  const [showResultCurves,setShowResultCurves]=useState(false);
  const [practice, setPractice] = useState(false), [startedAt, setStartedAt] = useState(Date.now), [now, setNow] = useState(Date.now);
  const [passageHistory]=useState<PassageShuffleBook>(()=>new Map());
  const [uploadedSong, setUploadedSong] = useState<File | null>(null);
  const player = useRef<MusicPanelHandle>(null), saving = useRef(false), storageSnapshot = useRef<string | null>(null);
  const measurement = measurements.find(row => row.id === measurementId);
  const publicIds = useMemo(() => new Set(targets.map(target => target.id)), [targets]);
  const localTargets = useMemo(() => parseLocalTargets(localRaw, { publicIds, adminTesting: adminTesting === true }), [localRaw, publicIds, adminTesting]);
  const pool = useMemo(() => personalPool(targets, localTargets, poolChoice, measurement?.type), [targets, localTargets, poolChoice, measurement?.type]);
  function changePool(choice: PoolChoice) { try { if (choice.mode === "all") localStorage.removeItem(TARGET_POOL_KEY); else localStorage.setItem(TARGET_POOL_KEY, JSON.stringify(choice)); } catch { /* The choice still applies on this page. */ } setPoolChoice(choice); }
  const sampleRun=useMemo(()=>sampleRequested && pool.length<=MAX_PERSONAL_CANDIDATES && pool.length>=3 && pool.every(target=>target.name.startsWith("Preview synthetic")) ? createPersonalExample(pool.map(target=>({id:target.id,name:target.name,family:targetFamily(target)})),startedAt) : null,[sampleRequested,pool,startedAt]);
  const run = sampleRun ?? (context ? runs.find(row => row.context === context) : undefined);
  const localOnly = run ? poolHasLocalTargets(run.candidates.map(candidate => candidate.id), publicIds) : false;
  const passageRequired=run?.requireMatchedPassage!==false;
  function changePassageRequirement(required:boolean){if(!run||sampleRun)return;safely(()=>{player.current?.stop();if(required){player.current?.reset();setHeard(emptyPair);}update({...run,requireMatchedPassage:required});setResearchStatus(required?"Future matched choices can use your existing optional research setting. Past private choices stay private.":"Free listening: no minimum before voting. Your existing Personal research permission still applies, with actual timing recorded.");});}
  const music = run?.music ?? draftMusic;
  const includedRecordings = music.mode === "pool" || music.mode === "upload" ? undefined : music.ids;
  const playbackReady=playback.channelMode!=="uploaded"||!!measurement?.channelMatchPreset;
  const playbackMeasurement=useMemo(()=>playbackReady?personalPlaybackMeasurement(measurement,playback.channelMode):undefined,[measurement,playback.channelMode,playbackReady]);
  const musicChosen = music.mode === "pool" || music.mode === "upload" || music.ids.length > 0;
  const musicReady = musicChosen&&playbackReady;
  const startBlock = personalStartBlock({ storageError, hasHeadphones: !!measurement, playbackReady, musicChosen, setupReady: !!context, sharingState: sharing.state, poolSize: pool.length, maxPool: MAX_PERSONAL_CANDIDATES, minPool: MIN_CUSTOM_POOL });
  // A first-time visitor (no run for this setup yet) gets the guided starter instead of the full setup card.
  const starter = ready && !targetsLoading && !run && !sampleRun;
  const playlistSongs = listeningPool.filter(track => `${track.title} ${track.artist}`.toLowerCase().includes(songSearch.toLowerCase())).sort((a,b)=>a.title.localeCompare(b.title));
  const standings = useMemo(() => run ? personalStandings(run) : [], [run]);
  const completed = run?.choices.filter(choice => choice.result !== "skip").length ?? 0;
  const eligible = standings.filter(row => !run?.excluded.includes(row.id));
  const tested = standings.filter(row => row.heard > 0);
  const favoriteId = useMemo(() => run ? personalFavorite(run) : null, [run]);
  const currentFavorite = eligible.find(row => row.id === favoriteId);
  const done = run ? confirmationComplete(run) : false;
  const pair = run?.pending ?? null;
  const pairToken = `${context}:${run?.updatedAt}:${run?.choices.length}:${pair?.join(":")}`;
  const [musicChooserOpen,setMusicChooserOpen]=useState(false);
  const nextComparisonFocusPending=useRef(false);
  const viewFocusPending=useRef<"comparison"|"results"|null>(null);
  const musicFocusKey=useRef<string|null>(null),previousMusicPlayer=useRef(pairToken),musicRemountPending=useRef(false);
  useEffect(()=>{
    const remounted=previousMusicPlayer.current!==pairToken;previousMusicPlayer.current=pairToken;
    if(!remounted)return;
    const restore=musicRemountPending.current;musicRemountPending.current=false;
    if(!restore||!musicChooserOpen||!musicFocusKey.current||document.activeElement!==document.body)return;
    const field=[...document.querySelectorAll<HTMLElement>('.music-chooser:not([hidden]) [data-music-control]')].find(node=>node.dataset.musicControl===musicFocusKey.current);
    field?.focus();
  },[pairToken,musicChooserOpen]);
  useEffect(()=>{
    if(!nextComparisonFocusPending.current)return;
    nextComparisonFocusPending.current=false;
    const duel=document.querySelector<HTMLElement>(".personal-duel");
    if(!results&&duel&&document.activeElement===document.body)focusComparisonPlayback(duel);
  },[pairToken,results]);
  useEffect(()=>{
    const destination=viewFocusPending.current;
    if(!destination||listeningReminder.open||(destination==="results")!==results)return;
    const target=document.querySelector<HTMLElement>(destination==="results"?".personal-results":".personal-duel");
    if(!target)return;
    viewFocusPending.current=null;
    if(document.activeElement!==document.body)return;
    if(destination==="results"){target.focus({preventScroll:true});target.scrollIntoView({block:"start",behavior:"instant"});}
    else focusComparisonPlayback(target,{preventScroll:false});
  },[pairToken,results,listeningReminder.open]);

  const excludedRecordings = useMemo(() => {
    if (!run || run.phase !== "confirm" || !pair) return [];
    const families = confirmationEvidence(run, pair);
    return listeningPool.filter(track => families.has(track.songFamily || track.url)).map(track => track.url);
  }, [run, pair]);

  useEffect(() => {
    function load() {
      player.current?.stop(); setHeard(emptyPair); setPractice(false);
      try {
        const playbackRaw=localStorage.getItem(PERSONAL_PLAYBACK_KEY);setPlayback(playbackRaw?parsePersonalPlayback(JSON.parse(playbackRaw)):DEFAULT_PERSONAL_PLAYBACK);
        const raw = localStorage.getItem(PERSONAL_KEY); const saved = parsePersonalRuns(raw);
        storageSnapshot.current = raw; setRuns(saved); setStorageError("");
        setLocalRaw(localStorage.getItem(PRIVATE_TARGETS_KEY)); setPoolChoice(parsePoolChoice(localStorage.getItem(TARGET_POOL_KEY)));
        const rows = JSON.parse(localStorage.getItem("target-lab-measurements") || "[]");
        if (!Array.isArray(rows)) throw Error("Saved measurements could not be read.");
        const valid = rows.map(parseMeasurement); setMeasurements(valid);
        const active = localStorage.getItem("target-lab-active-measurement") || "";
        setMeasurementId(valid.some(row => row.id === active) ? active : "");
      } catch (cause) { setRuns([]); setStorageError(cause instanceof Error ? cause.message : "Browser storage is unavailable."); }
      setReady(true);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reconcile externally restored setup and reset listening evidence when the active comparison changes.
    setSampleRequested(["localhost","127.0.0.1","[::1]"].includes(window.location.hostname) && new URLSearchParams(window.location.search).get("example")==="results");
    load();
    const changed = (event: StorageEvent) => { if (!event.key || [PERSONAL_KEY,PERSONAL_PLAYBACK_KEY,"target-lab-measurements","target-lab-active-measurement",PRIVATE_TARGETS_KEY,TARGET_POOL_KEY,"yinyang-erasure-event","yinyang-sync-event"].includes(event.key)) load(); };
    window.addEventListener("storage", changed);
    const erased = () => load();
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("yinyang-privacy-erasure") : null;
    if (channel) channel.onmessage = erased;
    window.addEventListener("yinyang-data-changed", erased);
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => { window.removeEventListener("storage", changed); window.removeEventListener("yinyang-data-changed", erased); channel?.close(); clearInterval(timer); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/targets", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw Error("Could not load targets. Check your listening access and reload.");
      setTargets(await response.json() as Target[]);
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load targets."); }).finally(() => { if (!controller.signal.aborted) setTargetsLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reconcile externally restored setup and reset listening evidence when the active comparison changes.
    let cancelled = false; autoCollapseSetupRef.current=false;setSetupCollapsed(false);setContext(""); player.current?.stop(); setHeard(emptyPair); setResults(false); setPractice(false);
    if (adminTesting!==null && measurement && pool.length >= 2) void fingerprint({ ...(adminTesting?{adminTest:true}:{}),algorithm: "personal-v1", protocol: personalPlaybackProtocol(playback), measurement, targets: pool.map(t => [t.id,t.points,targetFamily(t)]) }).then(value => { if (!cancelled) setContext(value); }).catch(() => setError("Could not fingerprint this setup. Use a secure browser context."));
    return () => { cancelled = true; };
  }, [measurement, pool, playback,adminTesting]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Reconcile externally restored setup and reset listening evidence when the active comparison changes.
  useEffect(() => { setHeard(emptyPair); setListenSide(0); }, [pairToken]);
  const hasPair=!!pair, isSample=!!sampleRun, requestReminder=listeningReminder.request;
  useEffect(()=>{if(hasPair&&!results&&!run?.paused&&!isSample)requestReminder();},[hasPair,results,run?.paused,isSample,requestReminder]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Reconcile externally restored setup and reset listening evidence when the active comparison changes.
  useEffect(() => { setResults(run?.paused === true); }, [run?.context,run?.paused]);

  function save(next: PersonalRun[]) {
    if (sampleRun) throw Error("Example results are read-only. Return to your saved tournament to continue.");
    if (storageError) throw Error(storageError);
    if (localStorage.getItem(PERSONAL_KEY) !== storageSnapshot.current) throw Error("Progress changed in another tab. Reload before continuing.");
    const raw = JSON.stringify(next); parsePersonalRuns(raw);
    localStorage.setItem(PERSONAL_KEY, raw); storageSnapshot.current = raw; setRuns(next); setError("");
  }
  function update(next: PersonalRun) { save(runs.map(row => row.context === next.context ? next : row)); }
  function safely(action: () => void) { try { action(); } catch (cause) { setNotice(""); setError(cause instanceof Error ? cause.message : "Could not save progress. Export it before closing this page."); } }
  function start() { safely(() => {
    autoCollapseSetupRef.current=false;setSetupCollapsed(false);listeningReminder.newTest();
    if (!measurement || !context || pool.length < 2) return;
    if (pool.length > MAX_PERSONAL_CANDIDATES) throw Error(`Choose up to ${MAX_PERSONAL_CANDIDATES} targets under Choose my own pool. Your saved runs are unchanged.`);
    if (runs.length >= 8) throw Error("Eight setups are saved. Export and delete an older run below before starting another.");
    const next = createPersonalRun(context, `${measurement.device || measurement.name} · ${measurement.type === "ie" ? "In-Ear" : "Over-Ear"} · ${playback.loudnessTarget==="off"?"Normalization off":`${playback.loudnessTarget} LUFS`} · Channel ${playback.channelMode}`, pool.map(t => ({ id:t.id, name:t.name, family:targetFamily(t) })), budget);
    next.adminTestOnly=adminTesting===true;next.playback=playback;
    next.music = draftMusic; next.pending = nextPersonalPair(next); save([...runs,next]); viewFocusPending.current="comparison"; setStartedAt(Date.now()); setResults(false); setNotice("Your run is saved. Start with an optional practice comparison.");
  }); }
  function advance(result: "a" | "b" | "tie" | "skip") { safely(() => {
    if (!run || !pair || saving.current) return;
    saving.current = true;
    try {
      const snapshot = player.current?.snapshot();
      if (passageRequired && result !== "skip" && (!snapshot || snapshot.heardA < 5 || snapshot.heardB < 5 || snapshot.overlapSeconds < 5)) throw Error("Listen to at least five seconds of the same passage on both A and B first.");
      if (practice) { player.current?.finish(); setPractice(false); setHeard(emptyPair); player.current?.reset(); setNotice("Practice complete. No choice was saved. The next choice counts toward your run."); return; }
      const recording=music.mode==="upload"?snapshot?.sha256?(listeningPool.find(track=>track.sha256===snapshot.sha256)?.songFamily||listeningPool.find(track=>track.sha256===snapshot.sha256)?.url||`local:${snapshot.sha256}`):"":recordingFamily(snapshot?.recordingId||"");
      let next = recordPersonalChoice(run, { pair, result, recording, matchedPassageRequired:passageRequired,matchedPassage:!!snapshot&&snapshot.heardA>=5&&snapshot.heardB>=5&&snapshot.overlapSeconds>=5,start: Math.min(...(snapshot?.intervals.length ? snapshot.intervals.map(row => row.start) : [0])), end: Math.max(0,...(snapshot?.intervals.map(row => row.end) || [0])), at:Date.now(), phase:run.phase });
      if (passageRequired && result !== "skip" && !recording) throw Error("Wait for the recording and its local fingerprint to finish loading, then listen again.");
      if(sharing.testOnly||run.adminTestOnly){next.adminTestOnly=true;saveAdminTestRecord("personal-comparison",{pair,result,heardA:snapshot?.heardA,heardB:snapshot?.heardB,headphone:measurement?.device});}
      next.pending = nextPersonalPair(next);
      const count = next.choices.filter(c => c.result !== "skip").length;
      const pauseNow = count >= next.checkpoint || confirmationComplete(next);
      if (pauseNow) next = checkpointPersonalRun({...next,paused:true});
      // Save before stopping playback: a quota failure leaves this choice retryable.
      update(next); nextComparisonFocusPending.current=!pauseNow; player.current?.finish(); setHeard(emptyPair);
      if(sharing.ownerProfile&&!run.adminTestOnly&&!localOnly&&result!=="skip"){
        void fingerprint({context,choice:next.choices.at(-1)}).then(choiceKey=>fetch("/api/my-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"journal",choiceKey,targetAId:pair[0],targetBId:pair[1],result,device:measurement?.device,rig:measurement?.rig,phase:run.phase,heard_a:snapshot?.heardA||0,heard_b:snapshot?.heardB||0,overlap_seconds:snapshot?.overlapSeconds||0})})).then(async response=>{if(!response.ok)throw Error("Private journal save failed.");}).catch(()=>setResearchStatus("Saved in this browser; the private YinYangEQ journal could not be updated. No automatic retry."));
      }
      if (!sharing.testOnly && !run.adminTestOnly && !localOnly && result!=="skip" && sharing.enabled && sharing.token && measurement) {
        // Submit this new answer once, after durable local save. Never backfill or
        // automatically retry historical answers after withdrawal or deletion.
        setResearchStatus("Personal choice saved locally; sending optional research contribution…");
        void Promise.resolve().then(()=>fetch("/api/personal-research",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:crypto.randomUUID(),consentToken:sharing.token,noticeVersion:PERSONAL_RESEARCH_NOTICE_VERSION,targetAId:pair[0],targetBId:pair[1],result,headphoneType:measurement.type,setupFingerprint:context,recordingId:music.mode==="upload"?snapshot?.sha256?personalMusicToken(localStorage,snapshot.sha256):"":snapshot?.recordingId||"",intervals:snapshot?.intervals||[],matchedPassageRequired:passageRequired,phase:run.phase,roundNumber:next.choices.length,schedulerVersion:"personal-v1",candidateIds:run.candidates.map(t=>t.id),excludedIds:run.excluded,musicMode:music.mode,loudnessTarget:playback.loudnessTarget,channelMode:playback.channelMode})})).then(async response=>{const body=await response.json() as {error?:string};if(!response.ok)throw Error(body.error||"Contribution could not be saved.");setResearchStatus("Research contribution saved.");}).catch(cause=>setResearchStatus(`Kept locally; research sharing failed: ${cause instanceof Error?cause.message:"please try a future comparison"} No automatic retry.`));
      }
      if (!communitySharing.testOnly && !run.adminTestOnly && !localOnly && result!=="skip" && communitySharing.enabled && communitySharing.token && measurement) {
        // Submit this new answer once, after durable local save. Never backfill or
        // automatically retry historical answers after withdrawal or deletion.
        setResearchStatus("Personal choice saved locally; sending optional research contribution…");
        void Promise.resolve().then(()=>fetch("/api/community-preferences/personal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:crypto.randomUUID(),consentToken:communitySharing.token,noticeVersion:COMMUNITY_NOTICE_VERSION,targetAId:pair[0],targetBId:pair[1],result,headphoneType:measurement.type,setupFingerprint:context,recordingId:music.mode==="upload"?snapshot?.sha256?personalMusicToken(localStorage,snapshot.sha256):"":snapshot?.recordingId||"",intervals:snapshot?.intervals||[],matchedPassageRequired:passageRequired,phase:run.phase,roundNumber:next.choices.length,schedulerVersion:"personal-v1",candidateIds:run.candidates.map(t=>t.id),excludedIds:run.excluded,musicMode:music.mode,loudnessTarget:playback.loudnessTarget,channelMode:playback.channelMode})})).then(async response=>{const body=await response.json() as {error?:string};if(!response.ok)throw Error(body.error||"Contribution could not be saved.");setResearchStatus("Community contribution saved.");}).catch(cause=>setResearchStatus(`Kept locally; community sharing failed: ${cause instanceof Error?cause.message:"please try a future comparison"} No automatic retry.`));
      }
      if (pauseNow) { viewFocusPending.current="results"; setResults(true); setNotice("Progress saved. Take a break or review your shortlist."); }
    } finally { saving.current = false; }
  }); }
  function confirmFinalists() { safely(() => {
    if (!run) return;
    const finalists = eligible.filter(row => row.heard > 0 && !row.benched).slice(0,3).map(row => row.id);
    if (finalists.length < 2) throw Error("Compare at least two available targets before checking finalists.");
    const next = { ...run, phase:"confirm" as const, finalists, paused:false, updatedAt:Date.now() };
    next.pending = nextPersonalPair(next); update(next); player.current?.stop(); viewFocusPending.current="comparison"; setResults(false); setStartedAt(Date.now());
  }); }
  function pauseAndReview() { safely(() => { if (!run) return; const next=checkpointPersonalRun({...run,paused:true,updatedAt:Date.now()}); update(next); player.current?.stop(); viewFocusPending.current="results"; setResults(true); }); }
  function undoChoice() { safely(() => {
    if (!run || !run.choices.length) return;
    const previous = run.choices.at(-1)!;
    const next: PersonalRun = {...run, choices:run.choices.slice(0,-1), phase:"explore", finalists:[], pending:previous.pair, history:run.history?.filter(h=>h.choices<run.choices.length), updatedAt:Date.now()};
    if (previous.pair.some(id => run.excluded.includes(id))) next.pending = nextPersonalPair(next);
    update(next); nextComparisonFocusPending.current=true; player.current?.stop(); setHeard(emptyPair); setNotice("Last local choice removed. Any research contribution remains in My data until you delete it. Listen again before choosing.");
  }); }
  function exploreMore() { if(sampleRun){navigateFresh("/shootout/personal");return;} safely(() => {
    if (!run) return;
    const next = { ...run, phase:"explore" as const, finalists:[], paused:false, checkpoint:completed + run.budget, updatedAt:Date.now() };
    next.pending = nextPersonalPair(next); update(next); viewFocusPending.current="comparison"; setResults(false); setStartedAt(Date.now());
  }); }
  function toggleTarget(id: string, restore: boolean) { safely(() => {
    if (!run) return;
    const excluded = restore ? run.excluded.filter(value => value !== id) : [...new Set([...run.excluded,id])];
    if (run.candidates.length - excluded.length < 2) throw Error("Keep at least two targets available.");
    const next = { ...run, excluded, restored:restore ? [...new Set([...run.restored,id])] : run.restored, phase:"explore" as const, finalists:[], updatedAt:Date.now() };
    next.pending = nextPersonalPair(next); update(next); player.current?.stop();
  }); }
  function chooseMusic(next: PersonalMusic) { safely(() => { if (run) update({...run,music:next,updatedAt:Date.now()}); else setDraftMusic(next); musicRemountPending.current=!!run; player.current?.stop(); if (next.mode !== "upload") setUploadedSong(null); setHeard(emptyPair); setNotice(run ? "Music choice saved. Previous comparisons remain in your run; listen again before choosing." : ""); }); }
  function choosePlayback(next:PersonalPlayback){safely(()=>{const valid=parsePersonalPlayback(next);localStorage.setItem(PERSONAL_PLAYBACK_KEY,JSON.stringify(valid));player.current?.stop();setHeard(emptyPair);setPlayback(valid);setNotice("Playback setup changed. Each setup keeps separate progress; switch back to resume its saved run.");});}
  async function uploadMatchingPreset(file:File){try{if(!measurement)throw Error("Select your headphone measurement first.");if(file.size>200000)throw Error("Preset file exceeds 200 KB.");const preset=parseChannelMatchPreset(await file.text());const next=measurements.map(row=>row.id===measurement.id?{...row,channelMatchPreset:preset,channelMatchFileName:file.name}:row);localStorage.setItem("target-lab-measurements",JSON.stringify(next));player.current?.stop();setHeard(emptyPair);setMeasurements(next);choosePlayback({...playback,channelMode:"uploaded"});}catch(cause){setError(cause instanceof Error?cause.message:"Could not load matching preset.");}}
  function selectMeasurement(id: string) { safely(() => { player.current?.stop(); localStorage.setItem("target-lab-active-measurement",id); setMeasurementId(id); }); }
  async function importMeasurement(entry: CatalogMeasurement) {
    try { const row = parseMeasurement(await importCatalogEntry(entry)); const next = [...measurements,row]; localStorage.setItem("target-lab-measurements",JSON.stringify(next)); localStorage.setItem("target-lab-active-measurement",row.id); setMeasurements(next); setMeasurementId(row.id); setHeadphoneType(row.type); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not import measurement."); }
  }
  const [liveSnapshot,setLiveSnapshot]=useState<ReturnType<MusicPanelHandle["snapshot"]>>(null);
  const updateHeard=useCallback((next:[number,number])=>{setHeard(next);setLiveSnapshot(player.current?.snapshot()??null);},[]);
  const passageQualified=Boolean(heard[0]>=5&&heard[1]>=5&&liveSnapshot&&liveSnapshot.heardA>=5&&liveSnapshot.heardB>=5&&liveSnapshot.overlapSeconds>=5);
  const canChoose=!!pair&&musicReady&&(!passageRequired||passageQualified);
  const shortlist = eligible.filter(row => row.heard > 0).slice(0,3);
  const crossChecks = run?.choices.filter(c => c.phase === "confirm" && c.result !== "skip") ?? [];
  const contradictions = run ? crossChecks.some(c => c.result !== "tie" && crossChecks.some(other => [...other.pair].sort().join() === [...c.pair].sort().join() && other.result !== "tie" && other.pair[other.result === "a" ? 0 : 1] !== c.pair[c.result === "a" ? 0 : 1])) : false;

  useEffect(() => {
    if (run && measurement && playbackReady && !results && !sampleRun && !autoCollapseSetupRef.current) {
      autoCollapseSetupRef.current = true;
      setSetupCollapsed(true);
    }
  }, [run, measurement, playbackReady, results, sampleRun]);

  const musicControls = <section className="personal-music-settings" aria-label="Music choices" onFocusCapture={event=>{musicFocusKey.current=(event.target as HTMLElement).dataset.musicControl??null;}} onBlurCapture={event=>{if(!musicRemountPending.current&&event.relatedTarget instanceof Node&&!event.currentTarget.contains(event.relatedTarget))musicFocusKey.current=null;}}><div className="personal-music-fields"><label>Music source<select data-music-control="source" value={music.mode} onChange={event => { const mode=event.target.value as PersonalMusic["mode"]; chooseMusic({mode,ids:mode === "pool" ? [] : mode === "upload" ? music.ids : music.ids.length ? mode === "song" ? music.ids.slice(0,1) : music.ids : mode === "song" ? [listeningPool[0].url] : []}); }}><option value="pool">Random Listening Pool</option><option value="song">Keep One Song</option><option value="playlist">My Playlist</option><option value="upload">Upload My Music</option></select></label>{music.mode === "song" && <label>Song to keep<select data-music-control="song" value={music.ids[0] || ""} onChange={event=>chooseMusic({mode:"song",ids:[event.target.value]})}>{[...listeningPool].sort((a,b)=>a.title.localeCompare(b.title)).map(track=><option key={track.url} value={track.url}>{musicDisplayTitle(track.title)} · {track.artist} · {track.versionLabel || "original"}</option>)}</select></label>}{music.mode === "playlist" && <><label>Find playlist songs<input type="search" data-music-control="playlist-search" value={songSearch} onChange={event=>setSongSearch(event.target.value)} /></label><p role="status">{music.ids.length} selected · {playlistSongs.length} of {listeningPool.length} songs shown</p><div className="personal-playlist" role="group" aria-label="Playlist songs">{playlistSongs.map(track=><label key={track.url}><input type="checkbox" data-music-control={`playlist:${track.url}`} checked={music.ids.includes(track.url)} onChange={event=>chooseMusic({mode:"playlist",ids:event.target.checked ? [...music.ids,track.url] : music.ids.filter(id=>id!==track.url)})}/><span>{musicDisplayTitle(track.title)}<small>{track.artist} · {track.versionLabel || "original"}</small></span></label>)}{!playlistSongs.length && <p>No matching songs.</p>}</div></>}{music.mode==="upload"&&<p className="personal-upload-help">Start your tournament, then choose a stereo audio file in the player’s music chooser. Audio and filenames stay on this device. Uploaded files must be selected again after reloading; your comparison progress remains saved. Use genuinely different songs for finalist checks—different file fingerprints cannot prove different songs.</p>}</div>{(error||storageError)&&<p className="personal-music-error">{storageError||error}</p>}<details className="personal-music-help"><summary>Music options &amp; finalist checks</summary><p>Music choices are saved with this run. Changing the source keeps previous comparisons and requires fresh listening. Keep One Song is useful for familiarization; finalist checks need at least two different song families. Choose Random Listening Pool or a varied playlist for those checks.</p></details></section>;

    const headphonePicker = <HeadphonePicker browseRequest={browseRequest} rows={measurements} selectedId={measurementId} headphoneType={measurement?.type || headphoneType} onType={type => { player.current?.stop(); setHeadphoneType(type); selectMeasurement(""); }} onSelect={selectMeasurement} onClear={() => selectMeasurement("")} onImport={importMeasurement} onUpload={() => { navigateFresh("/shootout?tab=measurements"); }} onEdit={() => { navigateFresh("/shootout?tab=measurements"); }} onDelete={id => safely(() => { const next=measurements.filter(row => row.id !== id); localStorage.setItem("target-lab-measurements",JSON.stringify(next)); setMeasurements(next); if (id === measurementId) selectMeasurement(""); })}/>;
  const loudnessControl = <section className="loudness-control adjustable" aria-label="Track loudness" title="Choose the track loudness target. This setting is saved with your Personal setup."><strong>Loudness</strong><div className="loudness-select-wrap"><span className="loudness-selected-label">{playback.loudnessTarget==="off"?"Normalization off":`−${playback.loudnessTarget.slice(1)} LUFS`}</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 6 5 5 5-5"/></svg><select value={playback.loudnessTarget} aria-label="Track loudness target" onChange={event=>choosePlayback({...playback,loudnessTarget:event.target.value as PersonalPlayback["loudnessTarget"]})}><option value="-14">−14 LUFS</option><option value="-16">−16 LUFS</option><option value="-18">−18 LUFS</option><option value="off">Normalization off</option></select></div><span>{playback.loudnessTarget==="off"?"Normalization is off.":"Matched source loudness, as in Open Comparison."}</span>{playback.loudnessTarget==="off"&&<span className="loudness-warning" role="alert">Track levels may be very different or loud.</span>}</section>;
  const channelSettings = <div className="personal-channel-settings"><label>Channel matching<select aria-label="Personal channel matching" value={playback.channelMode} onChange={event=>choosePlayback({...playback,channelMode:event.target.value as PersonalPlayback["channelMode"]})}><option value="auto">Auto</option><option value="uploaded">Uploaded</option><option value="off">Off</option></select></label>{playback.channelMode==="uploaded"&&<label className="personal-preset-upload" title="Upload a two-channel PEQdB or Qudelix TXT preset"><Upload size={15} aria-hidden="true"/><span>{measurement?.channelMatchPreset?"Replace channel preset":"Upload channel preset"}</span><input aria-label="Upload two-channel PEQdB or Qudelix TXT preset" type="file" accept=".txt" disabled={!measurement} onChange={event=>{const file=event.target.files?.[0];if(file)void uploadMatchingPreset(file);event.target.value="";}}/></label>}<span>{playback.channelMode==="off"?"Left and Right correction is off; target EQ stays active.":playback.channelMode==="uploaded"?measurement?.channelMatchPreset?`Using ${measurement.channelMatchFileName||"saved preset"}`:"Choose a PEQdB or Qudelix TXT file containing both Left and Right channel filters.":measurement?.leftPoints?.length&&measurement?.rightPoints?.length?"Auto uses your saved Left and Right responses.":"Auto needs Left and Right responses for channel correction."}</span></div>;
    const supportDetails = <><p className="personal-private">{sampleRun ? "Viewing simulated results only. Your saved tournament remains unchanged." : ownerProfile ? "Your personal progress is saved in this browser and the private YinYangEQ account journal. Review My profile before publishing entries." : "Find your own favorite with a blind personal tournament. Progress is saved in this browser; Sync and export are available when you choose them."}</p>
    {!sampleRun && <PersonalResearchSharing onChange={sharingChanged} onCommunityChange={communityChanged}/>}{!sampleRun && <><p><a href="/community-preferences">Community Preferences · optional reference checks and research methods →</a></p></>}{researchStatus && <p role="status">{researchStatus}</p>}
    <details className="personal-method"><summary>How this tournament works &amp; its limits</summary><p>Early rounds prioritize unheard targets and spread related variants apart. Later rounds focus on promising contenders while continuing exploration. Scores adjust for opponent strength; no single loss eliminates a target. Ties do not count as losses. Finalist checks use distinct music references, hidden names and randomized sides. Listening Pool references group known versions by song; uploaded files are distinguished by content fingerprints, which cannot prove different songs.</p><p>Use a quiet setting, consistent fit and a comfortable fixed volume. Practice first if the controls are unfamiliar. Take a break at least every 15–20 minutes. Five seconds per side is an interaction minimum; replay or try another passage when the difference is subtle. Source normalization does not guarantee equal perceived loudness after EQ.</p><p>This is personal preference discovery, not a certified ITU listening test. Close preferences, song dependence and preference cycles can leave multiple contenders. The scheduling and benching thresholds are practical heuristics, not statistically proven stopping rules.</p><ul className="personal-evidence"><li><strong>Same passage, concealed identities and randomized presentation:</strong> reduce changes in programme content and presentation cues. <a href="https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1284-2-201901-I!!PDF-E.pdf">ITU-R BS.1284-2 §5.2.1</a>.</li><li><strong>Practice, replay and rest:</strong> become familiar with the controls and take regular breaks. <a href="https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1116-3-201502-I!!PDF-E.pdf">ITU-R BS.1116-3 §4.1</a> and <a href="https://www.itu.int/rec/R-REC-BS.1284">BS.1284-2 §5.2.1</a>.</li><li><strong>Adaptive comparisons:</strong> research studies finding good candidates from noisy pairwise choices. Our scheduler uses this principle, with different heuristics and no inherited accuracy guarantee. <a href="https://proceedings.mlr.press/v38/jamieson15.html">Jamieson et al., Sparse Dueling Bandits (2015)</a>.</li><li><strong>A shortlist can be the honest result:</strong> one option need not beat every other option. <a href="https://proceedings.mlr.press/v161/haddenhorst21a.html">Haddenhorst et al., Testification of Condorcet Winners (2021)</a>.</li><li><strong>Our practical choices:</strong> least-encountered scheduling, family spacing, 25% exploration, bench thresholds and two-song-family finalist checks are reviewable design rules. The cited research does not establish those exact values.</li></ul></details>
    <details><summary>Saved setups &amp; local data</summary><p>Up to eight setups and 500 choices per setup. Personal progress is saved on this browser, is included in explicit browser Sync, and is removed by Clear saved browser data in My data. Export is a local file; keep it private. Switching setups retains each run. Removing local progress does not delete optional research submissions; manage those in My data.</p>{runs.map(saved => <div className="personal-contender" key={saved.context}><span>{saved.label}<small>{saved.choices.filter(c => c.result !== "skip").length} comparisons · {new Date(saved.updatedAt).toLocaleDateString()}</small></span><button type="button" onClick={() => download("personal-tournament.json",saved)}><span aria-hidden="true">↓</span> Export</button><button type="button" onClick={() => { if (window.confirm("Delete this personal run from this browser? This cannot be undone.")) safely(() => { save(runs.filter(row => row.context !== saved.context)); player.current?.stop(); }); }}>Delete run</button></div>)}<div className="personal-data-actions"><button type="button" className="personal-download" onClick={() => safely(() => download("personal-tournament-all.json", localStorage.getItem(PERSONAL_KEY)))}><span aria-hidden="true">↓</span> Export raw saved progress</button><a className="personal-manage-link" href="/my-data">Manage or erase browser data <span aria-hidden="true">→</span></a></div></details>
  </>;
  const targetPicker = <PersonalTargetPicker publicTargets={targets} localTargets={localTargets} choice={poolChoice} type={measurement?.type} onChange={changePool}/>;
  const startCard = <div className="starter-start">
    {targetPicker}
    <p className="starter-start-copy">{measurement ? <>{pool.some(target => target.name.startsWith("Preview synthetic")) && <strong>Sample curves · preview only. </strong>}{pool.length} targets in the pool. A short session gives a preliminary shortlist; it will not necessarily cover the whole pool.{pool.length>budget*2&&<> Each comparison plays two targets, so {budget} comparisons can cover at most {budget*2} of these. Choose a longer session or a smaller pool for a finer shortlist.</>}</> : "Pick your headphones in step 1 to see the compatible target pool."}</p>
    <div className="starter-start-row"><label className="starter-size">Comparisons per session <select value={budget} onChange={event => setBudget(Number(event.target.value))}><option value={10}>10 comparisons</option><option value={20}>20 comparisons</option><option value={40}>40 comparisons</option></select></label><button type="button" className="primary starter-start-button" disabled={!!startBlock} aria-describedby={startBlock?"personal-start-reason":undefined} onClick={() => void consent.ask(start)}>Start personal tournament</button></div>
    {startBlock&&<p id="personal-start-reason" className="alpha-session-start-reason" role="status" data-reason={startBlock.kind}>{startBlock.message}{startBlock.kind==="sharing-unavailable"&&<> <button type="button" className="alpha-session-start-retry" onClick={()=>window.dispatchEvent(new Event("yinyang-data-changed"))}>Check again</button></>}</p>}
  </div>;
  const contribution = personalContributionStatus(sharing,{testOnly:adminTesting,practice});
  const starterView = <section className="personal-starter" aria-labelledby="starter-title">
    <div className="starter-intro">
      <p id="starter-title" className="personal-setup-lead">Find the sound you like best.</p>
      <p>Compare two sounds at a time on your own headphones. Your choices narrow {pool.length ? `${pool.length} targets` : "the targets"} to a personal shortlist, and names stay hidden until your results.</p>
      <nav className="starter-modes" aria-label="Other listening modes"><span>Other ways to listen</span><a href="/shootout?mode=blind">Blind Research</a><a href="/shootout?mode=open">Open Comparison</a></nav>
    </div>
    <ol className="starter-steps">
      <li className={`starter-step${measurement?" is-done":""}`}><h2><span className="starter-num" aria-hidden="true">{measurement?"✓":"1"}</span>Pick your headphones</h2><p className="starter-help">Each target is applied through your headphone’s measurement, so it sounds the way it would on yours.</p>{headphonePicker}</li>
      <li className="starter-step"><h2><span className="starter-num" aria-hidden="true">2</span>Pick your music</h2><p className="starter-help">A random track from the Listening Pool works well, or use a song of your own.</p>{musicControls}</li>
      <li className="starter-step"><h2><span className="starter-num" aria-hidden="true">3</span>Start listening</h2>{startCard}</li>
    </ol>
    <PersonalThemePicker/>
    <details className="starter-advanced"><summary>Advanced setup<span>{playback.loudnessTarget==="off"?"Normalization off":`${playback.loudnessTarget.replace("-","−")} LUFS`} · channel matching {playback.channelMode==="uploaded"?"Uploaded":playback.channelMode==="off"?"Off":"Auto"}</span></summary><div className="starter-advanced-body">{loudnessControl}{channelSettings}<p className="personal-setup-note">Separate progress for each measurement, catalog, loudness and channel-matching setup. Switching back restores that setup’s progress. Keep headphone fit and volume consistent.</p><button type="button" className="listening-reminder-link" onClick={()=>{player.current?.stop();listeningReminder.show();}}>Review listening safety tips</button></div></details>
    {!sampleRun && <p className="starter-status" role="status" data-sharing={contribution.kind}>{contribution.text}</p>}
  </section>;
  return <main className="shell personal-shootout alpha-listening"><div className="site-contents" inert={listeningReminder.open}>
    <div className="content shootout-content"><div className="shootout-view" data-mode="personal" data-active-listening={!!run && !results && !!pair}>
    <header className="personal-page-heading"><div className="personal-heading-art" aria-hidden="true"><ModeIllustration kind="personal"/></div><div><span className="personal-eyebrow">YOUR EARS. YOUR FAVORITES.</span><h1>Personal Tournament</h1></div><a href="/shortcuts" className="personal-key-help" title="Playback and tuning keyboard shortcuts">Shortcuts</a></header>
    {sampleRun && <section className="personal-example-notice" role="status"><strong>Sample results · actual tournament page</strong><p>These simulated choices show gold, silver, bronze and the full target list using the local sample curves. They are read-only and do not replace your saved progress or contribute research data.</p><a href="/shootout/personal">Return to my saved tournament →</a></section>}
    {starter ? starterView : <fieldset className="personal-example-setup" disabled={!!sampleRun}>
    <section className={`shootout-setup ${setupCollapsed ? "is-collapsed" : ""}`} aria-label="Personal setup"><div className="shootout-setup-control"><button type="button" className="shootout-setup-toggle" aria-expanded={!setupCollapsed} aria-controls="personal-setup-panel" aria-describedby="setup-auto-hide-note" onClick={toggleSetup}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg><span>{setupCollapsed ? "Show test options" : "Hide test options"}</span></button><button type="button" className="listening-reminder-link" onClick={()=>{player.current?.stop();listeningReminder.show();}}>Before You Listen</button><SetupAutoHideNote/></div>{setupCollapsed && <div className="alpha-setup-summary" role="group" aria-label="Current personal setup"><strong>{measurement?.name || "Choose your headphones"}</strong>{measurement && <span>{measurement.type === "ie" ? "In-Ear" : "Over-Ear"}</span>}<span>{playback.loudnessTarget === "off" ? "Normalization off" : `${playback.loudnessTarget} LUFS`}</span></div>}<div id="personal-setup-panel" className="shootout-setup-panel" aria-hidden={setupCollapsed} inert={setupCollapsed}><div className="shootout-setup-content"><div className="heading-row shootout-heading-row"><div><h2>Your listening setup</h2><p className="alpha-setup-intro">Choose your headphones, then discover your favorites by listening.</p></div><div className="shootout-heading-aside"><span className="count-pill pool-count"><span className="pool-count-main">{targetsLoading ? "Loading targets…" : `${pool.length} TARGETS IN THE POOL`}</span><span className="pool-count-detail">Personal · saved progress</span></span>{loudnessControl}</div></div>
    <TournamentModeTabs active="personal"/>
    {headphonePicker}{channelSettings}{targetPicker}<p className="personal-setup-note">Separate progress for each measurement, catalog, loudness and channel-matching setup. Switching back restores that setup’s progress. Keep headphone fit and volume consistent.</p></div></div></section>
    {(!run || results || !pair || !playbackReady) && musicControls}
    </fieldset>}

    {!sampleRun&&!starter&&<p className={adminTesting?"admin-test-notice":"personal-sharing-status"} role="status" data-sharing={personalContributionStatus(sharing,{testOnly:adminTesting,practice}).kind}>{personalContributionStatus(sharing,{testOnly:adminTesting,practice}).text}</p>}
    {(error || storageError) && <div className="message" role="alert">{storageError || error} <button type="button" onClick={() => window.location.reload()}>Reload</button></div>}
    {notice && <p role="status">{notice}</p>}
    {localOnly && !sampleRun && <p className="personal-sharing-status" role="status" data-sharing="local-targets">This run uses your own targets or a very large pool, so it stays on this device. Nothing from it is sent to research or community sharing.</p>}
    {!ready || targetsLoading ? <p role="status">{targetsLoading ? "Loading your target pool…" : "Loading saved progress…"}</p> : !run ? null : <> <section className="personal-session-bar" aria-label="Current session"><div><span className="personal-phase-dot" aria-hidden="true"/><strong>{done ? "Finalists checked" : run.phase === "confirm" ? "Checking finalists" : "Exploring your sound"}</strong><span>{completed} saved · {tested.length}/{standings.length} explored</span></div>{!results && <button type="button" onClick={pauseAndReview}>Pause &amp; see results</button>}</section>
      {!musicReady && <p role="status">{!playbackReady?"Upload a two-channel matching preset or choose Auto / Off to continue.":"Select at least one song in My Playlist to continue."}</p>}
      {now-startedAt >= 15*60000 && !results && <aside className="personal-break" role="status">Time for a listening break. Your progress is saved; pause now and return when rested.</aside>}
      {!results && pair && playbackReady && <section className="personal-duel" aria-label="Blind personal comparison"><h2>{practice ? "Practice · no choice saved" : run.phase === "confirm" ? "Listen again on different music" : "Which sounds better to you?"}</h2>{!practice&&run.phase!=="confirm"&&run.checkpoint>0&&<div className="personal-duel-progress"><progress max={run.checkpoint} value={Math.min(completed,run.checkpoint)} aria-label="Comparisons completed in this session"/><span>Comparison {Math.min(completed+1,run.checkpoint)} of {run.checkpoint} · {tested.length} of {standings.length} targets heard</span></div>}<p>Names stay hidden. Replay freely, then choose A, B or no preference.</p><div className="personal-ab cards">{pair.map((id,index)=><div className="card listen-card" key={`${id}-${index}`} role="button" tabIndex={0} aria-label={`Play Sample ${index?"B":"A"}`} onClick={()=>void player.current?.listen(index as 0|1)} onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==="Enter"||event.key===" ")){event.preventDefault();void player.current?.listen(index as 0|1);}}}><div className="chart"><div className="curve-frame listen-surface blind-masked"><canvas className="waveform" data-waveform={index} width={560} height={210} role="img" aria-label={`Live layered spectrum for Sample ${index?"B":"A"}`}/><span className="curve-hover-choice" aria-hidden="true">Play {index?"B":"A"}</span></div><div className="level-meter" data-meter={index} role="meter" aria-label={`Clipping safety meter for Sample ${index?"B":"A"}`} aria-valuemin={-60} aria-valuemax={0} aria-valuenow={-60} aria-valuetext="Idle"><span className="meter-clip" data-clip>CLIP!</span><div className="level-track"><i data-level-fill/></div></div><div className="chart-labels"><span>20 Hz</span><span>200 Hz</span><span>2 kHz</span><span>20 kHz</span></div></div><div className="card-bottom"><div><strong>Target {index?"B":"A"}</strong><small>Tap to listen · blind</small></div></div></div>)}</div><p className="personal-listen-status" role="status">{!passageRequired?"Free listening · no minimum required · your research permission still applies":canChoose ? "Ready to choose" : "Listen to five seconds of the same passage on both sides"}</p><div className="music-panel-host"><MusicPanel compareControls={<MatchedPassageStrip heard={heard} required={passageRequired} qualified={passageQualified} onRequiredChange={changePassageRequirement} hostId="personal-passage-actions" switchControl={<button type="button" className="strip-switch" data-next={listenSide===0?"b":"a"} onClick={()=>void player.current?.listen(listenSide===0?1:0)}>Switch {listenSide===0?"B":"A"}</button>}/>} choiceControls={<div className="personal-comparison-actions"><div className="personal-actions personal-votes choice-controls"><button type="button" className="choice-a" data-locked={!canChoose} disabled={!canChoose} onClick={() => advance("a")}>Prefer A</button><button type="button" className="choice-tie" data-locked={!canChoose} disabled={!canChoose} onClick={() => advance("tie")}>No Preference / Tie</button><button type="button" className="choice-b" data-locked={!canChoose} disabled={!canChoose} onClick={() => advance("b")}>Prefer B</button></div><div className="personal-actions alpha-session-utilities" role="group" aria-label="Comparison options"><button type="button" onClick={() => advance("skip")} title="Skip without recording a preference">Skip comparison</button><button type="button" onClick={() => { player.current?.stop(); player.current?.reset(); setPractice(!practice); setNotice("Practice choices do not count. You can replay A and B before starting."); }}>{practice ? "Leave practice" : "Practice first"}</button></div></div>} songActions={music.mode!=="upload"&&listeningPool.filter(track=>!excludedRecordings.includes(track.url)&&(!includedRecordings||includedRecordings.includes(track.url))).length>1&&<button type="button" onClick={() => void player.current?.randomSong()}>Another song</button>} sourceControls={musicControls} musicChooserOpen={musicChooserOpen} onMusicChooserOpenChange={open=>{setMusicChooserOpen(open);if(!open){musicFocusKey.current=null;musicRemountPending.current=false;}}} passageHistory={passageHistory} passageControlsHostId="personal-passage-actions" onPlaybackChange={onMusicPlayback} beforePlayback={listeningReminder.request} key={pairToken} retainedFile={retainedSongFor(music.mode,run?.phase,uploadedSong)} onFileChosen={setUploadedSong} ref={player} pair={pair} testMode={music.mode==="upload"?"bring":"blind"} personalOnly excludedRecordingIds={excludedRecordings} includedRecordingIds={includedRecordings} loudnessTarget={playback.loudnessTarget} targets={pool} suggestions={[]} measurement={playbackMeasurement} consent={false} onSideChange={setListenSide} onHeard={updateHeard} onPassagePlay={() => void player.current?.playPassage()}/></div></section>}
      <section className="personal-journey" aria-label="Tournament progress">
        <div className="personal-journey-heading"><div><span className="personal-eyebrow">YOUR LISTENING JOURNEY</span><h2>{done ? "A shortlist worth coming back to." : run.phase === "confirm" ? "Does your favorite hold up?" : "Explore. Compare. Make it yours."}</h2></div><span className="personal-saved-tag">{sampleRun ? "Read-only sample" : "Progress saved"}</span></div>
        <ol className="personal-journey-stages"><li aria-current={run.phase !== "confirm" && !done ? "step" : undefined}><span>01</span><div><strong>Explore &amp; compare</strong><p>Hear new targets. Build your own shortlist.</p></div></li><li aria-current={run.phase === "confirm" || done ? "step" : undefined}><span>02</span><div><strong>{done ? "Finalists checked" : "Check your finalists"}</strong><p>Revisit your favorites on different music.</p></div></li></ol>
        <div className="personal-journey-stats"><span><strong>{completed}</strong> comparisons across all sessions</span><span><strong>{tested.length} / {standings.length}</strong> targets explored</span><span><strong>{run.excluded.length}</strong> set aside</span></div>
        <div className="personal-session-progress"><span>This session</span><progress aria-label="Session comparisons" max={run.budget} value={Math.min(run.budget,Math.max(0, completed - (run.checkpoint - run.budget)))}/><span>{Math.min(run.budget,Math.max(0, completed - (run.checkpoint - run.budget)))} / {run.budget}</span></div>
        <p className="personal-progress-note">{pool.some(target => target.name.startsWith("Preview synthetic")) && <strong>Sample curves · preview only. </strong>}{sampleRun ? "Simulated choices are not saved or submitted." : "Pause whenever you like. Session sizes are stopping points, not a measure of certainty."}</p>
        <div className="personal-actions alpha-session-utilities" role="group" aria-label="Saved run actions">{results && !done && pair && <button type="button" className="primary personal-resume" onClick={() => { safely(() => { if (run) update({...run,paused:false,checkpoint:completed>=run.checkpoint?completed+run.budget:run.checkpoint}); viewFocusPending.current="comparison"; setResults(false); setStartedAt(Date.now()); }); }}><span aria-hidden="true">▶</span> Resume Listening</button>}<button type="button" onClick={() => download("personal-tournament.json",run)}><span aria-hidden="true">↓</span> Export this run</button>{!sampleRun&&<button type="button" disabled={!run.choices.length} title="Remove the most recent answer from this browser and replay that comparison. Research submissions are managed separately in My data." onClick={undoChoice}>Undo last choice</button>}</div><details className="personal-progress-help"><summary>About progress &amp; Undo</summary><p>Explore &amp; compare introduces curves and builds your shortlist. Check your leading curves compares the finalists on different songs to see whether your preference holds. Finalists checked means those repeat comparisons are complete; you can still keep listening.</p><p>Undo last choice removes only your most recent saved answer in this browser and reopens that comparison. It does not delete a research submission; use My data to manage those. The sample results are read-only, so Undo is hidden here.</p></details></section>
      {(results || !pair) && <section className="personal-results" aria-label="Personal results" tabIndex={-1}><div className="personal-result-toolbar"><span id="personal-results-context">{sampleRun ? "Sample results · read-only" : "Results · listening paused"}</span><button type="button" onClick={exploreMore}>{sampleRun ? "Return to my saved tournament" : "▶ Return to listening"}</button></div><PersonalPodium run={run} afterWinners={currentFavorite&&<aside className="personal-fine-tune-callout"><div><h3>Make it yours.</h3><p><span className="tune-copy-wide">Bass, mids, and treble—adjust the thump, voices, and sparkle.</span><span className="tune-copy-narrow">Thump, voices, sparkle—your way.</span></p></div><PersonalTuneLink id={currentFavorite.id} name={currentFavorite.name} label="Fine-tune my favorite" preview/></aside>}/><details className="personal-result-curves" open={showResultCurves} onToggle={event=>setShowResultCurves(event.currentTarget.open)}><summary>View finalist target curves</summary><p>Curves are revealed here after listening. Resume a blind round to compare without visual cues.</p><div className="cards">{shortlist.map((row,index)=>{const target=pool.find(t=>t.id===row.id);return target?<article className="card" key={row.id}><div className="chart"><div className="curve-frame"><Curve points={target.points} color={["#58d8c9","#e9b466","#b69fee"][index]}/></div><div className="chart-labels"><span>20 Hz</span><span>200 Hz</span><span>2 kHz</span><span>20 kHz</span></div></div><div className="card-bottom personal-curve-caption"><PersonalPlace place={eligible.findIndex(other=>Math.abs(other.score-row.score)<1e-8)+1} medal={!!favoriteId}/><strong>{row.name}</strong><PersonalTuneLink id={row.id} name={row.name}/></div></article>:null;})}</div></details><h2>{currentFavorite ? "Your current favorite & close alternatives" : "Your shortlist · no clear favorite yet"}</h2><p>{currentFavorite ? `Current favorite: ${currentFavorite.name}.` : tested.length ? "Your leading targets need more direct comparisons, or your choices are tied or mixed." : "Complete some comparisons to build a shortlist."} This applies to your tested targets, measurement and music. It is not a universal winner or a confidence estimate.</p>{tested.length < standings.length && <p>{standings.length-tested.length} targets have not been heard yet. Continue exploring before treating this as a whole-pool result.</p>}{done && <p>Finalist checks completed: every finalist pair was compared on at least two distinct recording references. Library tracks share song-family references; uploaded files use content fingerprints, which do not prove different songs. {contradictions ? "Some preferences reversed across checks; keep the shortlist and listen again another day." : "You can still revisit this result with more music or another session."}</p>}<ol className="personal-shortlist">{shortlist.map(row => <li key={row.id}><div className="personal-shortlist-heading"><PersonalPlace place={eligible.findIndex(other=>Math.abs(other.score-row.score)<1e-8)+1} medal={!!favoriteId}/><strong>{row.name}</strong><PersonalTuneLink id={row.id} name={row.name}/></div><span>{row.wins} preferred · {row.losses} not preferred · {row.ties} ties · {row.opponents.size} opponents</span></li>)}</ol><div className="personal-actions"><button type="button" onClick={exploreMore}>{sampleRun ? "Return to my saved tournament" : `Explore & refine for ${run.budget} more`}</button><button type="button" disabled={!!sampleRun || shortlist.length < 2} aria-describedby={sampleRun ? "personal-results-context" : undefined} onClick={confirmFinalists}>Check top {Math.min(3,shortlist.length)} on different music</button></div><p>Finalist checks re-test your current shortlist. They cannot rule out untested or benched targets, and ties may leave several good options. Uploaded music is distinguished by file content; use different songs, since file fingerprints cannot detect alternate versions of the same song.</p><details><summary>Manage contenders · reversible benching</summary><p>Repeated losers are benched after at least five choices and losses to at least three opponents. They get occasional second chances. Targets you set aside stay excluded until you restore them.</p>{standings.map(row => <div className="personal-contender" key={row.id}><span>{row.name}<small>{run.excluded.includes(row.id) ? "Set aside by you" : row.benched ? "Benched · occasional second chances" : row.heard ? "Active" : "Not heard yet"}</small></span>{run.excluded.includes(row.id) || row.benched ? <button type="button" disabled={!!sampleRun} onClick={() => toggleTarget(row.id,true)}>Restore</button> : <button type="button" disabled={!!sampleRun} onClick={() => toggleTarget(row.id,false)}>Set aside</button>}</div>)}</details></section>}
    </>}
    <div className="personal-support" role="group" aria-label="Research, guidance and saved data"><TournamentHeader activeTab="shootout"/>
    {starter ? <details className="starter-more"><summary>Privacy, sharing &amp; how this works</summary>{supportDetails}</details> : supportDetails}</div></div></div></div>{listeningReminder.open&&<BeforeYouListen personal onMeasurementChoice={measurement||sampleRun?undefined:kind=>{listeningReminder.dismiss();if(kind==="database")browseMeasurements();else window.location.href=kind==="saved"?"/shootout?tab=measurements#saved-measurements":"/shootout?tab=measurements";}} skip={listeningReminder.skip} onSkipChange={listeningReminder.setSkip} onReady={listeningReminder.ready}/>}{consent.dialog}</main>;
}
