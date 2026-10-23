"use client";

import { useSyncExternalStore } from "react";
import { displayPreferencesSnapshot, parseDisplayPreferences, subscribeDisplayPreferences, writeDisplayPreferences } from "@/lib/display-preferences";
import "./shortcut-scope-select.css";

const subscribe = (listener: () => void) => subscribeDisplayPreferences(listener);

/** Compact control beside the shortcut hints: where the playback keys listen. Saved per browser with the other keyboard preferences. */
export default function ShortcutScopeSelect() {
  const raw = useSyncExternalStore(subscribe, displayPreferencesSnapshot, () => null);
  const scope = raw === null ? "everywhere" : parseDisplayPreferences(raw).shortcutScope;
  return <label className="shortcut-scope"><span>Shortcuts</span>
    <select aria-label="Where keyboard shortcuts work" value={scope} disabled={raw === null} onChange={event => writeDisplayPreferences({ shortcutScope: event.target.value as "everywhere" | "player" | "off" })}>
      <option value="everywhere">Everywhere</option>
      <option value="player">Player area only</option>
      <option value="off">Off</option>
    </select></label>;
}
