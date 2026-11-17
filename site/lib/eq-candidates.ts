import type { Point } from "./curves";
import type { HeadphoneMeasurement } from "./measurement";
import type { FinalizedVariant } from "./preference-finalize";
import { exportFitRms } from "./preference-finalize";
import { fitAutoEqAsync } from "./autoeq-client";
import { FIT_BANDS, FIT_METHODS } from "./fitter-settings";
export async function generateEqCandidates(raw: Point[], target: Point[], signal: AbortSignal, onProgress: (count: number) => void = () => {}, headphoneType?: HeadphoneMeasurement["type"]) {
  const candidates: FinalizedVariant[]=[];
  for (const method of FIT_METHODS) for (const bands of FIT_BANDS) {
    if (signal.aborted) throw new DOMException("EQ calculation cancelled.","AbortError");
    const [fit] = await fitAutoEqAsync({raw,targets:[target],kind:"export",method,bands,headphoneType:method === "peqdb-smoothed" ? headphoneType : undefined,sampleRate:48000},signal);
    if (signal.aborted) throw new DOMException("EQ calculation cancelled.","AbortError");
    candidates.push({...fit,bands,method,priority:"close",rms:exportFitRms(raw,target,fit.filters)});onProgress(candidates.length);
  }
  return candidates;
}
