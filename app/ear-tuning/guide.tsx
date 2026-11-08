"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { BookOpen, Play, Square } from "lucide-react";
import { response, type PeqFilter } from "@/lib/autoeq";
import { pinkNoise } from "@/lib/ear-tuning-audio";
import { safeGain } from "@/lib/eq-playback";
import "./guide.css";

type Kind = "peak" | "dip";
type Clip = "reference" | "mystery";
type Playback = {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  envelope: GainNode;
  level: GainNode;
};
type Props = {
  volume: number;
  requestListening: (action: () => void) => void;
  onBeforePractice: () => void;
  stopPracticeRef: RefObject<(() => void) | null>;
};

const clipSeconds = 2.5;
const practiceHz = 1000;
const practiceQ = 1.2;
const practiceDb = 6;
const practiceLevel = (volume: number) => Math.min(.18, Math.max(0, volume)) * 10 ** (-practiceDb / 20);
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
    ? `Frequency response of the mystery clip. A ${answer} around 1 kHz makes the middle region ${answer === "peak" ? "stronger" : "quieter"} than the same noise in the reference.`
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

export default function EarTuningGuide({ volume, requestListening, onBeforePractice, stopPracticeRef }: Props) {
  const details = useRef<HTMLDetailsElement>(null);
  const referenceButton = useRef<HTMLButtonElement>(null);
  const context = useRef<AudioContext | null>(null);
  const noise = useRef<AudioBuffer | null>(null);
  const currentClip = useRef<Playback | null>(null);
  const latestVolume = useRef(volume);
  const intent = useRef(0);
  const [round, setRound] = useState(0);
  const [order, setOrder] = useState<[Kind, Kind] | null>(null);
  const [heard, setHeard] = useState({ reference: false, mystery: false });
  const [guess, setGuess] = useState<Kind | null>(null);
  const [playing, setPlaying] = useState<Clip | null>(null);
  const [message, setMessage] = useState("");
  const kind = order?.[round] ?? "peak";

  const stopAudio = useCallback(() => {
    intent.current++;
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
  }, [stopAudio]);

  const closeContext = useCallback(() => {
    const session = context.current;
    context.current = null;
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
    if (currentClip.current && context.current) {
      safeGain(currentClip.current.level, practiceLevel(volume), context.current.currentTime);
    }
  }, [volume]);

  async function playClip(which: Clip, answer: Kind) {
    stopAudio();
    const request = intent.current;
    setMessage("");
    setPlaying(which);
    try {
      const audio = context.current ??= new AudioContext();
      audio.onstatechange = () => {
        if (currentClip.current && audio.state !== "running") stopPractice();
      };
      await audio.resume();
      if (request !== intent.current) return;
      if (audio.state !== "running") throw Error("Audio unavailable");
      const source = audio.createBufferSource();
      source.buffer = noise.current ??= pinkNoise(audio, clipSeconds);
      const filter = audio.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.value = practiceHz;
      filter.Q.value = practiceQ;
      filter.gain.value = which === "reference" ? 0 : practiceFilter(answer).gain;
      const envelope = audio.createGain();
      const level = audio.createGain();
      level.gain.value = practiceLevel(latestVolume.current);
      const start = audio.currentTime + .025;
      const end = start + clipSeconds;
      envelope.gain.setValueAtTime(0, audio.currentTime);
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(1, start + .04);
      envelope.gain.setValueAtTime(1, end - .04);
      envelope.gain.linearRampToValueAtTime(0, end);
      source.connect(filter).connect(envelope).connect(level).connect(audio.destination);
      const clip = { source, filter, envelope, level };
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
    const request = ++intent.current;
    requestListening(() => {
      if (request !== intent.current || document.hidden || !details.current?.open || latestVolume.current <= 0) return;
      const nextOrder: [Kind, Kind] = order ?? (Math.random() < .5 ? ["peak", "dip"] : ["dip", "peak"]);
      if (!order) setOrder(nextOrder);
      onBeforePractice();
      void playClip(which, nextOrder[round]);
    });
  }

  function advance() {
    stopPractice();
    setHeard({ reference: false, mystery: false });
    setGuess(null);
    setMessage("");
    if (round === 1) {
      setRound(0);
      setOrder(null);
    } else {
      setRound(1);
    }
    referenceButton.current?.focus();
  }

  return <details ref={details} className="ear-card ear-guide" onToggle={event => {
    if (!event.currentTarget.open) {
      stopPractice();
      closeContext();
    }
  }}>
    <summary><span><BookOpen size={18} aria-hidden="true"/> Learn what peaks and dips sound like</span></summary>
    <div className="ear-guide-content">
      <p><strong>Frequency</strong> is pitch, from low bass to high treble. <strong>Level</strong> is how strong a sound is at that pitch. A peak is a region that stands out. A dip is a region that sounds quieter than the pitches around it.</p>
      <p>Some midrange peaks sound nasal, and some treble peaks make hiss or “s” sounds stand out. A dip can make part of a voice or instrument sound hollow or missing. The effect depends on the frequency and the recording.</p>
      <ResponsePicture/>
      <section className="ear-guide-practice" aria-labelledby="ear-practice-title">
        <div className="ear-guide-practice-heading">
          <h2 id="ear-practice-title">Practice with pink noise</h2>
          <span>Round {round + 1} of 2</span>
        </div>
        <p>Play the reference, then the mystery clip. Both use the same noise. Listen for a region that gets stronger or quieter. The clips are short and use the Listening level below, capped at a low setting.</p>
        <div className="ear-guide-actions" role="group" aria-label="Practice playback">
          <button ref={referenceButton} type="button" disabled={volume <= 0} onClick={() => listen("reference")}><Play size={15} aria-hidden="true"/> Play reference</button>
          <button type="button" disabled={!heard.reference || volume <= 0} onClick={() => listen("mystery")}><Play size={15} aria-hidden="true"/> {guess ? `Play revealed ${kind}` : "Play mystery"}</button>
          <button type="button" disabled={!playing} onClick={stopPractice}><Square size={14} aria-hidden="true"/> Stop practice</button>
        </div>
        <div className="ear-guide-actions" role="group" aria-label="Identify the mystery clip">
          <button type="button" disabled={!heard.mystery || !!guess || !!playing} onClick={() => setGuess("peak")}>I hear a peak</button>
          <button type="button" disabled={!heard.mystery || !!guess || !!playing} onClick={() => setGuess("dip")}>I hear a dip</button>
        </div>
        <p className="ear-guide-status" role="status">{message || (volume <= 0 ? "Set a low Listening level below to hear the practice clips."
          : playing ? `Playing ${playing} clip.`
          : guess ? `${guess === kind ? "You heard it." : `You chose a ${guess}.`} The mystery clip had a ${kind} near 1 kHz. That pitch region sounded ${kind === "peak" ? "stronger" : "quieter"} than in the reference.`
          : heard.mystery ? "Choose peak or dip. You can replay either clip."
          : heard.reference ? "Now play the mystery clip." : "Play the reference first.")}</p>
        {guess && <>
          <ResponsePicture answer={kind}/>
          <button type="button" className="ear-guide-next" onClick={advance}>{round === 0 ? "Next round" : "Practice again"}</button>
        </>}
      </section>
      <h2 className="ear-guide-method">Find a change on your headphones</h2>
      <ol className="ear-guide-steps">
        <li><strong>Locate it.</strong> Start quietly. Use a slow sweep through one region, then stop near a spot that stands out or drops away. Try a few pitches on either side. Same-level tones can sound louder or quieter at different pitches, so listen for local changes you can find again. <a href="https://pubmed.ncbi.nlm.nih.gov/15376658/">Research on equal loudness</a></li>
        <li><strong>Check that region.</strong> Switch to pink noise and use <em>Focus on this frequency region</em>. Compare nearby positions at the same listening level. Reseat your headphones and repeat. If the spot moves or disappears, skip it for now.</li>
        <li><strong>Try a small change.</strong> Start with a small cut on a repeatable peak. A dip can be left alone or tried with a small boost if it repeats. Compare <em>Before adjustments</em> and <em>After adjustments</em> on the same familiar music at a similar level. Keep the change only if it helps.</li>
      </ol>
    </div>
  </details>;
}
