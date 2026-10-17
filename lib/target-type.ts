export type HeadphoneType = "ie" | "oe";

type TargetTypeSource = {
  name?: unknown;
  type?: unknown;
  measurement?: { type?: unknown } | string | null;
};

/** Returns a fixed headphone type when known; unmarked targets remain valid for both. */
export function targetHeadphoneType(target: TargetTypeSource): HeadphoneType | null {
  let measurementType: unknown;
  if (typeof target.measurement === "string") {
    try { measurementType = (JSON.parse(target.measurement) as { type?: unknown }).type; } catch {}
  } else {
    measurementType = target.measurement?.type;
  }
  if (measurementType === "ie" || measurementType === "oe") return measurementType;
  if (target.type === "ie" || target.type === "oe") return target.type;

  const name = String(target.name ?? "");
  if (/\b(?:oe|over[\s-]*ear)\b/i.test(name)) return "oe";
  if (/\b(?:ie|iem|in[\s-]*ear)\b/i.test(name)) return "ie";
  return null;
}
