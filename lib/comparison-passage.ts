import type { TrackAnalysis } from './loudness';
export type ComparisonPassage = { start: number; end: number };
export const PASSAGE_SECONDS = 5;
/** Choose an audible five-second window; avoid silent introductions when peaks exist. */
export function chooseComparisonPassage(duration: number, waveform?: TrackAnalysis['waveform'], random = Math.random, previous?: ComparisonPassage): ComparisonPassage | null {
  if (!Number.isFinite(duration) || duration < PASSAGE_SECONDS) return null;
  const length = PASSAGE_SECONDS, latest = Math.max(0, duration - length - .1);
  const candidates = Array.from({ length: latest > 0 ? 32 : 1 }, (_, index) => {
    const start = latest * index / 31;
    let energy = 0;
    if (waveform) {
      const count = waveform.maxL.length, from = Math.floor(start / duration * count), to = Math.min(count, Math.ceil((start + length) / duration * count));
      for (let i = from; i < to; i++) energy += Math.max(Math.abs(waveform.minL[i]), Math.abs(waveform.maxL[i])) ** 2 + Math.max(Math.abs(waveform.minR[i]), Math.abs(waveform.maxR[i])) ** 2;
      energy /= Math.max(1, to - from);
    }
    return { start, energy };
  });
  const peak = Math.max(...candidates.map(candidate => candidate.energy)), audible = candidates.filter(candidate => candidate.energy >= peak * .65);
  const different = previous ? audible.filter(candidate => Math.abs(candidate.start - previous.start) >= Math.min(1, latest / 2)) : audible;
  const choices = different.length ? different : audible;
  const index = Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)));
  const start = Math.round(choices[index].start * 100) / 100;
  return { start, end: Math.min(duration, start + length) };
}
export function comparisonOrder(random = Math.random): [0 | 1, 0 | 1] { return random() < .5 ? [0, 1] : [1, 0]; }

/** Every drag moves the fixed five-second window; it cannot grow or shrink. */
export function adjustComparisonPassage(passage: ComparisonPassage, mode: "move" | "start" | "end", delta: number, duration: number): ComparisonPassage {
  if (!Number.isFinite(duration) || !Number.isFinite(delta) || duration <= 0) return passage;
  const limit = duration >= PASSAGE_SECONDS + .1 ? duration - .1 : duration;
  const length = Math.min(PASSAGE_SECONDS, limit);
  const start = Math.round(Math.max(0, Math.min(limit - length, passage.start + delta)) * 100) / 100;
  return { start, end: Math.min(duration, start + length) };
}
