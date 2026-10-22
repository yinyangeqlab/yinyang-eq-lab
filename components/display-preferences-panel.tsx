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
    <p>Saved in this browser only. They are not part of Sync, research or your data choices.</p>
    <label><input type="checkbox" disabled={disabled} checked={value?.motion === "reduced"} onChange={event => writeDisplayPreferences({ motion: event.target.checked ? "reduced" : "auto" })}/><span><strong>Pause decorative motion</strong>Stops looping icons, artwork and background animation. Your system’s reduced-motion setting always applies.</span></label>
    <label><input type="checkbox" disabled={disabled} checked={value?.singleKeyShortcuts === true} onChange={event => writeDisplayPreferences({ singleKeyShortcuts: event.target.checked })}/><span><strong>Letter and number shortcuts</strong>1, 2, A, B and S select or switch samples. Turn off if you use speech input or press keys by accident; Space and arrow keys still work.</span></label>
  </section>;
}
