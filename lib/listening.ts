export type Interval = { side: 0 | 1; start: number; end: number; rate: number };

function merged(rows: Interval[], side: 0 | 1): [number, number][] {
  const result: [number, number][] = [];
  for (const row of rows.filter(row => row.side === side).sort((a, b) => a.start - b.start)) {
    const last = result.at(-1);
    if (last && row.start <= last[1]) last[1] = Math.max(last[1], row.end);
    else result.push([row.start, row.end]);
  }
  return result;
}

function intersect(a: [number, number][], b: [number, number][]): [number, number][] {
  const result: [number, number][] = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    const start = Math.max(a[i][0], b[j][0]), end = Math.min(a[i][1], b[j][1]);
    if (end > start) result.push([start, end]);
    if (a[i][1] < b[j][1]) i++; else j++;
  }
  return result;
}

export function commonSegments(rows: Interval[]) { return intersect(merged(rows, 0), merged(rows, 1)); }
export function segmentOverlap(a: [number, number][], b: [number, number][]) {
  return intersect(a, b).reduce((sum, [start, end]) => sum + end - start, 0);
}

export function parseIntervals(input: unknown): Interval[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 200).flatMap((value): Interval[] => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    const { side, start, end, rate } = row;
    if ((side !== 0 && side !== 1) || ![start, end, rate].every(v => typeof v === "number" && Number.isFinite(v))) return [];
    if ((start as number) < 0 || (end as number) <= (start as number) || (end as number) > 86400 || (rate as number) < .5 || (rate as number) > 2) return [];
    return [{ side, start: start as number, end: end as number, rate: rate as number }];
  });
}

export function intervalStats(rows: Interval[]) {
  const heard = [0, 1].map(side => rows.filter(row => row.side === side).reduce((sum, row) => sum + (row.end - row.start) / row.rate, 0));
  const overlap = commonSegments(rows).reduce((sum, [start, end]) => sum + end - start, 0);
  return { heardA: +heard[0].toFixed(2), heardB: +heard[1].toFixed(2), overlapSeconds: +overlap.toFixed(2) };
}

/** Evidence for the currently selected green passage, excluding all other audio. */
export function selectedPassageIntervals(rows: Interval[], passage: { start: number; end: number } | null): Interval[] {
  if (!passage || !Number.isFinite(passage.start) || !Number.isFinite(passage.end) || passage.end <= passage.start) return [];
  return rows.flatMap(row => {
    const start = Math.max(row.start, passage.start), end = Math.min(row.end, passage.end);
    return end > start ? [{ ...row, start, end }] : [];
  });
}

/** Unique source coverage: replaying a portion never fills in unheard portions. */
export function selectedPassageProgress(rows: Interval[]): [number, number] {
  const seconds = (side: 0 | 1) => Math.min(5, merged(rows, side).reduce((sum, [start, end]) => sum + end - start, 0));
  return [seconds(0), seconds(1)];
}
