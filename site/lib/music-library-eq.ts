import { PERSONAL_AREA_TITLE } from "./personal-area";
import { validFitter, type FitterSettings } from "./fitter-settings";
import type { Point } from "./curves";
import type { PeqFilter } from "@/lib/autoeq";
import { peakBoost } from "@/lib/preference-finalize";
import type { ChannelMatch } from "./channel-balance";
import { safeChannelMatch } from "./channel-match-export";
import { isPresetQ, MAX_PRESET_Q, MIN_PRESET_Q } from "./peq-preset";

export type LibraryEq = { fitter?: FitterSettings; engine?: "peqdb" | "legacy"; engineVersion?: string; id: string; name: string; filters: PeqFilter[]; preamp: number; source: string; measurementId?: string; headphone?: string; channelMatch?: ChannelMatch; createdAt?: number; updatedAt?: number; target?: { id?: string; name: string; points: Point[] } };
export const LIBRARY_EQ_KEY = "target-lab-library-eqs-v1";
export const LIBRARY_EQ_FILTER_LIMIT = 40;
// Headroom depends only on the filters. Keep validation on every read, while
// avoiding the three-rate frequency sweep for unchanged presets and UI edits.
const headroomCache = new Map<string, number>();
const savedTime = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 8.64e15 ? value : undefined;

export function libraryEqPreamp(filters: PeqFilter[], requestedPreamp: number) {
  if (!Number.isFinite(requestedPreamp) || requestedPreamp > 0 || requestedPreamp < -60) throw new Error("The EQ preamp is invalid.");
  // Recalculate headroom even for downloaded presets. An extra 1 dB protects against intersample peaks.
  const key = JSON.stringify(filters.map(f => [f.type ?? "PK", f.hz, f.gain, f.q]));
  let headroom = headroomCache.get(key);
  if (headroom === undefined) {
    headroom = -Math.ceil((Math.max(0, peakBoost(filters)) + 1.5) * 10) / 10;
    if (headroomCache.size >= 128) headroomCache.delete(headroomCache.keys().next().value!);
    headroomCache.set(key, headroom);
  }
  const preamp = Math.min(requestedPreamp, headroom);
  if (preamp < -60) throw new Error("These filters need more than 60 dB of headroom. Reduce their boosts before saving.");
  return preamp;
}

export function safeLibraryEq(value: LibraryEq): LibraryEq {
  if (!Array.isArray(value.filters) || value.filters.length < 1 || value.filters.length > LIBRARY_EQ_FILTER_LIMIT) {
    throw new Error(`This EQ needs 1–${LIBRARY_EQ_FILTER_LIMIT} peak or shelf filters.`);
  }
  if (value.filters.some(f => !["PK", "LSC", "HSC"].includes(f.type ?? "PK") || !Number.isFinite(f.hz) || f.hz < 20 || f.hz > 20000 || !Number.isFinite(f.gain) || Math.abs(f.gain) > 24 || !isPresetQ(f.q))) {
    throw new Error(`Each saved EQ filter needs a supported peak or shelf type, 20–20,000 Hz, −24 to +24 dB gain and Q ${MIN_PRESET_Q}–${MAX_PRESET_Q}.`);
  }
  const preamp = libraryEqPreamp(value.filters, value.preamp);
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
  if (/^\s*CH:\s*[01]\s*$/im.test(text)) throw new Error(`This is a channel-match preset. Attach it to a headphone model in ${PERSONAL_AREA_TITLE} instead of importing it as a shared EQ.`);
  if (/^\s*Channel:\s*(?:L|R|1|2)\s*(?:#.*)?$/im.test(text)) throw new Error("This EQ has separate Left/Right settings. Use Blind EQ Comparison to test the complete stereo preset; Saved EQs currently use the same filters on both channels.");
  const filters: PeqFilter[] = [];
  let preamp = 0;
  let engine: LibraryEq["engine"], engineVersion: string | undefined;
  const number = "([-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))";
  const preampLine = new RegExp(`^Preamp:\\s*${number}\\s*dB$`, "i");
  const filterLine = new RegExp(`^Filter(?:\\s+\\d+)?:\\s*ON\\s+(PK|PEQ|LS|LSC|HS|HSC)\\s+Fc\\s+${number}\\s*Hz\\s+Gain\\s+${number}\\s*dB(?:\\s+Q\\s+${number})?$`, "i");
  for (const [index, raw] of text.replace(/^\uFEFF/, "").split(/\r?\n/).entries()) {
    const line = raw.trim();
    const provenance = /^# Engine: (peqdb|legacy) (.+)$/.exec(line);
    if (provenance) { engine = provenance[1] as LibraryEq["engine"]; engineVersion = provenance[2].slice(0, 160); }
    const setting = line.split("#")[0].trim();
    if (!setting || /^Filter(?:\s+\d+)?:\s*OFF\b/i.test(setting) || /^Channel:\s*(ALL|L\s+R|1\s+2)$/i.test(setting)) continue;
    const pre = preampLine.exec(setting);
    if (pre) { preamp += Number(pre[1]); continue; }
    const filter = filterLine.exec(setting);
    if (filter) {
      const kind = filter[1].toUpperCase();
      if ((kind === "PK" || kind === "PEQ") && filter[4] === undefined) throw new Error(`Line ${index + 1}: Peak filters need a Q value.`);
      filters.push({ type: (kind === "PEQ" ? "PK" : kind === "LS" ? "LSC" : kind === "HS" ? "HSC" : kind) as PeqFilter["type"], hz: Number(filter[2]), gain: Number(filter[3]), q: filter[4] === undefined ? Math.SQRT1_2 : Number(filter[4]) });
      continue;
    }
    if (/^[-+\d.]+[\s,;\t]+[-+\d.]+/.test(setting)) throw new Error("This looks like a target or measurement curve. Upload EQ settings with Preamp and Filter lines instead.");
    throw new Error(`Line ${index + 1}: Unsupported EQ setting. Choose a parametric TXT export with PK, LS/LSC or HS/HSC filters. GraphicEQ, convolution, includes and native .peace files are not supported.`);
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

export function saveLibraryEq(eq: LibraryEq, { refuseIfFull = false } = {}) {
  const safe = safeLibraryEq(eq), rows = readLibraryEqs(), existing = rows.find(item => item.id === safe.id);
  if (refuseIfFull && !existing && rows.length >= 30) {
    throw new Error("You have 30 saved EQs. Remove one in My Collection before importing another.");
  }
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
