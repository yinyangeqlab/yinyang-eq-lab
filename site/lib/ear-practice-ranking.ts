export const EAR_PRACTICE_PROTOCOL = "ear-practice-mixed-v1";
export const EAR_PRACTICE_LEGACY_PROTOCOL = "ear-practice-v1";
export const EAR_PRACTICE_CONSENT = "ear-practice-public-v2";
export const EAR_PRACTICE_MAX_STAGE = 100;
export const EAR_PRACTICE_STAGES = [
  { id: 1, label: "Exaggerated", gainDb: 9, q: 1.4, description: "A broad change that stands out." },
  { id: 2, label: "Moderate", gainDb: 5, q: 2, description: "A smaller change over a narrower region." },
  { id: 3, label: "Very nuanced", gainDb: 2.5, q: 3.2, description: "A small change confined to a narrow region." },
] as const;
export type EarPracticeStage = (typeof EAR_PRACTICE_STAGES)[number];
export type EarPracticeGuess = { kind: "peak" | "dip"; hz: number };
export type EarPracticeBand = EarPracticeGuess & { gain: number; q: number; halfWidth: number };
export type EarPracticeAnswer = {
  guesses: EarPracticeGuess[];
  bands: EarPracticeBand[];
  correct: boolean;
  difficulty?: EarPracticeStage["id"];
  accuracy?: number;
};
export type EarPracticeSet = {
  id: string;
  stage: number;
  count: number;
  answer: EarPracticeAnswer | null;
  legacy?: boolean;
};
export type EarPracticeStanding = { rank: number; username: string; furthest: number; correct: number; attempts: number; accuracy: number; participantId?: string };
export type EarPracticeDistribution = { level: number; count: number };
export type EarPracticeBoard = { rows: EarPracticeStanding[]; distribution: EarPracticeDistribution[]; participants: number; page: number; pageSize: number };
export const EAR_PRACTICE_RANGE = { from: 80, to: 9800 };
export const EAR_PRACTICE_SWEEP_SECONDS = 12;

export function earPracticeBandGain(band: EarPracticeBand, hz: number) {
  const distance = Math.abs(Math.log2(hz / band.hz));
  if (distance >= band.halfWidth) return 0;
  const taper = .5 * (1 + Math.cos(Math.PI * Math.max(0, 2 * distance / band.halfWidth - 1)));
  return band.gain * taper / (1 + (2 * band.q * Math.sinh(Math.LN2 * distance)) ** 2);
}

export function earPracticeFrequencyMatches(guessHz: number, answerHz: number) {
  return Math.abs(Math.log2(guessHz / answerHz)) <= .25;
}

export function earPracticeGuessMatches(guess: EarPracticeGuess, answer: EarPracticeGuess) {
  return guess.kind === answer.kind && earPracticeFrequencyMatches(guess.hz, answer.hz);
}

// Location credit is independent of peak/dip identification. Match marks once,
// allowing omissions without shifting every later match onto the wrong band.
export function earPracticeLocationAccuracy(guesses: EarPracticeGuess[], bands: EarPracticeGuess[]) {
  if (!bands.length) return 0;
  const marks = guesses.map(guess => guess.hz).sort((a, b) => a - b);
  const targets = bands.map(band => band.hz).sort((a, b) => a - b);
  const best = Array.from({ length: marks.length + 1 }, () => new Array<number>(targets.length + 1).fill(0));
  for (let mark = 1; mark <= marks.length; mark++) {
    for (let target = 1; target <= targets.length; target++) {
      const credit = Math.max(0, 1 - Math.abs(Math.log2(marks[mark - 1] / targets[target - 1])));
      best[mark][target] = Math.max(best[mark - 1][target], best[mark][target - 1], best[mark - 1][target - 1] + credit);
    }
  }
  return 100 * best[marks.length][targets.length] / targets.length;
}
