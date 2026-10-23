/**
 * Why "Start personal tournament" is unavailable. A disabled button with no explanation leaves a new listener stuck,
 * so each blocking condition maps to one plain sentence. Conditions only explain the existing gates; they never relax them.
 */
export type PersonalStartInput = {
  storageError?: string;
  /** False until a headphone measurement is chosen. Optional so existing callers keep their meaning. */
  hasHeadphones?: boolean;
  /** False when channel matching is "Uploaded" but the measurement has no channel-match preset. */
  playbackReady: boolean;
  /** False when the chosen music mode still needs a song (My Playlist / Keep One Song with nothing picked). */
  musicChosen: boolean;
  /** The setup fingerprint exists only after the optional-sharing status has been read. */
  setupReady: boolean;
  sharingState?: "checking" | "ready" | "unavailable";
  /** Targets in the chosen pool and the smallest allowed pool; omitted by callers that do not offer a custom pool. */
  poolSize?: number;
  minPool?: number;
};

export type PersonalStartBlock = { kind: "storage" | "headphones" | "channel" | "music" | "pool" | "sharing-unavailable" | "checking"; message: string };

export function personalStartBlock(input: PersonalStartInput): PersonalStartBlock | null {
  if (input.storageError) return { kind: "storage", message: `Browser storage is unavailable, so progress cannot be saved. ${input.storageError}` };
  if (input.hasHeadphones === false) return { kind: "headphones", message: "Pick your headphones in step 1 to start." };
  if (input.poolSize !== undefined && input.minPool !== undefined && input.poolSize < input.minPool) return { kind: "pool", message: `Choose at least ${input.minPool} targets under Targets to compare (${input.poolSize} chosen).` };
  if (!input.playbackReady) return { kind: "channel", message: "Channel matching is set to Uploaded, but this measurement has no channel-match preset. Choose Auto or Off, or add a preset in My space." };
  if (!input.musicChosen) return { kind: "music", message: "Choose at least one song under Music source to start." };
  if (input.setupReady) return null;
  if (input.sharingState === "unavailable") return { kind: "sharing-unavailable", message: "Start is waiting for your sharing settings, which could not be checked. Your tournament stays on this device either way." };
  return { kind: "checking", message: "Checking your settings…" };
}

/**
 * The page remounts the player every round. A song the listener chose in Upload mode is held in memory (never stored)
 * and reloaded, except during finalist checks, which must use a different song.
 */
export function retainedSongFor<T>(musicMode: string, phase: string | undefined, song: T | null): T | null {
  return musicMode === "upload" && phase !== "confirm" ? song : null;
}
