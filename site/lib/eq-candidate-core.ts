import type { Point } from "./curves";
import type { HeadphoneMeasurement } from "./measurement";
import type { FinalizedVariant } from "./preference-finalize";
import { exportFitRms } from "./preference-finalize";
import { FIT_BANDS, FIT_METHODS, JOINT_FITTER } from "./fitter-settings";
export async function collectEqCandidates(fitAutoEqAsync: typeof import("./autoeq-client").fitAutoEqAsync, raw: Point[], target: Point[], signal: AbortSignal, onProgress: (count: number) => void = () => {}, headphoneType?: HeadphoneMeasurement["type"], tuning = false) {
  const candidates: FinalizedVariant[]=[];
  const settings = FIT_METHODS.flatMap(method => FIT_BANDS.map(bands => ({ method, bands })));
  const otherJointFits = FIT_BANDS.filter(bands => bands !== JOINT_FITTER.bands).map(bands => ({ ...JOINT_FITTER, bands }));
  const requested = tuning ? [JOINT_FITTER, ...otherJointFits, ...settings] : settings;
  for (const [index, { method, bands }] of requested.entries()) {
    if (signal.aborted) throw new DOMException("EQ calculation cancelled.","AbortError");
    try {
      const [fit] = await fitAutoEqAsync({raw,targets:[target],kind:"export",method,bands,headphoneType:method === "peqdb-smoothed" ? headphoneType : undefined,sampleRate:48000},signal);
      if (signal.aborted) throw new DOMException("EQ calculation cancelled.","AbortError");
      candidates.push({...fit,bands,method,priority:"close",rms:exportFitRms(raw,target,fit.filters)});
    } catch (error) {
      // A browser that cannot run Joint Fit can still generate the established export choices.
      if (method !== "joint" || signal.aborted) throw error;
    }
    onProgress(index + 1);
  }
  return candidates;
}
