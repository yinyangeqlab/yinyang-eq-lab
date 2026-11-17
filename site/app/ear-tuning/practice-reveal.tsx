import { useMemo } from "react";
import type { Point } from "@/lib/curves";
import { EAR_PRACTICE_RANGE, earPracticeBandGain, type EarPracticeBand } from "@/lib/ear-practice-ranking";
import FrequencyNavigator from "./frequency-navigator";

type Props = { bands: EarPracticeBand[]; frequency: number; onSeek: (hz: number) => void; gainAt?: (hz: number) => number };

export default function PracticeReveal({ bands, frequency, onSeek, gainAt }: Props) {
  const points = useMemo(() => {
    const { from, to } = EAR_PRACTICE_RANGE;
    const frequencies = new Set(Array.from({ length: 401 }, (_, index) => from * (to / from) ** (index / 400)));
    for (const band of bands) frequencies.add(band.hz);
    return [...frequencies].sort((a, b) => a - b).map(hz =>
      [hz, gainAt ? gainAt(hz) : bands.reduce((total, band) => total + earPracticeBandGain(band, hz), 0)] as Point);
  }, [bands, gainAt]);
  return <div className="ear-practice-reveal">
    <FrequencyNavigator frequency={frequency} onSeek={onSeek} range={EAR_PRACTICE_RANGE} points={points}
      legendLabel="Revealed practice EQ" markers={bands.map(band => band.hz)}/>
    <ul aria-label="Revealed peaks and dips">
      {bands.map((band, index) => {
        const left = Math.round(band.hz / 2 ** band.halfWidth).toLocaleString("en-US");
        const right = Math.round(band.hz * 2 ** band.halfWidth).toLocaleString("en-US");
        return <li key={band.hz}><button type="button" onClick={() => onSeek(band.hz)}>
          {index + 1}. {band.kind === "peak" ? "Peak" : "Dip"} at {band.hz.toLocaleString("en-US")} Hz
        </button>
        <span>{band.gain > 0 ? "+" : "−"}{Math.abs(band.gain)} dB · Q {band.q} · Span {left}–{right} Hz</span></li>;
      })}
    </ul>
  </div>;
}
