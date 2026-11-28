import { at, fitGrid } from "./peqdb-engine";
import type { PeqFilter } from "./autoeq";
import type { FitBands } from "./fitter-settings";
import type { Point } from "./curves";

const DB = 10 / Math.LN10;
const LOG_GAIN = Math.LN10 / 40;
const PEAK_CAP = 6;
const weightsFor = (trebleWeight: number) => fitGrid.map(hz =>
  Math.sqrt((hz <= 10_000 ? 1.7 : 1) * (hz <= 200 ? 2.3 : 1) * (hz >= 5_000 && hz <= 10_000 ? trebleWeight : 1)));
const defaultWeights = weightsFor(1);
// With ten filters, emphasize the lower treble so broad corrections do not crowd it out.
const tenBandWeights = weightsFor(1.75);
const clamp = (x: number, low: number, high: number) => Math.max(low, Math.min(high, x));
type Kind = 0 | 1 | -1;
type Section = { center: number; gain: number; logQ: number; kind: Kind };
type Candidate = { sections: Section[]; cost: number };

function dot(a: ArrayLike<number>, b: ArrayLike<number>) {
  let total = 0;
  for (let k = 0; k < a.length; k++) total += a[k] * b[k];
  return total;
}
function mean(values: Float64Array) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/** RBJ biquads in bilinear-warped frequencies, equivalent to playback's coefficients. */
function section(section: Section, grid: Float64Array, output: Float64Array, columns?: Float64Array[]) {
  const { center, gain, logQ, kind } = section;
  const a = Math.exp(LOG_GAIN * gain), invQ2 = Math.exp(-2 * logQ);
  const a2 = a * a, inverseA2 = 1 / a2;
  for (let i = 0; i < grid.length; i++) {
    const delta = grid[i] - center;
    if (kind === 0) {
      const r = 4 * Math.sinh(delta) ** 2 / invQ2;
      const n = r + a2, d = r + inverseA2;
      output[i] += DB * Math.log(n / d);
      if (columns) {
        const slope = DB * (1 / n - 1 / d);
        columns[0][i] = -slope * (4 / invQ2) * Math.sinh(2 * delta);
        columns[1][i] = .5 * (a2 / n + inverseA2 / d);
        columns[2][i] = 2 * r * slope;
      }
    } else {
      const r = Math.exp(2 * kind * delta);
      const p = a - r, u = 1 - a * r, shared = a * r * invQ2;
      const n = p * p + shared, d = u * u + shared;
      output[i] += gain / 2 + DB * Math.log(n / d);
      if (columns) {
        columns[0][i] = -2 * kind * r * DB * ((-2 * p + a * invQ2) / n - (-2 * a * u + a * invQ2) / d);
        columns[1][i] = .5 + DB * LOG_GAIN * a * ((2 * p + r * invQ2) / n - (-2 * r * u + r * invQ2) / d);
        columns[2][i] = -2 * shared * DB * (1 / n - 1 / d);
      }
    }
  }
}

function evaluate(sections: Section[], grid: Float64Array, desired: Float64Array, weights: number[], columns?: Float64Array[]) {
  const response = new Float64Array(grid.length);
  sections.forEach((value, i) => section(value, grid, response, columns?.slice(i * 3, i * 3 + 3)));
  const residual = response.map((value, i) => value - desired[i]);
  const offset = mean(residual);
  // The second half penalizes combined boost above 6 dB without enforcing an artificial hard ceiling.
  const error = new Float64Array(grid.length * 2);
  for (let i = 0; i < grid.length; i++) {
    error[i] = weights[i] * (residual[i] - offset);
    error[grid.length + i] = 2 * Math.max(0, response[i] - PEAK_CAP);
  }
  if (columns) for (const column of columns) {
    const offset = mean(column.subarray(0, grid.length));
    for (let i = 0; i < grid.length; i++) {
      column[grid.length + i] = response[i] > PEAK_CAP ? 2 * column[i] : 0;
      column[i] = weights[i] * (column[i] - offset);
    }
  }
  return { error, response, cost: dot(error, error) };
}

function dictionary(grid: Float64Array, weights: number[]) {
  const kinds: Kind[] = [0, 1, -1];
  const qs = [.45, .65, .9, 1.25, 1.8, 2.6, 3.8, 5.5, 8];
  return kinds.flatMap(kind => Array.from({ length: kind ? 49 : 145 }, (_, i) =>
    (kind ? qs.slice(0, 5) : qs).map(q => {
      const center = grid[0] + (grid.at(-1)! - grid[0]) * i / (kind ? 48 : 144);
      const definition = { center, kind, gain: 1, logQ: Math.log(q) };
      const response = new Float64Array(grid.length);
      section(definition, grid, response);
      const offset = mean(response);
      const basis = response.map((value, j) => weights[j] * (value - offset));
      return { definition, basis, power: dot(basis, basis) };
    })).flat());
}

function seed(initial: Section[], bands: number, grid: Float64Array, desired: Float64Array,
  shapes: ReturnType<typeof dictionary>, weights: number[], allowShelves: boolean) {
  const result = initial.slice();
  const used = new Set<number>();
  while (result.length < bands) {
    const { error } = evaluate(result, grid, desired, weights);
    let bestIndex = -1, bestGain = 0, best = -Infinity;
    const kinds = new Set(result.map(value => value.kind));
    for (const [i, { definition, basis, power }] of shapes.entries()) {
      if (used.has(i) || definition.kind && (!allowShelves || kinds.has(definition.kind))) continue;
      const projection = -dot(basis, error);
      const gain = clamp(projection / power, -16, 16);
      const improvement = 2 * projection * gain - power * gain * gain;
      if (improvement > best) { best = improvement; bestIndex = i; bestGain = gain; }
    }
    result.push({ ...shapes[bestIndex].definition, gain: bestGain });
    used.add(bestIndex);
  }
  return result;
}

/** Solve the positive definite damped normal equations by Cholesky factorization. */
function step(normal: Float64Array, gradient: Float64Array, damping: number, locked: boolean[]) {
  const n = gradient.length, lower = new Float64Array(normal.length);
  const answer = new Float64Array(n);
  for (let row = 0; row < n; row++) {
    for (let col = 0; col <= row; col++) {
      let value = locked[row] || locked[col] ? Number(row === col) : normal[row * n + col];
      if (row === col && !locked[row]) value += damping * (value + .01);
      for (let k = 0; k < col; k++) value -= lower[row * n + k] * lower[col * n + k];
      lower[row * n + col] = row === col ? Math.sqrt(value) : value / lower[col * n + col];
    }
    let value = locked[row] ? 0 : -gradient[row];
    for (let k = 0; k < row; k++) value -= lower[row * n + k] * answer[k];
    answer[row] = value / lower[row * n + row];
  }
  for (let row = n - 1; row >= 0; row--) {
    let value = answer[row];
    for (let k = row + 1; k < n; k++) value -= lower[k * n + row] * answer[k];
    answer[row] = value / lower[row * n + row];
  }
  return answer;
}

function refine(initial: Section[], grid: Float64Array, desired: Float64Array, weights: number[]): Candidate {
  let sections = initial, damping = .01;
  const size = sections.length * 3;
  const low = sections.flatMap(() => [grid[0], -16, Math.log(.35)]);
  const high = sections.flatMap(({ kind }) => [grid.at(-1)!, 16, Math.log(kind ? 3 : 8)]);
  const columns = Array.from({ length: size }, () => new Float64Array(grid.length * 2));
  const normal = new Float64Array(size * size);
  let current = evaluate(sections, grid, desired, weights, columns);
  for (let iteration = 0; iteration < 105; iteration++) {
    const gradient = Float64Array.from(columns, column => dot(column, current.error));
    for (let i = 0; i < size; i++) for (let j = 0; j <= i; j++) normal[i * size + j] = dot(columns[i], columns[j]);
    const values = sections.flatMap(value => [value.center, value.gain, value.logQ]);
    const locked = values.map((value, i) => value <= low[i] + 1e-9 && gradient[i] > 0 || value >= high[i] - 1e-9 && gradient[i] < 0);
    let accepted = false;
    for (let attempt = 0; attempt < 9; attempt++) {
      const delta = step(normal, gradient, damping, locked);
      const movement = Math.max(1, ...delta.map((value, i) => Math.abs(value) / (i % 3 === 1 ? 5 : .7)));
      const next = values.map((value, i) => clamp(value + delta[i] / movement, low[i], high[i]));
      const trial = sections.map((value, i) => ({ ...value, center: next[i * 3], gain: next[i * 3 + 1], logQ: next[i * 3 + 2] }));
      const candidate = evaluate(trial, grid, desired, weights);
      if (candidate.cost < current.cost) {
        const improvement = current.cost - candidate.cost;
        sections = trial;
        current = evaluate(sections, grid, desired, weights, columns);
        if (improvement < 1e-8 * Math.max(1, current.cost)) return { sections, cost: current.cost };
        damping = Math.max(1e-7, damping / 2.5);
        accepted = true;
        break;
      }
      damping *= 5;
    }
    if (!accepted) break;
  }
  return { sections, cost: current.cost };
}

let prepared: { rate: number; grid: Float64Array; shapes: Map<number[], ReturnType<typeof dictionary>> } | undefined;

export function fitJointEq(raw: Point[], target: Point[], rate: number, bandLimit: FitBands = 20): PeqFilter[] {
  if (!prepared || prepared.rate !== rate) {
    const grid = Float64Array.from(fitGrid, hz => Math.log(Math.tan(Math.PI * hz / rate)));
    prepared = { rate, grid, shapes: new Map() };
  }
  const { grid } = prepared;
  const weights = bandLimit === 10 ? tenBandWeights : defaultWeights;
  let shapes = prepared.shapes.get(weights);
  if (!shapes) {
    shapes = dictionary(grid, weights);
    prepared.shapes.set(weights, shapes);
  }
  const desired = Float64Array.from(fitGrid, hz => at(target, hz) - at(raw, hz));
  let best: Candidate = { sections: [], cost: Infinity };
  for (let bands = 10; bands <= bandLimit; bands += 5) {
    const layouts = [seed(best.sections, bands, grid, desired, shapes, weights, true), seed([], bands, grid, desired, shapes, weights, false)];
    if (best.sections.length) layouts.push(seed([], bands, grid, desired, shapes, weights, true));
    best = layouts.map(layout => refine(layout, grid, desired, weights)).reduce((a, b) => a.cost <= b.cost ? a : b);
  }
  const names = { 0: "PK", 1: "LSC", [-1]: "HSC" } as const;
  return best.sections.map(value => ({
    type: names[value.kind],
    hz: clamp(rate / Math.PI * Math.atan(Math.exp(value.center)), 20, 20_000),
    gain: value.gain,
    q: Math.exp(value.logQ),
  })).sort((a, b) => a.hz - b.hz);
}
