import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Trophy } from "lucide-react";
import {
  EAR_PRACTICE_CONSENT, EAR_PRACTICE_RANGE, EAR_PRACTICE_MAX_STAGE, EAR_PRACTICE_STAGES,
  EAR_PRACTICE_SWEEP_SECONDS, earPracticeFrequencyMatches, type EarPracticeGuess, type EarPracticeSet,
} from "@/lib/ear-practice-ranking";
import { safeGain } from "@/lib/eq-playback";
import FrequencyNavigator from "./frequency-navigator";
import PeakDipIcon from "./peak-dip-icon";
import { PracticeFeedback } from "./practice-feedback";
import PracticeReveal from "./practice-reveal";
import PracticeVolume, { DEFAULT_PRACTICE_VOLUME, MAX_PRACTICE_VOLUME, usePracticeVolume } from "./practice-volume";
import { useEarPlaybackKeys } from "./playback-keys";

type Profile = { canPublish: boolean; username: string | null; revision: number; needsConsent: boolean; set: EarPracticeSet | null };
type Side = "reference" | "mystery";
type Voice = { source: AudioBufferSourceNode; reference: GainNode; mystery: GainNode; started: number; offset: number };
type Props = {
  detailsRef: RefObject<HTMLDetailsElement | null>;
  stopRef: RefObject<(() => void) | null>;
  requestListening: (action: () => void) => void;
  onBeforePractice: () => void;
};
const api = "/api/ear-practice";
const lowHz = EAR_PRACTICE_RANGE.from;
const ratio = EAR_PRACTICE_RANGE.to / lowHz;
const level = (volume: number) => .65 * Math.min(MAX_PRACTICE_VOLUME, Math.max(0, volume));
const timeAt = (hz: number) => EAR_PRACTICE_SWEEP_SECONDS * Math.log(hz / lowHz) / Math.log(ratio);
const frequencyAt = (time: number) => Math.round(lowHz * ratio ** Math.min(1, Math.max(0, time / EAR_PRACTICE_SWEEP_SECONDS)));
const prettyHz = (hz: number) => hz.toLocaleString("en-US") + " Hz";

async function responseJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw Error(body.error || "Ranked practice is temporarily unavailable.");
  return body;
}

export default function RankedPractice({ detailsRef, stopRef, requestListening, onBeforePractice }: Props) {
  const [volume, setVolume] = usePracticeVolume();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [set, setSet] = useState<EarPracticeSet | null>(null);
  const [username, setUsername] = useState("");
  const [guesses, setGuesses] = useState<EarPracticeGuess[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState("");
  const [side, setSide] = useState<Side>("reference");
  const [heard, setHeard] = useState({ reference: false, mystery: false });
  const [hz, setHz] = useState(lowHz);
  const intent = useRef(0);
  const context = useRef<AudioContext | null>(null);
  const master = useRef<GainNode | null>(null);
  const voice = useRef<Voice | null>(null);
  const clip = useRef<{ key: string; buffer: AudioBuffer } | null>(null);
  const pendingAudio = useRef<AbortController | null>(null);
  const latestVolume = useRef(volume);
  const startId = useRef<string | null>(null);
  const leaveDialog = useRef<HTMLDialogElement>(null);
  const leaveDestination = useRef<URL | null>(null);
  const leaveOpener = useRef<HTMLAnchorElement | null>(null);
  const allowUnload = useRef(false);
  const active = !!set && !set.answer;

  const disconnect = useCallback(() => {
    const current = voice.current;
    voice.current = null;
    if (!current) return;
    current.source.onended = null;
    current.source.stop();
    current.source.disconnect();
    current.reference.disconnect();
    current.mystery.disconnect();
  }, []);

  const stop = useCallback(() => {
    intent.current += 1;
    pendingAudio.current?.abort();
    disconnect();
    setPlaying(false);
    setStarting(false);
  }, [disconnect]);

  useEffect(() => {
    stopRef.current = stop;
    const hidden = () => { if (document.hidden) stop(); };
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      stop();
      setGuesses([]);
      setHeard({ reference: false, mystery: false });
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pageshow", restore);
    return () => {
      if (stopRef.current === stop) stopRef.current = null;
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pageshow", restore);
      intent.current += 1;
      pendingAudio.current?.abort();
      disconnect();
      void context.current?.close().catch(() => {});
      context.current = null;
      master.current = null;
      clip.current = null;
    };
  }, [disconnect, stop, stopRef]);

  useEffect(() => {
    if (!active) return;
    allowUnload.current = false;
    function beforeUnload(event: BeforeUnloadEvent) {
      if (allowUnload.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function confirmLink(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      const dialog = leaveDialog.current;
      if (!dialog || !link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      const url = new URL(link.href);
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      const current = window.location;
      if (url.origin === current.origin && url.pathname === current.pathname && url.search === current.search) return;
      event.preventDefault();
      event.stopPropagation();
      if (dialog.open) return;
      leaveDestination.current = url;
      leaveOpener.current = link;
      stop();
      dialog.showModal();
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", confirmLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", confirmLink, true);
    };
  }, [active, stop]);

  useEffect(() => {
    latestVolume.current = volume;
    if (master.current && context.current) safeGain(master.current, level(volume), context.current.currentTime, false);
  }, [volume]);

  useEffect(() => {
    if (!playing) return;
    let frame: number;
    const update = () => {
      const current = voice.current;
      const audio = context.current;
      if (!current || !audio) return;
      setHz(frequencyAt(audio.currentTime - current.started + current.offset));
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  function resetRound() {
    stop();
    clip.current = null;
    setGuesses([]);
    setHz(lowHz);
    setSide("reference");
    setHeard({ reference: false, mystery: false });
  }

  async function loadProfile() {
    resetRound();
    setSet(null);
    setProfile(null);
    startId.current = null;
    setMessage("");
    setBusy(true);
    try {
      const result = await responseJson<Profile>(await fetch(api + "?mine=1", { cache: "no-store" }));
      setProfile(result);
      setUsername(result.username ?? "");
      setSet(result.set);
      setConsent(false);
      if (result.set?.answer) setVolume(DEFAULT_PRACTICE_VOLUME);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ranked practice could not be opened.");
    } finally {
      setBusy(false);
    }
  }

  async function write(data: Record<string, unknown>) {
    stop();
    setBusy(true);
    setMessage("");
    try {
      const result = await responseJson<{ set: EarPracticeSet; username?: string }>(await fetch(api, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      }));
      resetRound();
      setSet(result.set);
      if (result.set.answer) setVolume(DEFAULT_PRACTICE_VOLUME);
      if (data.action === "start") {
        startId.current = null;
        if (result.username) setProfile(previous => previous && { ...previous, username: result.username!, needsConsent: result.set.legacy ? previous.needsConsent : false });
      }
      return result.set;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The ranked result could not be saved.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  function startVoice(audio: AudioContext, buffer: AudioBuffer, position: number) {
    disconnect();
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const split = audio.createChannelSplitter(2);
    const reference = audio.createGain();
    const mystery = audio.createGain();
    reference.gain.value = side === "reference" ? 1 : 0;
    mystery.gain.value = side === "mystery" ? 1 : 0;
    source.connect(split);
    split.connect(reference, 0).connect(master.current!);
    split.connect(mystery, 1).connect(master.current!);
    const offset = Math.min(timeAt(position), buffer.duration - .025);
    const started = audio.currentTime;
    const current = { source, reference, mystery, started, offset };
    voice.current = current;
    source.onended = () => {
      if (voice.current !== current) return;
      disconnect();
      setHz(EAR_PRACTICE_RANGE.to);
      setPlaying(false);
    };
    source.start(started, offset);
    setPlaying(true);
    setHeard(previous => ({ ...previous, [side]: true }));
  }

  async function play(round: EarPracticeSet) {
    const request = ++intent.current;
    setStarting(true);
    setMessage("");
    const controller = new AbortController();
    pendingAudio.current = controller;
    try {
      const audio = context.current ??= new AudioContext();
      if (!master.current) {
        master.current = audio.createGain();
        master.current.connect(audio.destination);
      }
      master.current.gain.value = level(latestVolume.current);
      await audio.resume();
      const key = round.id;
      if (clip.current?.key !== key) {
        const response = await fetch(api + "?audio=" + encodeURIComponent(round.id), { signal: controller.signal });
        if (!response.ok) await responseJson(response);
        const buffer = await audio.decodeAudioData(await response.arrayBuffer());
        if (request !== intent.current) return;
        clip.current = { key, buffer };
      }
      if (request !== intent.current) return;
      startVoice(audio, clip.current.buffer, hz === EAR_PRACTICE_RANGE.to ? lowHz : hz);
    } catch (error) {
      if (request !== intent.current) return;
      setMessage(error instanceof Error ? error.message : "Ranked audio could not start.");
    } finally {
      if (request === intent.current) {
        setStarting(false);
        pendingAudio.current = null;
      }
    }
  }

  function listen() {
    if (!set) return;
    const request = ++intent.current;
    requestListening(() => {
      if (request !== intent.current || document.hidden || !detailsRef.current || detailsRef.current.closest("details:not([open])")) return;
      onBeforePractice();
      void play(set);
    });
  }

  function chooseSide(next: Side) {
    setSide(next);
    const current = voice.current;
    if (!current || !context.current) return;
    const now = context.current.currentTime;
    current.reference.gain.setTargetAtTime(next === "reference" ? 1 : 0, now, .012);
    current.mystery.gain.setTargetAtTime(next === "mystery" ? 1 : 0, now, .012);
    setHeard(previous => ({ ...previous, [next]: true }));
  }

  function seek(next: number) {
    if (playing || starting) stop();
    setHz(next);
  }

  function mark(kind: EarPracticeGuess["kind"]) {
    if (!set || busy || guesses.length >= set.count || !heard.reference || !heard.mystery) return;
    const current = voice.current;
    const actualHz = current && context.current ? frequencyAt(context.current.currentTime - current.started + current.offset) : hz;
    stop();
    setHz(actualHz);
    setGuesses(previous => previous.some(guess => guess.hz === actualHz) ? previous : [...previous, { kind, hz: actualHz }]);
  }

  function begin() {
    if (!profile || busy || (profile.needsConsent || !profile.username) && !consent) return;
    void write({ action: "start", id: startId.current ??= crypto.randomUUID(), username, revision: profile.revision, consent: EAR_PRACTICE_CONSENT });
  }

  async function discardAndLeave() {
    const destination = leaveDestination.current;
    if (!destination || !active || busy) return;
    const result = await write({ action: "answer", id: set.id, guesses: [] });
    if (!result?.answer) return;
    allowUnload.current = true;
    window.location.assign(destination.href);
  }

  function togglePlayback() {
    if (busy) return;
    if (playing || starting) {
      if (voice.current && context.current) {
        const { started, offset } = voice.current;
        setHz(frequencyAt(context.current.currentTime - started + offset));
      }
      stop();
    } else if (volume > 0) listen();
  }

  const playbackKeys = useEarPlaybackKeys("ranked", active && !busy ? {
    toggle: togglePlayback,
    reference: starting ? undefined : () => chooseSide("reference"),
    mystery: starting ? undefined : () => chooseSide("mystery"),
    frequency: { hz, range: EAR_PRACTICE_RANGE, seek },
  } : {});

  const answer = set?.answer;
  const complete = !set?.legacy && !!answer?.correct && set?.stage === EAR_PRACTICE_MAX_STAGE;
  const needsConsent = !!profile?.canPublish && (profile.needsConsent || !profile.username);
  const reversed = answer?.guesses.length === 1 && answer.bands.length === 1 &&
    answer.guesses[0].kind !== answer.bands[0].kind && earPracticeFrequencyMatches(answer.guesses[0].hz, answer.bands[0].hz);
  return <><details ref={detailsRef} className="ear-card ear-guide ear-guide-ranked" onToggle={event => {
    if (!event.currentTarget.open) stop();
    else if (!profile && !busy) void loadProfile();
  }}>
    <summary><span className="ear-guide-summary">
      <Trophy size={18} aria-hidden="true"/>
      <span className="ear-guide-summary-copy">
        <strong>Ranked Practice Challenge</strong>
        <small>Randomized listening challenges · Level 100 Grandmaster</small>
      </span>
    </span></summary>
    <div className="ear-guide-content"><div className="ear-guide-practice" data-ear-player="ranked" onKeyDown={playbackKeys} tabIndex={0}>
      <p>Compare Reference with Mystery in a sine sweep. Move the playhead to check a frequency, mark each peak or dip, then submit your guesses.</p>
      <details className="ear-ranked-overview" open={!set}>
      <summary>How levels and scoring work</summary>
      <p>Everyone follows the same Level 1–100 progression. Each new round, including retries, has randomized frequencies, peak or dip choices, and a mix of Exaggerated, Moderate or Very nuanced difficulty. Later levels add more changes, make them narrower and subtler, and draw nuanced challenges more often.</p>
      <ol className="ear-ranked-levels" aria-label="Level progression">
        <li><strong>1–10</strong><span>1 hidden change</span></li>
        <li><strong>11–25</strong><span>2 changes</span></li>
        <li><strong>26–45</strong><span>3 changes</span></li>
        <li><strong>46–65</strong><span>4 changes</span></li>
        <li><strong>66–85</strong><span>5 changes</span></li>
        <li><strong>86–100</strong><span>6 changes · Grandmaster at 100</span></li>
      </ol>
      <p>Clear Level 100 to earn this challenge’s Grandmaster milestone. Win a round by identifying every change’s type and frequency within a quarter octave. Your frequency accuracy measures how close each mark is to the exact answer, separately from wins and losses.</p>
      </details>
      <Link href="/shootout?tab=rankings&view=practice">View ranked practice results</Link>
      {profile?.canPublish === false && <p>This session can use the unranked exercises in Recommended practice. Ranked scores are available to participant accounts.</p>}
      {set?.legacy && <p>This saved round uses the earlier challenge format. You can finish it here, then begin the new mixed challenge at Level 1. Earlier scores stay separate.</p>}
      {needsConsent && !active && <form className="ear-ranked-start" onSubmit={event => {
        event.preventDefault();
        begin();
      }}>
        {!profile?.username && <label>Public username <span className="ear-help">Optional · leave blank for an anonymous listener name</span><input type="text" autoComplete="off" minLength={3} maxLength={24} value={username}
          onChange={event => setUsername(event.target.value)} placeholder="e.g. QuietListener" disabled={busy}/></label>}
        <label className="ear-check"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)}/>
          Publish my name or anonymous label, level, wins, losses and frequency accuracy in the rankings and player distribution. Each challenge counts once I start; wrong or unfinished rounds count as losses with zero accuracy until submitted.</label>
        <p>Your records stay linked to a private participant ID visible to the site admin, including when you use an anonymous label or change your name. You can rename your entry or withdraw your scores from Rankings.</p>
        <button type="submit" disabled={busy || !consent}>Start ranked practice challenge</button>
      </form>}
      {profile?.canPublish && !needsConsent && !set && <button type="button" className="ear-guide-next" disabled={busy} onClick={begin}>Start ranked practice challenge</button>}
      {busy && !set && <p role="status">Loading ranked challenge…</p>}
      {set && <p role="status">{complete ? "Grandmaster · Level 100 cleared" : "Level " + set.stage + " of " + EAR_PRACTICE_MAX_STAGE + " · " + set.count + " hidden " + (set.count === 1 ? "change" : "changes")}</p>}
      {answer && <>
        <div role="status"><PracticeFeedback correct={answer.correct} streak={0} reversed={!!reversed}>
          {answer.correct ? "You found every change." : "Find every peak and dip within a quarter octave to complete the challenge."}
        </PracticeFeedback></div>
        {answer.difficulty && <p>Difficulty · {EAR_PRACTICE_STAGES.find(difficulty => difficulty.id === answer.difficulty)?.label}</p>}
        {answer.accuracy !== undefined && <p>Frequency accuracy · <strong>{answer.accuracy.toFixed(1)}%</strong>. Exact marks earn 100%; a quarter octave away earns 75%; one octave away or a missing mark earns 0%. A correct frequency with the wrong peak/dip type can earn location accuracy, but does not win the round.</p>}
        <PracticeReveal bands={answer.bands} frequency={hz} onSeek={seek}/>
        {!complete && !needsConsent && <button type="button" className="ear-guide-next" disabled={busy} onClick={begin}>
          {set?.legacy ? "Start new mixed challenge" : answer.correct ? "Try Level " + (set!.stage + 1) : "Retry Level " + set!.stage}
        </button>}
      </>}
      {active && <>
        <FrequencyNavigator frequency={hz} range={EAR_PRACTICE_RANGE} onSeek={seek}/>
        <PracticeVolume volume={volume} onChange={setVolume}/>
        <p className="ear-playback-keys">Space plays or pauses. Arrows change frequency. A selects Reference. B selects Mystery.</p>
        <div className="ear-guide-actions" role="group" aria-label="Ranked practice playback">
          <button type="button" onClick={togglePlayback} disabled={busy || volume <= 0 && !playing && !starting}>
            {starting ? "Cancel playback" : playing ? "Pause sweep" : "Play sweep"}
          </button>
          <button type="button" aria-pressed={side === "reference"} disabled={starting} onClick={() => chooseSide("reference")}>Reference</button>
          <button type="button" aria-pressed={side === "mystery"} disabled={starting} onClick={() => chooseSide("mystery")}>Mystery</button>
        </div>
        <div className="ear-guide-actions" role="group" aria-label="Mark changes for the public score">
          <button type="button" disabled={busy || !heard.reference || !heard.mystery || guesses.length >= set.count} onClick={() => mark("peak")}><PeakDipIcon kind="peak"/> Mark peak here</button>
          <button type="button" disabled={busy || !heard.reference || !heard.mystery || guesses.length >= set.count} onClick={() => mark("dip")}><PeakDipIcon kind="dip"/> Mark dip here</button>
        </div>
        {guesses.length > 0 && <ul className="ear-ranked-guesses" aria-label="Marked frequencies">{guesses.map(guess =>
          <li key={guess.hz}>{guess.kind} at {prettyHz(guess.hz)} <button type="button"
            onClick={() => setGuesses(previous => previous.filter(item => item.hz !== guess.hz))}>Remove</button></li>)}</ul>}
        <div className="ear-guide-actions">
          <button type="button" disabled={busy || guesses.length !== set.count}
            onClick={() => void write({ action: "answer", id: set.id, guesses })}>Submit guesses</button>
          <button type="button" disabled={busy} onClick={() => void write({ action: "answer", id: set.id, guesses: [] })}>Give up and reveal</button>
        </div>
      </>}
      {message && <p role="status">{message} <button type="button" disabled={busy} onClick={() => void loadProfile()}>Reload ranked status</button></p>}
    </div></div>
  </details>
  {active && createPortal(<dialog ref={leaveDialog} className="ear-ranked-leave" aria-labelledby="ear-ranked-leave-title"
    aria-describedby="ear-ranked-leave-description"
    onCancel={event => { if (busy) event.preventDefault(); }}
    onClose={() => {
      const opener = leaveOpener.current;
      leaveOpener.current = null;
      leaveDestination.current = null;
      requestAnimationFrame(() => opener?.focus());
    }}>
    <h2 id="ear-ranked-leave-title">Leave this ranked challenge?</h2>
    <p id="ear-ranked-leave-description">Your current guesses will not be saved. Keep practicing to finish the challenge, or discard it and record a ranked loss.</p>
    {message && <p role="status">{message}</p>}
    <div className="ear-guide-actions">
      <button type="button" disabled={busy} onClick={() => leaveDialog.current?.close()}>Keep practicing</button>
      <button type="button" disabled={busy} onClick={() => void discardAndLeave()}>{busy ? "Saving…" : "Discard and leave"}</button>
    </div>
  </dialog>, document.body)}</>;
}
