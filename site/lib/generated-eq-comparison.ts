import type { FinalizedVariant } from "./preference-finalize";
import type { EqPreset } from "./blind-eq";
import { createPersonalRun, nextPersonalPair, personalStandings, personalFinalistReadiness, confirmationComplete, recordPersonalChoice, parsePersonalRuns, type PersonalRun } from "./personal-shootout";

export const GENERATED_EQ_STORAGE = "yinyang-generated-eq-comparisons-v1";
export type GeneratedComparison = { version: 1; signature: string; selected: number[]; run: PersonalRun; revealed: boolean; sampleRate: number };
export const generatedSignature = (context: unknown, variants: FinalizedVariant[]) => JSON.stringify({ context, variants });
export const generatedRecordingId = (track: { url: string; songFamily?: string; sha256?: string }) => track.songFamily ? `family:${track.songFamily}` : track.sha256 ? `file:${track.sha256}` : track.url;
export function generatedPreset(fit: FinalizedVariant): EqPreset {
  const channel = () => ({ preampDb: fit.preamp, filters: fit.filters.map(f => ({ ...f, type: f.type ?? "PK" as const })) });
  return { name: "Generated EQ result", channels: [channel(), channel()] };
}
export function generatedReadiness(run: PersonalRun) {
  const underheard = personalStandings(run).filter(row => row.heard < 2).length;
  if (underheard) return { ready: false, ids: [] as string[], reason: `${underheard} selected results still need at least two comparisons. No result is eliminated after one loss.` };
  return personalFinalistReadiness(run);
}
/** Balanced introductions precede the already versioned contender scheduler. */
export function generatedNextPair(run: PersonalRun, random = Math.random): [string, string] | null {
  if (run.phase === "confirm") return nextPersonalPair(run, random);
  const rows = personalStandings(run), minimum = Math.min(...rows.map(row => row.heard));
  if (minimum >= 2) return nextPersonalPair(run, random);
  const pick = <T,>(pool: T[]) => pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  const a = pick(rows.filter(row => row.heard === minimum));
  let others = rows.filter(row => row.id !== a.id);
  const fewest = Math.min(...others.map(row => row.heard)); others = others.filter(row => row.heard === fewest);
  const fresh = others.filter(row => !a.opponents.has(row.id)); if (fresh.length) others = fresh;
  const b = pick(others);
  return random() < .5 ? [a.id, b.id] : [b.id, a.id];
}
export function createGeneratedComparison(signature: string, selected: number[], variants: FinalizedVariant[], random = Math.random, sampleRate = 48000): GeneratedComparison {
  if (!Number.isFinite(sampleRate) || sampleRate < 3000 || sampleRate > 768000) throw Error("The playback sample rate is unavailable.");
  if (selected.length < 2 || selected.length > 20 || new Set(selected).size !== selected.length || selected.some(i => !Number.isInteger(i) || !variants[i])) throw Error("Select 2–20 generated results to compare.");
  const run = createPersonalRun(signature, "Selected generated EQ results", selected.map(i => ({ id: String(i), name: `Generated result ${i + 1}`, family: String(i) })));
  run.pending = generatedNextPair(run, random);
  return { version: 1, signature, selected: [...selected], run, revealed: false, sampleRate };
}
export function confirmGeneratedComparison(session: GeneratedComparison, random = Math.random) {
  const readiness = generatedReadiness(session.run);
  if (session.revealed || !readiness.ready) throw Error(readiness.reason || "This comparison has ended.");
  const run = { ...session.run, phase: "confirm" as const, finalists: readiness.ids, pending: null };
  return { ...session, run: { ...run, pending: generatedNextPair(run, random) } };
}
export function recordGeneratedComparison(session: GeneratedComparison, result: "a" | "b" | "tie" | "skip", song: string, evidence: { heard: [number, number]; start: number; seconds: number }, random = Math.random): GeneratedComparison {
  if (session.revealed || !session.run.pending) throw Error("This comparison has ended.");
  if (!["a", "b", "tie", "skip"].includes(result) || !song || song.length > 200 || !Number.isFinite(evidence.start) || evidence.start < 0 || !Number.isFinite(evidence.seconds) || evidence.seconds < 0 || evidence.seconds > 15.01) throw Error("Invalid comparison evidence.");
  if (result !== "skip" && (evidence.heard.length !== 2 || evidence.heard.some(n => !Number.isFinite(n) || n <= 0) || evidence.seconds <= 0)) throw Error("Play both A and B before choosing.");
  const run = recordPersonalChoice(session.run, { pair: session.run.pending, result, recording: song, heardSeconds: [...evidence.heard], start: evidence.start, end: evidence.start + evidence.seconds, at: Date.now(), phase: session.run.phase });
  return { ...session, run: { ...run, pending: generatedNextPair(run, random) } };
}
/** Only confirmation choices can establish the within-set listening result. */
export function generatedLeadingResult(run: PersonalRun): string | null {
  if (!confirmationComplete(run)) return null;
  return run.finalists.find(id => run.finalists.filter(other => other !== id).every(other => {
    let margin = 0;
    for (const choice of run.choices) if (choice.phase === "confirm" && choice.pair.includes(id) && choice.pair.includes(other) && (choice.result === "a" || choice.result === "b")) margin += choice.pair[choice.result === "a" ? 0 : 1] === id ? 1 : -1;
    return margin > 0;
  })) ?? null;
}
export function restoreGeneratedComparison(raw: string | null, signature: string, variants: FinalizedVariant[]): GeneratedComparison | null {
  if (!raw) return null;
  const value = JSON.parse(raw) as GeneratedComparison;
  if (value.signature !== signature) return null;
  if (value.version !== 1 || typeof value.revealed !== "boolean" || typeof value.sampleRate !== "number" || !Array.isArray(value.selected)) throw Error("Saved comparison is invalid.");
  // Reuse the run validator, then bind every candidate and choice to this exact generated set.
  createGeneratedComparison(signature, value.selected, variants, () => 0, value.sampleRate);
  const [run] = parsePersonalRuns(JSON.stringify([value.run]));
  if (run.context !== signature || run.schedulerVersion !== "personal-v2" || run.candidates.length !== value.selected.length || run.candidates.some((c, i) => c.id !== String(value.selected[i])) || run.excluded.length || run.restored.length || run.history?.length) throw Error("Saved comparison does not match these selected results.");
  return { version: 1, signature, selected: value.selected, run, revealed: value.revealed, sampleRate: value.sampleRate };
}
