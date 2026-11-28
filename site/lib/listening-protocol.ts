import type { Interval } from "./listening";

export const LISTENING_PROTOCOL = "matched-passage-v2";
export const LEVEL_MATCHED_LISTENING_PROTOCOL = "joint-20-passage-level-v1";
export const PASSAGE_LEVEL_MATCH_METHOD = "passage-lufs-v1";
export const MIN_SIDE_SECONDS = 5;
export const MIN_COMMON_SECONDS = 5;
export const isRankedPassageProtocol = (value: string) => value === LISTENING_PROTOCOL || value === LEVEL_MATCHED_LISTENING_PROTOCOL;

export type PassageLevelMatch = {
  method: typeof PASSAGE_LEVEL_MATCH_METHOD;
  start: number; end: number; differenceLu: number;
};
export function cleanPassageLevelMatch(value: unknown): PassageLevelMatch | null {
  if (!value || typeof value !== "object") return null;
  const { method, start, end, differenceLu } = value as PassageLevelMatch;
  if (method !== PASSAGE_LEVEL_MATCH_METHOD || ![start, end, differenceLu].every(Number.isFinite) ||
      start < 0 || end - start < MIN_COMMON_SECONDS - 1e-6 || differenceLu < 0 || differenceLu > .05) return null;
  return { method, start, end, differenceLu };
}

export function matchedPassageContains(match: PassageLevelMatch, intervals: Interval[]) {
  return intervals.every(interval => interval.rate === 1 && interval.start >= match.start - 1e-6 && interval.end <= match.end + 1e-6);
}

// Research collection without enforcing the controlled five-second protocol.
export const FREE_LISTENING_PROTOCOL = "free-listening-v1";
