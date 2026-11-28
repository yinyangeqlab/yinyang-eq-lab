import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { eqCoefficients, type EqFilter } from "../../../site/lib/blind-eq";
import { FIT_BANDS, JOINT_FITTER, jointFitterVersion } from "../../../site/lib/fitter-settings";
import { fitJointEq } from "../../../site/lib/joint-fit";
import { at, fitGrid, validatePoints } from "../../../site/lib/peqdb-engine";
import type { Point } from "../../../site/lib/curves";

type Fixture = { name: string; points: Point[]; target: Point[] };
type Filter = Omit<EqFilter, "type"> & { type: keyof typeof filterTypes };
type NativeCoefficients = [b0: number, b1: number, b2: number, a1: number, a2: number];
type Capture = { name: string; bands: number; filters: Filter[]; nativeCoefficients?: NativeCoefficients[] };

const filterTypes = { PK: "PK", LSQ: "LSC", HSQ: "HSC" } as const;
const captureTypes = { PK: "PK", LSC: "LSQ", HSC: "HSQ" } as const;
const snapshotDate = "2026-11-25";
const sampleRate = 48_000;
const all = FIT_BANDS;
const upTo20 = [10, 15, 20];
const sources = [
  { tool: "YinYang EQ", name: "YinYang Fixed Bands", capture: "yinyang-standard", budgets: all },
  { tool: "YinYang EQ", name: "YinYang Movable Bands", capture: "yinyang-precise", budgets: all },
  { tool: "YinYang EQ", name: "YinYang PEQdB Unsmoothed", capture: "yinyang-peqdb", budgets: all },
  { tool: "YinYang EQ", name: "YinYang PEQdB Smoothed", capture: "yinyang-peqdb-smoothed", budgets: all },
  { tool: "PEQdB Studio", name: "PEQdB Studio Standard", capture: "studio-standard", budgets: upTo20 },
  { tool: "PEQdB Studio", name: "PEQdB Studio Precise", capture: "studio-precise", budgets: upTo20 },
  { tool: "Squiglink", name: "Squiglink Auto EQ (6 kHz)", capture: "squig-6000", budgets: upTo20, extended: "squig-6000-extended" },
  { tool: "Squiglink", name: "Squiglink Auto EQ (20 kHz)", capture: "squig-20000", budgets: upTo20, extended: "squig-20000-extended" },
  { tool: "Hangout Audio", name: "Hangout Audio Auto EQ", capture: "hangout", budgets: upTo20, extended: "hangout-extended" },
  { tool: "AutoEq.app", name: "AutoEq.app Custom PEQ", capture: "autoeq-custom", budgets: all, extended: "autoeq-extended" },
  { tool: "modernGraphTool", name: "modernGraphTool Exact match", capture: "modern-exact", budgets: all, extended: "modern-exact-extended" },
  { tool: "modernGraphTool", name: "modernGraphTool Treble-safe", capture: "modern-treble-safe", budgets: all, extended: "modern-treble-safe-extended" },
  { tool: "Tryptify", name: "Tryptify Peaking", capture: "tryptify-peaking", budgets: [10, 20] },
  { tool: "Tryptify", name: "Tryptify Shelf ends", capture: "tryptify-shelf-ends", budgets: [10, 20] },
  { tool: "CurveLab", name: "CurveLab Auto PEQ", capture: "curvelab", budgets: [10] },
  { tool: "Audio Discourse", name: "Audio Discourse Auto EQ", capture: "audio-discourse-extended", budgets: upTo20 },
  { tool: "Bedrock Reviews", name: "Bedrock Reviews Auto EQ", capture: "bedrock-extended", budgets: upTo20 },
  { tool: "HiFiEndgame", name: "HiFiEndgame Auto EQ", capture: "hifiendgame-extended", budgets: upTo20 },
  { tool: "Boizoff", name: "Boizoff Auto EQ", capture: "boizoff-extended", budgets: upTo20 },
  { tool: "Unheard Lab", name: "Unheard Lab Auto EQ", capture: "unheard-lab-extended", budgets: upTo20 },
  { tool: "CSI-Zone", name: "CSI-Zone Auto EQ", capture: "csi-zone-6000-extended", budgets: upTo20 },
];

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function measure(fixture: Fixture, capture: Capture) {
  const { filters, nativeCoefficients } = capture;
  const active = filters.filter(filter => filter.gain !== 0);
  const coefficients = nativeCoefficients?.map(([b0, b1, b2, a1, a2]) =>
    ({ feedforward: [b0, b1, b2], feedback: [1, a1, a2] }))
    ?? active.map(filter => eqCoefficients({ ...filter, type: filterTypes[filter.type] }, sampleRate));
  const response = fitGrid.map(hz => {
    const w = 2 * Math.PI * hz / sampleRate;
    const power = ([x, y, z]: number[]) =>
      (x + y * Math.cos(w) + z * Math.cos(2 * w)) ** 2 + (y * Math.sin(w) + z * Math.sin(2 * w)) ** 2;
    return coefficients.reduce((sum, { feedforward, feedback }) =>
      sum + 10 * Math.log10(power(feedforward) / power(feedback)), 0);
  });
  const residual = fitGrid.map((hz, index) => response[index] + at(fixture.points, hz) - at(fixture.target, hz));
  const offset = average(residual);
  const errors = residual.map(value => Math.abs(value - offset));
  const androidRangeResidual = residual.filter((_, index) => fitGrid[index] >= 30 && fitGrid[index] <= 6_000);
  const androidRangeOffset = average(androidRangeResidual);
  const rms = (low: number, high: number) => Math.sqrt(average(errors
    .filter((_, index) => fitGrid[index] >= low && fitGrid[index] <= high)
    .map(value => value ** 2)));
  const sortedErrors = [...errors].sort((a, b) => a - b);
  return {
    active_filters: active.length,
    rms_20Hz_to_10kHz_db: rms(20, 10_000),
    rms_20Hz_to_20kHz_db: rms(20, 20_000),
    rms_20Hz_to_200Hz_db: rms(20, 200),
    rms_5kHz_to_10kHz_db: rms(5_000, 10_000),
    rms_10kHz_to_20kHz_db: rms(10_000, 20_000),
    p95_absolute_error_db: sortedErrors[Math.ceil(sortedErrors.length * .95) - 1],
    max_absolute_error_db: sortedErrors.at(-1)!,
    peak_combined_boost_db: Math.max(0, ...response),
    peak_combined_boost_20Hz_to_80Hz_db: Math.max(0, ...response.filter((_, index) => fitGrid[index] <= 80)),
    max_single_filter_boost_db: Math.max(0, ...active.map(filter => filter.gain)),
    max_single_filter_cut_db: Math.max(0, ...active.map(filter => -filter.gain)),
    filters_at_or_above_16kHz_with_6dB_gain_magnitude:
      active.filter(filter => filter.hz >= 16_000 && Math.abs(filter.gain) >= 6).length,
    rms_30Hz_to_6kHz_db: Math.sqrt(average(androidRangeResidual.map(value => (value - androidRangeOffset) ** 2))),
  };
}

const [inputDirectory, csvPath, summaryPath, jointFlag, jointDate, additionalFlag, additionalDate, ...extra] = process.argv.slice(2);
assert(inputDirectory && csvPath && summaryPath, "Provide the input directory and destinations for the scores and ranking summary.");
assert(extra.length === 0 && (!jointFlag || jointFlag === "--joint-fit-date" && jointDate) &&
  (!additionalFlag || jointDate && additionalFlag === "--additional-joint-fit-date" && additionalDate),
  "Use --joint-fit-date YYYY-MM-DD followed optionally by --additional-joint-fit-date YYYY-MM-DD.");
for (const value of [jointDate, additionalDate].filter(Boolean)) {
  const date = new Date(value);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(value) && value > snapshotDate &&
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value,
    "New fits need a measurement date after the original snapshot.");
}
assert(!additionalDate || additionalDate >= jointDate);
const read = (filename: string) => JSON.parse(readFileSync(join(inputDirectory, filename), "utf8"));
const fixtures: Fixture[] = [...read("fixtures.json"), read("studio-fixture.json")];
assert.equal(fixtures.length, 7);
assert.equal(new Set(fixtures.map(fixture => fixture.name)).size, fixtures.length);
for (const { points, target } of fixtures) {
  validatePoints(points);
  validatePoints(target);
}

const round = (value: number) => Number(value.toFixed(5));
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return average([sorted[Math.floor((sorted.length - 1) / 2)], sorted[Math.floor(sorted.length / 2)]]);
};
type Metrics = ReturnType<typeof measure>;
const keys = Object.keys(measure(fixtures[0], { name: fixtures[0].name, bands: 10, filters: [] })) as (keyof Metrics)[];
const columns = ["snapshot_date", "sample_rate_hz", "headphone", "bands", "platform", "tool", "fitter", ...keys];
const rows: (string | number)[][] = [];
const summarize = (fitter: string, tool: string, budget: number, captures: Capture[], platform = "web", date = snapshotDate) => {
  const scores = fixtures.map(fixture => {
    const matches = captures.filter(capture => capture.name === fixture.name && capture.bands === budget);
    assert.equal(matches.length, 1, `Expected one ${fitter} result for ${fixture.name} at ${budget} bands`);
    const capture = matches[0];
    assert(capture.filters.length <= budget && capture.filters.every(filter =>
      Object.hasOwn(filterTypes, filter.type) && Number.isFinite(filter.hz) && filter.hz > 0 &&
      filter.hz < sampleRate / 2 && Number.isFinite(filter.q) && filter.q > 0 && Number.isFinite(filter.gain)),
    `Invalid filter capture for ${fitter} / ${fixture.name} / ${budget}`);
    if (capture.nativeCoefficients) {
      assert.equal(capture.nativeCoefficients.length, capture.filters.length);
      assert(capture.nativeCoefficients.every(row => row.length === 5 && row.every(Number.isFinite)));
    }
    const metrics = measure(fixture, capture);
    assert(Object.values(metrics).every(Number.isFinite));
    rows.push([date, sampleRate, fixture.name, budget, platform, tool, fitter, ...keys.map(key => round(metrics[key]))]);
    return metrics;
  });
  return {
    fitter, tool, budget, cases: scores.length,
    medians: Object.fromEntries(keys.map(key => [key, round(median(scores.map(score => score[key])))])),
  };
};
const baseline = all.map(budget => summarize("Before EQ", "", budget,
  fixtures.map(({ name }) => ({ name, bands: budget, filters: [] })), "reference"));
const scores = sources.flatMap(({ tool, name, capture, budgets, extended }) => {
  const captures: Capture[] = [...read(capture + "-fits.json"), ...(extended ? read(extended + "-fits.json") : [])];
  assert.equal(captures.length, fixtures.length * budgets.length, `Unexpected case count for ${name}`);
  return budgets.map(budget => summarize(name, tool, budget, captures));
});
const androidCaptures: Capture[] = read("loundess-peq-fits.json");
assert.equal(androidCaptures.length, fixtures.length * all.length);
const androidReference = all.map(budget =>
  summarize("Loundess PEQ Squig AutoEQ", "Loundess PEQ", budget, androidCaptures, "android"));

function scoreJointFit(bands: typeof FIT_BANDS[number], date: string) {
  const captures = fixtures.map(({ name, points, target }) => {
    const filters = fitJointEq(points, target, sampleRate, bands).map(filter => ({
      ...filter, type: captureTypes[filter.type ?? "PK"],
    }));
    assert.equal(filters.length, bands, `Unexpected filter count for ${name}`);
    return { name, bands, filters };
  });
  scores.push(summarize(`YinYang Joint Fit ${bands}`, "YinYang EQ", bands, captures, "web", date));
}

if (jointDate) scoreJointFit(JOINT_FITTER.bands, jointDate);
const additionalBudgets = FIT_BANDS.filter(bands => bands !== JOINT_FITTER.bands);
if (additionalDate) for (const bands of additionalBudgets) scoreJointFit(bands, additionalDate);

const csvCell = (value: string | number) => typeof value === "string" && /[",\r\n]/.test(value)
  ? `"${value.replaceAll('"', '""')}"`
  : value;
writeFileSync(csvPath, [columns, ...rows].map(row => row.map(csvCell).join(",")).join("\n") + "\n");
const snapshot = {
  date: snapshotDate, fixtureCount: fixtures.length, sampleRate, baseline, scores, androidReference,
  ...(jointDate ? { jointFit: { date: jointDate, version: jointFitterVersion(JOINT_FITTER.bands) } } : {}),
  ...(additionalDate ? { additionalJointFit: { date: additionalDate, budgets: additionalBudgets, version: jointFitterVersion(additionalBudgets[0]) } } : {}),
};
writeFileSync(summaryPath, JSON.stringify(snapshot, null, 2) + "\n");
console.log(`Scored ${scores.length * fixtures.length} web fits across ${new Set(sources.map(({ tool }) => tool)).size} tools, plus ${androidCaptures.length} Android fits and before-EQ baselines.`);
