/**
 * Pure helpers for the Preference Tuning listening tools: sign flipping for dB fields,
 * loop passage bounds, starting-sound identity for snapshots, and track-aware loudness matching.
 * Nothing here touches the DOM, audio nodes or storage.
 */
import { presetFilterResponse, type PresetFilter } from "@/lib/peq-preset";

/* ── Signed dB fields ── */

/** The ± button turns 0 dB into this small cut, so a cut can be started without a minus key. */
export const FIRST_CUT_DB = .5;
/** Flips boost to cut and back. Zero (or an unreadable value) becomes the documented first cut. */
export function flippedGain(gain: number) {
  return !Number.isFinite(gain) || gain === 0 ? -FIRST_CUT_DB : -gain;
}

/* ── Loop passage ── */

export type LoopPassage = { start: number; end: number };
export const LOOP_DEFAULT_SECONDS = 5;
export const LOOP_MIN_SECONDS = .5;
const knownDuration = (duration: number) => Number.isFinite(duration) && duration > 0;

/** A default loop starting at the playhead. Near the end of a track it slides back so it keeps its length; a short track loops whole. */
export function loopAt(position: number, duration: number): LoopPassage {
  const from = Math.max(0, Number.isFinite(position) ? position : 0);
  if (!knownDuration(duration)) return { start: from, end: from + LOOP_DEFAULT_SECONDS };
  const length = Math.min(LOOP_DEFAULT_SECONDS, duration);
  const start = Math.max(0, Math.min(from, duration - length));
  return { start, end: start + length };
}

/** Keeps a loop inside the track and at least LOOP_MIN_SECONDS long (or the whole track when it is shorter). */
export function boundedLoop(loop: LoopPassage, duration: number): LoopPassage {
  const from = Number.isFinite(loop.start) ? Math.max(0, loop.start) : 0;
  const to = Number.isFinite(loop.end) ? loop.end : from + LOOP_DEFAULT_SECONDS;
  if (!knownDuration(duration)) return { start: from, end: Math.max(from + LOOP_MIN_SECONDS, to) };
  const least = Math.min(LOOP_MIN_SECONDS, duration);
  const start = Math.min(from, duration - least);
  return { start, end: Math.max(start + least, Math.min(duration, to)) };
}

/* ── Starting-sound identity ── */

/** Content identity for a curve, so an imported target that reuses an id never inherits another curve's snapshots. */
export function curveFingerprint(points: readonly (readonly [number, number])[]) {
  let hash = 0x811c9dc5;
  const mix = (value: number) => {
    let bits = Math.round(value * 100) | 0;
    for (let byte = 0; byte < 4; byte++) { hash = Math.imul(hash ^ (bits & 255), 0x01000193); bits >>>= 8; }
  };
  for (const [hz, db] of points) { mix(hz); mix(db); }
  return `${points.length}-${(hash >>> 0).toString(36)}`;
}

/* ── Loudness matching ──
 * The spectrum of the playing track is captured before the tone filters, pooled into bands, and averaged slowly.
 * Each option (starting sound, live tuning, snapshots) is then scored as
 *   level = previewGain² × Σ bandPower × loudnessWeight × |tone filter response|²
 * and every option louder than the quietest one is turned down to meet it. Trims never exceed 1.
 *
 * Worked cases:
 * - Neutral option (no filters, gain 1): level equals the weighted input, so its trim depends only on the other options.
 * - Boosted option: its response raises the sum, while its previewGain (headroom for the boost) lowers it. Whichever
 *   option nets out louder is attenuated; the quieter one stays at 1.
 * - Cut-only option: previewGain is 1 and the response lowers the sum, so the other options come down to it.
 * - Near-silent or unreadable input: optionLevel returns null, matchTrims returns null, and the caller leaves gain at 1.
 */

export type LoudnessBands = { hz: Float64Array; from: Int32Array; to: Int32Array; weight: Float64Array };
/** Summed analyser power under about −60 dBFS RMS is treated as silence and left out of the estimate. */
export const SILENCE_POWER = 1e-7;
/** Frames in the running mean before it becomes a slow moving average (40 frames × 250 ms = 10 s). */
export const LOUDNESS_WINDOW_FRAMES = 40;
/** Frames of audible music needed before any trim is applied (about 1 s). */
export const LOUDNESS_MIN_FRAMES = 4;
/** No option is ever turned down by more than this. */
export const MAX_MATCH_CUT_DB = 18;

/** Approximate ITU-R BS.1770 K-weighting as power: a 38 Hz high-pass and a +4 dB shelf above about 1.5 kHz. */
function loudnessWeight(hz: number, sampleRate: number) {
  const ratio = (hz / 38) ** 2;
  const highPass = ratio * ratio / ((1 - ratio) ** 2 + 4 * ratio);
  const shelf = presetFilterResponse(hz, { type: "HSC", hz: Math.min(1500, sampleRate * .49), gain: 4, q: Math.SQRT1_2 }, sampleRate);
  return highPass * 10 ** (shelf / 10);
}

/** Groups FFT bins from 20 Hz to 20 kHz into roughly sixth-octave bands (single bins where the FFT is coarser than that). */
export function loudnessBands(sampleRate: number, fftSize: number): LoudnessBands {
  const binHz = sampleRate / fftSize;
  const last = Math.min(fftSize / 2, Math.floor(Math.min(20000, sampleRate / 2) / binHz) + 1);
  const from: number[] = [], to: number[] = [], hz: number[] = [];
  for (let bin = Math.max(1, Math.ceil(20 / binHz)); bin < last;) {
    const end = Math.min(last, bin + Math.max(1, Math.floor(bin * (2 ** (1 / 6) - 1))));
    from.push(bin); to.push(end); hz.push((bin + end - 1) / 2 * binHz);
    bin = end;
  }
  return { hz: Float64Array.from(hz), from: Int32Array.from(from), to: Int32Array.from(to), weight: Float64Array.from(hz, value => loudnessWeight(value, sampleRate)) };
}

/** Pools one analyser frame per channel (dB per bin) into band powers. Returns the summed power, used to skip silence. */
export function poolBandPowers(bands: LoudnessBands, channels: readonly Float32Array[], out: Float64Array) {
  let total = 0;
  for (let band = 0; band < out.length; band++) {
    let power = 0;
    for (const channel of channels) {
      for (let bin = bands.from[band]; bin < bands.to[band] && bin < channel.length; bin++) {
        const db = channel[bin];
        if (db > -200 && db < 60) power += 10 ** (db / 10);
      }
    }
    out[band] = power;
    total += power;
  }
  return total;
}

/** Folds a frame into the running mean: a plain average at first, then a slow moving average so levels settle instead of pumping. */
export function accumulateBandPowers(mean: Float64Array, frame: Float64Array, frames: number) {
  const share = 1 / Math.min(frames + 1, LOUDNESS_WINDOW_FRAMES);
  for (let band = 0; band < mean.length; band++) mean[band] += (frame[band] - mean[band]) * share;
}

/**
 * Weighted level (linear power) of one option for the captured spectrum.
 * `filters` are the option's audible, rate-adjusted tone filters and `gain` its preview gain. Null when the input is too quiet to judge.
 */
export function optionLevel(bands: LoudnessBands, mean: Float64Array, filters: readonly PresetFilter[], gain: number, sampleRate: number): number | null {
  let input = 0, output = 0;
  for (let band = 0; band < mean.length; band++) {
    const weighted = mean[band] * bands.weight[band];
    if (!(weighted > 0)) continue;
    let db = 0;
    for (const filter of filters) db += presetFilterResponse(bands.hz[band], filter, sampleRate);
    input += weighted;
    output += weighted * 10 ** (db / 10);
  }
  const level = output * gain * gain;
  return input > SILENCE_POWER * 1e-3 && Number.isFinite(level) && level > 0 ? level : null;
}

/** Linear trims (each ≤ 1) that bring every option down to the quietest one. Null when any level is unknown. */
export function matchTrims(levels: readonly (number | null)[]): number[] | null {
  if (!levels.length) return null;
  let quietest = Infinity;
  for (const level of levels) {
    if (level === null || !Number.isFinite(level) || level <= 0) return null;
    quietest = Math.min(quietest, level);
  }
  const floor = 10 ** (-MAX_MATCH_CUT_DB / 20);
  return levels.map(level => Math.max(floor, Math.min(1, Math.sqrt(quietest / level!))));
}

/** Moves a trim toward its target by at most `stepDb` per update, and never above 1. */
export function slewTrim(current: number, target: number, stepDb = .5) {
  const step = 10 ** (stepDb / 20);
  const from = current > 0 && Number.isFinite(current) ? current : 1;
  return Math.min(1, Math.max(from / step, Math.min(from * step, target)));
}

export const trimDb = (trim: number) => Math.round(20 * Math.log10(Math.max(trim, 1e-6)) * 2) / 2 || 0;
