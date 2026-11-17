import type { Point } from "./curves";
import type { HeadphoneMeasurement } from "./measurement";
import { peqCoefficients, autoEqReferenceOffset, type PeqFilter } from "./autoeq";
import { at, channelBalance, type ChannelMatch } from "./channel-balance";

type ResponseOptions = { referenceRaw?: Point[]; channelMatch?: ChannelMatch };

// Keep every saved measurement knot. The legacy paired `points` average has only
// 121 samples; the retained channel attachments carry the original detail.
export function measurementResponsePoints(measurement: Pick<HeadphoneMeasurement, "points" | "leftPoints" | "rightPoints"> | undefined): Point[] | undefined {
  if (!measurement) return undefined;
  const { leftPoints: left, rightPoints: right } = measurement;
  if (!left?.length || !right?.length) return measurement.points;
  const frequencies = [...new Set([...left, ...right].map(point => point[0]))].sort((a, b) => a - b);
  return frequencies.map(hz => [hz, (at(left, hz) + at(right, hz)) / 2]);
}

function interpolate(points: Point[]) {
  return (hz: number) => {
    if (hz <= points[0][0]) return points[0][1];
    if (hz >= points[points.length - 1][0]) return points[points.length - 1][1];
    let lo = 0, hi = points.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >>> 1; if (points[mid][0] < hz) lo = mid; else hi = mid; }
    const [x0, y0] = points[lo], [x1, y1] = points[hi];
    return y0 + (y1 - y0) * Math.log(hz / x0) / Math.log(x1 / x0);
  };
}

function filterResponse(filters: PeqFilter[], rate: number) {
  // These are the same coefficients installed by replaceEqStage. Calculate them
  // once, rather than for every display point during each slider movement.
  const coefficients = filters.map(filter => peqCoefficients(filter, rate));
  return (hz: number) => {
    const w = 2 * Math.PI * hz / rate, c = Math.cos(w), s = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
    return coefficients.reduce((sum, { b: [b0, b1, b2], a: [a0, a1, a2] }) => {
      const nr = b0 + b1 * c + b2 * c2, ni = b1 * s + b2 * s2, dr = a0 + a1 * c + a2 * c2, di = a1 * s + a2 * s2;
      return sum + 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di));
    }, 0);
  };
}

function responseFrequencies(raw: Point[], target: Point[] | undefined, filters: PeqFilter[], rate: number, match?: ChannelMatch) {
  const frequencies = new Set<number>([20, 1000, 20000]);
  for (let i = 0; i <= 2048; i++) frequencies.add(20 * 1000 ** (i / 2048));
  for (const points of [raw, target, match?.leftPoints, match?.rightPoints]) for (const [hz] of points ?? []) frequencies.add(hz);
  // Include exact filter centers and densely sample their digital bandwidth,
  // including the compressed bandwidth near Nyquist at 44.1 kHz.
  for (const filter of [...filters, ...(match?.channelMatchPreset?.channels.flatMap(row => row.filters) ?? [])]) {
    frequencies.add(filter.hz);
    const omega = 2 * Math.PI * filter.hz / rate;
    const width = Math.sin(omega) / omega / filter.q;
    for (let i = -128; i <= 128; i++) frequencies.add(filter.hz * Math.exp(i * width / 64));
  }
  return [...frequencies].filter(hz => Number.isFinite(hz) && hz >= 20 && hz <= Math.min(20000, rate / 2)).sort((a, b) => a - b);
}

// Display the actual windowed FIR used by playback, including custom matching.
// Zero-padding makes interpolation fine enough to retain its low-frequency shape.
// Removing the integer delay before the FFT avoids interpolating rapid phase
// rotation (which would otherwise invent magnitude dips between FFT bins).
const SPECTRUM_SIZE = 65536;
const matchResponses = new WeakMap<ChannelMatch, Map<number, (hz: number) => number>>();
function impulseSpectrum(impulse: Float32Array) {
  const real = new Float64Array(SPECTRUM_SIZE), imag = new Float64Array(SPECTRUM_SIZE);
  for (let i = 0; i < impulse.length; i++) real[(i - impulse.length / 2 + SPECTRUM_SIZE) % SPECTRUM_SIZE] = impulse[i];
  for (let i = 1, j = 0; i < SPECTRUM_SIZE; i++) {
    let bit = SPECTRUM_SIZE >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) [real[i], real[j]] = [real[j], real[i]];
  }
  for (let size = 2; size <= SPECTRUM_SIZE; size *= 2) {
    const step = -2 * Math.PI / size;
    for (let offset = 0; offset < size / 2; offset++) {
      const c = Math.cos(step * offset), s = Math.sin(step * offset);
      for (let start = 0; start < SPECTRUM_SIZE; start += size) {
        const even = start + offset, odd = even + size / 2;
        const r = real[odd] * c - imag[odd] * s, im = real[odd] * s + imag[odd] * c;
        real[odd] = real[even] - r; imag[odd] = imag[even] - im;
        real[even] += r; imag[even] += im;
      }
    }
  }
  return { real, imag };
}
function matchingResponse(match: ChannelMatch | undefined, rate: number) {
  if (!match) return () => 0;
  let rates = matchResponses.get(match);
  if (!rates) { rates = new Map(); matchResponses.set(match, rates); }
  const cached = rates.get(rate);
  if (cached) return cached;
  const balance = channelBalance(match, rate);
  const spectra = balance?.impulses.map(impulseSpectrum);
  const response = spectra ? (hz: number) => {
    const bin = Math.min(SPECTRUM_SIZE / 2, hz * SPECTRUM_SIZE / rate), lo = Math.floor(bin), hi = Math.min(SPECTRUM_SIZE / 2, lo + 1), fraction = bin - lo;
    return spectra.reduce((sum, { real, imag }) => {
      const r = real[lo] + fraction * (real[hi] - real[lo]), im = imag[lo] + fraction * (imag[hi] - imag[lo]);
      return sum + 20 * Math.log10(Math.max(1e-12, Math.hypot(r, im))) / 2;
    }, 0);
  } : () => 0;
  if (rates.size >= 3) rates.delete(rates.keys().next().value!);
  rates.set(rate, response);
  return response;
}

export function eqResponse(raw: Point[], target: Point[] | undefined, base: PeqFilter[], added: PeqFilter[], sampleRate = 48000, reference: "shootout" | "1khz" = "shootout", enabled = true, options: ResponseOptions = {}) {
  if (raw.length < 2) return null;
  const rawAt = interpolate(raw), targetAt = target?.length ? interpolate(target) : undefined, rawReference = rawAt(1000);
  const referenceRaw = options.referenceRaw ?? raw;
  const offset = targetAt ? reference === "shootout" ? autoEqReferenceOffset(referenceRaw, target!) : targetAt(1000) - at(referenceRaw, 1000) : 0;
  const gain = filterResponse([...base, ...added], sampleRate), match = matchingResponse(options.channelMatch, sampleRate);
  return responseFrequencies(raw, target, [...base, ...added], sampleRate, options.channelMatch).map(hz => {
    const before = rawAt(hz) - rawReference;
    return { hz, raw: before, target: targetAt ? targetAt(hz) - offset - rawReference : undefined, after: before + (enabled ? gain(hz) : 0) + match(hz) };
  });
}

// Put comparison curves on the original Tuning chart's common target reference.
// Uniform volume/headroom are omitted; the raw-to-predicted difference preserves
// the active filters and channel correction's frequency-dependent response.
export function tuningResponsePlot(raw: Point[] | undefined, target: Point[] | undefined, base: PeqFilter[], added: PeqFilter[], sampleRate = 48000, reference: "shootout" | "1khz" = "shootout", enabled = true, anchor = 75, options: ResponseOptions = {}) {
  const rows = raw ? eqResponse(raw, target, base, added, sampleRate, reference, enabled, options) : null;
  const gain = filterResponse(base, sampleRate);
  if (!rows) return { raw: undefined, after: undefined, target: target?.map(([hz, db]): Point => [hz, db - at(target, 1000) + anchor]), base: responseFrequencies([], target, base, sampleRate).map((hz): Point => [hz, anchor + gain(hz)]) };
  const offset = anchor - (target ? at(rows.map(row => [row.hz, row.target!] as Point), 1000) : 0);
  return { raw: rows.map((row): Point => [row.hz, row.raw + offset]), after: rows.map((row): Point => [row.hz, row.after + offset]), target: target ? rows.map((row): Point => [row.hz, row.target! + offset]) : undefined, base: rows.map((row): Point => [row.hz, row.raw + offset + gain(row.hz)]) };
}
