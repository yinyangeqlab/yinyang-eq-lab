// RETIRED v1 mechanism. Kept for historical format/regression reference only.
// The API and migration 0022 block all new v1 releases. Do not re-enable it as a small-study archive.
import { ARCHIVE_TARGETS } from "@/lib/archive-targets";

export const ARCHIVE_YEARS = [2026, 2027, 2028] as const;
export const ARCHIVE_METHOD = "bounded-geometric-v1";
export const ARCHIVE_NOTICE_VERSION = "2026-10-18-v5";
export const ARCHIVE_MIN_NOISY_TOTAL = 40;
export type ArchiveInput = { subject_id: string; id: string; created_at: number; winner_id: string; loser_id: string };
export type ArchivePair = { targetA: string; targetB: string; estimatedAWins: number; estimatedBWins: number };
export type StatisticsArchive = { year: number; methodology: string; epsilon: number; maxContributionsPerAccount: number; minimumNoisyTotal: number; pairs: ArchivePair[] };

// Exact fair bits avoid floating-point inverse-CDF Laplace sampling. Difference of
// two Geom(1/2) variables has mass 2^-|z|/3. Adjacent integer bins differ by at most
// one per account, so the histogram mechanism has epsilon=ln(2), add/remove adjacency.
// Never store or expose the random tape, raw histogram, subjects or suppressed cells.
function geometric() {
  let count = 0;
  const word = new Uint32Array(1);
  while (true) { crypto.getRandomValues(word); if (word[0] & 1) return count; count++; }
}
function noise() { return geometric() - geometric(); }

export function buildStatisticsArchive(year: number, input: ArchiveInput[], sampleNoise: () => number = noise): StatisticsArchive {
  if (!(ARCHIVE_YEARS as readonly number[]).includes(year)) throw new Error("Archive budget exhausted or unsupported year");
  const allowed = new Set<string>(ARCHIVE_TARGETS.map(t=>t.id));
  // Deterministic one-per-account selection. No voter/browser fallback for legacy data.
  const first = new Map<string, ArchiveInput>();
  const start = Date.UTC(year, 0, 1), end = Date.UTC(year + 1, 0, 1);
  for (const row of input) {
    if (!row.subject_id || row.subject_id === "owner" || !row.subject_id.startsWith("invite:") || row.created_at < start || row.created_at >= end || !allowed.has(row.winner_id) || !allowed.has(row.loser_id) || row.winner_id === row.loser_id) continue;
    const prev = first.get(row.subject_id);
    if (!prev || row.created_at < prev.created_at || row.created_at === prev.created_at && row.id < prev.id) first.set(row.subject_id, row);
  }
  const exact = new Map<string, number[]>();
  for (const row of first.values()) {
    const [a,b] = [row.winner_id,row.loser_id].sort();
    const key = `${a}:${b}`, counts = exact.get(key) || [0,0];
    counts[row.winner_id === a ? 0 : 1]++; exact.set(key, counts);
  }
  const pairs: ArchivePair[] = [];
  const ids = [...allowed].sort();
  // Visit EVERY public pair and outcome, including zeros. Private-data-dependent
  // partition selection or an exact-k gate would leak membership information.
  for (let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++) {
    const counts = exact.get(`${ids[i]}:${ids[j]}`) || [0,0];
    const noisy = counts.map(count=>Math.max(0,count+sampleNoise()));
    // Thresholding and rounding operate only on the noised vector (post-processing).
    if (noisy.reduce((a,b)=>a+b,0) < ARCHIVE_MIN_NOISY_TOTAL) continue;
    pairs.push({targetA:ids[i],targetB:ids[j],estimatedAWins:noisy[0],estimatedBWins:noisy[1]});
  }
  return {year,methodology:ARCHIVE_METHOD,epsilon:Math.log(2),maxContributionsPerAccount:1,minimumNoisyTotal:ARCHIVE_MIN_NOISY_TOTAL,pairs};
}
