import { fitAutoEq } from '../../lib/autoeq';
import { finalizeVariant } from '../../lib/preference-finalize';
import { eqCoefficients, type EqFilter, type EqPreset } from '../../lib/blind-eq';
import type { Point } from '../../lib/curves';
import { at, fitGrid, type WasmFit } from './engine';

export type Fixture = { name: string; source: string; rig: string; type: 'ie' | 'oe'; sha: string; sourceUrl: string; targetName: string; targetSha: string; points: Point[]; target: Point[] };
export type Fit = { label: string; filters: EqFilter[]; fitMs: number; rms8k: number; rms16k: number; preamp: number; response: number[] };
export type Comparison = { fixture: Fixture; fits: Fit[]; wasmMemory: number; totalMs: number; difference8k: number; difference16k: number };
const evaluationGrid = Array.from({ length: 2049 }, (_, i) => 20 * 1000 ** (i / 2048));

export function response(filters: EqFilter[], hz: number, rate = 48000) {
  return filters.reduce((sum, filter) => {
    const { feedforward: b, feedback: a } = eqCoefficients(filter, rate), w = 2 * Math.PI * hz / rate;
    const power = (v: number[]) => v.reduce((s, c, i) => s + c * Math.cos(w * i), 0) ** 2 + v.reduce((s, c, i) => s - c * Math.sin(w * i), 0) ** 2;
    return sum + 10 * Math.log10(power(b) / power(a));
  }, 0);
}
function shapeRms(values: number[]) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
}
export function score(fixture: Fixture, filters: EqFilter[], rate: number, ceiling: number) {
  return shapeRms(evaluationGrid.filter(hz => hz <= ceiling).map(hz => at(fixture.target, hz) - at(fixture.points, hz) - response(filters, hz, rate)));
}
export function headroom(filters: EqFilter[]) {
  let peak = 0;
  for (const rate of [44100, 48000, 96000]) for (let i = 0; i <= 8192; i++) {
    peak = Math.max(peak, response(filters, 20 * 1000 ** (i / 8192), rate));
  }
  return -Math.ceil((peak + 1) * 10) / 10;
}
export function makeFit(fixture: Fixture, label: string, filters: EqFilter[], fitMs: number, rate: number): Fit {
  return { label, filters, fitMs, preamp: headroom(filters), rms8k: score(fixture, filters, rate, 8000), rms16k: score(fixture, filters, rate, 16000), response: fitGrid.map(hz => response(filters, hz, rate)) };
}
export function ourFits(fixture: Fixture, rate: number) {
  let start = performance.now();
  const shootout = fitAutoEq(fixture.points, fixture.target);
  const shootoutMs = performance.now() - start;
  const fits = [makeFit(fixture, 'Current shootout · 10 bands', shootout.filters.map(f => ({ ...f, type: 'PK' })), shootoutMs, rate)];
  start = performance.now();
  const precise = finalizeVariant(fixture.points, fixture.target, 10, 'precise', 'close');
  fits.push(makeFit(fixture, 'Current precise export · 10 bands', precise.filters.map(f => ({ ...f, type: 'PK' })), performance.now() - start, rate));
  return fits;
}
export function finishComparison(fixture: Fixture, fits: Fit[], precise: WasmFit, adaptive: WasmFit, rate: number, totalMs: number): Comparison {
  fits.push(makeFit(fixture, 'PEQdB · no smoothing · 10 bands', precise.filters, precise.fitMs, rate));
  fits.push(makeFit(fixture, `PEQdB · ${fixture.type === 'ie' ? 'in-ear' : 'over-ear'} smoothing · 10 bands`, adaptive.filters, adaptive.fitMs, rate));
  const difference = (ceiling: number) => shapeRms(evaluationGrid.filter(hz => hz <= ceiling).map(hz => response(fits[0].filters, hz, rate) - response(fits[2].filters, hz, rate)));
  return { fixture, fits, wasmMemory: precise.memoryBytes, totalMs, difference8k: difference(8000), difference16k: difference(16000) };
}
export function preset(fit: Fit): EqPreset {
  return { name: fit.label, channels: [0, 1].map(() => ({ preampDb: fit.preamp, filters: fit.filters })) as EqPreset['channels'] };
}
export function exportFit(fit: Fit) {
  return `# ${fit.label}\nPreamp: ${fit.preamp.toFixed(1)} dB\n` + fit.filters.map((f, i) => `Filter ${i + 1}: ON ${f.type} Fc ${f.hz.toFixed(3)} Hz Gain ${f.gain.toFixed(4)} dB Q ${f.q.toFixed(5)}`).join('\n') + '\n';
}
