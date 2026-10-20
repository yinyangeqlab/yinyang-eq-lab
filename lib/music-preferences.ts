export type MusicChoice = "keep" | "pass";
export type MusicCounts = Record<string, { keep: number; pass: number }>;
type Candidate = { url: string; group: string };

// One account has one current choice per recording. A neutral prior prevents
// a single Keep from behaving like a well-established unanimous preference.
export function rankMusic<T extends Candidate>(tracks: readonly T[], counts: MusicCounts): T[] {
  return [...tracks].sort((a, b) => {
    const x = counts[a.url] ?? { keep: 0, pass: 0 };
    const y = counts[b.url] ?? { keep: 0, pass: 0 };
    return (y.keep + 1) / (y.keep + y.pass + 2) - (x.keep + 1) / (x.keep + x.pass + 2)
      || y.keep - x.keep || a.url.localeCompare(b.url);
  });
}

export function musicRotation<T extends Candidate>(tracks: readonly T[], counts: MusicCounts, random = Math.random): T[] {
  const pool: T[] = [];
  for (const group of ["dynamic", "compact"]) {
    const ranked = rankMusic(tracks.filter(track => track.group === group), counts);
    pool.push(...ranked.slice(0, 10));
    // One challenger per group per cycle keeps the rest of the measured
    // library eligible to enter the top ten instead of freezing the shortlist.
    const challengers = ranked.slice(10);
    if (challengers.length) pool.push(challengers[Math.floor(random() * challengers.length)]);
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}
