import { useId } from "react";
import type { EarSignal } from "@/lib/ear-tuning-audio";

export type PracticeSignal = Exclude<EarSignal, "music">;

export const practiceSounds = [
  { id: "pink", label: "Pink noise", sweepLabel: "Pink noise", tip: "Both clips use the same broad hiss. Listen for a band that stands out or recedes in the mystery clip." },
  { id: "sine", label: "Sine tone", sweepLabel: "Sine sweep", tip: "Both clips glide upward through the same pitches. Listen for a brief swell or drop in the mystery sweep." },
  { id: "harmonics", label: "Harmonic tone", sweepLabel: "Harmonic sweep", tip: "The sweeps have overtones, like a musical note. Listen for a part of the mystery sweep that sounds stronger or softer." },
] as const;

export function PracticeSounds({ signal, onChange, sweeps = false }: {
  signal: PracticeSignal;
  onChange: (signal: PracticeSignal) => void;
  sweeps?: boolean;
}) {
  const id = useId();
  return <fieldset className="ear-guide-sounds" aria-describedby={sweeps ? `${id}-help` : undefined}>
    <legend>Practice sound</legend>
    <div>
      {practiceSounds.filter(sound => !sweeps || sound.id !== "pink").map(sound => <label key={sound.id}>
        <input type="radio" name={id} checked={signal === sound.id} onChange={() => onChange(sound.id)}/>
        {sweeps ? sound.sweepLabel : sound.label}
      </label>)}
    </div>
    {sweeps && <small id={`${id}-help`}>Changing the sound starts a new set of rounds.</small>}
  </fieldset>;
}
