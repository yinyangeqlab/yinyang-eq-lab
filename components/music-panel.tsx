"use client";
import { adminMusicChoices, saveAdminMusicChoice } from "@/lib/admin-test-store";

import { attachMediaRecovery } from "@/lib/media-recovery";

import { FileMusic, FolderOpen, RotateCcw, Shuffle, Play, Square, MoveVertical, Volume2, VolumeX } from "lucide-react";
import { createPortal } from "react-dom";
import {musicDisplayTitle} from "@/lib/music-display";
import { type ReactNode, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { Point } from "@/lib/curves";
import { intervalStats, selectedPassageIntervals, selectedPassageProgress, type Interval } from "@/lib/listening";
import { fitAutoEq } from "@/lib/autoeq";
import { channelBalance } from "@/lib/channel-balance";
import type { HeadphoneMeasurement } from "@/lib/measurement";
import { analyzeTrack, type TrackAnalysis } from "@/lib/loudness";
import TrackWaveform from "@/components/track-waveform";
import { shuffleComparisonPassage, rememberComparisonPassage, comparisonOrder, type PassageShuffleBook, type ComparisonPassage } from "@/lib/comparison-passage";
import { curatedWaveform } from "@/lib/curated-waveforms";
import { estimateWaveformSpread, previewDynamics } from "@/lib/dynamics-preview";
import { matchSongSuggestion, type SongSuggestion } from "@/lib/song-match";
import { musicCandidates } from "@/lib/music-catalog";
import { musicRotation, musicCommunityRank, playbackTarget, type MusicChoice, type MusicCounts } from "@/lib/music-preferences";
import { listeningPool as curatedMusic } from "@/lib/music-catalog";
import { readDisplayPreferences } from "@/lib/display-preferences";

export type MusicContext = { songTitle: string; songArtist: string; songAlbum: string; recordingId: string; sha256: string | null; audioFormat: string | null; sampleRate: number | null; bitrate: number | null; duration: number | null; intervals: Interval[]; heardA: number; heardB: number; overlapSeconds: number; normalizationStatus: string; loudnessTarget: string };
export type MusicPanelHandle = { finish: () => (MusicContext & { consent: boolean }) | null; snapshot: () => (MusicContext & { consent: boolean }) | null; heard: () => [number, number]; reset: () => void; stop: () => void; pause: () => void; isPlaying: () => boolean; isHashing: () => boolean; listen: (side: 0 | 1) => Promise<boolean>; randomSong: () => Promise<boolean>; replay: () => Promise<boolean>; playPassage: () => Promise<boolean> };
type MusicVoteSnapshot = { byTrack?: MusicCounts; mine?: Record<string, MusicChoice>; signedIn?: boolean; testOnly?:boolean; error?: string };
type Target = { id: string; points: Point[] };

type SourceRate = { sampleRate?: number; bitrate?: number; mode?: "CBR" | "VBR" | "ABR"; basis?: "frame" | "average" | "byte-rate" };
function sourceDetails(buffer: ArrayBuffer, format: string): SourceRate {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 36) return {};
  const ascii = (start: number, value: string) => [...value].every((char, i) => bytes[start + i] === char.charCodeAt(0));
  if (ascii(0, "RIFF") && ascii(8, "WAVE")) {
    let offset = 12;
    while (offset + 8 <= view.byteLength) {
      const id = view.getUint32(offset, false), size = view.getUint32(offset + 4, true);
      if (id === 0x666d7420 && offset + 24 <= view.byteLength) return { sampleRate: view.getUint32(offset + 12, true), bitrate: view.getUint32(offset + 16, true) * 8, basis: "byte-rate" };
      offset += 8 + size + size % 2;
    }
    return {};
  }
  if (ascii(0, "fLaC") && bytes.length >= 26 && (bytes[4] & 127) === 0) return { sampleRate: (bytes[18] << 12) | (bytes[19] << 4) | (bytes[20] >> 4) };
  if (format !== "MP3") return {};
  let start = 0;
  if (ascii(0, "ID3") && bytes.length >= 10) start = 10 + ((bytes[6] & 127) << 21) + ((bytes[7] & 127) << 14) + ((bytes[8] & 127) << 7) + (bytes[9] & 127);
  for (let i = start; i < Math.min(bytes.length - 4, start + 4096); i++) {
    if (bytes[i] !== 255 || (bytes[i + 1] & 224) !== 224) continue;
    const version = (bytes[i + 1] >> 3) & 3, layer = (bytes[i + 1] >> 1) & 3;
    const rateIndex = (bytes[i + 2] >> 2) & 3, bitrateIndex = (bytes[i + 2] >> 4) & 15;
    if (version === 1 || layer !== 1 || rateIndex === 3 || bitrateIndex === 0 || bitrateIndex === 15) continue;
    const base = [44100, 48000, 32000][rateIndex];
    const kbps=(version===3 ? [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320] : [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[bitrateIndex];
    const sampleRate = version === 3 ? base : version === 2 ? base / 2 : base / 4;
    const result: SourceRate = { sampleRate, bitrate: kbps * 1000, basis: "frame" };
    // Xing/Info follows Layer III side information; its frame bitrate is not the song average.
    // LAME's method byte distinguishes ABR from other variable-rate encoding.
    const frameEnd = Math.min(bytes.length, i + Math.floor((version === 3 ? 144 : 72) * kbps * 1000 / sampleRate) + ((bytes[i + 2] >> 1) & 1));
    const mono = (bytes[i + 3] >> 6) === 3;
    const tag = i + 4 + (version === 3 ? (mono ? 17 : 32) : (mono ? 9 : 17));
    if (tag + 8 <= frameEnd && (ascii(tag, "Xing") || ascii(tag, "Info"))) {
      result.mode = ascii(tag, "Info") ? "CBR" : "VBR";
      const flags = view.getUint32(tag + 4, false);
      let cursor = tag + 8, frames = 0, size = 0;
      if (flags & 1) { if (cursor + 4 > frameEnd) return result; frames = view.getUint32(cursor, false); cursor += 4; }
      if (flags & 2) { if (cursor + 4 > frameEnd) return result; size = view.getUint32(cursor, false); cursor += 4; }
      if (frames && size) { result.bitrate = Math.round(size * 8 * sampleRate / (frames * (version === 3 ? 1152 : 576))); result.basis = "average"; }
      if (flags & 4) cursor += 100;
      if (flags & 8) cursor += 4;
      if (cursor + 10 <= frameEnd && ascii(cursor, "LAME")) {
        const method = bytes[cursor + 9] & 15;
        if (method === 1) result.mode = "CBR";
        else if (method === 2) result.mode = "ABR";
        else if ([3, 4, 5, 6].includes(method)) result.mode = "VBR";
      }
    } else if (i + 54 <= frameEnd && ascii(i + 36, "VBRI")) {
      result.mode = "VBR";
      const size = view.getUint32(i + 46, false), frames = view.getUint32(i + 50, false);
      if (size && frames) { result.bitrate = Math.round(size * 8 * sampleRate / (frames * (version === 3 ? 1152 : 576))); result.basis = "average"; }
    }
    return result;
  }
  return {};
}

function sourceBitrateLabel(details: SourceRate, fallback: number | null, file: File | null, duration: number, curated: boolean): string {
  const fileAverage = file && file.size > 0 && duration > 0 ? file.size * 8 / duration : null;
  const average = details.basis === "average" ? details.bitrate : fileAverage;
  const rate = details.basis === "byte-rate" ? details.bitrate : average ?? details.bitrate ?? fallback;
  const mode = details.mode ? `${details.mode} (${details.mode === "CBR" ? "constant" : details.mode === "ABR" ? "average-rate encoding" : "variable"})` : "CBR/VBR mode unknown";
  if (!rate) return "source bitrate not read";
  const number = `${Math.round(rate / 1000)} kb/s`;
  if (details.basis === "byte-rate") return `${number} · WAV header byte rate`;
  if (average) return `${number} average${details.basis !== "average" ? " (file size/duration, includes tags)" : " (MP3 header)"} · ${mode}`;
  if (details.basis === "frame") return `${number} first frame · ${mode}${details.mode ? "; average unavailable" : ""}`;
  return `${number} ${curated ? "catalog-reported" : "reported"} · ${mode}`;
}

const MusicPanel = forwardRef<MusicPanelHandle, { passageHistory?: PassageShuffleBook; beforePlayback?:()=>boolean; sourceControls?: ReactNode; choiceControls?: ReactNode; pair: [string, string] | null; testMode: "blind" | "bring" | "open"; loudnessTarget: "-14" | "-16" | "-18" | "off"; targets: Target[]; suggestions: SongSuggestion[]; personalOnly?: boolean; excludedRecordingIds?: string[]; includedRecordingIds?: string[]; measurement?: HeadphoneMeasurement; consent: boolean; onDataSettings?: () => void; onPassagePlay?: () => void; passageControlsHostId?: string; comparisonComplete?: boolean; onConsentChange?: (enabled: boolean) => void; onSideChange: (side: 0 | 1) => void; onHeard: (seconds: [number, number]) => void; onPlaybackChange?: (playing: boolean) => void; onSourceReadyChange?: (ready: boolean) => void; onListenShortcut?: (side: 0 | 1) => unknown }>(function MusicPanel({ passageHistory, beforePlayback, sourceControls, choiceControls, pair, testMode, loudnessTarget, targets, suggestions, personalOnly = false, excludedRecordingIds = [], includedRecordingIds, measurement, consent, onDataSettings, onPassagePlay, passageControlsHostId, comparisonComplete = false, onSideChange, onHeard, onPlaybackChange, onSourceReadyChange, onListenShortcut }, ref) {
  const [passageHost, setPassageHost] = useState<HTMLElement | null>(null);
  useEffect(() => { setPassageHost(passageControlsHostId ? document.getElementById(passageControlsHostId) : null); }, [passageControlsHostId]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecovery = useRef<ReturnType<typeof attachMediaRecovery> | null>(null);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const recovery = attachMediaRecovery(audio, {
      onRecovering: () => { setSourceError(""); },
      onRecovered: () => { setSourceError(""); },
      onFailure: () => { setSourceError("The audio connection was interrupted. Press Play to try again."); },
    });
    mediaRecovery.current = recovery;
    return () => { recovery.dispose(); mediaRecovery.current = null; };
  }, []);

  const engine = useRef<{ context: AudioContext; sourceAnalyser: AnalyserNode; dynamics: AudioWorkletNode | null; filters: BiquadFilterNode[][]; balanceConvolvers: ConvolverNode[]; balanceKey?: HeadphoneMeasurement; balanceCustomAllowed?: boolean; balanceBoostDb: number; analysers: AnalyserNode[]; gates: GainNode[]; preamp: GainNode; transitionGain: GainNode } | null>(null);
  const dynamicRangeRef = useRef(0);
  const waveFrame = useRef<number | null>(null);
  const waveLevels = useRef<Float32Array[][]>([[], []]);
  const liveReadAt = useRef(0);
  const urlRef = useRef<string | null>(null);
  const hashSerialRef = useRef(0);
  const sourceSerialRef = useRef(0);
  const curatedFetchRef = useRef(0);
  const curatedIndexRef = useRef(-1);
  const curatedQueueRef = useRef<number[]>([]);
  const [adminTestOnly,setAdminTestOnly]=useState(false);
  const [musicCounts, setMusicCounts] = useState<MusicCounts>({});
  const [musicChoices, setMusicChoices] = useState<Record<string, MusicChoice>>({});
  const [musicVotesReady, setMusicVotesReady] = useState(false);
  const [musicSignedIn, setMusicSignedIn] = useState(false);
  const [musicSaving, setMusicSaving] = useState(false);
  const [musicVoteMessage, setMusicVoteMessage] = useState("");
  const [candidateUrl, setCandidateUrl] = useState<string | null>(null);
  const selectedPoolTrack = curatedMusic.find(track => track.url === candidateUrl);
  const requestedLoudness = testMode === "open" || personalOnly ? loudnessTarget : "-16";
  const sharedPlaybackTarget = requestedLoudness === "off" ? null : playbackTarget(selectedPoolTrack ? curatedMusic.filter(track => (track.songFamily || track.url) === (selectedPoolTrack.songFamily || selectedPoolTrack.url)) : [], Number(requestedLoudness));
  const includedRecordingIdsRef = useRef(includedRecordingIds);
  includedRecordingIdsRef.current = includedRecordingIds;
  const excludedRecordingIdsRef = useRef(excludedRecordingIds);
  excludedRecordingIdsRef.current = excludedRecordingIds;
  const candidateUrlRef = useRef(candidateUrl);
  candidateUrlRef.current = candidateUrl;
  const musicVoteRequest = useRef(0);
  async function refreshMusicVotes() {
    const request = ++musicVoteRequest.current;
    const response = await fetch("/api/music-votes", { cache: "no-store" });
    const result = await response.json() as MusicVoteSnapshot;
    if (request !== musicVoteRequest.current) return;
    if (!response.ok) throw new Error(result.error || "Could not load music choices.");
    setMusicCounts(result.byTrack ?? {});
    setAdminTestOnly(result.testOnly===true);
    setMusicChoices(result.testOnly?adminMusicChoices():result.mine ?? {});
    setMusicSignedIn(Boolean(result.signedIn));
    setMusicVotesReady(true);
    setMusicVoteMessage("");
  }
  useEffect(() => {
    // Read community standings in every mode; never feed ratings into the sampler.
    const refresh = () => { void refreshMusicVotes().catch(() => { setMusicVotesReady(false); setMusicVoteMessage("Music votes unavailable."); }); };
    const refreshVisible = () => { if (document.visibilityState === "visible") refresh(); };
    refresh();
    const timer = window.setInterval(refreshVisible, 60_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("yinyang-data-changed", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("yinyang-data-changed", refresh); musicVoteRequest.current++; };
  }, [candidateUrl]);
  const poolCommunityRank = useMemo(() => candidateUrl ? musicCommunityRank(musicCandidates, musicCounts, candidateUrl) : null, [candidateUrl, musicCounts]);
  const poolRankText = !musicVotesReady ? musicVoteMessage === "Music votes unavailable." ? "Community rank unavailable" : "Loading community rank…" : poolCommunityRank ? `Community rank #${poolCommunityRank.position} of ${poolCommunityRank.total} rated` : "Not ranked yet · no community votes";
  async function voteForMusic(choice: MusicChoice | null) {
    if (!candidateUrl || musicSaving) return;
    if(adminTestOnly){try{setMusicChoices(saveAdminMusicChoice(candidateUrl,choice));setMusicVoteMessage("Private test rating saved locally · community rank unchanged.");}catch(error){setMusicVoteMessage(error instanceof Error?error.message:"Local test could not be saved.");}return;}
    const votingUrl = candidateUrl;
    musicVoteRequest.current++;
    setMusicSaving(true);
    setMusicVoteMessage("");
    try {
      const response = await fetch("/api/music-votes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trackUrl: candidateUrl, choice }), cache: "no-store" });
      const result = await response.json() as MusicVoteSnapshot;
      if (!response.ok) throw new Error(result.error || "Could not save music choice. Try again.");
      musicVoteRequest.current++;
      setMusicCounts(result.byTrack ?? {});
      setMusicVotesReady(true);
      setMusicChoices(result.mine ?? {});
      // Ratings never alter the current random cycle or future selection odds.

      if (candidateUrlRef.current === votingUrl) setMusicVoteMessage(choice ? "Music choice saved." : "Music choice cleared.");
    } catch (error) { if (candidateUrlRef.current === votingUrl) setMusicVoteMessage(error instanceof Error ? error.message : "Could not save music choice. Try again."); }
    finally { setMusicSaving(false); }
  }
  const measuredLufsRef = useRef<number | null>(null);
  const samplesRef = useRef<File[]>([]);
  const sampleIndexRef = useRef(-1);
  const intervalsRef = useRef<Interval[]>([]);
  const activeRef = useRef<{ side: 0 | 1; start: number; rate: number } | null>(null);
  const sideRef = useRef<0 | 1>(0);
  const heardRef = useRef<[number, number]>([0, 0]);
  const onHeardRef = useRef(onHeard);
  onHeardRef.current = onHeard;
  const testModeRef = useRef(testMode);
  testModeRef.current = testMode;
  const [file, setFile] = useState<File | null>(null);
  const sourceKindRef = useRef<"curated" | "uploaded" | null>(null);
  const [samples, setSamples] = useState<File[]>([]);
  const [sampleChoice, setSampleChoice] = useState("random");
  const [openMusicSource,setOpenMusicSource]=useState<"pool"|"own">("pool");
  const [sampleStatus, setSampleStatus] = useState(`${curatedMusic.length} recordings · random Listening Pool`);
  const [sourceError, setSourceError] = useState("");
  const [loudnessStatus, setLoudnessStatus] = useState("Choose a track to measure loudness.");
  const [analysis, setAnalysis] = useState<TrackAnalysis | null>(null);
  const [curatedPreview, setCuratedPreview] = useState<Pick<TrackAnalysis, "waveform"> | null>(null);
  const [bitrateDetails, setBitrateDetails] = useState<SourceRate>({});
  const [meta, setMeta] = useState<Omit<MusicContext, "intervals" | "heardA" | "heardB" | "overlapSeconds" | "normalizationStatus" | "loudnessTarget">>({ songTitle: "", songArtist: "", songAlbum: "", recordingId: "", sha256: null, audioFormat: null, sampleRate: null, bitrate: null, duration: null });
  const [hashing, setHashing] = useState(false);
  const [side, setSide] = useState<0 | 1>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const lastPlaybackPosition=useRef(0);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  useEffect(() => { onSourceReadyChange?.(!!file && duration > 0); }, [file, duration, onSourceReadyChange]);
  const [volume, setVolume] = useState(1);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [waveformFocus,setWaveformFocus]=useState<number|null>(null);
  const [waveformZoom, setWaveformZoom] = useState(1);
  const [dynamicRange, setDynamicRange] = useState(0);
  const [dynamicSliderEnabled, setDynamicSliderEnabled] = useState(false);
  const [dynamicReduction, setDynamicReduction] = useState<number | null>(null);
  const [dynamicOutputGain, setDynamicOutputGain] = useState<number | null>(null);
  const [dynamicRangeUnavailable, setDynamicRangeUnavailable] = useState(false);
  const dynamicsAdjusted = Math.abs(dynamicRange) >= .0001 && !dynamicRangeUnavailable;
  const dynamicsExpanding = dynamicRange > 0;
  const spreadChange = useMemo(() => {
    if (!dynamicsAdjusted || !analysis || !duration) return 0;
    return estimateWaveformSpread(previewDynamics(analysis.waveform, dynamicRange, duration)) - estimateWaveformSpread(analysis.waveform);
  }, [analysis, duration, dynamicRange, dynamicsAdjusted]);
  const displayedLoudness = analysis ? `${selectedPoolTrack && sourceKindRef.current === "curated" ? `${selectedPoolTrack.integrated_lufs.toFixed(1)} LUFS measured` : `Estimated ${analysis.integratedLufs.toFixed(1)} LUFS`} · ${requestedLoudness === "off" ? "normalization off" : `matching to ${sharedPlaybackTarget?.toFixed(1)} LUFS`}` : loudnessStatus;
  const preciseClock=(seconds:number)=>`${Math.floor(seconds/60)}:${(seconds%60).toFixed(2).padStart(5,"0")}`;
  const clock = (seconds: number) => Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}` : "0:00";
  const pairTargets = pair?.map(id => targets.find(t => t.id === id));
  const [passageOverride, setPassageOverride] = useState<ComparisonPassage | null>(null);
  const ownPassageHistory=useRef<PassageShuffleBook>(new Map());
  const passageBook=passageHistory??ownPassageHistory.current;
  // Local visit only: no file identity or passage history is transmitted or persisted.
  const passageTrackKey=duration&&file?(sourceKindRef.current==="curated"&&candidateUrlRef.current?`pool:${candidateUrlRef.current}`:`file:${file.name}:${file.size}:${file.lastModified}`):"";
  const automaticPassage=useMemo(()=>shuffleComparisonPassage(duration,(curatedPreview??analysis)?.waveform,passageBook.get(passageTrackKey)??[]),[duration,curatedPreview,analysis,passageTrackKey,passageBook]);
  const passage=passageOverride??automaticPassage?.passage??null;
  const passageRef = useRef(passage);
  passageRef.current = passage;
  useEffect(() => { onHeardRef.current(heardNow()); }, [passage?.start, passage?.end]);
  const [shuffleStatus,setShuffleStatus]=useState("");
  useEffect(()=>{
    if(!passageTrackKey||!passage)return;
    passageBook.set(passageTrackKey,passageOverride?rememberComparisonPassage(passageBook.get(passageTrackKey)??[],passage,duration):automaticPassage!.history);
  },[passageTrackKey,passage,passageOverride,automaticPassage,passageBook,duration]);
  function shufflePassage(){
    if(!passage||!passageTrackKey)return;
    const history=rememberComparisonPassage(passageBook.get(passageTrackKey)??[],passage,duration);
    const next=shuffleComparisonPassage(duration,(curatedPreview??analysis)?.waveform,history,personalOnly?passage.end-passage.start:5,Math.random,passage);
    if(!next)return;
    passageBook.set(passageTrackKey,next.history);setPassageDone(false);setPassageOverride(next.passage);
    setShuffleStatus(next.restarted?"All sections selected. Starting a new shuffled cycle.":next.partialOverlap?"Covering remaining new audio; short gaps need some overlap to keep the segment length.":"New section selected · active audio favored.");
    if(personalOnly)setWaveformFocus((next.passage.start+next.passage.end)/2);
  }
  useEffect(()=>{setShuffleStatus("");},[passageTrackKey]);
  const passageRunRef = useRef<{ order: [0 | 1, 0 | 1]; step: number; range: ComparisonPassage; transitioning: boolean; pendingStart: boolean } | null>(null);
  const [passageRun, setPassageRun] = useState<{ step: number } | null>(null);
  const [passageDone, setPassageDone] = useState(false);
  const passageTickRef = useRef<() => void>(() => {});
  function cancelPassage() { passageRunRef.current = null; setPassageRun(null); }
  async function playPassageSide(run: NonNullable<typeof passageRunRef.current>) {
    const audio = audioRef.current;
    if (!audio || passageRunRef.current !== run) return;
    run.transitioning = true;
    closeInterval(); audio.pause(); selectSide(run.order[run.step]);
    run.pendingStart = true; audio.currentTime = run.range.start; setPosition(run.range.start); setPassageRun({ step: run.step });
    try {
      await engine.current!.context.resume();
      if (passageRunRef.current !== run) return;
      await audio.play();
      if (passageRunRef.current === run) { run.transitioning = false; setSourceError(""); }
    } catch { if (passageRunRef.current === run) { cancelPassage(); audio.pause(); setSourceError("Passage playback stopped. Press Play both targets to try again."); } }
  }
  async function completePassageSide() {
    const run = passageRunRef.current;
    if (!run || run.transitioning) return;
    run.transitioning = true; closeInterval(run.range.end); audioRef.current?.pause();
    heardRef.current = heardNow(); onHeardRef.current(heardRef.current);
    if (run.step === 0) { run.step = 1; await playPassageSide(run); }
    else { cancelPassage(); setPassageDone(true); }
  }
  function checkPassageEnd() {
    const audio = audioRef.current, run = passageRunRef.current;
    // Media time, not a wall-clock timeout: buffering never earns progress.
    if (audio && run && !run.transitioning && !audio.paused && !audio.seeking && audio.currentTime >= run.range.end) void completePassageSide();
  }
  passageTickRef.current = checkPassageEnd;
  useEffect(() => { const timer = window.setInterval(() => passageTickRef.current(), 40); return () => { window.clearInterval(timer); passageRunRef.current = null; }; }, []);
  async function playPassage() {
    if(beforePlayback&&!beforePlayback())return false;
    if (!audioRef.current || !file || !passage || !pair || !measurement || comparisonComplete) return false;
    cancelPassage(); setPassageDone(false); setPassageOverride(passage);
    try { setupEngine(); applyFit(); } catch { setSourceError("Could not initialize audio playback."); return false; }
    const run = { order: comparisonOrder(), step: 0, range: passage, transitioning: true, pendingStart: true };
    passageRunRef.current = run; await playPassageSide(run);
    return passageRunRef.current === run;
  }


  function updateDynamicRange(value: number) {
    const amount = Math.max(-1, Math.min(1, value));
    dynamicRangeRef.current = amount;
    setDynamicRange(amount);
    setDynamicReduction(null);
    setDynamicOutputGain(null);
    engine.current?.dynamics?.port.postMessage({ amount });
  }

  useEffect(() => {
    if (testMode !== "open") { setDynamicSliderEnabled(false); updateDynamicRange(0); }
  }, [testMode]);

  function closeInterval(endOverride?:number) {
    const current = activeRef.current, end = endOverride ?? audioRef.current?.currentTime;
    if (current && end !== undefined && Number.isFinite(end) && end > current.start + .05) intervalsRef.current.push({ ...current, end });
    activeRef.current = null;
    heardRef.current = heardNow(); onHeardRef.current(heardRef.current);
  }
  function startInterval() {
    const audio = audioRef.current;
    if (!audio || audio.paused || audio.seeking || activeRef.current || !Number.isFinite(audio.currentTime)) return;
    lastPlaybackPosition.current=audio.currentTime;
    const run = passageRunRef.current;
    const start = run?.pendingStart ? run.range.start : audio.currentTime;
    if (run) run.pendingStart = false;
    activeRef.current = { side: sideRef.current, start, rate: audio.playbackRate };
  }
  function heardNow(): [number, number] {
    return selectedPassageProgress(snapshotIntervals());
  }
  useEffect(() => { const timer = window.setInterval(() => { if (activeRef.current) onHeardRef.current(heardNow()); }, 250); return () => clearInterval(timer); }, []);
  useEffect(() => { const resumeVisibleAudio = () => { if (document.visibilityState === "visible" && audioRef.current && !audioRef.current.paused) void engine.current?.context.resume(); }; document.addEventListener("visibilitychange", resumeVisibleAudio); return () => document.removeEventListener("visibilitychange", resumeVisibleAudio); }, []);
  const listenShortcut = useRef<(side: 0 | 1) => unknown>(() => false);
  listenShortcut.current = onListenShortcut ?? listenToSide;
  useEffect(() => {
    const toggleWithSpace = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof Element && event.target.closest("button, a, input, textarea, select, summary, [contenteditable], [role='button'], [role='textbox'], [role='slider']")) return;
      event.preventDefault(); event.stopPropagation();
      audioRef.current?.closest(".music-panel")?.querySelector<HTMLButtonElement>(".deck-play")?.click();
    };
    const handlePlaybackShortcut = (event: KeyboardEvent) => {
      if (event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
      const panel = audioRef.current?.closest<HTMLElement>(".music-panel");
      if (!panel || panel.closest("[inert], [hidden]")) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (event.target instanceof Element && event.target.closest("button, a, input, textarea, select, summary, [contenteditable], [role='button'], [role='textbox'], [role='slider'], [role='dialog']")) return;
      const key = event.key.toLowerCase();
      const side = !event.shiftKey && (key === "a" || key === "1") ? 0 : !event.shiftKey && (key === "b" || key === "2") ? 1 : !event.shiftKey && key === "s" ? (sideRef.current === 0 ? 1 : 0) : null;
      const seek = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
      if (event.code === "Space" && !event.shiftKey) { toggleWithSpace(event); return; }
      if (side === null && !seek) return;
      // Letter/number shortcuts can be turned off on Shortcuts & help (WCAG 2.1.4); Space and arrows remain.
      if (side !== null && !readDisplayPreferences().singleKeyShortcuts) return;
      event.preventDefault(); event.stopPropagation();
      if (seek) {
        const audio = audioRef.current; if (!audio || !Number.isFinite(audio.duration)) return;
        cancelPassage(); closeInterval();
        const seconds = Math.max(0, Math.min(audio.duration, audio.currentTime + seek * (event.shiftKey ? 1 : .25)));
        audio.currentTime = seconds; setPosition(seconds); if (personalOnly) setWaveformFocus(seconds);
      } else if (side !== null) void listenShortcut.current(side);
    };
    window.addEventListener("keydown", handlePlaybackShortcut, true);
    return () => window.removeEventListener("keydown", handlePlaybackShortcut, true);
  }, []);
  function snapshotIntervals() {
    const audio=audioRef.current;
    const rows=[...intervalsRef.current], active=activeRef.current, end=audio?.seeking ? lastPlaybackPosition.current : audio?.currentTime;
    if(active && end!==undefined && Number.isFinite(end) && end>active.start) rows.push({...active,end});
    return selectedPassageIntervals(rows, passageRef.current);
  }
  async function replayPassage() {
    if(beforePlayback&&!beforePlayback())return false;
    cancelPassage();
    const audio=audioRef.current;if(!audio||!file)return false;
    const other=intervalsRef.current.find(row=>row.side!==sideRef.current);
    const start=other?.start ?? intervalsRef.current[0]?.start ?? activeRef.current?.start ?? 0;
    closeInterval();audio.currentTime=start;
    try{await audio.play();return true;}catch{return false;}
  }
  function resetHeard() { cancelPassage(); setPassageDone(false); closeInterval(); intervalsRef.current = []; heardRef.current = [0, 0]; onHeardRef.current([0, 0]); startInterval(); }
  async function listenToSide(next: 0 | 1, reminderChecked = false) {
    if(!reminderChecked&&beforePlayback&&!beforePlayback())return false;
    cancelPassage();
    if (!audioRef.current) return false;
    if (!file) {
      if (testModeRef.current === "bring") return false;
      selectSide(next);
      return chooseRandomSample("random", true);
    }
    try { setupEngine(); applyFit(); } catch { setSourceError("Could not initialize audio playback."); return false; }
    selectSide(next);
    try { await Promise.all([engine.current!.context.resume(), audioRef.current.play()]); setSourceError(""); return true; } catch { setSourceError("Playback could not start. Check the selected track and browser audio permissions."); return false; }

  }
  useImperativeHandle(ref, () => ({ replay: replayPassage, isHashing: () => hashing, heard: heardNow, reset: resetHeard, stop: () => { cancelPassage(); audioRef.current?.pause(); }, pause: () => { cancelPassage(); audioRef.current?.pause(); }, playPassage, isPlaying: () => !!audioRef.current && !audioRef.current.paused, randomSong: async () => { setSampleChoice("random"); return chooseRandomSample("random", true); }, listen: async next => {if(beforePlayback&&!beforePlayback())return false; return listenToSide(next, true);}, snapshot: () => ({ ...meta, normalizationStatus:loudnessStatus,loudnessTarget:requestedLoudness,intervals: snapshotIntervals(), ...intervalStats(snapshotIntervals()), consent: sourceKindRef.current === "curated" || consent }), finish: () => {
    cancelPassage();
    closeInterval(); audioRef.current?.pause();
    const intervals = snapshotIntervals();
    const stats = intervalStats(intervals);
    return { ...meta, normalizationStatus:loudnessStatus,loudnessTarget:requestedLoudness, intervals, ...stats, consent: sourceKindRef.current === "curated" || consent };
  } }));
  useEffect(() => {
    if (testMode !== "open") audioRef.current?.pause();
    resetHeard();
    if (testMode === "blind" && pair) void chooseRandomSample("random");
  }, [pair, testMode]);
  function clearMusicSource(){cancelPassage();curatedFetchRef.current++;sourceSerialRef.current++;hashSerialRef.current++;candidateUrlRef.current=null;measuredLufsRef.current=null;setDuration(0);setPassageOverride(null);setPosition(0); sourceKindRef.current=null;setCandidateUrl(null);setMusicVoteMessage(""); audioRef.current?.pause(); if (urlRef.current) {URL.revokeObjectURL(urlRef.current);urlRef.current=null;} setFile(null);setAnalysis(null);setCuratedPreview(null);if(audioRef.current){audioRef.current.removeAttribute("src");audioRef.current.load();}resetHeard();setHashing(false);setSourceError("");setWaveformZoom(1);setWaveformFocus(null);setLoudnessStatus("Choose a stereo song to measure loudness.");}
  useEffect(()=>{if(testMode==="bring")clearMusicSource();else if(testMode==="open")setOpenMusicSource(sourceKindRef.current==="uploaded"?"own":"pool");},[testMode]);
  function changeOpenMusicSource(source:"pool"|"own"){
    if(source===openMusicSource)return;
    clearMusicSource();setOpenMusicSource(source);setSampleChoice("random");
    if(source==="pool"){samplesRef.current=[];setSamples([]);void chooseRandomSample("random");}
    else setSampleStatus("Choose a stereo song or a music folder from your device. Audio stays local.");
  }
  function applyFit() {
    const current = engine.current;
    if (!current || !pairTargets?.[0] || !pairTargets[1]) return;
    const raw: Point[] = measurement?.points ?? [[20, 0], [20000, 0]];
    const fits = pairTargets.map(t => fitAutoEq(raw, t!.points));
    const customAllowed = testMode === "open" || personalOnly;
    if (current.balanceKey !== measurement || current.balanceCustomAllowed !== customAllowed) {
      const balance = channelBalance(measurement, current.context.sampleRate, customAllowed);
      current.balanceConvolvers.forEach((node, channel) => {
        const impulse = balance?.impulses[channel] ?? new Float32Array([1]);
        const buffer = current.context.createBuffer(1, impulse.length, current.context.sampleRate);
        buffer.getChannelData(0).set(impulse);
        node.buffer = buffer;
      });
      current.balanceBoostDb = balance?.maxBoostDb ?? 0;
      current.balanceKey = measurement;
      current.balanceCustomAllowed = customAllowed;
    }
    fits.forEach((fit, side) => current.filters[side].forEach((node, i) => {
      const filter = fit.filters[i];
      node.frequency.setTargetAtTime(filter?.hz ?? 1000, current.context.currentTime, .03);
      node.Q.setTargetAtTime(filter?.q ?? 1, current.context.currentTime, .03);
      node.gain.setTargetAtTime(filter?.gain ?? 0, current.context.currentTime, .03);
    }));
    const currentTrack = curatedMusic.find(track => track.url === candidateUrlRef.current);
    const family = currentTrack ? curatedMusic.filter(track => (track.songFamily || track.url) === (currentTrack.songFamily || currentTrack.url)) : [];
    const target = requestedLoudness === "off" ? null : playbackTarget(family, Number(requestedLoudness));
    const loudnessGainDb = target !== null && measuredLufsRef.current !== null ? target - measuredLufsRef.current : 0;
    current.preamp.gain.setTargetAtTime(10 ** ((Math.min(fits[0].preamp, fits[1].preamp) - current.balanceBoostDb - 1 + loudnessGainDb) / 20), current.context.currentTime, .03);
  }
  useEffect(() => { applyFit(); }, [pair, targets, file, measurement, loudnessTarget, testMode, loudnessStatus, sharedPlaybackTarget]);
  useEffect(() => { drawWaveforms(); return () => { if (waveFrame.current !== null) cancelAnimationFrame(waveFrame.current); if (urlRef.current) URL.revokeObjectURL(urlRef.current); if (engine.current && engine.current.context.state !== "closed") void engine.current.context.close(); }; }, []);

  function updateLevelMeter(branch: number, analyser: AnalyserNode | undefined, active: boolean) {
    const meter = document.querySelector<HTMLElement>(`[data-meter="${branch}"]`);
    if (!meter) return;
    const clipText = meter.querySelector<HTMLElement>("[data-clip]");
    if (!active || !analyser) { meter.style.setProperty("--level", "0%"); meter.dataset.level="idle";meter.removeAttribute("aria-valuenow");meter.setAttribute("aria-valuetext","Idle");if(clipText)clipText.hidden=true;return; }
    const samples = new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(samples);
    const gain = engine.current?.preamp.gain.value ?? 1;
    let peak = 0;
    for (const sample of samples) peak=Math.max(peak,Math.abs(sample*gain));
    const peakDb=peak>0?20*Math.log10(peak):-Infinity;
    meter.style.setProperty("--level", `${Math.max(0,Math.min(100,(peakDb+60)*100/60))}%`);
    meter.dataset.level=peak>=1?"clip":peak>=.89125?"near":"safe";
    meter.setAttribute("aria-valuenow",String(Math.max(-60,Math.min(0,Math.round(peakDb)))));
    meter.setAttribute("aria-valuetext",peak>=1?"Clipping!":`Peak ${Number.isFinite(peakDb)?peakDb.toFixed(1):"below -60"} dBFS`);
    if(peak>=1)meter.dataset.clipUntil=String(performance.now()+1200);
    if(clipText)clipText.hidden=performance.now()>=Number(meter.dataset.clipUntil||0);
  }

  function updateLiveStats() {
    if (testModeRef.current !== "open" || performance.now() - liveReadAt.current < 150) return;
    liveReadAt.current = performance.now();
    const gain = engine.current?.preamp.gain.value ?? 1;
    for (let branch = 0; branch < 2; branch++) {
      const analyser = engine.current?.analysers[branch];
      const node = document.querySelector<HTMLElement>(`[data-live-branch="${branch}"]`);
      const audio = audioRef.current;
      if (!node) continue;
      const active = !!analyser && !!audio && !audio.paused && !audio.seeking && !audio.ended;
      if (!active || !analyser) { node.querySelectorAll("[data-live]").forEach(item => { item.textContent = "—"; }); continue; }
      const samples = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(samples);
      let peak = 0, sum = 0;
      for (const value of samples) { const sample = value * gain; peak = Math.max(peak, Math.abs(sample)); sum += sample * sample; }
      const rms = Math.sqrt(sum / samples.length);
      const values = { peak: peak > 0 ? 20 * Math.log10(peak) : -Infinity, rms: rms > 0 ? 20 * Math.log10(rms) : -Infinity, crest: peak > 0 && rms > 0 ? 20 * Math.log10(peak / rms) : NaN };
      for (const [key, value] of Object.entries(values)) { const target = node.querySelector(`[data-live="${key}"]`); if (target) target.textContent = Number.isFinite(value) ? `${value.toFixed(1)} dB${key === "crest" ? "" : "FS"}` : "—"; }
    }
  }

  function drawWaveforms() {
    for (let branch = 0; branch < 2; branch++) {
      const analyser = engine.current?.analysers[branch];
      const spectrum = testModeRef.current === "open" ? analyser : engine.current?.sourceAnalyser;
      const canvas = document.querySelector<HTMLCanvasElement>(`[data-waveform="${branch}"]`);
      const pen = canvas?.getContext("2d");
      if (!canvas || !pen) continue;
      const audio = audioRef.current;
      const transportPlaying = !!audio && !audio.paused && !audio.seeking && !audio.ended;
      const active = !!spectrum && transportPlaying && sideRef.current === branch;
      canvas.closest(".card")?.classList.toggle("is-playing", active);
      const data = active ? new Uint8Array(spectrum.frequencyBinCount) : null;
      if (data) spectrum!.getByteFrequencyData(data);
      updateLevelMeter(branch, analyser, active);
      const count = 72, levels = waveLevels.current[branch];
      const masked = canvas.closest(".curve-frame")?.classList.contains("blind-masked");
      const plotStart = masked ? 0 : canvas.width * 64 / 560;
      const plotEnd = masked ? canvas.width : canvas.width * 546 / 560;
      const waveX = (index: number) => plotStart + index * (plotEnd - plotStart) / (count - 1);
      while (levels.length < 3) levels.push(new Float32Array(count));
      pen.clearRect(0, 0, canvas.width, canvas.height);
      const idlePhase = transportPlaying ? performance.now() * .002 : 0;
      for (let i = 0; i < count; i++) {
        const hz = 20 * 1000 ** (i / (count - 1));
        const bin = data ? Math.min(data.length - 1, Math.round(hz * spectrum!.fftSize / engine.current!.context.sampleRate)) : 0;
        const energy = data ? (data[bin] + data[Math.max(0, bin - 1)] + data[Math.min(data.length - 1, bin + 1)]) / (3 * 255) : 0;
        if (active) {
          const idle = .09 + .035 * Math.sin(i * .42 + branch);
          levels[0][i] += (Math.max(idle, energy) - levels[0][i]) * .22;
          levels[1][i] += (levels[0][i] - levels[1][i]) * .11;
          levels[2][i] += (levels[1][i] - levels[2][i]) * .07;
        } else {
          const low = .018 + (transportPlaying ? .008 * Math.sin(i * .42 + idlePhase + branch) : 0);
          levels[0][i] += (low - levels[0][i]) * .42;
          levels[1][i] += (low - levels[1][i]) * .36;
          levels[2][i] += (low - levels[2][i]) * .3;
        }
      }
      for (let layer = 2; layer >= 0; layer--) {
        const base = 160 - layer * 19, amplitude = active ? 72 - layer * 9 : 14 - layer * 2;
        const y = (i: number) => base - levels[layer][i] * amplitude - (active ? 3 : .7) * Math.sin(i * .32 + branch + layer * .6 + idlePhase);
        pen.beginPath(); pen.moveTo(plotStart, y(0));
        for (let i = 1; i < count; i++) {
          const lastX = waveX(i - 1), x = waveX(i);
          pen.quadraticCurveTo(lastX, y(i - 1), (lastX + x) / 2, (y(i - 1) + y(i)) / 2);
        }
        pen.lineTo(plotEnd, y(count - 1));
        const tint = branch === 0 ? "255,82,111" : "72,184,255";
        pen.strokeStyle = active ? (layer === 0 ? "rgba(255,255,255,.94)" : `rgba(${tint},${layer === 1 ? .66 : .38})`) : (layer === 0 ? "rgba(255,255,255,.27)" : `rgba(${tint},${layer === 1 ? .24 : .16})`);
        pen.lineWidth = active ? (layer === 0 ? 2.4 : 1.8) : 1;
        pen.shadowColor = `rgba(${tint},.7)`; pen.shadowBlur = active ? (layer === 0 ? 12 : 7) : 0; pen.stroke();
        pen.shadowBlur = 0; pen.lineTo(plotEnd, base + 13); pen.lineTo(plotStart, base + 13); pen.closePath();
        pen.fillStyle = `rgba(${tint},${active ? (layer === 0 ? .09 : .045) : .008})`; pen.fill();
      }
    }
    updateLiveStats();
    waveFrame.current = requestAnimationFrame(drawWaveforms);
  }

  function setupEngine() {
    if (engine.current || !audioRef.current) return;
    const context = new AudioContext();
    const source = context.createMediaElementSource(audioRef.current);
    const sourceAnalyser = context.createAnalyser(); sourceAnalyser.fftSize = 2048; sourceAnalyser.smoothingTimeConstant = .8; source.connect(sourceAnalyser);
    const dynamicInput = context.createGain(); sourceAnalyser.connect(dynamicInput);
    const filters: BiquadFilterNode[][] = [[], []], balanceConvolvers: ConvolverNode[] = [], analysers: AnalyserNode[] = [], gates: GainNode[] = [];
    const preamp = context.createGain(), transitionGain = context.createGain(); preamp.connect(transitionGain); transitionGain.connect(context.destination);
    const splitter = context.createChannelSplitter(2), merger = context.createChannelMerger(2);
    dynamicInput.connect(splitter);
    for (let channel = 0; channel < 2; channel++) {
      const convolver = context.createConvolver(); convolver.normalize = false;
      const unity = context.createBuffer(1, 1, context.sampleRate); unity.getChannelData(0)[0] = 1; convolver.buffer = unity;
      splitter.connect(convolver, channel, 0); convolver.connect(merger, 0, channel); balanceConvolvers[channel] = convolver;
    }
    for (let branch = 0; branch < 2; branch++) {
      let node: AudioNode = merger;
      for (let i = 0; i < 10; i++) {
        const filter = context.createBiquadFilter(); filter.type = "peaking"; filter.frequency.value = 1000; filter.Q.value = 1;
        node.connect(filter); node = filter; filters[branch].push(filter);
      }
      const analyser = context.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = .8; node.connect(analyser); analysers.push(analyser);
      const gate = context.createGain(); gate.gain.value = branch === sideRef.current ? 1 : 0; analyser.connect(gate); gate.connect(preamp); gates.push(gate);
    }
    engine.current = { context, sourceAnalyser, dynamics: null, filters, balanceConvolvers, balanceBoostDb: 0, analysers, gates, preamp, transitionGain };
    if (context.audioWorklet) {
      void context.audioWorklet.addModule("/dynamic-range-worklet.js").then(() => {
        if (engine.current?.context !== context) return;
        const dynamics = new AudioWorkletNode(context, "target-dynamic-range", { outputChannelCount: [2] });
        dynamics.port.postMessage({ amount: dynamicRangeRef.current });
        dynamics.port.onmessage = event => { if (engine.current?.dynamics === dynamics && event.data?.type === "dynamics") { setDynamicReduction(Math.max(0, Number(event.data.reductionDb) || 0)); setDynamicOutputGain(Number(event.data.netGainDb) || 0); } };
        dynamics.onprocessorerror = () => {
          if (engine.current?.dynamics !== dynamics) return;
          dynamics.disconnect(); sourceAnalyser.connect(dynamicInput); engine.current.dynamics = null;
          setDynamicRangeUnavailable(true); setDynamicSliderEnabled(false); updateDynamicRange(0);
        };
        dynamics.connect(dynamicInput);
        sourceAnalyser.connect(dynamics);
        sourceAnalyser.disconnect(dynamicInput);
        engine.current.dynamics = dynamics;
      }).catch(() => { setDynamicRangeUnavailable(true); setDynamicSliderEnabled(false); updateDynamicRange(0); });
    } else { setDynamicRangeUnavailable(true); setDynamicSliderEnabled(false); updateDynamicRange(0); }
    applyFit();
  }
  async function stereoFile(next: File) {
    const context = new AudioContext();
    try { const buffer = await context.decodeAudioData(await next.arrayBuffer()); return buffer.numberOfChannels === 2; }
    catch { return false; }
    finally { await context.close(); }
  }
  function startPlayback(fadeIn = false) {
    if(beforePlayback&&!beforePlayback())return;
    const audio = audioRef.current;
    if (!audio) return;
    try {
      setupEngine();
      applyFit();
      const current = engine.current!;
      const gain = current.transitionGain.gain;
      gain.cancelScheduledValues(current.context.currentTime);
      gain.setValueAtTime(fadeIn ? 0 : 1, current.context.currentTime);
      if (fadeIn) gain.linearRampToValueAtTime(1, current.context.currentTime + .18);
      void Promise.all([current.context.resume(), mediaRecovery.current?.retry() ? Promise.resolve() : audio.play()]).then(() => setSourceError("")).catch(() => setSourceError("Playback could not start. Check the selected track and browser audio permissions."));
    } catch { setSourceError("Could not initialize audio playback."); }
  }
  function processFileData(next: File, sourceSerial: number, hashSerial: number) {
    void next.slice(0, 65536).arrayBuffer().then(header => {
      if (sourceSerial !== sourceSerialRef.current) return;
      const format = (next.name.split(".").pop() || next.type || "unknown").toUpperCase();
      const details = sourceDetails(header, format);
      setBitrateDetails(details);
      setMeta(old => ({ ...old, sampleRate: details.sampleRate ?? old.sampleRate, bitrate: details.bitrate ?? old.bitrate }));
    }).catch(() => {});
    void analyzeTrack(next).then(result => {
      if (sourceSerial !== sourceSerialRef.current) return;
      setAnalysis(result);
      // Pool files already have native-source R128 measurements. Browser estimates
      // are descriptive and must not replace those values for normalization.
      if (sourceKindRef.current !== "curated") measuredLufsRef.current = result.integratedLufs;
      setLoudnessStatus(`Estimated ${result.integratedLufs.toFixed(1)} LUFS`);
      applyFit();
    }).catch(error => {
      if (sourceSerial !== sourceSerialRef.current) return;
      setAnalysis(null);
      if (error instanceof Error && error.message === "Stereo audio required.") {
        audioRef.current?.pause();
        setSourceError("Choose a decodable two-channel stereo audio file.");
      } else setLoudnessStatus("Audio analysis unavailable for this track; playback is unadjusted.");
    });
    setHashing(true);
    void (async () => {
      try {
        if (next.size > 300_000_000) throw new Error("File exceeds the 300 MB hashing limit.");
        const digest = await crypto.subtle.digest("SHA-256", await next.arrayBuffer());
        const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
        if (hashSerial === hashSerialRef.current) setMeta(old => ({ ...old, sha256: hash }));
      } catch { if (hashSerial === hashSerialRef.current) setMeta(old => ({ ...old, sha256: null })); }
      finally { if (hashSerial === hashSerialRef.current) setHashing(false); }
    })();
  }
  async function chooseRandomSample(choice = sampleChoice, autoPlay = false): Promise<boolean> {
    if(autoPlay&&beforePlayback&&!beforePlayback())return false;
    if (testModeRef.current === "blind" || (choice === "random" && !samplesRef.current.length)) {
      const mode = testModeRef.current;
      const serial = ++curatedFetchRef.current;
      const sourceSerial = ++sourceSerialRef.current;
      const hashSerial = ++hashSerialRef.current;
      const excluded = new Set(excludedRecordingIdsRef.current);
      const included = includedRecordingIdsRef.current === undefined ? null : new Set(includedRecordingIdsRef.current);
      curatedQueueRef.current = curatedQueueRef.current.filter(index => !excluded.has(curatedMusic[index].url) && (!included || included.has(curatedMusic[index].url)));
      if (!curatedQueueRef.current.length) {
        // The sampler receives no ratings and never waits on the voting service.
        const eligible = curatedMusic.filter(track => !excluded.has(track.url) && (!included || included.has(track.url)));
        if (!eligible.length) { setSourceError("No eligible recording is available. Select a song or playlist; finalist checks need a different song family."); return false; }
        const queue = musicRotation(eligible).map(track => curatedMusic.indexOf(track));
        if (queue.length > 1 && queue[queue.length - 1] === curatedIndexRef.current) [queue[0], queue[queue.length - 1]] = [queue[queue.length - 1], queue[0]];
        curatedQueueRef.current = queue;
      }
      const index = curatedQueueRef.current.pop()!;
      const track = curatedMusic[index];
      if(testModeRef.current==="open")setOpenMusicSource("pool");
      sourceKindRef.current = "curated";
      candidateUrlRef.current = track.url;
      setCandidateUrl(track.url);
      setMusicVoteMessage("");
      const format = track.filename.split(".").pop()!.toUpperCase();
      const streamUrl = track.fileUrl;
      const mime = ({ FLAC: "audio/flac", WAV: "audio/wav", M4A: "audio/mp4", AAC: "audio/aac", OGG: "audio/ogg", MP3: "audio/mpeg" } as Record<string,string>)[format] || "application/octet-stream";
      audioRef.current?.pause();
      if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; }
      updateDynamicRange(0);
      setDynamicSliderEnabled(false);
      resetHeard();
      setSourceError("");
      setAnalysis(null);
      setCuratedPreview(curatedWaveform(track.fileUrl));
      setWaveformZoom(1);
      setPosition(0);
      setDuration(track.duration);
      setHashing(false);
      measuredLufsRef.current = track.integrated_lufs;
      setLoudnessStatus(`Listening pool · ${track.integrated_lufs.toFixed(1)} LUFS measured`);
      setBitrateDetails({});
      setMeta({ songTitle: track.title, songArtist: track.artist, songAlbum: track.album, recordingId: track.url, sha256: track.sha256 ?? null, audioFormat: format, sampleRate: null, bitrate: track.bitrate_kbps ? track.bitrate_kbps * 1000 : null, duration: track.duration });
      setFile(new File([], track.filename, { type: mime }));
      if (audioRef.current) { audioRef.current.src = streamUrl; audioRef.current.load(); }
      curatedIndexRef.current = index;
      setSampleStatus(`${musicDisplayTitle(track.title)} · ${track.versionLabel || "original recording"}`);
      if (autoPlay) startPlayback(true);
      // Long recordings keep streaming from native source measurements and peaks.
      // Decoding a 40-minute file into PCM can exhaust mobile browser memory.
      if (track.duration > 600) {
        // Read only a bounded header; never decode long recordings into PCM.
        void fetch(streamUrl,{headers:{Range:"bytes=0-65535"}}).then(async response=>{
          if(response.status!==206){await response.body?.cancel();return;}
          const details=sourceDetails(await response.arrayBuffer(),format);
          if(serial===curatedFetchRef.current){setBitrateDetails(details);setMeta(old=>({...old,sampleRate:details.sampleRate??old.sampleRate,bitrate:old.bitrate??details.bitrate??null}));}
        }).catch(()=>{});
        return true;
      }
      // Playback uses the streaming URL. Analysis and fingerprinting can finish later.
      window.setTimeout(() => {
        if (serial !== curatedFetchRef.current || testModeRef.current !== mode) return;
        void fetch(track.fileUrl).then(response => {
          if (!response.ok) throw new Error(`Audio source returned ${response.status}`);
          return response.blob();
        }).then(blob => {
          if (serial !== curatedFetchRef.current || testModeRef.current !== mode) return;
          const source = new File([blob], track.filename, { type: mime });
          setFile(source);
          processFileData(source, sourceSerial, hashSerial);
        }).catch(() => {
          if (serial === curatedFetchRef.current) setLoudnessStatus("Audio analysis unavailable for this track; playback continues.");
        });
      }, 800);
      return true;
    }
    const samples = samplesRef.current;
    if (!samples.length) return false;
    let index = choice === "random" ? Math.floor(Math.random() * samples.length) : Number(choice);
    if (!Number.isInteger(index) || index < 0 || index >= samples.length) index = Math.floor(Math.random() * samples.length);
    if (choice === "random" && samples.length > 1 && index === sampleIndexRef.current) index = (index + 1) % samples.length;
    sampleIndexRef.current = index;
    chooseFile(samples[index], true, true, undefined, autoPlay);
    setSampleStatus(`${choice === "random" ? "Random" : "Selected"} sample ${index + 1}/${samples.length}: ${samples[index].name}`);
    return true;
  }
  async function chooseFolder(files: FileList | null) {
    if (!files) return;
    const extensions = /\.(mp3|wav|flac|m4a|aac|acc|ogg|oga|opus|webm|aif|aiff|alac|wma|caf|mka|mp4)$/i;
    const candidates = Array.from(files).filter(item => extensions.test(item.name) && item.webkitRelativePath.split("/").length === 2);
    setSampleStatus(`Checking ${candidates.length} root-level audio files for stereo…`);
    const stereo: File[] = [];
    for (const [index, item] of candidates.entries()) {
      setSampleStatus(`Checking stereo audio ${index + 1}/${candidates.length}…`);
      if (await stereoFile(item)) stereo.push(item);
    }
    samplesRef.current = stereo;
    setSamples(stereo);
    sampleIndexRef.current = -1;
    setSampleChoice("random");
    if (!stereo.length) { setSampleStatus("No decodable two-channel stereo files found directly in this folder."); return; }
    setSampleStatus(`${stereo.length} stereo songs ready from this folder.`);
    if (testMode === "blind") await chooseRandomSample("random");
  }
  function chooseFile(next: File | null, knownStereo = false, sample = false, curated?: SongSuggestion, autoPlay = false) {
    if (!next || !audioRef.current) return;
    curatedFetchRef.current++; // Cancel pending pool downloads before accepting a local file.
    if(testModeRef.current==="open")setOpenMusicSource("own");
    sourceKindRef.current = "uploaded";
    candidateUrlRef.current = null;
    setCandidateUrl(null);
    setMusicVoteMessage("");
    const sourceSerial = ++sourceSerialRef.current;
    const hashSerial = ++hashSerialRef.current;
    void knownStereo; void sample;
    audioRef.current.pause();
    updateDynamicRange(0);
    setDynamicSliderEnabled(false);
    resetHeard();
    setSourceError("");
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const format = (next.name.split(".").pop() || next.type || "unknown").toUpperCase();
    const matched = curated ?? matchSongSuggestion(next.name, suggestions);
    setBitrateDetails({});
    setMeta({ songTitle: matched?.title ?? "", songArtist: matched?.artist ?? "", songAlbum: matched?.album ?? "", recordingId: matched?.recordingId ?? "", sha256: null, audioFormat: format, sampleRate: null, bitrate: null, duration: null });
    measuredLufsRef.current = null;
    setLoudnessStatus("Analyzing track…");
    setAnalysis(null);
    setCuratedPreview(null);
    setWaveformZoom(1);
    setPosition(0);
    setDuration(0);setPassageOverride(null);setWaveformFocus(null);
    setFile(next);
    urlRef.current = URL.createObjectURL(next);
    audioRef.current.src = urlRef.current;
    audioRef.current.load();
    if (autoPlay) startPlayback(true);
    processFileData(next, sourceSerial, hashSerial);
  }
  function selectSide(next: 0 | 1) {
    closeInterval(); sideRef.current = next;
    setSide(next); onSideChange(next);
    const current = engine.current;
    current?.gates.forEach((gate, i) => gate.gain.setTargetAtTime(i === next ? 1 : 0, current.context.currentTime, .02));
    void current?.context.resume();
    startInterval();
  }
  const songDetails = <details className="music-details"><summary>Song details</summary>{meta.songTitle ? <dl className="song-metadata"><div><dt>Title</dt><dd>{meta.songTitle}</dd></div><div><dt>Artist</dt><dd>{meta.songArtist || "—"}</dd></div><div><dt>Album</dt><dd>{meta.songAlbum || "—"}</dd></div><div><dt>Recording ID / ISRC</dt><dd>{meta.recordingId || "—"}</dd></div></dl> : <p className="metadata-match">{file ? "No matching song in the website database." : "Choose a track to look for saved song metadata."}</p>}</details>;
  const passageControls = pair && onPassagePlay && <div className={`passage-controls ${passageRun ? "running" : ""}`}>
      
      <span className={`passage-times${passage?"":" is-empty"}`}>{passage ? personalOnly?`${preciseClock(passage.start)} – ${preciseClock(passage.end)} · ${(passage.end-passage.start).toFixed(2)}s`:`${clock(passage.start)} – ${clock(passage.end)}` : "No segment selected"}</span>
      <span className={`passage-copy ${passageRun ? `side-${side ? "b" : "a"}` : ""}`} role="status">{comparisonComplete ? "Saved" : passageRun ? `${side ? "B" : "A"} · ${passageRun.step + 1}/2` : passageDone ? "Ready to vote" : passage ? personalOnly?"Move grip to shift · edges resize · minimum 5s":"Drag the five-second window" : "Choose a track"}</span>
      <button type="button" className="passage-new" aria-label="Shuffle passage" title={`Explore new sections before repeating; favor active audio. History lasts for this page visit. ${shuffleStatus}`} disabled={!passage || duration <= 5.1 || !!passageRun || comparisonComplete} onClick={shufflePassage}><Shuffle size={14} aria-hidden="true"/><span>Shuffle passage</span></button>
    <span className="passage-shuffle-status" role="status">{shuffleStatus}</span>
    <button type="button" className="passage-play" disabled={comparisonComplete || !passage} onClick={() => { if (passageRun) { cancelPassage(); audioRef.current?.pause(); } else onPassagePlay(); }}>{passageRun ? <Square size={15} fill="currentColor" aria-hidden="true"/> : <Play size={15} fill="currentColor" aria-hidden="true"/>}{passageRun ? "Stop comparison" : "Play both targets"}</button></div>;
  return <section className="music-panel alpha-audio-deck" data-mode={testMode} data-passage-external={!!passageControlsHostId} aria-keyshortcuts="Space 1 2 S A B ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight">

    <div className={`playback-transport ${isPlaying ? "is-playing" : ""}`} role="group" aria-label="Music playback controls">{testMode === "open" && <div className="playback-dynamics"><button type="button" className="deck-dynamics-toggle" aria-label="Toggle Dynamic Range Compression/Expansion slider" aria-pressed={dynamicSliderEnabled} title="Toggle Dynamic Range Compression/Expansion slider. Hover over center line of playback waveform." disabled={!duration || dynamicRangeUnavailable} onClick={() => setDynamicSliderEnabled(value => !value)}><MoveVertical size={19} strokeWidth={2.4} aria-hidden="true" /><span className="deck-dynamics-label">Dynamics</span></button><button type="button" className="deck-dynamics-reset" aria-label="Reset track dynamics" title="Reset track dynamics" disabled={dynamicRangeUnavailable || Math.abs(dynamicRange) < .0001} onClick={() => updateDynamicRange(0)}><RotateCcw size={19} strokeWidth={2.4} aria-hidden="true" /></button></div>}<button type="button" className="deck-play" aria-keyshortcuts="Space" aria-label={isPlaying ? "Pause music" : "Play music"} onClick={() => { cancelPassage(); const audio=audioRef.current; if(!audio) return; if(audio.paused&&beforePlayback&&!beforePlayback())return; if(!file){if(testModeRef.current === "bring") setSourceError("Choose your own stereo song to play.");else void chooseRandomSample("random",true);return;} if(audio.paused) { try { setupEngine(); applyFit(); void Promise.all([engine.current!.context.resume(), audio.play()]).then(() => setSourceError("")).catch(() => setSourceError("Playback could not start. Check the selected track and browser audio permissions.")); } catch { setSourceError("Could not initialize audio playback."); } } else audio.pause(); }}><span className="deck-play-label">{isPlaying ? "Pause" : "Play"}</span></button><div className="playback-secondary"><div className="waveform-zoom" role="group" aria-label="Waveform zoom"><button type="button" aria-label="Zoom waveform out" disabled={waveformZoom === 1 || !(curatedPreview ?? analysis)} onClick={() => setWaveformZoom(value => Math.max(1, value / 2))}>−</button><span>{waveformZoom}×</span><button type="button" aria-label="Zoom waveform in" disabled={waveformZoom === (personalOnly?256:8) || !(curatedPreview ?? analysis)} onClick={() => setWaveformZoom(value => Math.min(personalOnly?256:8, value * 2))}>+</button></div><>{personalOnly&&passage&&<button type="button" className="passage-focus" title="Zoom around the selected passage without moving playback" aria-label="Focus Passage" onClick={()=>{setWaveformFocus((passage.start+passage.end)/2);setWaveformZoom(Math.min(256,Math.max(1,2**Math.ceil(Math.log2(duration/Math.max(10,(passage.end-passage.start)*3))))));}}>Focus</button>}</><div className={`volume-control ${volumeOpen ? "open" : ""}`}><button type="button" className="deck-volume-toggle" aria-label={volume === 0 ? "Volume muted; show volume control" : "Show volume control"} aria-expanded={volumeOpen} onClick={() => setVolumeOpen(value => !value)}>{volume === 0 ? <VolumeX size={20} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}</button></div></div><span className="playback-time"><span>{clock(position)}</span><span aria-hidden="true">/</span><span>{clock(duration)}</span></span><label className="playback-volume-row" hidden={!volumeOpen}><span>Volume</span><input className="deck-volume" type="range" min={0} max={1} step={0.01} value={volume} aria-label="Volume" onChange={e => {const value=Number(e.target.value);if(audioRef.current)audioRef.current.volume=value;setVolume(value);}} /><output aria-hidden="true">{Math.round(volume * 100)}%</output></label></div><div className={`player-row ${isPlaying ? "is-playing" : ""}`}><TrackWaveform resizablePassage={personalOnly} viewCenter={personalOnly?waveformFocus:null} maxZoom={personalOnly?256:8} compact hideZoom zoom={waveformZoom} onZoom={setWaveformZoom} analysis={curatedPreview ?? analysis} placeholder={file ? (loudnessStatus.startsWith("Audio analysis unavailable") ? "Waveform unavailable" : "Analyzing source waveform…") : "Choose a stereo track to view its waveform"} position={position} duration={duration} passage={pair ? passage : null} passageActive={!!passageRun} onPassageChange={comparisonComplete ? undefined : next => { cancelPassage(); audioRef.current?.pause(); closeInterval(); setPassageDone(false); setPassageOverride(next); }} onSeek={seconds => { cancelPassage(); closeInterval(); if (audioRef.current) audioRef.current.currentTime = seconds; setPosition(seconds);if(personalOnly)setWaveformFocus(seconds); }} dynamicRange={dynamicRange} onDynamicRangeChange={updateDynamicRange} dynamicSliderEnabled={testMode === "open" && dynamicSliderEnabled} dynamicRangeDisabled={dynamicRangeUnavailable} /><audio ref={audioRef} crossOrigin="anonymous" preload="auto" onPlay={() => {setupEngine();applyFit();void engine.current?.context.resume();onPlaybackChange?.(true);}} onPlaying={() => {startInterval();setIsPlaying(true);onPlaybackChange?.(true);}} onPause={() => {if(passageRunRef.current && !passageRunRef.current.transitioning && audioRef.current?.paused) cancelPassage(); closeInterval();setIsPlaying(false);onPlaybackChange?.(false);}} onWaiting={() => {closeInterval();setIsPlaying(false);onPlaybackChange?.(false);}} onTimeUpdate={() => {if(!audioRef.current?.seeking)lastPlaybackPosition.current=audioRef.current?.currentTime??0;setPosition(audioRef.current?.currentTime ?? 0);}} onSeeking={() => {closeInterval(lastPlaybackPosition.current);setIsPlaying(false);onPlaybackChange?.(false);}} onSeeked={() => {startInterval();const playing=!!audioRef.current && !audioRef.current.paused;setIsPlaying(playing);onPlaybackChange?.(playing);}} onEnded={() => {closeInterval();setIsPlaying(false);onPlaybackChange?.(false);if(passageRunRef.current) void completePassageSide();}} onError={() => { cancelPassage(); if (!mediaRecovery.current?.handleError()) setSourceError(audioRef.current?.error?.code === 2 ? "The audio connection was interrupted. Press Play to try again." : "This browser could not play the selected audio format."); }} onLoadedMetadata={() => { const seconds = audioRef.current?.duration; const valid = seconds && Number.isFinite(seconds) ? seconds : null; setDuration(valid ?? 0);setPosition(0);setMeta(old => ({ ...old, duration: valid, bitrate: old.bitrate ?? (valid && file ? Math.round(file.size * 8 / valid) : null) })); }} /></div>

    <p className="alpha-playback-shortcuts"><kbd>Space</kbd> play / pause <span>·</span> <kbd>1</kbd> A / <kbd>2</kbd> B <span>·</span> <kbd>S</kbd> switch <span>·</span> <kbd>←</kbd> / <kbd>→</kbd> seek 0.25s <span>·</span> <kbd>Shift</kbd> + arrow seek 1s</p>
    {choiceControls}<div className="playback-topbar">
      <div className="music-header">
        <div className="alpha-track-heading">
          <span className="mini-label">NOW PLAYING</span>
          <div className="playback-title-line"><h2>{musicDisplayTitle(meta.songTitle || selectedPoolTrack?.title || file?.name || "Choose music")}</h2></div>
          <p className="alpha-track-artist">{meta.songArtist || selectedPoolTrack?.artist || (file ? "Artist unavailable" : "Select from the Listening Pool or use your own music")}</p>
        </div>
        <span className="count-pill">A/B TONAL PREVIEW</span>{dynamicsAdjusted && analysis && <div className="dynamics-status" aria-live="off"><span className={`dynamics-preview-key ${dynamicsExpanding ? "expanding" : ""}`}>{dynamicsExpanding ? "Red beyond blue" : "Blue compressed"} <span>· {dynamicsExpanding ? "scaled source" : "gray source"}</span><b> · peak spread {spreadChange >= 0 ? "+" : ""}{spreadChange.toFixed(1)} dB</b></span><span className="dynamics-meter">{dynamicReduction === null || dynamicOutputGain === null ? "Waiting for audio processor…" : `${dynamicsExpanding ? "Quiet" : "Peak"} reduction ${dynamicReduction.toFixed(1)} dB · Net gain ${dynamicOutputGain >= 0 ? "+" : ""}${dynamicOutputGain.toFixed(1)} dB`}</span></div>}
      </div>
    <div className="alpha-source-strip" aria-label="Selected audio source specifications"><span>{file ? meta.audioFormat || "Audio" : "Stereo audio"}</span><span>{meta.sampleRate ? `${Math.round(meta.sampleRate / 100) / 10} kHz` : "Source rate —"}</span><span>{file ? sourceBitrateLabel(bitrateDetails, meta.bitrate, file, duration, sourceKindRef.current === "curated") : "No track loaded"}</span><span>{file ? displayedLoudness : "Files stay on your device"}</span><span className="waveform-source-caption">L / R · pre-EQ · click to seek</span></div>
    {personalOnly&&sourceControls&&<div className="personal-playback-source">{sourceControls}</div>}
    {(!personalOnly || testMode === "bring") && <div className="source-controls">{!personalOnly&&sourceControls}<div className="sample-row" hidden={testMode === "bring" || personalOnly}><p className="music-meta">{sourceKindRef.current === "curated" && candidateUrl && <><span className="pool-community-rank" title="Current community Upvote/Downvote standings, using the same ranking as the Listening Pool page. Unrated recordings have no position.">Listening Pool · {poolRankText}</span><span className="pool-song-separator"> — </span></>}{sampleStatus}</p>{testMode === "open" && <label className="sample-choice playback-source-choice"><span>Music Source</span><select aria-label="Playback music source" value={openMusicSource} onChange={event=>changeOpenMusicSource(event.target.value as "pool"|"own")}><option value="pool">Listening Pool</option><option value="own">Use Your Music</option></select></label>}{testMode==="open"&&openMusicSource==="own"&&samples.length>0&&<label className="sample-choice"><span>Folder song</span><select aria-label="Choose song from your folder" value={sampleChoice} onChange={event=>{setSampleChoice(event.target.value);void chooseRandomSample(event.target.value);}}><option value="random">Random song from folder</option>{samples.map((sample,index)=><option key={`${sample.name}-${index}`} value={String(index)}>{sample.name}</option>)}</select></label>}</div>
    {(testMode === "bring" || testMode === "open" && openMusicSource==="own") && <div className="music-source-row">{testMode === "open" && openMusicSource==="own" && <label className="sample-folder" title="Choose Music folder"><input type="file" multiple ref={node => { if (node) node.setAttribute("webkitdirectory", ""); }} onChange={e => void chooseFolder(e.target.files)} /><FolderOpen size={20} aria-hidden="true" /><span className="picker-label">Choose folder</span></label>}<label className="music-upload" title={file?.name ? `Audio file: ${file.name}` : "Choose audio file"}><input type="file" accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.acc,.ogg,.oga,.opus,.webm,.aif,.aiff,.alac,.wma,.caf,.mka,.mp4" onChange={e => void chooseFile(e.target.files?.[0] ?? null)} /><FileMusic size={20} aria-hidden="true" /><span className="file-label-text">{file?.name ?? (testMode==="open"?"Choose song":"Choose a real stereo song")}</span></label></div>}</div>}{sourceError && <p className="music-meta" role="alert">{sourceError}</p>}
    {passageControlsHostId ? (passageHost ? createPortal(passageControls, passageHost) : null) : passageControls}</div>
    <details className="playback-privacy music-details"><summary><span>{personalOnly ? "Personal results save locally. Sharing and Sync follow your choices." : "Your audio stays in this browser. Song detail sharing is optional."}</span><span className="playback-privacy-label">Playback privacy</span></summary><p>{personalOnly ? "Personal tournament playback. Your target choices and recording references are saved locally, outside public rankings. Future choices are shared only through the private-research or Community Preferences options you explicitly enable. Neither changes Research Rankings. Explicit browser Sync transfers saved progress only when you choose it." : "Audio from your device stays in this browser. Blind votes support public rankings, and approved-target comparisons or descriptions can enter private owner research. Listening segments are saved for every completed comparison. Song tags and file details from music you choose on your device are shared only if you opt in below; audio bytes are never uploaded."}</p></details>
    {<div className="shootout-music-vote" role="group" aria-label="Music selection preference">
      {personalOnly&&candidateUrl&&<span className="pool-community-rank">Listening Pool · {poolRankText}</span>}{adminTestOnly&&<span className="admin-test-inline">Private test ratings · local only</span>}<span className="music-vote-question" title={candidateUrl ? `${meta.songTitle} · Rate the music selection for future tournaments, separately from target preference.` : "Listening pool votes apply to known candidate recordings."}>Like this selection?</span>
      {file && sourceKindRef.current === "uploaded" && <select aria-label="Match uploaded recording to a Listening pool candidate" title="Only select an entry if your file is the same recording. This connects its Upvote/Downvote vote to the library." value={candidateUrl ?? ""} onChange={event => { setCandidateUrl(event.target.value || null); setMusicVoteMessage(""); }}><option value="">Match library recording…</option>{musicCandidates.map(track => <option key={track.url} value={track.url}>{track.artist} · {track.title}{track.versionLabel ? ` · ${track.versionLabel}` : ""}</option>)}</select>}
      <button type="button" disabled={!candidateUrl || !musicVotesReady || !musicSignedIn || musicSaving} aria-pressed={!!candidateUrl && musicChoices[candidateUrl] === "keep"} onClick={() => void voteForMusic("keep")}>Upvote</button><button type="button" disabled={!candidateUrl || !musicVotesReady || !musicSignedIn || musicSaving} aria-pressed={!!candidateUrl && musicChoices[candidateUrl] === "pass"} onClick={() => void voteForMusic("pass")}>Downvote</button>{candidateUrl && musicChoices[candidateUrl] && <button type="button" className="music-vote-undo" disabled={musicSaving} onClick={() => void voteForMusic(null)}>Undo</button>}<a href="/music-library">Explore Listening Pool</a><span className="music-vote-state" role="status">{!candidateUrl ? file ? "Match this file to a pool recording to vote." : "Choose a pool recording to vote." : musicVoteMessage || (musicSaving ? "Saving…" : !musicVotesReady ? "Music votes unavailable" : !musicSignedIn ? "Sign in to vote" : musicChoices[candidateUrl] ? `Saved: ${musicChoices[candidateUrl] === "keep" ? "Upvote" : "Downvote"}` : personalOnly ? "" : "For future tournaments")}</span><span className="music-vote-explanation">{adminTestOnly?"Private test ratings stay in this browser and never affect community rankings or random music selection.":personalOnly?"Song ratings update the Listening Pool ranking, not target rankings or random selection.":"Music votes update the shared Listening Pool ranking across tournaments. They do not affect target-curve rankings or random music selection."}</span>
    </div>}
    {personalOnly ? <div className="personal-track-details">{songDetails}<details className="music-details"><summary>File fingerprint &amp; processing</summary><p className="music-meta">A file fingerprint identifies exact file bytes. It is not an audio download or an account credential.</p><p className="music-meta">{file ? `${displayedLoudness} · ${hashing ? "hashing locally…" : meta.sha256 ? `File fingerprint (SHA-256) ${meta.sha256.slice(0, 12)}…` : "hash unavailable"} · ${meta.audioFormat} · ${meta.sampleRate ? `${Math.round(meta.sampleRate / 100) / 10} kHz source rate` : "source sample rate not read"} · ${sourceBitrateLabel(bitrateDetails, meta.bitrate, file, duration, sourceKindRef.current === "curated")}` : "Choose a stereo sample, then click A or B."}</p></details></div> : songDetails}
    {testMode === "open" && <details className="audio-stats"><summary>Audio stats · original file</summary>{analysis ? <><div className="audio-stats-grid">
      <span>Integrated loudness <strong>{analysis.integratedLufs.toFixed(1)} LUFS <small>estimated</small></strong></span>
      <span>3-second level spread <strong>{analysis.loudnessSpreadDb === null ? "—" : `${analysis.loudnessSpreadDb.toFixed(1)} dB`}</strong></span>
      <span>Sample peak <strong>{Number.isFinite(analysis.samplePeakDbfs) ? `${analysis.samplePeakDbfs.toFixed(1)} dBFS` : "—"}</strong></span>
      <span>Crest factor <strong>{Number.isFinite(analysis.crestDb) ? `${analysis.crestDb.toFixed(1)} dB` : "—"}</strong></span>
      <span>Stereo correlation <strong>{analysis.stereoCorrelation.toFixed(2)}</strong></span>
      <span>Side / mid level <strong>{Number.isFinite(analysis.sideMidDb) ? `${analysis.sideMidDb.toFixed(1)} dB` : "—"}</strong></span>
      <span>L / R balance <strong>{Number.isFinite(analysis.channelBalanceDb) ? `${analysis.channelBalanceDb.toFixed(1)} dB` : "—"}</strong></span>
      <span>Near-full-scale samples <strong>{analysis.clippedSamples.toLocaleString()}</strong></span>
    </div><p>Measured before EQ or volume matching. The 3-second spread is a descriptive estimate, not certified EBU loudness range. Near-full-scale samples do not by themselves prove audible clipping.</p></> : <p>Choose a stereo track to analyze it locally.</p>}</details>}
    {testMode === "open" && <details className="live-audio-stats audio-diagnostics" aria-label="After-EQ level diagnostics"><summary>After-EQ levels <span>Optional · computed A/B signals</span></summary><p>Both EQ paths are calculated at the current playhead before sample selection. Only the sample marked Playing is audible. These internal mixed-channel estimates include EQ and volume-matching gain; they do not measure your headphones or loudness at your ears.</p><div className="live-stats-grid">{[0, 1].map(branch => <div key={branch} data-live-branch={branch} data-live-audible={isPlaying && side === branch}><strong>Sample {branch ? "B" : "A"}<small className="live-branch-state">{!file ? "No track" : !isPlaying ? "Paused" : side === branch ? "Playing" : "Muted"}</small></strong><span>Peak <b data-live="peak">—</b></span><span>RMS <b data-live="rms">—</b></span><span>Crest <b data-live="crest">—</b></span></div>)}</div></details>}
    {!personalOnly && testMode !== "blind" && <button type="button" className="music-data-settings" onClick={onDataSettings}>Song detail sharing {consent ? "on" : "off"} · Data settings</button>}
    {!personalOnly && <details className="music-details file-identity"><summary>File fingerprint &amp; processing</summary><p className="music-meta">{file ? `${displayedLoudness} · ${hashing ? "hashing locally…" : meta.sha256 ? `File fingerprint (SHA-256) ${meta.sha256.slice(0, 12)}…` : "hash unavailable"} · ${meta.audioFormat} · ${meta.sampleRate ? `${Math.round(meta.sampleRate / 100) / 10} kHz source rate` : "source sample rate not read"} · ${sourceBitrateLabel(bitrateDetails, meta.bitrate, file, duration, sourceKindRef.current === "curated")}` : "Choose a stereo sample, then click A or B."}</p></details>}
  </section>;
});

export default MusicPanel;
