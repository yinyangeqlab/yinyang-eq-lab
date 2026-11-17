"use client";
import { useCallback, useEffect, useRef } from "react";
import { readDisplayPreferences } from "@/lib/display-preferences";
/** Shared pointer/keyboard scope tracking. Preferences are read at each key press. */
export function usePlaybackShortcutContext(region: string) {
  const active = useRef(false), mouse = useRef(false);
  useEffect(() => {
    const isInside = (target: EventTarget | null) => target instanceof Element && !!target.closest(region);
    const pointer = (event: PointerEvent) => { mouse.current = true; active.current = isInside(event.target); };
    const focus = (event: FocusEvent) => { active.current = isInside(event.target); };
    const key = (event: KeyboardEvent) => { if (event.key === "Tab") mouse.current = false; };
    document.addEventListener("pointerdown", pointer, true); document.addEventListener("focusin", focus, true); document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("pointerdown", pointer, true); document.removeEventListener("focusin", focus, true); document.removeEventListener("keydown", key, true); };
  }, [region]);
  return useCallback(() => {
    const prefs = readDisplayPreferences();
    return { scope: prefs.shortcutScope, singleKey: prefs.singleKeyShortcuts, regionActive: active.current, mouseFocused: mouse.current, modalOpen: !!document.querySelector('[aria-modal="true"], dialog[open]') };
  }, []);
}
