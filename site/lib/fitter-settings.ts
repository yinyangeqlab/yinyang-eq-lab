export type FitBands = 10 | 15 | 20 | 30;
export const FIT_METHODS = ["standard", "precise", "peqdb", "peqdb-smoothed"] as const;
export type FitterMethod = typeof FIT_METHODS[number] | "joint";
export const isPeqdbMethod = (method: unknown) => method === "peqdb" || method === "peqdb-smoothed";
export type FitterSettings = { method: FitterMethod; bands: FitBands };
export const DEFAULT_FITTER: FitterSettings = { method: "standard", bands: 10 };
export const FITTER_STORAGE = "yinyang-default-fitter-v1";
export const FIT_BANDS = [10, 15, 20, 30] as const;
export const JOINT_FITTER = { method: "joint", bands: 20 } as const;
export const JOINT_FITTER_VERSION = "yinyang-joint-fit-v1";
export const FIT_CANDIDATE_COUNT = FIT_METHODS.length * FIT_BANDS.length;
export const jointFitterVersion = (bands: FitBands) => bands === JOINT_FITTER.bands ? JOINT_FITTER_VERSION : "yinyang-joint-fit-band-limits-v1";
export const WEB_FIT_CANDIDATE_COUNT = FIT_CANDIDATE_COUNT + FIT_BANDS.length;
export const MAIN_FITTER_COHORT = "standard:10:legacy:yinyang-standard-close@listening-fitter-v1";
export const JOINT_FITTER_COHORT = `joint:20:joint:${JOINT_FITTER_VERSION}`;
export type FitProvenance = { method?: FitterMethod; bands: number; filterCount?: number; engine: string; engineVersion: string; sampleRate: number; rms: number; preamp: number };

export function cleanFitMetadata(value: unknown): FitProvenance[] {
  if (value === undefined || Array.isArray(value) && !value.length) return [];
  if (!Array.isArray(value) || value.length !== 2) throw Error("Two matching EQ fit records are required.");
  const clean = value.map((v: Record<string, unknown>) => {
    if (!v || typeof v !== "object" || !["legacy", "peqdb", "joint"].includes(String(v.engine)) || typeof v.engineVersion !== "string" || !v.engineVersion.length || v.engineVersion.length > 160 || ![v.bands, v.rms, v.preamp, v.sampleRate].every(n => typeof n === "number" && Number.isFinite(n)) || Number(v.bands) < 1 || Number(v.bands) > 30 || Number(v.rms) < 0 || Number(v.preamp) > 0 || Number(v.sampleRate) < 3000 || Number(v.sampleRate) > 768000 || v.method !== undefined && !validFitter(v)) throw Error("Invalid EQ fitter provenance.");
    if (v.filterCount !== undefined && (!Number.isInteger(v.filterCount) || Number(v.filterCount) < 1 || Number(v.filterCount) > Number(v.bands))) throw Error("Invalid EQ filter count.");
    if ((v.method === "joint" || v.engine === "joint") && !isJointFit(v as FitProvenance)) throw Error("Invalid Joint Fit provenance.");
    return { engine: v.engine, engineVersion: v.engineVersion, bands: v.bands, rms: v.rms, preamp: v.preamp, sampleRate: v.sampleRate, ...(v.method ? { method: v.method, filterCount: v.filterCount } : {}) } as FitProvenance;
  });
  if (clean.some(f => f.method !== clean[0].method || f.engine !== clean[0].engine || f.engineVersion !== clean[0].engineVersion || f.sampleRate !== clean[0].sampleRate || f.method && f.bands !== clean[0].bands)) throw Error("Both sides must use the same fitter configuration.");
  return clean;
}
export function validFitter(value: unknown): value is FitterSettings {
  if (!value || typeof value !== "object") return false;
  const v = value as FitterSettings;
  return FIT_BANDS.includes(v.bands) && (v.method === "joint" || FIT_METHODS.includes(v.method));
}
export const validExportFitter = validFitter;

export const fitterStorage = (scope: "tuning" | "listening") => scope === "tuning" ? "yinyang-tuning-fitter-v1" : FITTER_STORAGE;
export function readDefaultFitter(scope: "tuning" | "listening" = "listening"): FitterSettings {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(fitterStorage(scope)) || "null");
    if (validFitter(value) && (scope === "tuning" || value.method !== "joint")) return value;
  } catch {}
  return { ...(scope === "tuning" ? JOINT_FITTER : DEFAULT_FITTER) };
}
export const fitterNames: Record<FitterMethod, string> = {
  standard: "Preset Frequencies",
  precise: "Sequential Fit",
  peqdb: "PEQdB · Unsmoothed",
  "peqdb-smoothed": "PEQdB · Smoothed",
  joint: "All-Band Fit",
};
export const fitterLabel = (settings: FitterSettings) => `${fitterNames[settings.method]} · ${settings.bands} bands`;

/** Missing historical provenance must never be inferred as today's default. */
export function fitterCohort(context: string | null | undefined): { key: string; label: string } {
  try {
    const parsed = JSON.parse(context || "{}");
    const fits = parsed.eqFits;
    if (!Array.isArray(fits) || fits.length !== 2) return { key: "historical", label: "Earlier results · fitter unrecorded" };
    const [a, b] = fits as (FitProvenance & FitterSettings)[];
    if (!validFitter(a) || !validFitter(b) || a.method !== b.method || a.bands !== b.bands || a.engine !== b.engine || a.engineVersion !== b.engineVersion || typeof a.engineVersion !== "string" || !["legacy", "peqdb", "joint"].includes(a.engine)) return { key: "historical", label: "Earlier results · fitter unrecorded" };
    if ((a.method === "joint" || a.engine === "joint") && !isJointFitPair([a, b])) return { key: "historical", label: "Earlier results · fitter unrecorded" };
    return { key: `${a.method}:${a.bands}:${a.engine}:${a.engineVersion}`, label: `${fitterLabel(a)}${isPeqdbMethod(a.method) && a.engine !== "peqdb" ? " · fallback" : ""}` };
  } catch { return { key: "historical", label: "Earlier results · fitter unrecorded" }; }
}
function isJointFit(fit: FitProvenance) {
  return fit.method === JOINT_FITTER.method && fit.bands === JOINT_FITTER.bands &&
    fit.engine === "joint" && fit.engineVersion === JOINT_FITTER_VERSION && fit.filterCount === JOINT_FITTER.bands &&
    fit.sampleRate >= 44_100 && fit.sampleRate <= 192_000;
}

export function isJointFitPair(fits: FitProvenance[]) {
  return fits.length === 2 && fits[0].sampleRate === fits[1].sampleRate && fits.every(isJointFit);
}
