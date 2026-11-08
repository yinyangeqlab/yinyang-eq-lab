import { validFitter, type FitterSettings } from "./fitter-settings";
import type { Point } from "./curves";
import type { PeqFilter } from "@/lib/autoeq";
import { peakBoost } from "@/lib/preference-finalize";
import type { ChannelMatch } from "./channel-balance";
import { safeChannelMatch } from "./channel-match-export";

export type LibraryEq = { fitter?: FitterSettings; engine?: "peqdb" | "legacy"; engineVersion?: string; id: string; name: string; filters: PeqFilter[]; preamp: number; source: string; measurementId?: string; headphone?: string; channelMatch?: ChannelMatch; createdAt?: number; updatedAt?: number; target?: { id?: string; name: string; points: Point[] } };
export const LIBRARY_EQ_KEY = "target-lab-library-eqs-v1";
// Headroom depends only on the filters. Keep validation on every read, while
// avoiding the three-rate frequency sweep for unchanged presets and UI edits.
const headroomCache = new Map<string, number>();
const savedTime = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 8.64e15 ? value : undefined;

export function safeLibraryEq(value: LibraryEq): LibraryEq {
  if (!Array.isArray(value.filters) || value.filters.length < 1 || value.filters.length > 40 ||
    value.filters.some(f => !["PK", "LSC", "HSC"].includes(f.type ?? "PK") || !Number.isFinite(f.hz) || f.hz < 20 || f.hz > 20000 || !Number.isFinite(f.gain) || Math.abs(f.gain) > 24 || !Number.isFinite(f.q) || f.q < .1 || f.q > 20)) {
    throw new Error("This EQ needs 1–40 valid peak or shelf filters.");
  }
  if (!Number.isFinite(value.preamp) || value.preamp > 0 || value.preamp < -60) throw new Error("The EQ preamp is invalid.");
  // Recalculate headroom even for downloaded presets. An extra 1 dB protects against intersample peaks.
  const key = JSON.stringify(value.filters.map(f => [f.type ?? "PK", f.hz, f.gain, f.q]));
  let headroom = headroomCache.get(key);
  if (headroom === undefined) {
    headroom = -Math.ceil((Math.max(0, peakBoost(value.filters)) + 1.5) * 10) / 10;
    if (headroomCache.size >= 128) headroomCache.delete(headroomCache.keys().next().value!);
    headroomCache.set(key, headroom);
  }
  const preamp = Math.min(value.preamp, headroom);
  if (preamp < -60) throw new Error("These filters need more than 60 dB of headroom. Reduce their boosts before saving.");
  return { ...(validFitter(value.fitter) ? {fitter:{...value.fitter}} : {}), ...(["peqdb", "legacy"].includes(value.engine ?? "") ? { engine: value.engine, engineVersion: String(value.engineVersion ?? "").slice(0, 160) } : {}), id: String(value.id).slice(0, 100), name: String(value.name).slice(0, 100), source: String(value.source).slice(0, 100),
    filters: value.filters.map(f => ({ ...(f.type ? { type: f.type } : {}), hz: f.hz, gain: f.gain, q: f.q })), preamp,
    measurementId: value.measurementId ? String(value.measurementId).slice(0, 100) : undefined,
    headphone: value.headphone ? String(value.headphone).slice(0, 120) : undefined,
    channelMatch: value.channelMatch ? safeChannelMatch(value.channelMatch) : undefined,
    createdAt: savedTime(value.createdAt), updatedAt: savedTime(value.updatedAt),
    target: value.target && Array.isArray(value.target.points) && value.target.points.length >= 2 && value.target.points.length <= 2000 && value.target.points.every((p, i, rows) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && p[0] >= 20 && p[0] <= 20000 && Math.abs(p[1]) <= 200 && (!i || p[0] > rows[i - 1][0])) ? { id: String(value.target.id ?? "").slice(0,100), name: String(value.target.name).slice(0,100), points: value.target.points.map(([hz, db]) => [hz, db]) } : undefined };
}

export function parseLibraryEq(text: string, name: string): LibraryEq {
  if (text.length > 100_000) throw new Error("The EQ file is too large.");
  if (/^\s*CH:\s*[01]\s*$/im.test(text)) throw new Error("This is a channel-match preset. Attach it to a headphone model in My space instead of importing it as a shared EQ.");
  const filters: PeqFilter[] = [];
  let preamp = 0;
  let engine: LibraryEq["engine"], engineVersion: string | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const provenance = /^# Engine: (peqdb|legacy) (.+)$/.exec(line);
    if (provenance) { engine = provenance[1] as LibraryEq["engine"]; engineVersion = provenance[2].slice(0, 160); }
    if (!line || line.startsWith("#") || /^Filter\s+\d+:\s*OFF\b/i.test(line)) continue;
    const pre = /^Preamp:\s*([-+]?\d+(?:\.\d+)?)\s*dB\s*$/i.exec(line);
    if (pre) { preamp = Number(pre[1]); continue; }
    const filter = /^Filter\s+\d+:\s*ON\s+(PK|LSC|HSC)\s+Fc\s+([\d.]+)\s*Hz\s+Gain\s+([-+]?\d+(?:\.\d+)?)\s*dB\s+Q\s+([\d.]+)\s*$/i.exec(line);
    if (filter) { filters.push({ type: filter[1].toUpperCase() as PeqFilter["type"], hz: Number(filter[2]), gain: Number(filter[3]), q: Number(filter[4]) }); continue; }
    if (/^(Filter\s+\d+:|Preamp:)/i.test(line)) throw new Error("This file contains an unsupported filter. Upload a peak/shelf EQ TXT export.");
  }
  if (!filters.length) throw new Error("No supported EQ filters were found in this TXT file.");
  return safeLibraryEq({ id: crypto.randomUUID(), name, source: "Uploaded TXT", engine, engineVersion, filters, preamp });
}

export function readLibraryEqs(): LibraryEq[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(LIBRARY_EQ_KEY) || "[]");
    return Array.isArray(data) ? data.slice(0, 30).flatMap(value => { try { return [safeLibraryEq(value as LibraryEq)]; } catch { return []; } }) : [];
  } catch { return []; }
}

export function saveLibraryEq(eq: LibraryEq) {
  const safe = safeLibraryEq(eq), rows = readLibraryEqs(), existing = rows.find(item => item.id === safe.id);
  const now = Date.now();
  const next = [{ ...safe, createdAt: existing ? existing.createdAt : safe.createdAt ?? now, updatedAt: now }, ...rows.filter(item => item.id !== safe.id)].slice(0, 30);
  localStorage.setItem(LIBRARY_EQ_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("library-eqs-changed"));
}

export function removeLibraryEq(id: string) {
  removeLibraryEqs([id]);
}

export function removeLibraryEqs(ids: readonly string[]) {
  if (!ids.length) return;
  const selected = new Set(ids);
  const rows: unknown = JSON.parse(localStorage.getItem(LIBRARY_EQ_KEY) || "[]");
  if (!Array.isArray(rows)) throw new Error("Saved EQs could not be read. Nothing was deleted.");
  // Deleting does not change surviving filters or their stored headroom. Read
  // the freshest collection once, preserve it exactly, and notify once.
  const next = rows.filter(row => !row || typeof row !== "object" || !selected.has(row.id));
  if (next.length === rows.length) return;
  localStorage.setItem(LIBRARY_EQ_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("library-eqs-changed"));
}

export function measurementChannelMatch(measurement: ChannelMatch | undefined): ChannelMatch | undefined {
  if (!measurement) return;
  try { return safeChannelMatch(measurement); } catch { return; }
}
