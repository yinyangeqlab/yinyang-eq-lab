"use client";

import { useState } from "react";
import snapshot from "@/data/eq-fitter-rankings.json";
import { FIT_BANDS, fitterNames, type FitBands } from "@/lib/fitter-settings";

const core = "rms_20Hz_to_10kHz_db";
const full = "rms_20Hz_to_20kHz_db";
const androidRange = "rms_30Hz_to_6kHz_db";
const metrics = [
  { key: core, label: "Through 10 kHz", heading: "RMS to 10 kHz" },
  { key: full, label: "Through 20 kHz", heading: "RMS to 20 kHz" },
  { key: "rms_10kHz_to_20kHz_db", label: "10–20 kHz", heading: "RMS 10–20 kHz" },
  { key: "rms_5kHz_to_10kHz_db", label: "5–10 kHz", heading: "RMS 5–10 kHz" },
  { key: "rms_20Hz_to_200Hz_db", label: "Bass", heading: "RMS 20–200 Hz" },
  { key: "p95_absolute_error_db", label: "95th percentile error", heading: "95th percentile error" },
  { key: "max_absolute_error_db", label: "Worst error", heading: "Worst error" },
  { key: "peak_combined_boost_db", label: "Peak boost", heading: "Peak boost" },
] as const;

function displayFitter(name: string) {
  if (name === "YinYang Fixed Bands") return `YinYang ${fitterNames.standard}`;
  if (name === "YinYang Movable Bands") return `YinYang ${fitterNames.precise}`;
  if (name.startsWith("YinYang Joint Fit ")) return `YinYang ${fitterNames.joint}`;
  return name;
}

const tools = [...new Set(snapshot.scores.map(row => row.tool))].map(tool => ({
  tool,
  budgets: FIT_BANDS.filter(budget => snapshot.scores.some(row => row.tool === tool && row.budget === budget)),
}));
type Metric = (typeof metrics)[number];

export default function EqFitterRankings() {
  const [budget, setBudget] = useState<FitBands>(10);
  const [metric, setMetric] = useState<Metric>(metrics[0]);
  const rows = snapshot.scores.filter(row => row.budget === budget)
    .sort((a, b) => a.medians[metric.key] - b.medians[metric.key] || a.fitter.localeCompare(b.fitter));
  const baseline = snapshot.baseline.find(row => row.budget === budget)!;
  const android = snapshot.androidReference.find(row => row.budget === budget)!;
  const supportingMetric = metric.key === core ? metrics[1] : metrics[0];

  return <>
    <div className="fitter-ranking-controls">
      <fieldset>
        <legend>Band budget</legend>
        <div className="fitter-ranking-options">
          {FIT_BANDS.map(count =>
            <button key={count} type="button" aria-pressed={count === budget} onClick={() => setBudget(count)}>{count} bands</button>
          )}
        </div>
      </fieldset>
      <fieldset>
        <legend>Rank by</legend>
        <div className="fitter-ranking-options">
          {metrics.map(option =>
            <button key={option.key} type="button" aria-pressed={option.key === metric.key} onClick={() => setMetric(option)}>{option.label}</button>
          )}
        </div>
      </fieldset>
    </div>
    <p role="status">{rows.length} configurations from {new Set(rows.map(row => row.tool)).size} tools at {budget} bands. Ranked by {metric.heading}.</p>
    <table className="fitter-score-table">
      <caption>Median across {snapshot.fixtureCount} measurement–target pairs, in dB</caption>
      <thead>
        <tr>
          <th scope="col">Rank</th>
          <th scope="col">Fitter</th>
          <th scope="col" aria-sort="ascending">{metric.heading}</th>
          <th scope="col">{supportingMetric.heading}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => {
          const value = row.medians[metric.key];
          const rank = rows.findIndex(other => other.medians[metric.key] === value) + 1;
          return <tr key={row.fitter}>
            <td>{rank}</td>
            <th scope="row">{displayFitter(row.fitter)}</th>
            <td>{rank === 1 ? <strong>{value.toFixed(3)}</strong> : value.toFixed(3)}</td>
            <td>{row.medians[supportingMetric.key].toFixed(3)}</td>
          </tr>;
        })}
      </tbody>
      <tfoot>
        <tr id="rootlessjamesdsp-reference">
          <td />
          <th scope="row">
            <strong>Loundess PEQ (RootlessJamesDSP fork)</strong>
            <span className="fitter-reference-note">Android reference. Fits 30 Hz–6 kHz. Median of {android.medians.active_filters} active filters.</span>
          </th>
          <td>{android.medians[metric.key].toFixed(3)}</td>
          <td>{android.medians[supportingMetric.key].toFixed(3)}</td>
        </tr>
        <tr>
          <td />
          <th scope="row">Before EQ</th>
          <td>{baseline.medians[metric.key].toFixed(3)}</td>
          <td>{baseline.medians[supportingMetric.key].toFixed(3)}</td>
        </tr>
      </tfoot>
    </table>
    <section aria-labelledby="android-fit-adherence">
      <h3 id="android-fit-adherence">RootlessJamesDSP fork, 30 Hz–6 kHz</h3>
      <p>Only frequencies in this range set the level offset and count toward the error score.</p>
      <table className="fitter-score-table">
        <caption>Median across {snapshot.fixtureCount} pairs. Before EQ, {baseline.medians[androidRange].toFixed(3)} dB RMS.</caption>
        <thead>
          <tr>
            <th scope="col">Band limit</th>
            <th scope="col">Active filters</th>
            <th scope="col">RMS error</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.androidReference.map(row => <tr key={row.budget}>
            <th scope="row">{row.budget} bands</th>
            <td>{row.medians.active_filters}</td>
            <td>{row.medians[androidRange].toFixed(3)} dB</td>
          </tr>)}
        </tbody>
      </table>
    </section>
    <details className="fitter-coverage">
      <summary>Band budgets tested by tool</summary>
      <p>Each ranking includes configurations that completed all seven pairs at the selected budget.</p>
      <dl>
        {tools.map(({ tool, budgets }) => <div key={tool}>
          <dt>{tool}</dt>
          <dd>{budgets.join(", ")} bands</dd>
        </div>)}
      </dl>
    </details>
  </>;
}
