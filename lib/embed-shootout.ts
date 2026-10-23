// Shared, dependency-free logic for anonymous shareable shootouts: round
// planning, input validation, curve bands, loudness matching and statistics.
// The server, the listening UI and the tests all use these exact functions.

export const EMBED_MIN_TARGETS = 2;
export const EMBED_MAX_TARGETS = 4;
export const EMBED_MAX_RUNS = 2000;
export const EMBED_RETENTION_DAYS = 180;
export const EMBED_SHARE_NOTICE = "embed-share-v1";
export const EMBED_SIGNALS = ["noise", "pad", "beat"] as const;
export const EMBED_SIGNAL_CODES = ["noise", "pad", "beat", "file"] as const;
export const EMBED_LISTENER_KINDS = ["headphones", "iem", "speakers", "other", "unknown"] as const;
export type EmbedSignal = (typeof EMBED_SIGNALS)[number];
export type EmbedSignalCode = (typeof EMBED_SIGNAL_CODES)[number];
export type ListenerKind = (typeof EMBED_LISTENER_KINDS)[number];

/** [targetA, targetB, result (0 = A wins, 1 = B wins, 2 = tie), plan A was shown second (0/1), signal code index] */
export type StoredPick = [number, number, 0 | 1 | 2, 0 | 1, number];
export type RunRow = { hour: number; kind: ListenerKind; sighted: boolean; picks: StoredPick[] };

export type RoundPlan = { a: number; b: number; signal: EmbedSignal };

/** Every pairing once; two targets repeat the pair on each signal so consistency is measurable. */
export function planRounds(targetCount: number): RoundPlan[] {
  if (!Number.isInteger(targetCount) || targetCount < EMBED_MIN_TARGETS || targetCount > EMBED_MAX_TARGETS) throw new Error("A shootout needs two to four targets.");
  const pairs: [number, number][] = [];
  for (let a = 0; a < targetCount; a++) for (let b = a + 1; b < targetCount; b++) pairs.push([a, b]);
  if (pairs.length === 1) return EMBED_SIGNALS.map(signal => ({ a: 0, b: 1, signal }));
  return pairs.map(([a, b], index) => ({ a, b, signal: EMBED_SIGNALS[index % EMBED_SIGNALS.length] }));
}

const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const SHOOTOUT_ID_PATTERN = /^[a-hj-km-np-z2-9]{10}$/;
export const MANAGE_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function newShootoutId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, byte => ID_ALPHABET[byte % ID_ALPHABET.length]).join("");
}
export function newManageKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
export async function hashManageKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("embed-shootout-manage\0" + key));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function cleanTitle(value: unknown): string {
  const text = String(value ?? "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return text || "Blind shootout";
}

export class EmbedInputError extends Error {}

/** Parses a finished run from the listening page. Throws EmbedInputError on anything unexpected. */
export function parseRun(targetCount: number, body: Record<string, unknown>): { kind: ListenerKind; sighted: boolean; picks: StoredPick[] } {
  const plan = planRounds(targetCount);
  const raw = body.picks;
  if (!Array.isArray(raw) || raw.length !== plan.length) throw new EmbedInputError("Finish every round before sending your picks.");
  const seen = new Set<number>();
  const picks: StoredPick[] = new Array(plan.length);
  for (const item of raw) {
    if (!item || typeof item !== "object") throw new EmbedInputError("Invalid pick.");
    const { round, winner, flipped, signal } = item as Record<string, unknown>;
    if (!Number.isInteger(round) || (round as number) < 0 || (round as number) >= plan.length || seen.has(round as number)) throw new EmbedInputError("Invalid round.");
    if (winner !== "a" && winner !== "b" && winner !== "tie") throw new EmbedInputError("Invalid choice.");
    if (typeof flipped !== "boolean") throw new EmbedInputError("Invalid order.");
    const signalIndex = EMBED_SIGNAL_CODES.indexOf(signal as EmbedSignalCode);
    if (signalIndex < 0) throw new EmbedInputError("Invalid signal.");
    seen.add(round as number);
    const { a, b } = plan[round as number];
    picks[round as number] = [a, b, winner === "a" ? 0 : winner === "b" ? 1 : 2, flipped ? 1 : 0, signalIndex];
  }
  const kind = body.kind === undefined ? "unknown" : body.kind;
  if (!EMBED_LISTENER_KINDS.includes(kind as ListenerKind)) throw new EmbedInputError("Invalid listening setup.");
  return { kind: kind as ListenerKind, sighted: body.sighted === true, picks };
}

// ---------------------------------------------------------------- curves

/** ISO one-third-octave centers, 31.5 Hz – 16 kHz. */
export const BAND_HZ = [31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000] as const;

/** Resamples a [Hz, dB] curve to the bands, normalised to 0 dB at 1 kHz and rounded to 0.1 dB. */
export function curveBands(points: readonly (readonly [number, number])[]): number[] {
  const sorted = points.filter(([hz, db]) => Number.isFinite(hz) && Number.isFinite(db) && hz > 0).sort((p, q) => p[0] - q[0]);
  if (sorted.length < 2) throw new Error("A curve needs at least two points.");
  const at = (hz: number) => {
    if (hz <= sorted[0][0]) return sorted[0][1];
    if (hz >= sorted[sorted.length - 1][0]) return sorted[sorted.length - 1][1];
    let i = 1;
    while (sorted[i][0] < hz) i++;
    const [x0, y0] = sorted[i - 1], [x1, y1] = sorted[i];
    return y0 + (y1 - y0) * Math.log(hz / x0) / Math.log(x1 / x0);
  };
  const reference = at(1000);
  return BAND_HZ.map(hz => Math.round(Math.max(-24, Math.min(24, at(hz) - reference)) * 10) / 10);
}

const power = (db: number) => 10 ** (db / 10);
/**
 * Loudness-matching trims in dB. Each curve is brought to the same mean band
 * power (125 Hz – 8 kHz), then all trims shift together so no curve's loudest
 * band can exceed 0 dBFS-relative headroom. An approximation, not a LUFS measurement.
 */
export function playbackTrims(curves: readonly (readonly number[])[]): number[] {
  const lo = BAND_HZ.indexOf(125), hi = BAND_HZ.indexOf(8000);
  const match = curves.map(curve => -10 * Math.log10(curve.slice(lo, hi + 1).reduce((sum, db) => sum + power(db), 0) / (hi - lo + 1)));
  const peak = Math.max(...curves.map((curve, i) => Math.max(...curve) + match[i]));
  const shift = Math.min(0, -peak - 1);
  return match.map(value => Math.round((value + shift) * 100) / 100);
}

// ----------------------------------------------------------- statistics

export function wilson(successes: number, n: number, z = 1.96): [number, number] {
  if (n <= 0) return [0, 1];
  const p = successes / n, d = 1 + z * z / n;
  const center = (p + z * z / (2 * n)) / d, half = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

type Tally = { runs: number; scores: number[] };
export type TargetStat = { index: number; wins: number; losses: number; ties: number; comparisons: number; score: number; low: number; high: number; favorite: number };
export type EmbedSummary = {
  runs: number; sightedRuns: number; decided: number;
  targets: TargetStat[];
  pairs: { a: number; b: number; aWins: number; bWins: number; ties: number }[];
  sideBias: { decided: number; pickedFirstShown: number };
  repeatAgreement: { agree: number; total: number } | null;
  byKind: Partial<Record<ListenerKind, Tally>>;
  bySignal: Partial<Record<EmbedSignalCode, Tally>>;
  timeline: { day: number; runs: number }[];
};

/** Summarises blind runs only; peeked (sighted) runs are counted but kept out of every score. */
export function summarize(targetCount: number, rows: readonly RunRow[]): EmbedSummary {
  const blind = rows.filter(row => !row.sighted);
  const stats = Array.from({ length: targetCount }, (_, index) => ({ index, wins: 0, losses: 0, ties: 0, favorite: 0 }));
  const pairMap = new Map<string, { a: number; b: number; aWins: number; bWins: number; ties: number }>();
  const byKind: EmbedSummary["byKind"] = {}, bySignal: EmbedSummary["bySignal"] = {};
  let decided = 0, pickedFirstShown = 0, agree = 0, agreeTotal = 0;
  const addTally = <K extends string>(map: Partial<Record<K, Tally>>, key: K, scores: number[]) => {
    const tally = map[key] ?? (map[key] = { runs: 0, scores: new Array(targetCount).fill(0) });
    tally.runs++;
    scores.forEach((value, i) => { tally.scores[i] += value; });
  };
  const days = new Map<number, number>();
  for (const row of blind) {
    const runScore = new Array(targetCount).fill(0);
    const signalScores = new Map<EmbedSignalCode, number[]>();
    const winners = new Set<number>();
    for (const [a, b, code, flipped, signalIndex] of row.picks) {
      const key = `${a}-${b}`;
      const pair = pairMap.get(key) ?? { a, b, aWins: 0, bWins: 0, ties: 0 };
      pairMap.set(key, pair);
      const signal = EMBED_SIGNAL_CODES[signalIndex] ?? "noise";
      const roundScores = signalScores.get(signal) ?? new Array(targetCount).fill(0);
      signalScores.set(signal, roundScores);
      if (code === 2) {
        stats[a].ties++; stats[b].ties++; pair.ties++;
        runScore[a] += .5; runScore[b] += .5; roundScores[a] += .5; roundScores[b] += .5;
      } else {
        const win = code === 0 ? a : b, lose = code === 0 ? b : a;
        stats[win].wins++; stats[lose].losses++;
        if (code === 0) pair.aWins++; else pair.bWins++;
        runScore[win] += 1; roundScores[win] += 1;
        decided++;
        if ((code === 0 && !flipped) || (code === 1 && flipped)) pickedFirstShown++;
        winners.add(win);
      }
    }
    const best = Math.max(...runScore), leaders = runScore.flatMap((value, i) => value === best ? [i] : []);
    if (leaders.length === 1) stats[leaders[0]].favorite++;
    if (targetCount === 2) {
      const decisive = row.picks.filter(pick => pick[2] !== 2);
      if (decisive.length >= 2) { agreeTotal++; if (new Set(decisive.map(pick => pick[2])).size === 1) agree++; }
    }
    addTally(byKind, row.kind, runScore);
    for (const [signal, scores] of signalScores) addTally(bySignal, signal, scores);
    const day = Math.floor(row.hour / 24);
    days.set(day, (days.get(day) ?? 0) + 1);
  }
  const targets = stats.map(stat => {
    const comparisons = stat.wins + stat.losses + stat.ties, successes = stat.wins + stat.ties / 2;
    const [low, high] = wilson(successes, comparisons);
    return { ...stat, comparisons, score: comparisons ? successes / comparisons : 0, low, high };
  });
  const timeline = [...days].sort((p, q) => p[0] - q[0]).slice(-30).map(([day, runs]) => ({ day, runs }));
  return {
    runs: blind.length, sightedRuns: rows.length - blind.length, decided, targets,
    pairs: [...pairMap.values()].sort((p, q) => p.a - q.a || p.b - q.b),
    sideBias: { decided, pickedFirstShown },
    repeatAgreement: targetCount === 2 ? { agree, total: agreeTotal } : null,
    byKind, bySignal, timeline,
  };
}

export const KIND_LABELS: Record<ListenerKind, string> = { headphones: "Over-ear headphones", iem: "In-ear monitors", speakers: "Speakers", other: "Something else", unknown: "Prefer not to say" };
export const SIGNAL_LABELS: Record<EmbedSignalCode, string> = { noise: "Pink noise", pad: "Synth pad", beat: "Beat & bass", file: "Own file" };
