import type { HeadphoneMeasurement } from "@/lib/measurement";
export type PersonalPlayback = { loudnessTarget: "-14" | "-16" | "-18" | "off"; channelMode: "auto" | "uploaded" | "off" };
export const PERSONAL_PLAYBACK_KEY = "target-lab-personal-playback-v1";
export const DEFAULT_PERSONAL_PLAYBACK: PersonalPlayback = {loudnessTarget:"-16",channelMode:"auto"};
export function parsePersonalPlayback(value: unknown): PersonalPlayback {
  if (!value || typeof value !== "object") throw Error("Invalid personal playback settings.");
  const settings=value as PersonalPlayback;
  if (!["-14","-16","-18","off"].includes(settings.loudnessTarget)||!["auto","uploaded","off"].includes(settings.channelMode)) throw Error("Invalid personal playback settings.");
  return {loudnessTarget:settings.loudnessTarget,channelMode:settings.channelMode};
}
// Keep existing default runs accessible; other configurations get separate runs.
export function personalPlaybackProtocol(settings: PersonalPlayback) {
  return settings.loudnessTarget==="-16"&&settings.channelMode==="auto" ? "matched-5s-auto-balance-minus16" : `matched-5s-personal-v1:${settings.loudnessTarget}:${settings.channelMode}`;
}
export function personalPlaybackMeasurement(measurement:HeadphoneMeasurement|undefined,mode:PersonalPlayback["channelMode"]) {
  if (!measurement) return undefined;
  if (mode==="uploaded") {
    if (!measurement.channelMatchPreset) throw Error("Upload a two-channel matching preset first.");
    return {...measurement,channelMatchMode:"custom" as const};
  }
  if (mode==="off") return {...measurement,channelMatchMode:"auto" as const,leftPoints:undefined,rightPoints:undefined,channelMatchPreset:undefined};
  return {...measurement,channelMatchMode:"auto" as const};
}
