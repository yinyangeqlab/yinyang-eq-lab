/** Per-browser display preferences. Not in the Sync allowlist; cleared with other yinyang-* site data. */
export type DisplayPreferences = { motion: "auto" | "reduced"; singleKeyShortcuts: boolean; shortcutScope: "everywhere" | "player" | "off" };

const KEY = "yinyang-display-preferences";
export const DISPLAY_PREFERENCES_EVENT = "yinyang-display-preferences";
const defaults: DisplayPreferences = { motion: "auto", singleKeyShortcuts: true, shortcutScope: "everywhere" };

/** Raw stored string; a stable primitive snapshot for useSyncExternalStore. */
export function displayPreferencesSnapshot() {
  try { return localStorage.getItem(KEY) || "{}"; } catch { return "{}"; }
}

export function parseDisplayPreferences(raw: string): DisplayPreferences {
  try {
    const saved = JSON.parse(raw) as Partial<DisplayPreferences>;
    return { motion: saved.motion === "reduced" ? "reduced" : "auto", singleKeyShortcuts: saved.singleKeyShortcuts !== false, shortcutScope: saved.shortcutScope === "player" || saved.shortcutScope === "off" ? saved.shortcutScope : "everywhere" };
  } catch { return { ...defaults }; }
}

export function readDisplayPreferences(): DisplayPreferences { return parseDisplayPreferences(displayPreferencesSnapshot()); }

export function writeDisplayPreferences(change: Partial<DisplayPreferences>) {
  const next = { ...readDisplayPreferences(), ...change };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* Storage can be unavailable; the current page still applies the choice. */ }
  applyMotionPreference(next.motion);
  window.dispatchEvent(new Event(DISPLAY_PREFERENCES_EVENT));
  return next;
}

/** Mirrors prefers-reduced-motion through the shared reduced-motion stylesheet rule. */
export function applyMotionPreference(motion: DisplayPreferences["motion"]) {
  if (motion === "reduced") document.documentElement.dataset.motion = "reduced";
  else delete document.documentElement.dataset.motion;
}

export function subscribeDisplayPreferences(listener: (value: DisplayPreferences) => void) {
  const update = () => listener(readDisplayPreferences());
  const storage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) update(); };
  window.addEventListener(DISPLAY_PREFERENCES_EVENT, update);
  window.addEventListener("storage", storage);
  return () => { window.removeEventListener(DISPLAY_PREFERENCES_EVENT, update); window.removeEventListener("storage", storage); };
}
