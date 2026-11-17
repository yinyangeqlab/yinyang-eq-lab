import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { response, type PeqFilter } from "@/lib/autoeq";
import { EarTuningAudio, gainAtProbe } from "@/lib/ear-tuning-audio";
import { EAR_PRACTICE_RANGE, EAR_PRACTICE_STAGES as stages, earPracticeFrequencyMatches, type EarPracticeStage as Stage } from "@/lib/ear-practice-ranking";
import FrequencyNavigator from "./frequency-navigator";
import { PracticeFeedback } from "./practice-feedback";
import { PracticeSounds, type PracticeSignal } from "./practice-sounds";
import PracticeReveal from "./practice-reveal";
import PracticeVolume, { DEFAULT_PRACTICE_VOLUME, MAX_PRACTICE_VOLUME, usePracticeVolume } from "./practice-volume";
import { useEarPlaybackKeys } from "./playback-keys";

type Kind = "peak" | "dip";
type Side = "reference" | "mystery";
type Estimate = { kind: Kind; hz: number };
type Challenge = { kind: Kind; filters: PeqFilter[] };
type Score = { right: number; answered: number; streak: number };
type Practice = {
  stage: Stage;
  challenge: Challenge | null;
  estimate: Estimate | null;
  scores: Record<Stage["id"], Score>;
};
type Props = {
  requestListening: (action: () => void) => void;
  onBeforePractice: () => void;
  onOpenRanked: () => void;
  stopPracticeRef: RefObject<(() => void) | null>;
};

const startHz = 1000;
const headroomDb = stages[0].gainDb;
const flat: PeqFilter[] = [];
const cappedLevel = (volume: number) => Math.min(MAX_PRACTICE_VOLUME, Math.max(0, volume));
const formatHz = (hz: number) => `${hz.toLocaleString("en-US")} Hz`;
const emptyScore: Score = { right: 0, answered: 0, streak: 0 };

function newChallenge(stage: Stage): Challenge {
  const kind = Math.random() < .5 ? "peak" : "dip";
  const hz = Math.round(100 * 95 ** Math.random());
  return { kind, filters: [{ hz, q: stage.q, gain: kind === "peak" ? stage.gainDb : -stage.gainDb }] };
}

function configure(player: EarTuningAudio, challenge: Challenge, side: Side, signal: PracticeSignal) {
  player.configure({
    base: flat,
    // The engine also reserves the filter's positive gain on both A/B sides.
    preamp: -headroomDb + Math.max(0, challenge.filters[0].gain),
    adjustments: challenge.filters,
    bypass: side === "reference",
    focus: signal === "pink",
    probeHalfWidthOctaves: 1,
  });
}

export default function AdvancedPractice({ requestListening, onBeforePractice, stopPracticeRef, onOpenRanked }: Props) {
  const [volume, setVolume] = usePracticeVolume();
  const details = useRef<HTMLDetailsElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const engine = useRef<EarTuningAudio | null>(null);
  const latestVolume = useRef(volume);
  const intent = useRef(0);
  const [practice, setPractice] = useState<Practice>({
    stage: stages[0], challenge: null, estimate: null,
    scores: { 1: emptyScore, 2: emptyScore, 3: emptyScore },
  });
  const { stage, challenge, estimate, scores } = practice;
  const [hz, setHz] = useState(startHz);
  const [sampleRate, setSampleRate] = useState(48000);
  const [signal, setSignal] = useState<PracticeSignal>("sine");
  const [side, setSide] = useState<Side>("reference");
  const [heard, setHeard] = useState({ reference: false, mystery: false });
  const [playing, setPlaying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState("");

  const stop = useCallback(() => {
    intent.current += 1;
    engine.current?.stop();
    setPlaying(false);
    setStarting(false);
  }, []);

  useEffect(() => {
    stopPracticeRef.current = stop;
    function onVisibility() {
      if (document.hidden) stop();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (stopPracticeRef.current === stop) stopPracticeRef.current = null;
      intent.current += 1;
      engine.current?.close();
      engine.current = null;
    };
  }, [stop, stopPracticeRef]);

  useEffect(() => {
    latestVolume.current = volume;
    engine.current?.volume(cappedLevel(volume));
  }, [volume]);

  useEffect(() => {
    if (engine.current && challenge) configure(engine.current, challenge, side, signal);
  }, [challenge, side, signal]);

  function seek(next: number) {
    engine.current?.setFrequency(next);
    setHz(next);
  }

  function setRound(nextStage: Stage, nextChallenge: Challenge | null) {
    stop();
    seek(startHz);
    setPractice(previous => ({ ...previous, stage: nextStage, challenge: nextChallenge, estimate: null }));
    setSide("reference");
    setHeard({ reference: false, mystery: false });
    setMessage("");
  }

  function submit(kind: Kind) {
    if (!challenge || estimate || !heard.reference || !heard.mystery) return;
    // Keep the current level while listening and reset it for the next playback.
    stop();
    setVolume(DEFAULT_PRACTICE_VOLUME);
    const right = kind === challenge.kind && earPracticeFrequencyMatches(hz, challenge.filters[0].hz);
    setPractice(previous => {
      if (previous.challenge !== challenge || previous.estimate) return previous;
      const score = previous.scores[stage.id];
      return {
        ...previous,
        estimate: { kind, hz },
        scores: {
          ...previous.scores,
          [stage.id]: { right: score.right + Number(right), answered: score.answered + 1, streak: right ? score.streak + 1 : 0 },
        },
      };
    });
  }

  async function play(request: number, round: Challenge, media: HTMLAudioElement) {
    setStarting(true);
    setMessage("");
    try {
      const player = engine.current ??= new EarTuningAudio(media, () => {
        intent.current += 1;
        setPlaying(false);
        setStarting(false);
      });
      setSampleRate(player.context.sampleRate);
      configure(player, round, side, signal);
      player.setFrequency(hz);
      const started = await player.play(signal, () => cappedLevel(latestVolume.current));
      if (request !== intent.current) return;
      setPlaying(started);
      if (started) setHeard(previous => ({ ...previous, [side]: true }));
    } catch {
      if (request !== intent.current) return;
      stop();
      setMessage("Practice audio could not start. Check your audio output and try again.");
    } finally {
      if (request === intent.current) setStarting(false);
    }
  }

  function listen() {
    const request = ++intent.current;
    requestListening(() => {
      if (request !== intent.current || document.hidden || !details.current?.open || !challenge || !audio.current || latestVolume.current <= 0) return;
      onBeforePractice();
      void play(request, challenge, audio.current);
    });
  }

  function chooseSide(next: Side) {
    setSide(next);
    if (playing) setHeard(previous => ({ ...previous, [next]: true }));
  }

  function chooseSignal(next: PracticeSignal) {
    if (starting) stop();
    if (playing) {
      try {
        if (!engine.current?.switchGenerated(next, hz)) stop();
      } catch {
        stop();
        setMessage("This sound could not start. Press Play sound to try again.");
      }
    }
    setSignal(next);
  }

  const targetHz = challenge?.filters[0].hz ?? startHz;
  const close = estimate && earPracticeFrequencyMatches(estimate.hz, targetHz);
  const score = scores[stage.id];
  const percentOff = estimate ? Math.round(100 * Math.abs(estimate.hz / targetHz - 1)) : 0;
  function togglePlayback() {
    if (playing || starting) stop();
    else if (volume > 0) listen();
  }
  const playbackKeys = useEarPlaybackKeys("advanced", challenge ? {
    toggle: togglePlayback,
    reference: () => chooseSide("reference"),
    mystery: () => chooseSide("mystery"),
    frequency: { hz, range: EAR_PRACTICE_RANGE, seek },
  } : {});
  return <details ref={details} className="ear-guide-advanced" onToggle={event => {
    if (event.target === event.currentTarget && !event.currentTarget.open) stop();
  }}>
    <summary>Advanced practice · Unranked</summary>
    <div className="ear-guide-practice" data-ear-player="advanced" onKeyDown={playbackKeys} tabIndex={0}>
      <p>Practice freely with local scores. Choose a difficulty and find a randomized hidden peak or dip below 10 kHz. Move the playhead to explore. At each spot, hold the frequency still and switch between Reference and Mystery.</p>
      <p>Your headphones shape both sounds. A peak makes that spot louder in Mystery. A dip makes it quieter. Guess where the difference is clearest.</p>
      <div className="ear-guide-stages" role="group" aria-label="Difficulty stage">
        {stages.map(option => <button type="button" key={option.id} aria-pressed={option.id === stage.id}
          onClick={() => { if (option.id !== stage.id) setRound(option, null); }}>
          <span>Stage {option.id}</span>
          <strong>{option.label}</strong>
          <small>{scores[option.id].right} of {scores[option.id].answered} right</small>
        </button>)}
      </div>
      <p>{stage.description} A point requires the right type and a frequency within a quarter octave (about 20%). Each stage counts submitted guesses for this visit.</p>
      <button type="button" className="ear-guide-next" onClick={() => setRound(stage, newChallenge(stage))}>{challenge ? estimate ? "Next challenge" : "Skip challenge" : "Start challenge"}</button>
      <audio ref={audio} preload="none"/>
      {challenge && <>
        <PracticeSounds signal={signal} onChange={chooseSignal}/>
        {estimate ? <PracticeReveal bands={[{
          kind: challenge.kind, hz: targetHz, gain: challenge.filters[0].gain, q: challenge.filters[0].q, halfWidth: 1,
        }]} frequency={hz} onSeek={seek} gainAt={frequency => {
          const filter = challenge.filters[0];
          return response(frequency, { ...filter, gain: gainAtProbe({ filter, halfWidthOctaves: 1 }, frequency) }, sampleRate);
        }}/>
          : <FrequencyNavigator frequency={hz} range={EAR_PRACTICE_RANGE} onSeek={seek}/>}
        <PracticeVolume volume={volume} onChange={setVolume}/>
        <p className="ear-playback-keys">Space plays or stops. Arrows change frequency. A selects Reference. B selects Mystery.</p>
        <div className="ear-guide-actions" role="group" aria-label="Advanced practice playback">
          <button type="button" onClick={togglePlayback} disabled={volume <= 0 && !playing && !starting}>
            {starting ? "Cancel playback" : playing ? "Stop practice" : "Play sound"}
          </button>
          <button type="button" aria-pressed={side === "reference"} disabled={starting} onClick={() => chooseSide("reference")}>Reference</button>
          <button type="button" aria-pressed={side === "mystery"} disabled={starting} onClick={() => chooseSide("mystery")}>Mystery</button>
        </div>
        {!estimate && <div className="ear-guide-actions" role="group" aria-label="Submit a guess at the search frequency">
          <button type="button" disabled={!heard.reference || !heard.mystery} onClick={() => submit("peak")}>Guess peak here</button>
          <button type="button" disabled={!heard.reference || !heard.mystery} onClick={() => submit("dip")}>Guess dip here</button>
        </div>}
        <div role="status">
          {estimate && !message
            ? <PracticeFeedback correct={!!close && estimate.kind === challenge.kind} streak={score.streak} reversed={!!close && estimate.kind !== challenge.kind}>
              The mystery was a {challenge.kind} at {formatHz(targetHz)}. You guessed a {estimate.kind} at {formatHz(estimate.hz)}.{" "}
              {close ? "Within a quarter octave." : `Your estimate was ${percentOff}% ${estimate.hz < targetHz ? "below" : "above"} the answer.`}{" "}
              Stage {stage.id} score is {score.right} of {score.answered} right.
            </PracticeFeedback>
            : <p className="ear-guide-status">{message || (volume <= 0 ? "Raise the practice volume to hear the sounds."
              : heard.reference && heard.mystery ? "Compare at nearby frequencies, then guess peak or dip at the best spot."
              : "Listen to both the reference and mystery before guessing.")}</p>}
        </div>
        {estimate && <button type="button" className="ear-guide-next" onClick={() => seek(targetHz)}>Move to the answer frequency</button>}
        {estimate && score.answered === 6 && <div className="ear-ranked-invitation">
          <p>Ready for a scored challenge? Ranked play has its own rounds and public leaderboard.</p>
          <button type="button" onClick={onOpenRanked}>Open Ranked Practice Challenge</button>
        </div>}
      </>}
    </div>
  </details>;
}
