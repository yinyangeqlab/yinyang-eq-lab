/** Exploratory participant-balanced fractional Bradley–Terry score.
 * Gaussian prior N(1500, 350²); Laplace SD from the full inverse Hessian.
 * Ties score one half. Each participant group has total likelihood weight one,
 * shared across its distinct pairs; all repeats enter each pair mean.
 * Laplace ranges are conditional on this scoring model, never population CIs.
 * Participant groups are authenticated accounts when known, otherwise browsers.
 */
export type RankingTarget = { id: string; name: string; creator: string };
export type RankingVote = { id: string; voterId: string; winnerId: string; loserId: string; result?: string | null; reliabilityWeight?: number | null };
export type CheckResult = { voterId: string; result: string };
export function checkReliability(correct: number, total: number) {
  const alpha = 2 + correct, beta = 2 + total - correct;
  return { mean: alpha / (alpha + beta), sd: Math.sqrt(alpha * beta / ((alpha + beta) ** 2 * (alpha + beta + 1))), checks: total };
}
export function listenerReliability(checks: CheckResult[]) {
  const counts = new Map<string, { correct: number; total: number }>();
  for (const check of checks) {
    const row = counts.get(check.voterId) ?? { correct: 0, total: 0 };
    row.total++; if (check.result === "tie") row.correct++;
    counts.set(check.voterId, row);
  }
  return new Map([...counts].map(([id, row]) => [id, checkReliability(row.correct, row.total)]));
}
const SCALE = 400 / Math.log(10), PRIOR_SD = 350, PRECISION = (SCALE / PRIOR_SD) ** 2;

function cholesky(matrix: number[][]) {
  const n = matrix.length, lower = Array.from({ length: n }, () => Array(n).fill(0) as number[]);
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let value = matrix[i][j];
    for (let k = 0; k < j; k++) value -= lower[i][k] * lower[j][k];
    lower[i][j] = i === j ? Math.sqrt(Math.max(value, 1e-12)) : value / lower[j][j];
  }
  return lower;
}
function solve(lower: number[][], rhs: number[]) {
  const n = rhs.length, y = Array(n).fill(0) as number[], x = [...y];
  for (let i = 0; i < n; i++) {
    let value = rhs[i]; for (let j = 0; j < i; j++) value -= lower[i][j] * y[j];
    y[i] = value / lower[i][i];
  }
  for (let i = n - 1; i >= 0; i--) {
    let value = y[i]; for (let j = i + 1; j < n; j++) value -= lower[j][i] * x[j];
    x[i] = value / lower[i][i];
  }
  return x;
}
export function rankPreferences(targets: RankingTarget[], votes: RankingVote[]) {
  const validTargets=new Set(targets.map(t=>t.id));
  const involved=new Set(votes.filter(v=>v.winnerId!==v.loserId&&validTargets.has(v.winnerId)&&validTargets.has(v.loserId)).flatMap(v=>[v.winnerId,v.loserId]));
  const rows = targets.filter(t=>involved.has(t.id)).map(({ id, name, creator }) => ({ id, name, creator, wins: 0, losses: 0, ties: 0, comparisons: 0, listeners: 0, effectiveComparisons: 0 }));
  const index = new Map(rows.map((target, i) => [target.id, i]));
  const listeners = rows.map(() => new Set<string>());
  const clusters = new Map<string, { a: number; b: number; n: number; sum: number; participant: string }>();
  const unique = new Set<string>();
  let count = 0;
  for (const vote of votes) {
    if (unique.has(vote.id)) continue; unique.add(vote.id);
    const ids = [vote.winnerId, vote.loserId].sort(), a = index.get(ids[0]), b = index.get(ids[1]);
    if (a === undefined || b === undefined || a === b) continue;
    const tie = vote.result === "tie", score = tie ? .5 : vote.winnerId === ids[0] ? 1 : 0;
    for (const i of [a, b]) { rows[i].comparisons++; listeners[i].add(vote.voterId); }
    if (tie) { rows[a].ties++; rows[b].ties++; }
    else { rows[index.get(vote.winnerId)!].wins++; rows[index.get(vote.loserId)!].losses++; }
    const key = JSON.stringify([vote.voterId, ...ids]);
    const group = clusters.get(key) ?? { a, b, n: 0, sum: 0, participant:vote.voterId };
    group.n++; group.sum += score; clusters.set(key, group); count++;
  }
  // Bound a participant's total contribution across pairs, not just repeats of
  // one pair. More browser sessions on the same verified account add no people.
  const pairCounts=new Map<string,number>();
  for(const group of clusters.values()) pairCounts.set(group.participant,(pairCounts.get(group.participant)||0)+1);
  const observations=[...clusters.values()].map(group=>({...group,score:group.sum/group.n,weight:1/pairCounts.get(group.participant)!}));
  for (const group of observations) for (const i of [group.a, group.b]) rows[i].effectiveComparisons += group.weight;
  const n = rows.length, x = Array(n).fill(0) as number[];
  function derivatives() {
    const gradient = x.map(value => value * PRECISION);
    const hessian = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? PRECISION : 0));
    for (const { a, b, score, weight } of observations) {
      const probability = 1 / (1 + Math.exp(-(x[a] - x[b])));
      const error = weight * (probability - score), information = weight * probability * (1 - probability);
      gradient[a] += error; gradient[b] -= error;
      hessian[a][a] += information; hessian[b][b] += information;
      hessian[a][b] -= information; hessian[b][a] -= information;
    }
    return { gradient, hessian };
  }
  function objective(at: number[]) {
    let value = at.reduce((sum, item) => sum + .5 * PRECISION * item * item, 0);
    for (const { a, b, score, weight } of observations) {
      const d = at[a] - at[b];
      value += weight * (Math.max(d, 0) + Math.log1p(Math.exp(-Math.abs(d))) - score * d);
    }
    return value;
  }
  for (let iteration = 0; iteration < 40 && n; iteration++) {
    const { gradient, hessian } = derivatives();
    if (Math.max(...gradient.map(Math.abs)) < 1e-8) break;
    const step = solve(cholesky(hessian), gradient), before = objective(x);
    let fraction = 1;
    while (fraction > 1e-8 && objective(x.map((value, i) => value - fraction * step[i])) > before) fraction /= 2;
    for (let i = 0; i < n; i++) x[i] -= fraction * step[i];
  }
  const lower = cholesky(derivatives().hessian);
  return { voteCount: count, participantGroups:pairCounts.size, uncertainty:"Conditional scoring-model range; not a population confidence interval", rows: rows.map((row, i) => {
    const unit = Array(n).fill(0); unit[i] = 1;
    const sd = Math.sqrt(Math.max(0, solve(lower, unit)[i])) * SCALE;
    const rating = 1500 + x[i] * SCALE;
    return { ...row, listeners: listeners[i].size, rating, sd, lower: rating - 1.96 * sd, upper: rating + 1.96 * sd };
  }).filter(row => row.comparisons > 0).sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id)) };
}
