"use client";
import { useEffect, useState } from "react";
import { DEFAULT_FITTER, JOINT_FITTER, fitterStorage, readDefaultFitter, type FitterSettings } from "./fitter-settings";
export function useFitterSettings(scope: "tuning" | "listening" = "listening") {
  const initial = scope === "tuning" ? JOINT_FITTER : DEFAULT_FITTER;
  const [fitter, setFitter] = useState<FitterSettings>(initial);
  const [defaultFitter, setDefaultFitter] = useState<FitterSettings>(initial);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const saved = readDefaultFitter(scope);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Read browser-only defaults after hydration.
    setFitter(saved); setDefaultFitter(saved);
    const refresh = () => setDefaultFitter(readDefaultFitter(scope));
    window.addEventListener("storage", refresh); window.addEventListener("fitter-default-changed", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("fitter-default-changed", refresh); };
  }, [scope]);
  function saveDefault(value: FitterSettings) {
    try { localStorage.setItem(fitterStorage(scope), JSON.stringify(value)); setDefaultFitter(value); setNotice(""); window.dispatchEvent(new Event("fitter-default-changed")); }
    catch { setNotice("Could not save your default. This selection still works in this tab."); }
  }
  return { fitter, setFitter, defaultFitter, saveDefault, notice };
}
