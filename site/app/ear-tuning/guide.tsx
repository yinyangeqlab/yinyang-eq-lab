"use client";

import { useCallback, useEffect, useId, useRef, useState, type RefObject } from "react";
import { BookOpen, Play, Square } from "lucide-react";
import { response, type PeqFilter } from "@/lib/autoeq";
import { createEarHarmonicWave, EAR_TONE_AMPLITUDE, pinkNoise } from "@/lib/ear-tuning-audio";
import { safeGain } from "@/lib/eq-playback";
import AdvancedPractice from "./advanced-practice";
import { PracticeFeedback } from "./practice-feedback";
import { PracticeSounds, practiceSounds, type PracticeSignal } from "./practice-sounds";
import PracticeVolume, { DEFAULT_PRACTICE_VOLUME, MAX_PRACTICE_VOLUME, usePracticeVolume } from "./practice-volume";
import { useEarPlaybackKeys } from "./playback-keys";
import "./guide.css";

type Kind = "peak" | "dip";
type Clip = "reference" | "mystery";
type Playback = {
  source: AudioScheduledSourceNode;
  signal: PracticeSignal;
  filter: BiquadFilterNode;
  envelope: GainNode;
  level: GainNode;
};
type Props = {
  requestListening: (action: () => void) => void;
  onBeforePractice: () => void;
  stopPracticeRef: RefObject<(() => void) | null>;
};

const clipSeconds = 2.5;
const practiceHz = 1000;
const practiceQ = 1.2;
const practiceDb = 6;
const sweepRatio = 2.5;
const practiceLevel = (volume: number, signal: PracticeSignal) =>
  Math.min(MAX_PRACTICE_VOLUME, Math.max(0, volume)) * 10 ** (-practiceDb / 20) * (signal === "pink" ? 1 : EAR_TONE_AMPLITUDE);
const practiceFilter = (kind: Kind): PeqFilter => ({
  hz: practiceHz, q: practiceQ, gain: kind === "peak" ? practiceDb : -practiceDb,
});

function disconnectClip(clip: Playback) {
  clip.source.onended = null;
  clip.source.disconnect();
  clip.filter.disconnect();
  clip.envelope.disconnect();
  clip.level.disconnect();
}

function responsePath(kind: Kind) {
  const filter = practiceFilter(kind);
  return Array.from({ length: 81 }, (_, i) => {
    const hz = 200 * 25 ** (i / 80);
    return `${i === 0 ? "M" : "L"}${(62 + 270 * i / 80).toFixed(1)} ${(69 - response(hz, filter) * 6.7).toFixed(1)}`;
  }).join(" ");
}

const paths = { peak: responsePath("peak"), dip: responsePath("dip") };

function ResponsePicture({ answer }: { answer?: Kind }) {
  const description = answer
    ? `EQ applied to the mystery clip. A ${answer} around 1 kHz makes that region ${answer === "peak" ? "stronger" : "quieter"} than in the reference.`
    : "A peak rises above the reference and a dip falls below it. The horizontal axis runs from low to high pitch. The vertical axis shows more or less level.";
  return <figure className="ear-guide-response">
    <svg viewBox="0 0 360 157" role="img" aria-label={description}>
      <path className="ear-guide-grid" d="M62 20V118H332 M197 20V118"/>
      <path className="ear-guide-reference" d="M62 69H332"/>
      <text x="53" y="25" textAnchor="end">More</text>
      <text x="53" y="113" textAnchor="end">Less</text>
      <text x="62" y="135">Low pitch</text>
      <text x="197" y="135" textAnchor="middle">1 kHz</text>
      <text x="332" y="135" textAnchor="end">High pitch</text>
      {answer !== "dip" && <>
        <path className="ear-guide-peak" d={paths.peak}/>
        <text x="221" y="33" className="ear-guide-peak-label">Peak</text>
      </>}
      {answer !== "peak" && <>
        <path className="ear-guide-dip" d={paths.dip}/>
        <text x="221" y="107" className="ear-guide-dip-label">Dip</text>
      </>}
      <text x="332" y="61" textAnchor="end">Reference</text>
    </svg>
    <figcaption>{answer ? "The curve shows what changed in this clip compared with its reference."
      : "A response chart shows which pitches change in level. A waveform shows how the sound changes over time."}</figcaption>
  </figure>;
}

function ClipPractice({ requestListening, onBeforePractice, stopPracticeRef, sweeps = false }: Props & { sweeps?: boolean }) {
  const [volume, setVolume] = usePracticeVolume();
  const lastClip = useRef<Clip>("reference");
  const title = useId();
  const section = useRef<HTMLElement>(null);
  const referenceButton = useRef<HTMLButtonElement>(null);
  const context = useRef<AudioContext | null>(null);
  const noise = useRef<AudioBuffer | null>(null);
  const harmonics = useRef<PeriodicWave | null>(null);
  const currentClip = useRef<Playback | null>(null);
  const pauseRequested = useRef(false);
  const pauseTransition = useRef(false);
  const latestVolume = useRef(volume);
  const intent = useRef(0);
  const [signal, setSignal] = useState<PracticeSignal>(sweeps ? "sine" : "pink");
  const [round, setRound] = useState(0);
  const [order, setOrder] = useState<[Kind, Kind] | null>(null);
  const [heard, setHeard] = useState({ reference: false, mystery: false });
  const [{ guess, streak }, setFeedback] = useState<{ guess: Kind | null; streak: number }>({ guess: null, streak: 0 });
  const [playing, setPlaying] = useState<Clip | null>(null);
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState("");
  const kind = order?.[round] ?? "peak";

  const stopAudio = useCallback(() => {
    intent.current++;
    pauseRequested.current = false;
    pauseTransition.current = false;
    const clip = currentClip.current;
    currentClip.current = null;
    if (clip) {
      disconnectClip(clip);
      clip.source.stop();
    }
  }, []);

  const stopPractice = useCallback(() => {
    stopAudio();
    setPlaying(null);
    setPaused(false);
  }, [stopAudio]);

  const closeContext = useCallback(() => {
    const session = context.current;
    context.current = null;
    harmonics.current = null;
    if (session) {
      session.onstatechange = null;
      if (session.state !== "closed") void session.close().catch(() => {});
    }
  }, []);

  useEffect(() => {
    stopPracticeRef.current = stopPractice;
    function onVisibility() {
      if (document.hidden) {
        stopPractice();
        closeContext();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (stopPracticeRef.current === stopPractice) stopPracticeRef.current = null;
      stopAudio();
      closeContext();
    };
  }, [closeContext, stopAudio, stopPractice, stopPracticeRef]);

  useEffect(() => {
    latestVolume.current = volume;
    const clip = currentClip.current;
    if (clip && context.current) {
      safeGain(clip.level, practiceLevel(volume, clip.signal), context.current.currentTime);
    }
  }, [volume]);

  async function playClip(which: Clip, answer: Kind) {
    stopAudio();
    const request = intent.current;
    setMessage("");
    setPlaying(which);
    setPaused(false);
    try {
      const audio = context.current ??= new AudioContext();
      audio.onstatechange = () => {
        if (currentClip.current && audio.state !== "running" && !pauseRequested.current) stopPractice();
      };
      await audio.resume();
      if (request !== intent.current) return;
      if (audio.state !== "running") throw Error("Audio unavailable");
      const start = audio.currentTime + .025;
      const end = start + clipSeconds;
      let source: AudioScheduledSourceNode;
      if (signal === "pink") {
        const bufferSource = audio.createBufferSource();
        bufferSource.buffer = noise.current ??= pinkNoise(audio, clipSeconds);
        source = bufferSource;
      } else {
        const tone = audio.createOscillator();
        if (signal === "harmonics") tone.setPeriodicWave(harmonics.current ??= createEarHarmonicWave(audio));
        tone.frequency.setValueAtTime(practiceHz / sweepRatio, start);
        tone.frequency.exponentialRampToValueAtTime(practiceHz * sweepRatio, end);
        source = tone;
      }
      const filter = audio.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.value = practiceHz;
      filter.Q.value = practiceQ;
      filter.gain.value = which === "reference" ? 0 : practiceFilter(answer).gain;
      const envelope = audio.createGain();
      const level = audio.createGain();
      level.gain.value = practiceLevel(latestVolume.current, signal);
      envelope.gain.setValueAtTime(0, audio.currentTime);
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(1, start + .04);
      envelope.gain.setValueAtTime(1, end - .04);
      envelope.gain.linearRampToValueAtTime(0, end);
      source.connect(filter).connect(envelope).connect(level).connect(audio.destination);
      const clip = { source, signal, filter, envelope, level };
      source.onended = () => {
        if (currentClip.current !== clip) return;
        currentClip.current = null;
        disconnectClip(clip);
        setPlaying(null);
        setHeard(previous => ({ ...previous, [which]: true }));
      };
      source.start(start);
      source.stop(end);
      currentClip.current = clip;
    } catch {
      if (request !== intent.current) return;
      stopPractice();
      closeContext();
      setMessage("Practice audio could not start. Check your audio output and try again.");
    }
  }

  function listen(which: Clip) {
    if (volume <= 0 || (which === "mystery" && !heard.reference)) return;
    const request = ++intent.current;
    requestListening(() => {
      if (request !== intent.current || document.hidden || !section.current || section.current.closest("details:not([open])") || latestVolume.current <= 0) return;
      const nextOrder: [Kind, Kind] = order ?? (Math.random() < .5 ? ["peak", "dip"] : ["dip", "peak"]);
      if (!order) setOrder(nextOrder);
      lastClip.current = which;
      onBeforePractice();
      void playClip(which, nextOrder[round]);
    });
  }

  async function toggleClip() {
    const audio = context.current;
    if (!audio || !currentClip.current) {
      if (playing) stopPractice();
      else listen(lastClip.current);
      return;
    }
    if (pauseTransition.current) return;
    const request = intent.current;
    const resume = pauseRequested.current;
    pauseTransition.current = true;
    pauseRequested.current = true;
    try {
      if (resume) await audio.resume();
      else await audio.suspend();
      if (request !== intent.current || !currentClip.current) return;
      pauseRequested.current = !resume;
      setPaused(!resume);
    } catch {
      if (request === intent.current) stopPractice();
    } finally {
      if (request === intent.current) pauseTransition.current = false;
    }
  }

  function resetRound() {
    stopPractice();
    lastClip.current = "reference";
    setHeard({ reference: false, mystery: false });
    setFeedback(previous => ({ ...previous, guess: null }));
    setMessage("");
  }

  function submitGuess(next: Kind) {
    if (!heard.mystery || playing) return;
    setFeedback(previous => previous.guess ? previous : { guess: next, streak: next === kind ? previous.streak + 1 : 0 });
    if (round === 1) setVolume(DEFAULT_PRACTICE_VOLUME);
  }

  function chooseSound(next: PracticeSignal) {
    resetRound();
    setRound(0);
    setOrder(null);
    setSignal(next);
  }

  function advance() {
    resetRound();
    if (round === 1) {
      setRound(0);
      setOrder(null);
    } else {
      setRound(1);
    }
    referenceButton.current?.focus();
  }

  const player = sweeps ? "intermediate" : "beginner";
  const playbackKeys = useEarPlaybackKeys(player, {
    toggle: () => void toggleClip(),
    reference: () => listen("reference"),
    mystery: () => listen("mystery"),
  });

  return <section ref={section} className="ear-guide-practice" aria-labelledby={title}
    data-ear-player={player} onKeyDown={playbackKeys} tabIndex={0}>
    <div className="ear-guide-practice-heading">
      <h2 id={title}>{sweeps ? "Tone sweep trials" : "Beginner practice"}</h2>
      <span>Round {round + 1} of 2</span>
    </div>
    {sweeps && <PracticeSounds signal={signal} onChange={chooseSound} sweeps/>}
    <p>{!sweeps && <strong>Practice with pink noise. </strong>}{practiceSounds.find(sound => sound.id === signal)?.tip}</p>
    <PracticeVolume volume={volume} onChange={setVolume}/>
    <p className="ear-playback-keys">Space plays or pauses the clip. A plays Reference. B plays Mystery.</p>
    <div className="ear-guide-actions" role="group" aria-label="Practice playback">
      <button ref={referenceButton} type="button" disabled={volume <= 0} onClick={() => listen("reference")}><Play size={15} aria-hidden="true"/> Play reference</button>
      <button type="button" disabled={!heard.reference || volume <= 0} onClick={() => listen("mystery")}><Play size={15} aria-hidden="true"/> {guess ? `Play revealed ${kind}` : "Play mystery"}</button>
      <button type="button" disabled={!playing} onClick={stopPractice}><Square size={14} aria-hidden="true"/> Stop practice</button>
    </div>
    <div className="ear-guide-actions" role="group" aria-label="Identify the mystery clip">
      <button type="button" disabled={!heard.mystery || !!guess || !!playing} onClick={() => submitGuess("peak")}>I hear a peak</button>
      <button type="button" disabled={!heard.mystery || !!guess || !!playing} onClick={() => submitGuess("dip")}>I hear a dip</button>
    </div>
    <div role="status">
      {guess && !message && !playing
        ? <PracticeFeedback correct={guess === kind} streak={streak} reversed={guess !== kind}>
          You guessed a {guess}. The mystery was a {kind} near 1 kHz. That region sounded {kind === "peak" ? "stronger" : "quieter"} than in the reference.
        </PracticeFeedback>
        : <p className="ear-guide-status">{message || (volume <= 0 ? "Raise the practice volume to hear the clips."
          : playing ? `${paused ? "Paused" : "Playing"} ${playing} clip.`
          : heard.mystery ? "Choose peak or dip. You can replay either clip."
          : heard.reference ? "Now play the mystery clip." : "Play the reference first.")}</p>}
    </div>
    {guess && <>
      <ResponsePicture answer={kind}/>
      <button type="button" className="ear-guide-next" onClick={advance}>{round === 0 ? "Next round" : "Practice again"}</button>
    </>}
  </section>;
}

export default function EarTuningGuide({ requestListening, onBeforePractice, stopPracticeRef, onOpenRanked }: Props & { onOpenRanked: () => void }) {
  const beginner = useRef<(() => void) | null>(null);
  const intermediate = useRef<(() => void) | null>(null);
  const advanced = useRef<(() => void) | null>(null);
  const stopPractice = useCallback((except?: Props["stopPracticeRef"]) => {
    for (const ref of [beginner, intermediate, advanced]) {
      if (ref !== except) ref.current?.();
    }
  }, []);

  useEffect(() => {
    stopPracticeRef.current = stopPractice;
    return () => {
      if (stopPracticeRef.current === stopPractice) stopPracticeRef.current = null;
    };
  }, [stopPractice, stopPracticeRef]);

  function preparePlayback(active: Props["stopPracticeRef"]) {
    stopPractice(active);
    onBeforePractice();
  }
  const listening = { requestListening };

  return <details className="ear-card ear-guide" onToggle={event => {
    if (event.target === event.currentTarget && !event.currentTarget.open) stopPractice();
  }}>
    <summary><span className="ear-guide-summary">
      <BookOpen size={18} aria-hidden="true"/>
      <span className="ear-guide-summary-copy">
        <strong>Recommended practice</strong>
        <small>Learn what peaks and dips sound like</small>
      </span>
    </span></summary>
    <div className="ear-guide-content">
      <p><strong>Frequency</strong> is pitch, from low bass to high treble. <strong>Level</strong> is how strong a sound is at that pitch. A peak is a region that stands out. A dip is a region that sounds quieter than the pitches around it.</p>
      <p>Some midrange peaks sound nasal, and some treble peaks make hiss or “s” sounds stand out. A dip can make part of a voice or instrument sound hollow or missing. The effect depends on the frequency and the recording.</p>
      <ResponsePicture/>
      <details className="ear-guide-explanation">
        <summary>Why practice works without calibration</summary>
        <p>Your headphones and hearing shape both the Reference and Mystery. Only Mystery adds the practice EQ. If a spot sounds equally sharp or hollow in both, that sound is part of your baseline.</p>
        <p>Compare at the same frequency or the same point in a sweep. Keep the listening level and headphone fit steady. A deep dip in your headphones or a frequency you hear faintly can still make a practice change hard to hear. Your score reflects the exercise with your current setup.</p>
      </details>
      <ClipPractice {...listening} stopPracticeRef={beginner} onBeforePractice={() => preparePlayback(beginner)}/>
      <details className="ear-guide-intermediate" onToggle={event => {
        if (!event.currentTarget.open) intermediate.current?.();
      }}>
        <summary>Intermediate practice</summary>
        <ClipPractice {...listening} stopPracticeRef={intermediate} onBeforePractice={() => preparePlayback(intermediate)} sweeps/>
      </details>
      <AdvancedPractice {...listening} onOpenRanked={onOpenRanked} stopPracticeRef={advanced} onBeforePractice={() => preparePlayback(advanced)}/>
      <h2 className="ear-guide-method">Find a change on your headphones</h2>
      <ol className="ear-guide-steps">
        <li><strong>Locate it.</strong> Start quietly. Use a slow sweep through one region, then stop near a spot that stands out or drops away. Try a few pitches on either side. Same-level tones can sound louder or quieter at different pitches, so listen for local changes you can find again. <a href="https://pubmed.ncbi.nlm.nih.gov/15376658/">Research on equal loudness</a></li>
        <li><strong>Check that region.</strong> Switch to pink noise and use <em>Isolate frequencies at the playhead</em>. Compare nearby positions at the same listening level. Reseat your headphones and repeat. If the spot moves or disappears, skip it for now.</li>
        <li><strong>Try a small change.</strong> Start with a small cut on a repeatable peak. A dip can be left alone or tried with a small boost if it repeats. Compare <em>Before adjustments</em> and <em>After adjustments</em> on the same familiar music at a similar level. Keep the change only if it helps.</li>
      </ol>
    </div>
  </details>;
}
