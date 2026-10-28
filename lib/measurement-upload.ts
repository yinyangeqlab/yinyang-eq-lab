import type { Point } from "@/lib/curves";
import { averageChannels } from "@/lib/channel-balance";
export type MeasurementUploadMode = "shared" | "paired" | "keep";
export function measurementResponses(mode: MeasurementUploadMode, single: Point[] | undefined, left: Point[] | undefined, right: Point[] | undefined, changed = false) {
  if (mode === "keep" && changed) throw Error("Choose One response or Separate Left and Right before changing response attachments. Your saved measurement is unchanged.");
  if (mode === "shared") {
    if (!single) throw Error("Add one response file for both ears before saving.");
    if (left || right) throw Error("Use only the single response in One response mode. Choose Separate Left and Right for channel files.");
    return { singlePoints: single, leftPoints: undefined, rightPoints: undefined, points: single };
  }
  if (mode === "paired") {
    if (!left || !right) throw Error("Separate Left and Right needs both files. Add the missing ear or choose One response.");
    if (single) throw Error("Use only Left and Right files in Separate mode; do not attach a single response as well.");
  }
  const points = left && right ? averageChannels(left, right) : single ?? left ?? right;
  if (!points) throw Error("Keep or attach at least one response before saving.");
  return { singlePoints: single, leftPoints: left, rightPoints: right, points };
}
