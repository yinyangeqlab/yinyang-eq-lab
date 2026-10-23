import { targetHeadphoneType, type HeadphoneType } from "@/lib/target-type";
import type { Point } from "@/lib/curves";

/** Browser-only list of targets the person uploaded (Private, or submitted and still pending review). */
export const PRIVATE_TARGETS_KEY = "target-lab-private-targets";
/** Which targets the Personal tournament compares. Absent means every public target, as before. */
export const TARGET_POOL_KEY = "target-lab-personal-target-pool-v1";
export const MIN_CUSTOM_POOL = 2;
/** Largest pool whose choices the research/community endpoints accept (they reject longer candidate lists). Bigger pools work fully, but stay on this device. */
export const MAX_SHARED_POOL = 256;
/** Sanity bound on a stored selection only; the person can use as many targets as they like. */
const MAX_STORED_SELECTION = 20000;

export type PoolTarget = { id: string; name: string; points: Point[]; parentTargetId?: string | null; headphoneType?: HeadphoneType; measurement?: { type?: unknown } | null };
export type LocalPoolTarget = PoolTarget & { local: true; pending: boolean };
export type PoolChoice = { mode: "all" } | { mode: "custom"; ids: string[] };

const isPoint = (value: unknown): value is Point => Array.isArray(value) && value.length === 2 && value.every(item => typeof item === "number" && Number.isFinite(item));

export function parsePoolChoice(raw: string | null): PoolChoice {
  if (!raw) return { mode: "all" };
  try {
    const value = JSON.parse(raw) as { mode?: unknown; ids?: unknown };
    if (value.mode !== "custom" || !Array.isArray(value.ids)) return { mode: "all" };
    const ids = [...new Set(value.ids.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 80))].slice(0, MAX_STORED_SELECTION);
    return { mode: "custom", ids };
  } catch { return { mode: "all" }; }
}

/** Reads the person's own targets. Rows already public (approved) are dropped so they are not listed twice; admin test rows only appear in admin test mode. */
export function parseLocalTargets(raw: string | null, options: { publicIds: ReadonlySet<string>; adminTesting: boolean }): LocalPoolTarget[] {
  if (!raw) return [];
  let rows: unknown;
  try { rows = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(rows)) return [];
  const out: LocalPoolTarget[] = [];
  for (const row of rows as Record<string, unknown>[]) {
    if (!row || typeof row !== "object") continue;
    const { id, name, points, submissionId, status } = row;
    if (typeof id !== "string" || typeof name !== "string" || !Array.isArray(points) || points.length < 2 || !points.every(isPoint)) continue;
    if (status === "approved" || options.publicIds.has(id) || (typeof submissionId === "string" && options.publicIds.has(submissionId))) continue;
    if (row.adminTestOnly === true && !options.adminTesting) continue;
    out.push({ id, name: name.slice(0, 80), points, parentTargetId: typeof row.parentTargetId === "string" ? row.parentTargetId : null, headphoneType: row.headphoneType === "ie" || row.headphoneType === "oe" ? row.headphoneType : undefined, measurement: (row.measurement as PoolTarget["measurement"]) ?? null, local: true, pending: status === "pending" });
  }
  return out;
}

const fits = (target: PoolTarget, type: HeadphoneType | undefined) => { const kind = targetHeadphoneType(target); return !kind || kind === type; };

/** The targets one Personal run compares. "all" keeps the original behavior: every public target for this headphone type, never private ones. */
export function personalPool<T extends PoolTarget>(publicTargets: T[], localTargets: LocalPoolTarget[], choice: PoolChoice, type: HeadphoneType | undefined): (T | LocalPoolTarget)[] {
  const all: (T | LocalPoolTarget)[] = choice.mode === "all" ? publicTargets : [...publicTargets, ...localTargets].filter(target => choice.ids.includes(target.id));
  return all.filter(target => fits(target, type)).sort((a, b) => a.id.localeCompare(b.id));
}

/** True when a run must stay on this device: it includes a non-public target, or its pool is larger than the research endpoints accept. */
export const poolHasLocalTargets = (candidateIds: readonly string[], publicIds: ReadonlySet<string>) => candidateIds.length > MAX_SHARED_POOL || candidateIds.some(id => !publicIds.has(id));
