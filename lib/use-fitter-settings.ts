"use client";
import { useEffect, useState } from "react";
import { DEFAULT_FITTER, FITTER_STORAGE, readDefaultFitter, type FitterSettings } from "./fitter-settings";
export function useFitterSettings() {
  const [fitter, setFitter] = useState<FitterSettings>(DEFAULT_FITTER);
  const [defaultFitter, setDefaultFitter] = useState<FitterSettings>(DEFAULT_FITTER);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const saved = readDefaultFitter();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Read browser-only defaults after hydration.
    setFitter(saved); setDefaultFitter(saved);
    const refresh = () => setDefaultFitter(readDefaultFitter());
    window.addEventListener("storage", refresh); window.addEventListener("fitter-default-changed", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("fitter-default-changed", refresh); };
  }, []);
  function saveDefault(value: FitterSettings) {
    try { localStorage.setItem(FITTER_STORAGE, JSON.stringify(value)); setDefaultFitter(value); setNotice(""); window.dispatchEvent(new Event("fitter-default-changed")); }
    catch { setNotice("Could not save your default. This selection still works in this tab."); }
  }
  return { fitter, setFitter, defaultFitter, saveDefault, notice };
}
