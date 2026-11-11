import { useEffect, useState } from "react";

export const DEFAULT_PRACTICE_VOLUME = .10;
export const MAX_PRACTICE_VOLUME = .18;

export function usePracticeVolume() {
  const [volume, setVolume] = useState(DEFAULT_PRACTICE_VOLUME);
  useEffect(() => {
    function restore(event: PageTransitionEvent) {
      if (event.persisted) setVolume(DEFAULT_PRACTICE_VOLUME);
    }
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);
  return [volume, setVolume] as const;
}

export default function PracticeVolume({ volume, onChange }: { volume: number; onChange: (volume: number) => void }) {
  return <label className="ear-practice-volume">
    <span>Practice volume <strong>{Math.round(volume * 100)}%</strong></span>
    <input type="range" aria-label="Practice volume" aria-valuetext={`${Math.round(volume * 100)}%`}
      min={0} max={MAX_PRACTICE_VOLUME} step={.01} value={volume}
      onChange={event => onChange(event.currentTarget.valueAsNumber)}/>
  </label>;
}
