import type { Point } from "./curves";
import type { HeadphoneMeasurement } from "./measurement";
import { presetResponse } from "./peq-preset";

// A measured magnitude response has no acoustic phase information. The matched
// response is therefore checked against the measured magnitude model only.
const LENGTH = 8192;

export function at(points: Point[], hz: number) {
  if (hz <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) if (hz <= points[i][0]) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i];
    return y0 + (y1 - y0) * Math.log(hz / x0) / Math.log(x1 / x0);
  }
  return points[points.length - 1][1];
}

export function averageChannels(left: Point[], right: Point[]): Point[] {
  return Array.from({ length: 121 }, (_, i) => {
    const hz = 20 * 1000 ** (i / 120);
    return [hz, (at(left, hz) + at(right, hz)) / 2];
  });
}

function fft(real: Float64Array, imag: Float64Array, inverse = false) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [real[i], real[j]] = [real[j], real[i]]; [imag[i], imag[j]] = [imag[j], imag[i]]; }
  }
  for (let size = 2; size <= n; size *= 2) {
    const angle = (inverse ? 2 : -2) * Math.PI / size;
    for (let base = 0; base < n; base += size) for (let j = 0; j < size / 2; j++) {
      const cosine = Math.cos(angle * j), sine = Math.sin(angle * j);
      const even = base + j, odd = even + size / 2;
      const tr = real[odd] * cosine - imag[odd] * sine;
      const ti = real[odd] * sine + imag[odd] * cosine;
      real[odd] = real[even] - tr; imag[odd] = imag[even] - ti;
      real[even] += tr; imag[even] += ti;
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { real[i] /= n; imag[i] /= n; }
}

export function channelBalance(measurement: HeadphoneMeasurement | undefined, sampleRate: number, customAllowed = true) {
  const left = measurement?.leftPoints, right = measurement?.rightPoints;
  const supplied = customAllowed && measurement?.channelMatchMode === "custom" && measurement.channelMatchPreset;
  if ((!left?.length || !right?.length) && !supplied) return null;
  const levels = [measurement?.leftLevelDb ?? 0, measurement?.rightLevelDb ?? 0];
  const automatic = (hz: number) => ((at(right!, hz) + levels[1]) - (at(left!, hz) + levels[0])) / 2;
  const correction = (channel: number, hz: number) => supplied
    ? presetResponse(hz, supplied, channel as 0 | 1, sampleRate)
    : (channel === 0 ? 1 : -1) * automatic(hz);
  const impulses: [Float32Array, Float32Array] = [new Float32Array(LENGTH), new Float32Array(LENGTH)];
  let maxBoostDb = 0;
  for (let channel = 0; channel < 2; channel++) {
    const real = new Float64Array(LENGTH), imag = new Float64Array(LENGTH);
    for (let bin = 0; bin <= LENGTH / 2; bin++) {
      const hz = bin * sampleRate / LENGTH;
      const db = hz < 20 || hz > 20000 ? 0 : correction(channel, hz);
      maxBoostDb = Math.max(maxBoostDb, db);
      real[bin] = 10 ** (Math.max(-40, Math.min(40, db)) / 20);
      if (bin > 0 && bin < LENGTH / 2) real[LENGTH - bin] = real[bin];
    }
    fft(real, imag, true);
    for (let i = 0; i < LENGTH; i++) {
      const source = (i + LENGTH / 2) % LENGTH;
      const window = .5 - .5 * Math.cos(2 * Math.PI * i / (LENGTH - 1));
      impulses[channel][i] = real[source] * window;
    }
  }
  if (!left?.length || !right?.length) return { impulses, maxBoostDb, rmsErrorDb: null, maxErrorDb: null, supplied: true };
  let squared = 0, peak = 0, count = 0;
  const spectra = impulses.map(impulse => { const real = Float64Array.from(impulse), imag = new Float64Array(LENGTH); fft(real, imag); return { real, imag }; });
  for (let i = 0; i < 121; i++) {
    const hz = 20 * 1000 ** (i / 120);
    if (hz >= sampleRate / 2) continue;
    const bin = Math.round(hz * LENGTH / sampleRate);
    const actual = spectra.map(({ real, imag }) => 20 * Math.log10(Math.max(1e-12, Math.hypot(real[bin], imag[bin]))));
    const original = at(left, hz) + levels[0] - at(right, hz) - levels[1];
    const residual = original + actual[0] - actual[1];
    squared += residual * residual; peak = Math.max(peak, Math.abs(residual)); count++;
  }
  return { impulses, maxBoostDb, rmsErrorDb: Math.sqrt(squared / Math.max(1, count)), maxErrorDb: peak, supplied: !!supplied };
}
