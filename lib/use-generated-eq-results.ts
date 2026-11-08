"use client";

import { useEffect, useRef, useState } from "react";
import { validFitter } from "./fitter-settings";
import type { FinalizedVariant } from "./preference-finalize";

type ResultsScope = "tuning" | "shootout" | "personal";
type GeneratedResults = { key: string; variants: FinalizedVariant[]; saved: boolean };

function readVariants(value: unknown): value is FinalizedVariant[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) return false;
  return value.every((fit: FinalizedVariant) => fit && validFitter(fit) && fit.priority === "close" &&
    (fit.engine === "legacy" || fit.engine === "peqdb") &&
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

export function useGeneratedEqResults(scope: ResultsScope, inputKey: string) {
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

  const current = result?.key === inputKey ? result : null;
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
