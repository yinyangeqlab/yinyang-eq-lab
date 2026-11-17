import { BAND_HZ, type EmbedSummary, type RoundPlan, type RunRow } from "@/lib/embed-shootout";

export type EmbedTargetView = { id: string; name: string; credit: string; license: string; licenseUrl: string; sourceUrl: string; changes: string; bands: number[] };
export type EmbedConfig = { id: string; title: string; hz: number[]; bands: number[][]; trims: number[]; rounds: RoundPlan[]; runs: number };
export type EmbedReveal = { reveal: EmbedTargetView[]; crowd: { runs: number; targets: { index: number; score: number; favorite: number }[] } };
export type EmbedResults = {
  id: string; title: string; createdAt: number; expiresAt: number; targets: EmbedTargetView[]; summary: EmbedSummary; runs: RunRow[];
  ownerShare: { enabled: boolean; at: number | null; notice: string | null; currentNotice: string };
};

/** Same order as the orbs in the preview card: A red, B blue, then teal and amber. */
export const TARGET_COLORS = ["#ff4d5e", "#4d8dff", "#58d8c9", "#ffb84d"] as const;

const LOG_LO = Math.log(BAND_HZ[0]), LOG_HI = Math.log(BAND_HZ[BAND_HZ.length - 1]);
export const bandX = (index: number, width: number) => (Math.log(BAND_HZ[index]) - LOG_LO) / (LOG_HI - LOG_LO) * width;

/** Smooth SVG/canvas path through the band gains (Catmull-Rom converted to cubic Béziers). */
export function smoothPoints(points: readonly (readonly [number, number])[]): string {
  if (points.length < 2) return "";
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    try {
      const area = document.createElement("textarea");
      area.value = text; area.setAttribute("readonly", ""); area.style.position = "fixed"; area.style.opacity = "0";
      document.body.appendChild(area); area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch { return false; }
  }
}

// A sharer's manage keys stay in this browser only (and in the link fragment, which is never sent to a server).
const KEYS = "yinyang-embed-shootouts-v1";
export type SavedShootout = { id: string; key: string; title: string; created: number };
export function readSaved(): SavedShootout[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(KEYS) || "[]");
    return Array.isArray(list) ? list.filter((item): item is SavedShootout => !!item && typeof item.id === "string" && typeof item.key === "string").slice(0, 50) : [];
  } catch { return []; }
}
export function saveShootout(entry: SavedShootout) {
  try { localStorage.setItem(KEYS, JSON.stringify([entry, ...readSaved().filter(item => item.id !== entry.id)].slice(0, 50))); return readSaved().some(item => item.id === entry.id && item.key === entry.key); } catch { return false; }
}
export function forgetShootout(id: string) {
  try { localStorage.setItem(KEYS, JSON.stringify(readSaved().filter(item => item.id !== id))); } catch { /* storage unavailable */ }
}
const DONE = "yinyang-embed-done-";
export const alreadyVoted = (id: string) => { try { return localStorage.getItem(DONE + id) === "1"; } catch { return false; } };
export const markVoted = (id: string) => { try { localStorage.setItem(DONE + id, "1"); } catch { /* storage unavailable */ } };

export const siteOrigin = () => (typeof location === "undefined" ? "https://yinyangeq.com" : location.origin);
export const embedSnippet = (id: string, origin: string) =>
  `<iframe src="${origin}/embed/${id}" title="Blind headphone target shootout" width="100%" height="640" style="border:0;border-radius:18px;max-width:760px" loading="lazy" allow="autoplay"></iframe>`;
