export type MusicChoice = "keep" | "pass";
export type MusicCounts = Record<string, { keep: number; pass: number }>;
type Candidate = { url: string; songFamily?: string };

export function rankMusic<T extends Candidate>(tracks: readonly T[], counts: MusicCounts): T[] {
  return [...tracks].sort((a, b) => {
    const x = counts[a.url] ?? { keep: 0, pass: 0 }, y = counts[b.url] ?? { keep: 0, pass: 0 };
    return (y.keep + 1) / (y.keep + y.pass + 2) - (x.keep + 1) / (x.keep + x.pass + 2)
      || y.keep - x.keep || a.url.localeCompare(b.url);
  });
}

// Each cycle visits every song family once, choosing a version uniformly.
// Ratings and review flags never change eligibility or selection probability.
export function musicRotation<T extends Candidate>(tracks: readonly T[], _counts: MusicCounts = {}, random = Math.random): T[] {
  const families = new Map<string, T[]>();
  for (const track of tracks) {
    const key = track.songFamily || track.url;
    const family = families.get(key) ?? [];
    family.push(track); families.set(key, family);
  }
  const pool = [...families.values()].map(versions => versions[Math.floor(random() * versions.length)]);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

export function musicReview(counts = { keep: 0, pass: 0 }) {
  const total = counts.keep + counts.pass;
  const p = total ? counts.keep / total : 0;
  const z = 1.959963984540054;
  const upper = total ? (p + z*z/(2*total) + z*Math.sqrt(p*(1-p)/total + z*z/(4*total*total))) / (1+z*z/total) : 1;
  return { total, upper, flagged: total >= 50 && upper < .4 };
}

// Fixed gain only. A common lower target preserves peaks for version comparisons.
export function playbackTarget(tracks: readonly { integrated_lufs?: number; true_peak_dbtp?: number }[], target = -16) {
  return Math.min(target, ...tracks.flatMap(t => Number.isFinite(t.integrated_lufs) && Number.isFinite(t.true_peak_dbtp) ? [t.integrated_lufs! - 1 - t.true_peak_dbtp!] : []));
}
export function playbackGain(lufs: number | undefined, target = -16) {
  return Number.isFinite(lufs) ? 10 ** ((target - lufs!) / 20) : 1;
}
