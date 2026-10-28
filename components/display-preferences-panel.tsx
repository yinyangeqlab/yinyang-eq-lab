"use client";

import { useSyncExternalStore } from "react";
import { displayPreferencesSnapshot, parseDisplayPreferences, subscribeDisplayPreferences, writeDisplayPreferences } from "@/lib/display-preferences";

const subscribe = (listener: () => void) => subscribeDisplayPreferences(listener);

export default function DisplayPreferencesPanel() {
  const raw = useSyncExternalStore(subscribe, displayPreferencesSnapshot, () => null);
  const value = raw === null ? null : parseDisplayPreferences(raw);
  const disabled = value === null;
  return <section className="alpha-help-card alpha-display-preferences" aria-labelledby="display-preferences-title">
    <h2 id="display-preferences-title">Motion &amp; keyboard preferences</h2>
    <p>Applied in this tab and saved in this browser when storage is available. They are not part of Sync, research or your data choices.</p>
    <label><input type="checkbox" disabled={disabled} checked={value?.motion === "reduced"} onChange={event => writeDisplayPreferences({ motion: event.target.checked ? "reduced" : "auto" })}/><span><strong>Pause decorative motion</strong>Stops looping icons, artwork and background animation. Your system’s reduced-motion setting always applies.</span></label>
    <label><input type="checkbox" disabled={disabled} checked={value?.singleKeyShortcuts === true} onChange={event => writeDisplayPreferences({ singleKeyShortcuts: event.target.checked })}/><span><strong>Letter and number shortcuts</strong>1, 2, A, B and S select or switch samples. Turn off if you use speech input or press keys by accident; Space and arrow keys still work.</span></label>
    <label className="alpha-shortcut-scope-choice"><span><strong>Where shortcuts work</strong>Anywhere on this page enables supported playback keys except while typing, in menus or dialogs, or when a native control uses the key. After using the player limits them to the last-used playback area. Off disables playback shortcuts. Shared shootouts use Space to switch A/B; private Blind EQ uses its on-screen buttons.</span>
      <select disabled={disabled} value={value?.shortcutScope ?? "everywhere"} onChange={event => writeDisplayPreferences({ shortcutScope: event.target.value as "everywhere" | "player" | "off" })}><option value="everywhere">Anywhere on this page</option><option value="player">After using the player</option><option value="off">Off</option></select></label>
  </section>;
}
