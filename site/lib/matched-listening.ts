import { commonSegments, intervalStats, type Interval } from "@/lib/listening";

/** Unique source time heard on both sides; repeats and disjoint passages add no credit. */
export function matchedListeningProgress(intervals: Interval[], requiredSeconds = 5) {
  const segments = commonSegments(intervals);
  const seconds = segments.reduce((total, [start, end]) => total + end - start, 0);
  const raw = intervalStats(intervals);
  return {
    seconds,
    // Never round 4.99 up to a displayed completed five seconds.
    displaySeconds: Math.floor(Math.min(requiredSeconds, seconds) * 10) / 10,
    complete: seconds >= requiredSeconds,
    segments,
    heardA: raw.heardA,
    heardB: raw.heardB,
  };
}
