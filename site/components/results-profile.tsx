"use client";

import { targetDisplayName, trialDisplayLabels } from "@/lib/target-labels";
import { useEffect, useMemo, useState } from "react";
import type { HeadphoneMeasurement } from "@/lib/measurement";
import { parsePersonalRuns, personalAppearance, personalStandings, PERSONAL_KEY, PERSONAL_RETIREMENT_RULE, PERSONAL_TOURNAMENT_SCHEDULER, type PersonalChoice, type PersonalRun } from "@/lib/personal-shootout";
import PersonalAppearanceBar from "@/components/personal-appearance";
import "./results-profile.css";
import ComparisonDataActions from "@/components/comparison-data-actions";
import { checkReliability } from "@/lib/preference-ranking";

export type Trial = {
  id: string; adminTestOnly?:boolean; matchedPassageRequired?:boolean;matchedPassage?:boolean; serverTrialId?: string; sessionId?: string; result?: "a" | "b" | "tie"; catchTrial?: boolean; createdAt: number; pair: [string, string]; pairNames: [string, string]; winnerId: string;
  winnerName: string; loserName: string; recorded: boolean; researchRecorded?: boolean; mode?: "blind" | "bring" | "open"; type: string;
  reasonSide?: "a" | "b"; reasonTags?: string[]; otherReason?: string;
  measurementId?: string; measurementName: string | null; device: string | null; rig: string | null;
  heardA: number; heardB: number; overlapSeconds: number; songTitle: string;
  eqFits?: { bands: number; rms: number; preamp: number }[];
};

function TrialRemovalActions({row,onDeleteBrowser}:{row:Trial;onDeleteBrowser?:(id:string)=>void}) {
  return <>
    <ComparisonDataActions row={row} onDeleted={onDeleteBrowser} />
    {onDeleteBrowser && <button type="button" onClick={()=>{if(window.confirm("Remove this browser copy only? This will change your local headphone tally, but will NOT delete server submissions or update shared rankings."))onDeleteBrowser(row.id);}}>Remove browser copy only (keeps server data)</button>}
  </>;
}

type Measurement = Pick<HeadphoneMeasurement, "id" | "name" | "device" | "rig">;
type Mode = "trials" | "personal";
type Result = "a" | "b" | "tie" | "skip";
type Entry = {
  id: string;
  measurementKey: string;
  measurementLabel: string;
  at: number;
  pair: Trial["pair"];
  names: Trial["pairNames"];
  result: Result | undefined;
} & ({ kind: "trial"; trial: Trial } | { kind: "personal"; run: PersonalRun; choice: PersonalChoice });

function measurementLabel(name: string | null, device: string | null, rig: string | null) {
  return [...new Set([name, device, rig].map(value => value?.trim()).filter(Boolean))].join(" · ") || "Measurement not recorded";
}

function measurementSignature(name: string | null, device: string | null, rig: string | null) {
  return JSON.stringify([name, device, rig].map(value => value?.trim().toLowerCase() ?? ""));
}

function entriesFor(trials: Trial[], runs: PersonalRun[], measurements: Measurement[]): Entry[] {
  const known = new Map<string, Set<string>>();
  function remember(id: string | undefined, name: string | null, device: string | null, rig: string | null) {
    if (!id || !name) return;
    const signature = measurementSignature(name, device, rig);
    const ids = known.get(signature) ?? new Set<string>();
    ids.add(id);
    known.set(signature, ids);
  }
  for (const row of [...measurements, ...runs.flatMap(run => run.measurement ? [run.measurement] : [])]) remember(row.id, row.name, row.device, row.rig);
  for (const row of trials) remember(row.measurementId, row.measurementName, row.device, row.rig);

  const trialEntries = trials.flatMap(raw => {
    if (!Array.isArray(raw.pair) || raw.pair.length !== 2 || !Array.isArray(raw.pairNames) || !Number.isFinite(raw.createdAt)) return [];
    const trial = trialDisplayLabels({ ...raw, pairNames: [raw.pairNames[0] || raw.pair[0], raw.pairNames[1] || raw.pair[1]] });
    const signature = measurementSignature(trial.measurementName, trial.device, trial.rig);
    const matching = known.get(signature);
    const id = trial.measurementId || (matching?.size === 1 ? [...matching][0] : undefined);
    const result = trial.result || (trial.winnerId === trial.pair[0] ? "a" : trial.winnerId === trial.pair[1] ? "b" : undefined);
    return [{
      kind: "trial", trial, id: trial.id, at: trial.createdAt, pair: trial.pair, names: trial.pairNames, result,
      measurementKey: id ? `id:${id}` : `legacy:${signature}`,
      measurementLabel: measurementLabel(trial.measurementName, trial.device, trial.rig),
    } satisfies Entry];
  });
  const personalEntries = runs.flatMap(run => {
    const names = new Map(run.candidates.map(candidate => [candidate.id, targetDisplayName(candidate.id, candidate.name)]));
    const saved = run.measurement;
    const earlierHeadphone = run.label.split(/ · (?:In-Ear|Over-Ear) · /)[0];
    const label = saved ? measurementLabel(saved.name, saved.device, saved.rig) : `${earlierHeadphone} · earlier setup · ${dayKey(run.updatedAt)}`;
    return run.choices.map((choice, index) => ({
      kind: "personal", run, choice, id: `${run.context}:${index}`, at: choice.at, pair: choice.pair,
      names: [names.get(choice.pair[0])!, names.get(choice.pair[1])!], result: choice.result,
      measurementKey: saved ? `id:${saved.id}` : `personal:${run.context}`, measurementLabel: label,
    } satisfies Entry));
  });
  return [...trialEntries, ...personalEntries].sort((a, b) => b.at - a.at);
}

const modeLabel = (trial: Trial) => trial.mode === "blind" ? "Blind Research · Listening Pool" : trial.mode === "bring" ? "Blind Research · Own music" : "Open Shootout";
const dayKey = (time: number) => new Date(time).toLocaleDateString();
const isDistinct = (entry: Entry) => entry.pair[0] !== entry.pair[1] && !(entry.kind === "trial" && entry.trial.catchTrial);
const isAnswered = (entry: Entry) => !!entry.result && entry.result !== "skip";
const pairKey = (entry: Entry) => JSON.stringify([entry.measurementKey, entry.kind === "personal" ? entry.run.context : entry.trial.mode || "open", ...[...entry.pair].sort()]);

function ResultsShortlist({ entries, personal }: { entries: Entry[]; personal: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const comparisons = entries.filter(entry => isDistinct(entry) && isAnswered(entry));
  if (personal) {
    const runs = [...new Set(comparisons.flatMap(entry => entry.kind === "personal" ? [entry.run] : []))];
    return <section className="private-list collection-results-panel" aria-label="Personal Tournament rankings">
      <h2>Personal Tournament rankings</h2>
      {runs.some(run => run.schedulerVersion === PERSONAL_TOURNAMENT_SCHEDULER) && <p className="footnote">{PERSONAL_RETIREMENT_RULE}</p>}
      {runs.length ? runs.map(run => <TournamentRanking key={run.context} run={run}/>) : <p className="footnote">Answer a tournament comparison to build your rankings.</p>}
    </section>;
  }
  type Tally = { id: string; name: string; wins: number; losses: number; ties: number; total: number };
  const tallies = new Map<string, Tally>();
  for (const entry of comparisons) {
    entry.pair.forEach((id, index) => {
      const tally = tallies.get(id) ?? { id, name: entry.names[index], wins: 0, losses: 0, ties: 0, total: 0 };
      tally.total++;
      if (entry.result === "tie") tally.ties++;
      else if (entry.result === (index === 0 ? "a" : "b")) tally.wins++;
      else tally.losses++;
      tallies.set(id, tally);
    });
  }
  const score = (row: Tally) => (row.wins + row.ties * .5) / row.total;
  const rows = [...tallies.values()].sort((a, b) => score(b) - score(a) || b.total - a.total || a.name.localeCompare(b.name));
  return <section className="private-list collection-results-panel" aria-label="Ranking shortlist">
    <h2>Ranking shortlist</h2>
    <p className="footnote">All dates · {comparisons.length} answered {comparisons.length === 1 ? "comparison" : "comparisons"} across {rows.length} targets in this view. Ties count as half a preference. This is your listening record.</p>
    {rows.length ? <>
      <div className="personal-model-head" aria-hidden="true"><span>Target</span><span>Wins / losses / ties</span><span>Preference</span></div>
      {(expanded ? rows : rows.slice(0, 5)).map((row, index) => <div className="personal-model-row" key={row.id}>
        <span><b>{index + 1}. {row.name}</b>{row.total < 10 && <small>Provisional</small>}</span>
        <span aria-label={`${row.wins} wins, ${row.losses} losses, ${row.ties} ties`}>{row.wins} / {row.losses} / {row.ties}</span>
        <strong>{Math.round(score(row) * 100)}%</strong>
      </div>)}
      {rows.length > 5 && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Show shortlist" : `Show all ${rows.length} targets`}</button>}
    </> : <p className="footnote">Answer a trial with two different targets to build this shortlist.</p>}
  </section>;
}

function TournamentRanking({ run }: { run: PersonalRun }) {
  const [expanded, setExpanded] = useState(false);
  const standings = useMemo(() => personalStandings(run), [run]);
  const rows = standings.filter(row => row.heard > 0 && !run.excluded.includes(row.id))
    .concat(standings.filter(row => !row.heard || run.excluded.includes(row.id)));
  const appearance = useMemo(() => personalAppearance(run, standings), [run, standings]);
  return <section className="collection-tournament-ranking">
    <h3>{run.label}</h3>
    <div className="personal-model-head" aria-hidden="true"><span>Target</span><span>Wins / losses / ties</span><span>Preferred</span></div>
    {(expanded ? rows : rows.slice(0, 5)).map(row => {
      const name = targetDisplayName(row.id, row.name);
      return <div className="personal-model-row" key={row.id}>
        <div><b>{name}</b><PersonalAppearanceBar appearance={appearance.get(row.id)} name={name}/></div>
        <span aria-label={`${row.wins} wins, ${row.losses} losses, ${row.ties} ties`}>{row.wins} / {row.losses} / {row.ties}</span>
        <strong>{row.heard ? `${Math.round((row.wins + row.ties * .5) / row.heard * 100)}%` : "—"}</strong>
      </div>;
    })}
    {rows.length > 5 && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Show shortlist" : `Show all ${rows.length} targets`}</button>}
  </section>;
}

function TrialDetails({ entry, repeated, onDeleteBrowser }: {
  entry: Entry; repeated: Entry[]; onDeleteBrowser?: (id: string) => void;
}) {
  const [a, b] = entry.names;
  const answer = entry.result === "tie" ? "Unsure / tie" : entry.result === "skip" ? "Skipped" : entry.result ? `Prefer ${entry.result.toUpperCase()}` : "No answer saved";
  if (entry.kind === "personal") {
    const { choice, run } = entry;
    return <div className="trial-detail">
      <p><b>Answer</b> · {answer} · {a} (A) vs {b} (B)</p>
      <p><b>Setup</b> · {entry.measurementLabel} · {run.label}</p>
      <p><b>Stage</b> · {choice.phase === "confirm" ? "Finalist check" : "Explore & compare"}</p>
      {choice.heardSeconds && <p><b>Listening</b> · A {choice.heardSeconds[0].toFixed(1)} s · B {choice.heardSeconds[1].toFixed(1)} s</p>}
      <a href="/shootout/personal">Manage saved runs in Personal Tournament →</a>
    </div>;
  }
  const { trial } = entry;
  const scores = repeated.map(row => row.result === "tie" ? .5 : row.result && row.result !== "skip" && row.pair[row.result === "a" ? 0 : 1] === trial.pair[0] ? 1 : 0);
  const rate = scores.length ? scores.reduce<number>((sum, value) => sum + value, 0) / scores.length : 0;
  const sd = scores.length > 1 ? Math.sqrt(scores.reduce<number>((sum, value) => sum + (value - rate) ** 2, 0) / (scores.length - 1)) : 0;
  return <div className="trial-detail">
    <p><b>Answer</b> · {answer} · {a} (A) vs {b} (B)</p>
    <p><b>Measurement</b> · {entry.measurementLabel}</p>
    <p><b>Listening</b> · A {trial.heardA}s · B {trial.heardB}s · overlap {trial.overlapSeconds}s{trial.songTitle ? ` · ${trial.songTitle}` : ""}</p>
    <p><b>Reasons for {trial.reasonSide?.toUpperCase() || "selected side"}</b> · {trial.reasonTags?.length ? trial.reasonTags.join(", ") : "No reasons saved in this browser result"}{trial.otherReason ? ` · ${trial.otherReason}` : ""}</p>
    {trial.eqFits?.length ? <p><b>EQ fit</b> · A {trial.eqFits[0]?.bands ?? "—"} bands, {trial.eqFits[0]?.rms ?? "—"} dB RMS · B {trial.eqFits[1]?.bands ?? "—"} bands, {trial.eqFits[1]?.rms ?? "—"} dB RMS · shared preamp {Math.min(trial.eqFits[0]?.preamp ?? 0, trial.eqFits[1]?.preamp ?? 0)} dB</p> : null}
    {!isDistinct(entry) ? <p><b>Same-filter check</b> · Both sides used identical settings.</p> : scores.length > 1 &&
      <p><b>Pair consistency</b> · {scores.length} trials for this measurement and mode · A preference score {Math.round(rate * 100)}% · sample SD {sd.toFixed(3)}</p>}
    <TrialRemovalActions row={trial} onDeleteBrowser={onDeleteBrowser}/>
  </div>;
}

function TrialDiagnostics({ entries, pairs }: { entries: Entry[]; pairs: Map<string, Entry[]> }) {
  const trials = entries.flatMap(entry => entry.kind === "trial" ? [entry.trial] : []);
  const checks = trials.filter(trial => trial.catchTrial);
  const correct = checks.filter(trial => trial.result === "tie").length;
  const rate = checks.length ? correct / checks.length : null;
  const sd = rate !== null && checks.length > 1 ? Math.sqrt(rate * (1 - rate) * checks.length / (checks.length - 1)) : null;
  const repeated = [...pairs.values()].filter(group => group.length > 1 && isDistinct(group[0]));
  const agreement = repeated.length ? repeated.reduce((sum, group) => {
    const firstId = group[0].pair[0];
    const ties = group.filter(row => row.result === "tie").length;
    const wins = group.filter(row => (row.result === "a" || row.result === "b") && row.pair[row.result === "a" ? 0 : 1] === firstId).length;
    return sum + Math.max(ties, wins, group.length - ties - wins) / group.length;
  }, 0) / repeated.length : null;
  const identical = trials.filter(row => row.mode !== "open" && row.pair[0] === row.pair[1]);
  const calibration = checkReliability(identical.filter(row => row.result === "tie").length, identical.length);
  return <details className="results-diagnostics">
    <summary>Comparison totals and repeated-setting checks</summary>
    <p>{trials.length} saved trials · {trials.filter(row => row.recorded).length} ranking submissions · {trials.filter(row => !row.recorded && !row.researchRecorded).length} other saved trials.</p>
    <p>Repeated pair agreement · {agreement === null ? "—" : `${Math.round(agreement * 100)}%`}. This is the average majority choice rate for pairs tried more than once.</p>
    <p>Same-filter checks · {checks.length} · tie answers {rate === null ? "—" : `${Math.round(rate * 100)}%`} · accuracy SD {sd === null ? "—" : sd.toFixed(3)}.</p>
    <p>Identical-setting check summary · {identical.length ? `${Math.round(calibration.mean * 100)}% ± ${Math.round(calibration.sd * 100)} percentage points SD (${identical.length} checks; Beta(2, 2) prior)` : "No identical-setting checks yet"}.</p>
    <p>These checks describe recorded choices and carry no ranking weight.</p>
  </details>;
}

function PersonalCheckpoints({ entries, date }: { entries: Entry[]; date: string }) {
  const runs = new Map(entries.flatMap(entry => entry.kind === "personal" ? [[entry.run.context, entry.run] as const] : []));
  const checkpoints = [...runs.values()].flatMap(run => (run.history ?? []).map(checkpoint => ({ run, checkpoint })))
    .filter(({ checkpoint }) => !date || dayKey(checkpoint.at) === date)
    .sort((a, b) => b.checkpoint.at - a.checkpoint.at);
  const [limit, setLimit] = useState(10);
  if (!checkpoints.length) return null;
  return <details className="collection-checkpoints">
    <summary>Saved tournament checkpoints ({checkpoints.length})</summary>
    {checkpoints.slice(0, limit).map(({ run, checkpoint }, index) => {
      const favorite = checkpoint.leaders.find(row => row.id === checkpoint.favorite);
      return <article key={`${run.context}:${checkpoint.at}:${index}`}>
        <strong>{new Date(checkpoint.at).toLocaleString()}</strong>
        <p>{run.label} · {checkpoint.comparisons} comparisons</p>
        {checkpoint.leaders.length ? <ol>{checkpoint.leaders.map(row => {
          const name = targetDisplayName(row.id, row.name);
          return <li key={row.id}>{row === favorite && "Favorite · "}{name}<PersonalAppearanceBar appearance={row.appearance} name={name}/></li>;
        })}</ol> : <p>No answered comparisons at this checkpoint</p>}
      </article>;
    })}
    {checkpoints.length > limit && <button type="button" onClick={() => setLimit(value => value + 10)}>Show more checkpoints</button>}
  </details>;
}

const PAGE_SIZE = 15;

export default function ResultsProfile({ trials, measurements, onDeleteBrowser }: {
  trials: Trial[]; measurements: HeadphoneMeasurement[]; onDeleteBrowser?: (id: string) => void;
}) {
  const [personal, setPersonal] = useState<{ runs: PersonalRun[]; error: boolean }>({ runs: [], error: false });
  const [mode, setMode] = useState<Mode>("trials");
  const [test, setTest] = useState("");
  const [measurement, setMeasurement] = useState("");
  const [date, setDate] = useState("");
  const [target, setTarget] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    function load() {
      try { setPersonal({ runs: parsePersonalRuns(localStorage.getItem(PERSONAL_KEY)), error: false }); }
      catch { setPersonal({ runs: [], error: true }); }
    }
    function changed(event: StorageEvent) {
      if (!event.key || event.key === PERSONAL_KEY || event.key === "yinyang-erasure-event") load();
    }
    load();
    window.addEventListener("storage", changed);
    window.addEventListener("yinyang-data-changed", load);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener("yinyang-data-changed", load);
    };
  }, []);

  const entries = useMemo(() => entriesFor(trials, personal.runs, measurements), [trials, personal.runs, measurements]);
  const modes = entries.filter(row => mode === "personal" ? row.kind === "personal" : row.kind === "trial" && (!test || test === (row.trial.mode || "open")));
  const measurementOptions = new Map<string, string>();
  for (const row of modes) if (!measurementOptions.has(row.measurementKey)) measurementOptions.set(row.measurementKey, row.measurementLabel);
  const activeMeasurement = measurementOptions.has(measurement) ? measurement : "";
  const scope = modes.filter(row => !activeMeasurement || row.measurementKey === activeMeasurement);
  const dates = [...new Set(scope.map(row => dayKey(row.at)))];
  const activeDate = dates.includes(date) ? date : "";
  const dated = scope.filter(row => !activeDate || dayKey(row.at) === activeDate);
  const targets = new Map(dated.flatMap(row => row.pair.map((id, i) => [id, row.names[i]] as const)));
  const activeTarget = targets.has(target) ? target : "";
  const shown = dated.filter(row => !activeTarget || row.pair.includes(activeTarget));
  const pairs = new Map<string, Entry[]>();
  for (const row of scope.filter(isAnswered)) {
    const key = pairKey(row);
    const repeated = pairs.get(key) ?? [];
    repeated.push(row);
    pairs.set(key, repeated);
  }

  return <div className="collection-results">
    <div className="collection-result-modes" role="group" aria-label="Result type">
      <button type="button" aria-pressed={mode === "trials"} onClick={() => { setMode("trials"); setLimit(PAGE_SIZE); }}>Blind &amp; Open trials</button>
      <button type="button" aria-pressed={mode === "personal"} onClick={() => { setMode("personal"); setLimit(PAGE_SIZE); }}>Personal Tournament</button>
    </div>
    <section className="private-list collection-results-panel" aria-label={mode === "personal" ? "Personal Tournament history" : "Trials and results"}>
      <h2>{mode === "personal" ? "Personal Tournament history" : "Trials and results"}</h2>
      <p className="footnote">{mode === "personal" ? "Individual choices from your saved tournament setups. " : "Your saved Blind Research and Open Shootout choices. "}
        <a href={mode === "personal" ? "/shootout/personal" : "/my-data"}>{mode === "personal" ? "Open Personal Tournament" : "Manage submitted data"}</a>
      </p>
      {mode === "personal" && personal.error && <p role="alert">Saved tournament progress could not be read.</p>}
      <div className="collection-result-filters">
        {mode === "trials" && <label>Shootout<select value={test} onChange={event => { setTest(event.currentTarget.value); setMeasurement(""); setDate(""); setTarget(""); setLimit(PAGE_SIZE); }}>
          <option value="">All Blind &amp; Open trials</option><option value="blind">Blind Research · Listening Pool</option><option value="bring">Blind Research · Own music</option><option value="open">Open Shootout</option>
        </select></label>}
        <label>Headphone measurement<select value={activeMeasurement} onChange={event => { setMeasurement(event.currentTarget.value); setDate(""); setTarget(""); setLimit(PAGE_SIZE); }}>
          <option value="">All measurements</option>
          {[...measurementOptions].sort((a, b) => a[1].localeCompare(b[1])).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label>Test date<select value={activeDate} onChange={event => { setDate(event.currentTarget.value); setTarget(""); setLimit(PAGE_SIZE); }}>
          <option value="">All dates</option>{dates.map(day => <option key={day} value={day}>{day}</option>)}
        </select></label>
        <label>Target<select value={activeTarget} onChange={event => { setTarget(event.currentTarget.value); setLimit(PAGE_SIZE); }}>
          <option value="">All targets</option>{[...targets].sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select></label>
      </div>
      <p className="footnote" role="status">{shown.length ? `Showing ${Math.min(shown.length, limit)} of ${shown.length} ${shown.length === 1 ? "trial" : "trials"}` : "No saved trials in this view."}</p>
      {shown.slice(0, limit).map(entry => <details className="trial-row" key={entry.id}>
        <summary>
          <strong>{entry.names.join(" vs ")}</strong> · {entry.result === "tie" ? "Unsure / tie" : entry.result === "skip" ? "Skipped" : entry.result ? `${entry.names[entry.result === "a" ? 0 : 1]} preferred` : "No answer saved"}
          <span>{new Date(entry.at).toLocaleString()} · {entry.measurementLabel} · {entry.kind === "personal"
            ? entry.run.adminTestOnly ? "Private test" : entry.choice.phase === "confirm" ? "Finalist check" : "Personal Tournament"
            : `${modeLabel(entry.trial)} · ${entry.trial.adminTestOnly ? "Private test" : !isDistinct(entry) ? "Same-filter check" : entry.trial.recorded ? "Ranked" : entry.trial.researchRecorded ? "Research saved" : "Browser copy"}`}</span>
        </summary>
        <TrialDetails entry={entry} repeated={pairs.get(pairKey(entry)) ?? []} onDeleteBrowser={onDeleteBrowser}/>
      </details>)}
      {shown.length > limit && <button type="button" onClick={() => setLimit(value => value + PAGE_SIZE)}>Show more trials</button>}
      {mode === "personal" && <PersonalCheckpoints key={`${activeMeasurement}:${activeDate}`} entries={scope} date={activeDate}/>}
      {mode === "trials" && scope.length > 0 && <TrialDiagnostics entries={scope} pairs={pairs}/>}
    </section>
    <ResultsShortlist key={`${mode}:${test}:${activeMeasurement}`} entries={scope} personal={mode === "personal"}/>
  </div>;
}
