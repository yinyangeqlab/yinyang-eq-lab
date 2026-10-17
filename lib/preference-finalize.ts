import type { Point } from "@/lib/curves";
import { response, type PeqFilter } from "@/lib/autoeq";

export type FitMethod = "standard" | "precise";
export type FitPriority = "smooth" | "close";
export type FinalizedVariant = {
  bands: 10 | 15 | 20;
  method: FitMethod;
  priority: FitPriority;
  filters: PeqFilter[];
  preamp: number;
  peakBoost: number;
  rms: number;
};

const fitGrid = Array.from({ length: 241 }, (_, i) => 20 * 1000 ** (i / 240));
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

function at(points: Point[], hz: number) {
  if (hz <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) if (hz <= points[i][0]) {
    const [a, y0] = points[i - 1], [b, y1] = points[i];
    return y0 + (y1 - y0) * Math.log(hz / a) / Math.log(b / a);
  }
  return points[points.length - 1][1];
}

function smooth(values: number[], sigma: number) {
  const radius = Math.ceil(sigma * 3);
  return values.map((_, index) => {
    let total = 0, weight = 0;
    for (let offset = -radius; offset <= radius; offset++) {
      const w = Math.exp(-.5 * (offset / sigma) ** 2);
      total += values[clamp(index + offset, 0, values.length - 1)] * w;
      weight += w;
    }
    return total / weight;
  });
}

const weightAt = (hz: number) => hz < 40 ? .8 : hz > 10000 ? .65 : 1;
function loss(target: number[], filters: PeqFilter[]) {
  return fitGrid.reduce((sum, hz, index) => {
    const actual = filters.reduce((value, filter) => value + response(hz, filter), 0);
    return sum + weightAt(hz) * (target[index] - actual) ** 2;
  }, 0);
}

function standardFit(target: number[], bands: 10 | 15 | 20, qDivisor: number) {
  const q = bands / qDivisor;
  const filters: PeqFilter[] = Array.from({ length: bands }, (_, i) => ({ hz: Math.round(20 * 1000 ** ((i + .5) / bands)), gain: 0, q: +q.toFixed(2) }));
  const basis = filters.map(filter => fitGrid.map(hz => response(hz, { ...filter, gain: 1 })));
  const prediction = fitGrid.map(() => 0);
  for (let pass = 0; pass < 10; pass++) for (let band = 0; band < bands; band++) {
    const row = basis[band], old = filters[band].gain;
    let top = 0, bottom = .03;
    for (let i = 0; i < fitGrid.length; i++) {
      const w = weightAt(fitGrid[i]);
      top += w * row[i] * (target[i] - prediction[i] + old * row[i]);
      bottom += w * row[i] * row[i];
    }
    const next = clamp(top / bottom, -18, 18);
    filters[band].gain = next;
    for (let i = 0; i < fitGrid.length; i++) prediction[i] += (next - old) * row[i];
  }
  return filters.map(filter => ({ ...filter, gain: +filter.gain.toFixed(2) }));
}

function preciseFit(target: number[], bands: 10 | 15 | 20, priority: FitPriority) {
  const filters: PeqFilter[] = [];
  const residual = [...target];
  const qChoices = priority === "smooth" ? [.45, .65, .9, 1.2, 1.7, 2.4] : [.55, .8, 1.2, 1.8, 2.8, 4.2, 6.5, 9];
  for (let band = 0; band < bands; band++) {
    const candidates = residual.map((value, i) => ({ i, score: Math.abs(value) * weightAt(fitGrid[i]) })).sort((a, b) => b.score - a.score);
    const centers: number[] = [];
    for (const candidate of candidates) {
      if (centers.every(i => Math.abs(i - candidate.i) >= 5)) centers.push(candidate.i);
      if (centers.length >= 10) break;
    }
    let best: { filter: PeqFilter; change: number[]; score: number } | null = null;
    for (const index of centers) for (const q of qChoices) {
      const hz = fitGrid[index];
      if (filters.some(filter => Math.abs(Math.log2(filter.hz / hz)) < .12)) continue;
      const basis = fitGrid.map(f => response(f, { hz, gain: 1, q }));
      let top = 0, bottom = .02;
      for (let i = 0; i < fitGrid.length; i++) { const w = weightAt(fitGrid[i]); top += w * basis[i] * residual[i]; bottom += w * basis[i] ** 2; }
      const gain = clamp(top / bottom, -18, 18);
      const filter = { hz: Math.round(hz), gain, q };
      const change = fitGrid.map(f => response(f, filter));
      let improvement = 0;
      for (let i = 0; i < fitGrid.length; i++) improvement += weightAt(fitGrid[i]) * (residual[i] ** 2 - (residual[i] - change[i]) ** 2);
      const score = improvement - (priority === "smooth" ? .025 * q * q : 0);
      if (!best || score > best.score) best = { filter, change, score };
    }
    if (!best || best.score <= 0) {
      const hz = Math.round(20 * 1000 ** ((band + .5) / bands));
      filters.push({ hz, gain: 0, q: 1 });
      continue;
    }
    filters.push(best.filter);
    for (let i = 0; i < residual.length; i++) residual[i] -= best.change[i];
  }
  return filters.map(filter => ({ ...filter, gain: +filter.gain.toFixed(2) }));
}

export function peakBoost(filters: PeqFilter[]) {
  let peak = 0;
  for (const rate of [44100, 48000, 96000]) {
    const total = (hz: number) => filters.reduce((sum, filter) => sum + response(hz, filter, rate), 0);
    const values = Array.from({ length: 4097 }, (_, i) => total(20 * 1000 ** (i / 4096)));
    for (let i = 0; i < values.length; i++) {
      if (values[i] <= peak || i > 0 && values[i] < values[i - 1] || i < values.length - 1 && values[i] < values[i + 1]) continue;
      let low = Math.max(0, i - 1), high = Math.min(4096, i + 1);
      for (let step = 0; step < 24; step++) {
        const a = low + (high - low) / 3, b = high - (high - low) / 3;
        if (total(20 * 1000 ** (a / 4096)) < total(20 * 1000 ** (b / 4096))) low = a; else high = b;
      }
      peak = Math.max(peak, values[i], total(20 * 1000 ** (((low + high) / 2) / 4096)));
    }
  }
  return peak;
}

export function finalizeVariant(raw: Point[], desired: Point[], bands: 10 | 15 | 20, method: FitMethod, priority: FitPriority): FinalizedVariant {
  if (raw.length < 2 || desired.length < 2) throw new Error("Choose a headphone measurement and a target curve first.");
  const rawAt1k = at(raw, 1000), desiredAt1k = at(desired, 1000);
  const correction = fitGrid.map(hz => at(desired, hz) - desiredAt1k - (at(raw, hz) - rawAt1k));
  const fitTarget = smooth(correction, priority === "smooth" ? 5.5 : 1.2);
  let filters: PeqFilter[];
  if (method === "standard") {
    const candidates = priority === "close"
      ? [standardFit(smooth(correction, 5.5), bands, 11), ...[11, 9, 7].map(divisor => standardFit(fitTarget, bands, divisor))]
      : [standardFit(fitTarget, bands, 11)];
    filters = candidates.reduce((best, candidate) => loss(correction, candidate) < loss(correction, best) ? candidate : best);
  } else filters = preciseFit(fitTarget, bands, priority);
  const peak = peakBoost(filters);
  const preamp = -Math.ceil((Math.max(0, peak) + .5) * 10) / 10;
  const rms = Math.sqrt(loss(correction, filters) / fitGrid.reduce((sum, hz) => sum + weightAt(hz), 0));
  return { bands, method, priority, filters, preamp, peakBoost: peak, rms };
}

export function exportPeq(variant: FinalizedVariant) {
  const heading = `# Preference Tuning Lab · ${variant.bands} bands · ${variant.method} · ${variant.priority}\n# Frequency-domain headroom checked at 44.1, 48 and 96 kHz, with 0.5 dB margin.`;
  return `${heading}\nPreamp: ${variant.preamp.toFixed(1)} dB\n${variant.filters.map((filter, i) => `Filter ${i + 1}: ON PK Fc ${filter.hz} Hz Gain ${filter.gain.toFixed(2)} dB Q ${filter.q.toFixed(2)}`).join("\n")}\n`;
}

export function exportEqualizerApo(variant: FinalizedVariant) {
  return `# Preference Tuning Lab · ${variant.bands} bands · ${variant.method} · ${variant.priority}\nPreamp: ${variant.preamp.toFixed(1)} dB\n${variant.filters.map((filter, i) => `Filter ${i + 1}: ON PK Fc ${filter.hz} Hz Gain ${filter.gain.toFixed(2)} dB Q ${filter.q.toFixed(2)}`).join("\n")}\n`;
}

export function exportEasyEffects(variant: FinalizedVariant) {
  return `# EasyEffects: open Equalizer and choose Import APO.\n# Set the Equalizer input gain to ${variant.preamp.toFixed(1)} dB if the importer does not apply Preamp.\n${exportEqualizerApo(variant)}`;
}

export function exportQudelixGuide(variant: FinalizedVariant) {
  return `Preference Tuning Lab · Qudelix 5K entry guide\n${variant.bands} bands · ${variant.method} · ${variant.priority}\nSet PRE GAIN to ${variant.preamp.toFixed(1)} dB. Use a PEQ mode with at least ${variant.bands} bands. Enter each filter as a Peak (PK) filter; this is a manual-entry guide, not a native preset import.\n\nBand\tType\tFrequency (Hz)\tGain (dB)\tQ\n${variant.filters.map((filter, i) => `${i + 1}\tPK\t${filter.hz}\t${filter.gain.toFixed(2)}\t${filter.q.toFixed(2)}`).join("\n")}\n`;
}
