"use client";

import { useMemo, useSyncExternalStore } from "react";
import { autoEqTargetStorageKey, readLocalAutoEqTargets } from "@/lib/autoeq-target-sources";

export const autoEqLocalTargetsChanged = "yinyang-autoeq-local-targets-changed";

function subscribe(listener: () => void) {
  function changed(event: StorageEvent) { if (event.key === null || event.key === autoEqTargetStorageKey) listener(); }
  window.addEventListener("storage", changed);
  window.addEventListener(autoEqLocalTargetsChanged, listener);
  window.addEventListener("yinyang-data-changed", listener);
  return () => {
    window.removeEventListener("storage", changed);
    window.removeEventListener(autoEqLocalTargetsChanged, listener);
    window.removeEventListener("yinyang-data-changed", listener);
  };
}

function getRaw() { try { return localStorage.getItem(autoEqTargetStorageKey); } catch { return null; } }
export function useAutoEqLocalTargets() {
  const raw = useSyncExternalStore(subscribe, getRaw, () => null);
  return useMemo(() => readLocalAutoEqTargets(raw), [raw]);
}
