import catalog from "@/data/autoeq-target-sources.json";
import { parseCurve, type Point } from "@/lib/curves";

export const autoEqRevision = catalog.revision;
export const autoEqCatalogId = catalog.sharedCatalog;
export const autoEqSources = catalog.entries;
export const autoEqSourceRoot = `https://github.com/jaakkopasanen/AutoEq/tree/${autoEqRevision}/targets`;
export const autoEqLicenseScope = "https://github.com/jaakkopasanen/AutoEq/issues/790";
export const autoEqTargetStorageKey = "target-lab-autoeq-local-v1";

const sourceByFile = new Map(autoEqSources.map(entry => [entry.file, entry]));
type Source = (typeof autoEqSources)[number];

export function autoEqSourceName(entry: Source) {
  return entry.name ?? entry.file.slice(0, -4);
}

export function autoEqSourceUrl(entry: Source) {
  return `https://github.com/jaakkopasanen/AutoEq/blob/${autoEqRevision}/targets/${encodeURIComponent(entry.file)}`;
}

function idFor(entry: Source, index: number) {
  return `autoeq-local-${entry.sha256.slice(0, 32)}-${index}`;
}

const variants = new Map(autoEqSources.flatMap(entry => entry.kind === "conversion" ? [] :
  (entry.columns ?? [autoEqSourceName(entry)]).map((label, index) => [idFor(entry, index), {
    name: entry.kind === "table" ? `${label} (combined table)` : label,
    creator: `${entry.credit} · via AutoEq`,
    description: `From AutoEq: ${entry.file}. Match the source rig before fitting.`,
  }] as const)));

export type LocalAutoEqTarget = { id: string; name: string; creator: string; description: string; points: Point[];
  status: "local"; local: true; pending: false; rating: number; wins: number; losses: number };

export function isLocalAutoEqTarget(id: string) { return variants.has(id); }

function hydrate(id: string, points: Point[]): LocalAutoEqTarget {
  const info = variants.get(id);
  if (!info) throw Error("Unknown AutoEq curve.");
  return { id, ...info, points, status: "local", local: true, pending: false, rating: 1500, wins: 0, losses: 0 };
}

export function readLocalAutoEqTargets(raw: string | null): LocalAutoEqTarget[] {
  try {
    const stored: unknown = JSON.parse(raw || "{}");
    if (!stored || typeof stored !== "object") return [];
    return Object.entries(stored).flatMap(([id, points]) => isLocalAutoEqTarget(id) &&
      Array.isArray(points) && points.length >= 10 && points.length <= 2000 &&
      points.every((point, index) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) &&
        point[0] >= 20 && point[0] <= 20000 && Math.abs(point[1]) <= 200 && (!index || point[0] > points[index - 1][0]))
      ? [hydrate(id, points)] : []);
  } catch { return []; }
}

export function writeLocalAutoEqTargets(storage: Storage, targets: LocalAutoEqTarget[]) {
  if (targets.length) storage.setItem(autoEqTargetStorageKey, JSON.stringify(Object.fromEntries(targets.map(row => [row.id, row.points]))));
  else storage.removeItem(autoEqTargetStorageKey);
}

export async function parseLocalAutoEqFile(file: Pick<File, "name" | "size" | "arrayBuffer">) {
  const entry = sourceByFile.get(file.name);
  if (!entry) throw Error("File is not in the linked AutoEq snapshot.");
  if (file.size > 200_000) throw Error("File is too large.");
  const bytes = await file.arrayBuffer();
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), value => value.toString(16).padStart(2, "0")).join("");
  if (hash !== entry.sha256) throw Error("File differs from the linked AutoEq snapshot. Download it again from its source link.");
  if (entry.kind === "conversion") return [];
  const csv = new TextDecoder().decode(bytes);
  if (!entry.columns) return [hydrate(idFor(entry, 0), parseCurve(csv))];
  const lines = csv.trim().split(/\r?\n/).slice(1).map(row => row.split(","));
  return entry.columns.map((_, index) => hydrate(idFor(entry, index), parseCurve(lines.map(row => `${row[0]},${row[index + 1]}`).join("\n"))));
}

/** A source target is approved by this release's pinned metadata. Its points live at the original source. */
const shared = new Map(autoEqSources.flatMap(entry => (entry.shared ?? []).map(({ id, version }, index) => {
  const info = variants.get(idFor(entry, index))!;
  return [id, { id, ...info, file: entry.file, column: index, version }] as const;
})));
export const sharedAutoEqTarget = (id: string) => shared.get(id);
export const isSourceAutoEqTarget = (id: string) => shared.has(id) || isLocalAutoEqTarget(id);

const builtInIds = new Set(autoEqSources.flatMap(entry => entry.builtInId ? [entry.builtInId] : []));
export const isCatalogAutoEqTarget = (id: string) => shared.has(id) || builtInIds.has(id);

const sharedTargets = [...shared.values()].map(({ id, name, creator, description }) => ({
  id, name, creator, description, status: "approved" as const, rating: 1500, wins: 0, losses: 0, measurement: null,
}));
/** Client metadata only. A missing curve must be loaded before it can drive audio, graphs or exports. */
export const autoEqPickerTargets = sharedTargets.map(target => ({ ...target, points: [] as Point[] }));
/** Server metadata only. Comparison provenance is the pinned version hash, never the placeholder. */
export const autoEqRankingTargets = sharedTargets.map(target => ({ ...target, points: "[]" }));
