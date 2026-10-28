import type { PeqFilter } from "@/lib/autoeq";
import { peakBoost } from "@/lib/preference-finalize";

export type LibraryEq = { engine?: "peqdb" | "legacy"; engineVersion?: string; id: string; name: string; filters: PeqFilter[]; preamp: number; source: string };
export const LIBRARY_EQ_KEY = "target-lab-library-eqs-v1";

export function safeLibraryEq(value: LibraryEq): LibraryEq {
  if (!Array.isArray(value.filters) || value.filters.length < 1 || value.filters.length > 20 ||
    value.filters.some(f => !["PK", "LSC", "HSC"].includes(f.type ?? "PK") || !Number.isFinite(f.hz) || f.hz < 20 || f.hz > 20000 || !Number.isFinite(f.gain) || Math.abs(f.gain) > 24 || !Number.isFinite(f.q) || f.q < .1 || f.q > 20)) {
    throw new Error("This EQ needs 1–20 valid peak or shelf filters.");
  }
  if (!Number.isFinite(value.preamp) || value.preamp > 0 || value.preamp < -60) throw new Error("The EQ preamp is invalid.");
  // Recalculate headroom even for downloaded presets. An extra 1 dB protects against intersample peaks.
  const preamp = Math.min(value.preamp, -Math.ceil((Math.max(0, peakBoost(value.filters)) + 1.5) * 10) / 10);
  return { ...(["peqdb", "legacy"].includes(value.engine ?? "") ? { engine: value.engine, engineVersion: String(value.engineVersion ?? "").slice(0, 160) } : {}), id: String(value.id).slice(0, 100), name: String(value.name).slice(0, 100), source: String(value.source).slice(0, 100),
    filters: value.filters.map(f => ({ ...(f.type ? { type: f.type } : {}), hz: f.hz, gain: f.gain, q: f.q })), preamp };
}

export function parseLibraryEq(text: string, name: string): LibraryEq {
  if (text.length > 100_000) throw new Error("The EQ file is too large.");
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
  const next = [safeLibraryEq(eq), ...readLibraryEqs().filter(item => item.id !== eq.id)].slice(0, 30);
  localStorage.setItem(LIBRARY_EQ_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("library-eqs-changed"));
}
