import type { FitterSettings, FitProvenance } from "@/lib/fitter-settings";
import type { PersonalPlayback } from "@/lib/personal-playback";
// Local discovery policy v1. These are scheduling heuristics, not a calibrated
// best-arm identification procedure or a population preference estimator.
export const MAX_PERSONAL_CANDIDATES = 200;
export const PERSONAL_KEY = "target-lab-personal-shootouts-v1";
export type Candidate = { id: string; name: string; family: string };
export type PersonalChoice = {
  eqFits?: FitProvenance[]; pair: [string, string]; result: "a" | "b" | "tie" | "skip";
  heardSeconds?: [number, number];
  matchedPassageRequired?:boolean;matchedPassage?:boolean;recording: string; start: number; end: number; at: number; phase: "explore" | "confirm";
};
export type PersonalMusic = { mode: "pool" | "song" | "playlist" | "upload"; ids: string[] };
export type PersonalCheckpoint = { at: number; choices: number; comparisons: number; explored: number; phase: "explore" | "confirm"; favorite: string | null; leaders: { id: string; name: string; wins: number; losses: number; ties: number }[] };
export type PersonalRun = {
  version: 1; schedulerVersion?: "personal-v2"; adminTestOnly?:boolean; requireMatchedPassage?:boolean;context: string; label: string; candidates: Candidate[]; music?: PersonalMusic; playback?: PersonalPlayback; fitter?: FitterSettings;
  choices: PersonalChoice[]; excluded: string[]; restored: string[];
  pending: [string, string] | null; phase: "explore" | "confirm";
  finalists: string[]; budget: number; checkpoint: number; updatedAt: number;
  paused?: boolean; history?: PersonalCheckpoint[];
};
// Explicit known family only; unrelated curves by the same creator stay separate.
export function targetFamily(target: { id: string; name: string; parentTargetId?: string | null }) {
  if (/^MrChillStorm ISO 226 85 phon (?:0\.00|0\.25|0\.3661543|0\.50|0\.75|1\.00)$/.test(target.name)) return "mrchillstorm-iso226-85";
  return target.parentTargetId || target.id;
}
export function createPersonalRun(context: string, label: string, candidates: Candidate[], budget = 20): PersonalRun {
  if (candidates.length < 2 || candidates.length > MAX_PERSONAL_CANDIDATES) throw Error(`Choose 2–${MAX_PERSONAL_CANDIDATES} targets before starting. Your saved runs are unchanged.`);
  return { version: 1, schedulerVersion: "personal-v2", context, label, candidates, choices: [], excluded: [], restored: [], pending: null, phase: "explore", finalists: [], budget, checkpoint: budget, updatedAt: Date.now() };
}
const pairKey = (pair: string[]) => [...pair].sort().join("|");
export function personalStandings(run: PersonalRun) {
  const rows = run.candidates.map(candidate => ({ ...candidate, heard: 0, wins: 0, losses: 0, ties: 0, opponents: new Set<string>(), lostTo: new Set<string>(), score: 0, benched: false }));
  const index = new Map(rows.map((row, i) => [row.id, i]));
  const observations = run.choices.filter(c => c.result !== "skip");
  for (const c of observations) {
    const a = rows[index.get(c.pair[0])!], b = rows[index.get(c.pair[1])!];
    if (!a || !b) continue;
    a.heard++; b.heard++; a.opponents.add(b.id); b.opponents.add(a.id);
    if (c.result === "tie") { a.ties++; b.ties++; }
    else { const winner = c.result === "a" ? a : b, loser = c.result === "a" ? b : a; winner.wins++; loser.losses++; loser.lostTo.add(winner.id); }
  }
  // Ridge-regularized Bradley–Terry fit adjusts for opponent strength. A tie is
  // fractional evidence, not proof of equivalence. No confidence % is reported.
  for (let step = 0; step < 160; step++) {
    const gradient = rows.map(row => -.75 * row.score);
    const counts = rows.map(() => .75);
    for (const c of observations) {
      const a = index.get(c.pair[0]), b = index.get(c.pair[1]);
      if (a === undefined || b === undefined) continue;
      const p = 1 / (1 + Math.exp(rows[b].score - rows[a].score));
      const error = (c.result === "tie" ? .5 : c.result === "a" ? 1 : 0) - p;
      gradient[a] += error; gradient[b] -= error; counts[a]++; counts[b]++;
    }
    rows.forEach((row, i) => { row.score += .8 * gradient[i] / counts[i]; });
  }
  for (const row of rows) row.benched = !run.restored.includes(row.id) && row.heard >= 5 && row.losses - row.wins >= 4 && row.lostTo.size >= 3 && (row.wins + .5 * row.ties) / row.heard < .35;
  return rows.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
export function confirmationEvidence(run: PersonalRun, pair: string[]) {
  return new Set(run.choices.filter(c => c.phase === "confirm" && c.result !== "skip" && (c.matchedPassage !== false || run.requireMatchedPassage !== true && c.matchedPassageRequired === false && c.heardSeconds?.every(seconds => seconds > 0)) && !!c.recording && pairKey(c.pair) === pairKey(pair)).map(c => c.recording));
}
export function personalFavorite(run: PersonalRun) {
  if (run.schedulerVersion === "personal-v2" && !confirmationComplete(run)) return null;
  const shortlist = personalStandings(run).filter(row => row.heard > 0 && !run.excluded.includes(row.id) && (run.schedulerVersion!=="personal-v2" || run.finalists.includes(row.id))).slice(0,3);
  if (shortlist.length < 2) return null;
  const leader = shortlist[0];
  // Do not turn a model's arbitrary tie-break or a preference cycle into a winner.
  for (const other of shortlist.slice(1)) {
    let margin = 0;
    for (const c of run.choices) {
      if (c.result === "tie" || c.result === "skip" || pairKey(c.pair) !== pairKey([leader.id,other.id])) continue;
      margin += c.pair[c.result === "a" ? 0 : 1] === leader.id ? 1 : -1;
    }
    if (margin <= 0) return null;
  }
  return leader.id;
}
export function checkpointPersonalRun(run: PersonalRun): PersonalRun {
  const rows = personalStandings(run);
  const snapshot: PersonalCheckpoint = { at: Date.now(), choices: run.choices.length, comparisons: run.choices.filter(c => c.result !== "skip").length, explored: rows.filter(row => row.heard > 0).length, phase: run.phase, favorite: personalFavorite(run), leaders: rows.filter(row => row.heard > 0 && !run.excluded.includes(row.id)).slice(0,3).map(({id,name,wins,losses,ties}) => ({id,name,wins,losses,ties})) };
  const history = run.history ?? [], last = history.at(-1);
  if (last && last.choices === snapshot.choices && last.phase === snapshot.phase && JSON.stringify(last.leaders) === JSON.stringify(snapshot.leaders)) return run;
  if (history.length >= 1000) throw Error("Checkpoint history is full. Export this run before starting a new one.");
  return { ...run, history: [...history,snapshot] };
}
export function confirmationComplete(run: PersonalRun) {
  if (run.phase !== "confirm" || run.finalists.length < 2) return false;
  for (let i = 0; i < run.finalists.length; i++) for (let j = i + 1; j < run.finalists.length; j++) {
    if (confirmationEvidence(run, [run.finalists[i], run.finalists[j]]).size < 2) return false;
  }
  return true;
}
export function nextPersonalPair(run: PersonalRun, random = Math.random): [string, string] | null {
  const rows = personalStandings(run).filter(row => !run.excluded.includes(row.id));
  if (rows.length < 2) return null;
  const pick = <T,>(items: T[]): T => items[Math.min(items.length - 1, Math.floor(random() * items.length))];
  const orient = (a: string, b: string): [string, string] => random() < .5 ? [a, b] : [b, a];
  if (run.phase === "confirm") {
    const finalists = run.finalists.filter(id => rows.some(row => row.id === id));
    const pairs: [string, string][] = [];
    for (let i = 0; i < finalists.length; i++) for (let j = i + 1; j < finalists.length; j++) pairs.push([finalists[i], finalists[j]]);
    if (!pairs.length) return null;
    const min = Math.min(...pairs.map(pair => confirmationEvidence(run, pair).size));
    if (min >= 2) return null;
    const pair = pick(pairs.filter(pair => confirmationEvidence(run, pair).size === min));
    return orient(...pair);
  }
  if (run.schedulerVersion === "personal-v2") return progressivePair(run,rows,random);
  const last: string[] = run.choices.at(-1)?.pair ?? [];
  const active = rows.filter(row => !row.benched);
  const available = active.length >= 2 ? active : rows;
  const unseen = available.filter(row => row.heard === 0);
  const familyExposure = (family: string) => rows.filter(row => row.family === family).reduce((n, row) => n + row.heard, 0);
  const leastHeard = (pool: typeof rows) => {
    const min = Math.min(...pool.map(row => row.heard));
    const low = pool.filter(row => row.heard === min);
    const exposure = Math.min(...low.map(row => familyExposure(row.family)));
    return pick(low.filter(row => familyExposure(row.family) === exposure));
  };
  if (unseen.length) {
    const unseenCooled = unseen.filter(row => !last.includes(row.id));
    const a = leastHeard(unseenCooled.length ? unseenCooled : unseen);
    const others = available.filter(row => row.id !== a.id);
    const crossFamily = others.filter(row => row.family !== a.family);
    const secondPool = crossFamily.length ? crossFamily : others;
    const fresh = secondPool.filter(row => pairKey([a.id,row.id]) !== pairKey(last));
    const b = leastHeard(fresh.length ? fresh : secondPool);
    return orient(a.id, b.id);
  }
  // One quarter of rounds explores underheard targets; every tenth round gives
  // an automatically benched target another chance. Manual exclusions are final
  // until the listener restores them.
  const rescue = run.choices.length % 10 === 9 ? rows.filter(row => row.benched) : [];
  const exploration = rescue.length > 0 || random() < .25;
  const firstPool = rescue.length ? rescue : exploration ? available : available.slice(0, Math.min(4, available.length));
  const cooled = firstPool.filter(row => !last.includes(row.id));
  const a = exploration ? leastHeard(cooled.length ? cooled : firstPool) : pick(cooled.length ? cooled : firstPool);
  let opponents = available.filter(row => row.id !== a.id);
  const freshPair = opponents.filter(row => pairKey([a.id, row.id]) !== pairKey(last));
  if (freshPair.length) opponents = freshPair;
  const cross = opponents.filter(row => row.family !== a.family);
  if (cross.length && run.choices.length % 3 !== 0) opponents = cross;
  if (exploration) return orient(a.id, leastHeard(opponents).id);
  const priority = (row: typeof a) => row.score + Math.sqrt(2 * Math.log(run.choices.length + 2) / (row.heard + 1));
  const best = Math.max(...opponents.map(priority));
  return orient(a.id, pick(opponents.filter(row => priority(row) >= best - .15)).id);
}

/** New discovery procedure: connect newcomers to known contenders and compare contenders during coverage. */
function progressivePair(run: PersonalRun, rows: ReturnType<typeof personalStandings>, random: () => number): [string,string] | null {
  const pick = <T,>(items:T[]) => items[Math.min(items.length-1,Math.floor(random()*items.length))];
  const orient = (a:string,b:string):[string,string] => random()<.5?[a,b]:[b,a];
  const last:string[]=run.choices.at(-1)?.pair??[];
  const active=rows.filter(row=>!row.benched),available=active.length>=2?active:rows;
  const known=available.filter(row=>row.heard>0),unseen=available.filter(row=>row.heard===0);
  const meetings=(a:string,b:string)=>run.choices.filter(c=>c.result!=="skip"&&pairKey(c.pair)===pairKey([a,b])).length;
  const contenders=()=>{
    const top=known.slice(0,Math.min(6,known.length));
    const leaderScore=top[0].score;
    const a=pick(top.filter(row=>row.score>=leaderScore-.1));
    let others=top.filter(row=>row.id!==a.id);
    const notLast=others.filter(row=>pairKey([a.id,row.id])!==pairKey(last));if(notLast.length)others=notLast;
    const fewest=Math.min(...others.map(row=>meetings(a.id,row.id)));
    const fresh=others.filter(row=>meetings(a.id,row.id)===fewest);
    const best=Math.max(...fresh.map(row=>row.score));
    return orient(a.id,pick(fresh.filter(row=>row.score>=best-.1)).id);
  };
  // Every third decision connects likely contenders, even while the pool is still being introduced.
  if(known.length>=2 && run.choices.length%3===2)return contenders();
  if(unseen.length){
    const a=pick(unseen),winners=known.filter(row=>row.wins>0||row.ties>0),anchors=(winners.length?winners:known).slice(0,6);
    if(!anchors.length){const other=unseen.filter(row=>row.id!==a.id);return orient(a.id,pick(other).id);}
    const cooled=anchors.filter(row=>!last.includes(row.id));const options=cooled.length?cooled:anchors;
    const least=Math.min(...options.map(row=>row.heard));return orient(a.id,pick(options.filter(row=>row.heard===least)).id);
  }
  // Continue some coverage and periodically give benched targets another chance.
  const rescue=run.choices.length%10===9?rows.filter(row=>row.benched):[];
  if(rescue.length||random()<.25){
    const pool=rescue.length?rescue:available,least=Math.min(...pool.map(row=>row.heard));const a=pick(pool.filter(row=>row.heard===least));
    let others=available.filter(row=>row.id!==a.id);if(!others.length)others=rows.filter(row=>row.id!==a.id);
    const counts=Math.min(...others.map(row=>meetings(a.id,row.id)));return orient(a.id,pick(others.filter(row=>meetings(a.id,row.id)===counts)).id);
  }
  return contenders();
}

export function personalFinalistReadiness(run:PersonalRun) {
  const rows=personalStandings(run).filter(row=>!run.excluded.includes(row.id));
  const shortlist=rows.filter(row=>row.heard>0&&!row.benched).slice(0,3);
  if(run.schedulerVersion!=="personal-v2")return {ready:shortlist.length>=2,reason:"",ids:shortlist.map(row=>row.id)};
  const unseen=rows.filter(row=>row.heard===0).length;
  const result=(ready:boolean,reason:string)=>({ready,reason,ids:shortlist.map(row=>row.id)});
  if(unseen)return result(false,`${unseen} targets in this pool are still unheard. These are early contenders, not a confirmed shortlist.`);
  const minimumOpponents=Math.min(2,rows.length-1);
  if(shortlist.length<2||shortlist.some(row=>row.heard<3||row.opponents.size<minimumOpponents))return result(false,"Leading targets need at least three comparisons and more than one opponent before finalist checks.");
  const fourth=rows.filter(row=>row.heard>0&&!row.benched)[3];
  if(fourth&&Math.abs(fourth.score-shortlist[2].score)<1e-8)return result(false,"More than three contenders remain tied. Continue listening rather than choosing finalists by name or ID.");
  return result(true,"Ready to compare the leading targets on different songs.");
}
export function recordPersonalChoice(run: PersonalRun, choice: PersonalChoice): PersonalRun {
  if (!run.pending || pairKey(run.pending) !== pairKey(choice.pair) || run.pending[0] !== choice.pair[0]) throw Error("This matchup has changed. Please listen again.");
  if (run.choices.length >= 500) throw Error("This run has reached 500 comparisons. Export it, then start a new run.");
  return { ...run, choices: [...run.choices, choice], pending: null, updatedAt: Date.now() };
}
export function parsePersonalRuns(raw: string | null): PersonalRun[] {
  if (!raw) return [];
  const runs: unknown = JSON.parse(raw);
  if (!Array.isArray(runs) || runs.length > 8) throw Error("Personal progress could not be read. Export or clear the saved data before starting again.");
  for (const value of runs) {
    const r = value as PersonalRun;
    if (!r || r.version !== 1 || typeof r.context !== "string" || typeof r.label !== "string" || !Number.isFinite(r.updatedAt) || !Array.isArray(r.candidates) || r.candidates.length < 2 || r.candidates.length > MAX_PERSONAL_CANDIDATES || !Array.isArray(r.choices) || r.choices.length > 500 || !Array.isArray(r.excluded) || !Array.isArray(r.restored) || !Array.isArray(r.finalists) || ![10,20,40].includes(r.budget) || !Number.isInteger(r.checkpoint) || r.checkpoint < 0 || !["explore", "confirm"].includes(r.phase)) throw Error("Invalid saved personal run.");
    if(r.adminTestOnly!==undefined&&typeof r.adminTestOnly!=="boolean")throw Error("Invalid saved test mode.");
    if(r.requireMatchedPassage!==undefined&&typeof r.requireMatchedPassage!=="boolean")throw Error("Invalid saved passage requirement.");
    if (r.schedulerVersion !== undefined && r.schedulerVersion !== "personal-v2") throw Error("Unsupported saved scheduler version.");
    if (r.fitter && (!["standard","precise","peqdb"].includes(r.fitter.method)||![10,15,20,30].includes(r.fitter.bands))) throw Error("Invalid saved fitter settings.");
    if (r.playback && (!["-14","-16","-18","off"].includes(r.playback.loudnessTarget)||!["auto","uploaded","off"].includes(r.playback.channelMode))) throw Error("Invalid saved playback settings.");
    if (r.music && (!["pool","song","playlist","upload"].includes(r.music.mode) || !Array.isArray(r.music.ids) || r.music.ids.length > 200 || r.music.ids.some(id => typeof id !== "string") || r.music.mode === "song" && r.music.ids.length !== 1)) throw Error("Invalid saved music choices.");
    const ids = new Set(r.candidates.map(c => c?.id));
    if (ids.size !== r.candidates.length || r.candidates.some(c => !c || typeof c.id !== "string" || typeof c.name !== "string" || typeof c.family !== "string")) throw Error("Invalid saved target list.");
    if (r.paused !== undefined && typeof r.paused !== "boolean") throw Error("Invalid saved pause state.");
    if (r.history !== undefined) {
      if (!Array.isArray(r.history) || r.history.length > 1000) throw Error("Invalid checkpoint history.");
      for (const h of r.history) if (!h || !Number.isFinite(h.at) || !Number.isInteger(h.choices) || h.choices < 0 || h.choices > r.choices.length || !Number.isInteger(h.comparisons) || h.comparisons < 0 || h.comparisons > h.choices || !Number.isInteger(h.explored) || h.explored < 0 || h.explored > ids.size || !["explore","confirm"].includes(h.phase) || h.favorite !== null && !ids.has(h.favorite) || !Array.isArray(h.leaders) || h.leaders.length > 3 || h.leaders.some(t => !t || !ids.has(t.id) || typeof t.name !== "string" || ![t.wins,t.losses,t.ties].every(n => Number.isInteger(n) && n >= 0))) throw Error("Invalid saved checkpoint.");
    }
    const validPair = (pair: unknown): pair is [string,string] => Array.isArray(pair) && pair.length === 2 && pair[0] !== pair[1] && pair.every(id => typeof id === "string" && ids.has(id));
    if (r.pending !== null && !validPair(r.pending) || [...r.excluded,...r.restored,...r.finalists].some(id => !ids.has(id)) || r.finalists.length > 3) throw Error("Invalid saved pairing.");
    for (const c of r.choices) if (!c || c.heardSeconds !== undefined && (!Array.isArray(c.heardSeconds) || c.heardSeconds.length !== 2 || c.heardSeconds.some(n => !Number.isFinite(n) || n < 0)) || c.matchedPassageRequired!==undefined&&typeof c.matchedPassageRequired!=="boolean" || c.matchedPassage!==undefined&&typeof c.matchedPassage!=="boolean" || !validPair(c.pair) || !["a","b","tie","skip"].includes(c.result) || !["explore","confirm"].includes(c.phase) || typeof c.recording !== "string" || ![c.start,c.end,c.at].every(Number.isFinite) || c.end < c.start) throw Error("Invalid saved personal choice.");
  }
  return runs as PersonalRun[];
}
