import {fitAutoEqAsync} from "./autoeq-client";
import {collectEqCandidates} from "./eq-candidate-core";
import type {Point} from "./curves";
import type {HeadphoneMeasurement} from "./measurement";

export function generateEqCandidates(raw:Point[], target:Point[], signal:AbortSignal, onProgress?:(count:number)=>void, headphoneType?:HeadphoneMeasurement["type"]) {
  return collectEqCandidates(fitAutoEqAsync, raw, target, signal, onProgress, headphoneType, true);
}
