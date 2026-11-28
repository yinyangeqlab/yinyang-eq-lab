"use client";

import { useEffect, useRef, useState } from "react";
import { FIT_BANDS, WEB_FIT_CANDIDATE_COUNT, validExportFitter } from "./fitter-settings";
import { MAX_CHANNEL_MATCH_BANDS } from "./channel-match-export";
import type { FinalizedVariant } from "./preference-finalize";

type ResultsScope = "tuning" | "shootout" | "personal";
type GeneratedResults = { key: string; variants: FinalizedVariant[]; saved: boolean };

function readVariants(value: unknown): value is FinalizedVariant[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > WEB_FIT_CANDIDATE_COUNT) return false;
  return value.every((fit: FinalizedVariant) => fit && validExportFitter(fit) && fit.priority === "close" &&
    (fit.engine === "legacy" || fit.engine === "peqdb" || fit.engine === "joint") &&
    Number.isFinite(fit.rms) && fit.rms >= 0 &&
    Number.isFinite(fit.peakBoost) && fit.peakBoost >= 0 &&
    Number.isFinite(fit.preamp) && fit.preamp <= 0 &&
    Array.isArray(fit.filters) && fit.filters.length >= 1 && fit.filters.length <= fit.bands &&
    fit.filters.every((filter: FinalizedVariant["filters"][number]) => filter &&
      ["PK", "LSC", "HSC"].includes(filter.type ?? "PK") &&
      Number.isFinite(filter.hz) && filter.hz >= 20 && filter.hz <= 20000 &&
      Number.isFinite(filter.gain) && Math.abs(filter.gain) <= 24 &&
      Number.isFinite(filter.q) && filter.q >= .1 && filter.q <= 20));
}

export function useGeneratedEqResults(scope: ResultsScope, inputKey: string, priorInputKey?: string) {
  const storageKey = `yinyang-generated-eq-results-v1:${scope}`;
  const [result, setResult] = useState<GeneratedResults | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusPending = useRef(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      const { key, variants } = JSON.parse(stored);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore a browser-only result after hydration.
      if (typeof key === "string" && readVariants(variants)) setResult({ key, variants, saved: true });
    } catch { /* A fresh calculation is available if the browser cache is unreadable. */ }
  }, [storageKey]);

  const current = result && (result.key === inputKey ||
    result.key === priorInputKey && result.variants.every(fit => fit.method !== "peqdb-smoothed")) ? result : null;
  useEffect(() => {
    if (!current || !focusPending.current || !heading.current) return;
    focusPending.current = false;
    heading.current.focus();
  }, [current]);

  function save(variants: FinalizedVariant[]) {
    let saved = false;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ key: inputKey, variants }));
      saved = true;
    } catch { /* Results remain available on the current page. */ }
    focusPending.current = true;
    setResult({ key: inputKey, variants, saved });
  }

  function clear() {
    focusPending.current = false;
    setResult(null);
    try { localStorage.removeItem(storageKey); } catch { /* The in-memory results are cleared. */ }
  }

  return { result, current, heading, save, clear };
}

export const MAX_MAIN_EQ_BANDS = Math.max(...FIT_BANDS);
export type EqDeviceLimits = { mainBands: number; channelBands: number };
const DEVICE_LIMITS_KEY = "yinyang-eq-device-limits-v1";
const defaultDeviceLimits: EqDeviceLimits = { mainBands: 20, channelBands: 10 };

export function readEqDeviceLimits(): EqDeviceLimits {
  try {
    const limits: EqDeviceLimits = JSON.parse(localStorage.getItem(DEVICE_LIMITS_KEY) || "null");
    if (limits && Number.isInteger(limits.mainBands) && limits.mainBands >= 1 && limits.mainBands <= MAX_MAIN_EQ_BANDS &&
      Number.isInteger(limits.channelBands) &&
      limits.channelBands >= 0 && limits.channelBands <= MAX_CHANNEL_MATCH_BANDS) return limits;
  } catch { /* Use device-independent defaults if browser storage is unavailable. */ }
  return defaultDeviceLimits;
}

export function useEqDeviceLimits() {
  const [limits, setLimits] = useState(defaultDeviceLimits);
  useEffect(() => {
    const refresh = () => setLimits(readEqDeviceLimits());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(DEVICE_LIMITS_KEY, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(DEVICE_LIMITS_KEY, refresh);
    };
  }, []);
  function changeLimits(next: EqDeviceLimits) {
    setLimits(next);
    try {
      localStorage.setItem(DEVICE_LIMITS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(DEVICE_LIMITS_KEY));
    } catch { /* The limits still apply in this tab. */ }
  }
  return { limits, changeLimits };
}
