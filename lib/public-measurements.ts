import { parseCurve, type Point } from "./curves";
import type { HeadphoneMeasurement } from "./measurement";
import { at, averageChannels } from "./channel-balance";

export type CatalogMeasurement = {
  path: string;
  name: string;
  source: string;
  type: "ie" | "oe";
  rig?: string | null;
  sha: string;
  repository?: string;
  leftPath?: string;
  rightPath?: string;
};

export function catalogCsvUrl(entry: CatalogMeasurement) {
  const repository = entry.repository ?? "jaakkopasanen/AutoEq";
  const branch = entry.repository ? "main" : "master";
  return `https://raw.githubusercontent.com/${repository}/${branch}/` + entry.path.split("/").map(encodeURIComponent).join("/");
}

async function limitedResponseText(response: Response, maxBytes = 4_000_000) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The measurement link returned no data.");
  const decoder = new TextDecoder();
  let text = "", size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new Error("The measurement file exceeds 4 MB."); }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

export async function fetchPublicCurve(url: string, normalize = true): Promise<Point[]> {
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error("Enter a complete HTTPS link to a raw CSV or TXT file."); }
  if (parsed.protocol !== "https:") throw new Error("Use an HTTPS link to a public raw CSV or TXT file.");
  let response: Response;
  try { response = await fetch(parsed.href); }
  catch { throw new Error("The website could not read that link. The source may block browser access; download the file and use the file upload instead."); }
  if (!response.ok) throw new Error(`The measurement link returned HTTP ${response.status}.`);
  const size = Number(response.headers.get("content-length"));
  if (Number.isFinite(size) && size > 4_000_000) throw new Error("The measurement file exceeds 4 MB.");
  return parseCurve(await limitedResponseText(response), normalize);
}

export async function importCatalogEntry(entry: CatalogMeasurement): Promise<HeadphoneMeasurement> {
  const url = catalogCsvUrl(entry);
  if (!entry.leftPath || !entry.rightPath) {
    const points = await fetchPublicCurve(url);
    return { ...publicMeasurement(`${entry.name} · ${entry.source}`, entry.type, entry.rig, url, points, entry.source),
      device: entry.name.slice(0, 120), responseFileName: entry.path.split("/").pop() };
  }
  const rightUrl = catalogCsvUrl({ ...entry, path: entry.rightPath });
  const [leftRaw, rightRaw] = await Promise.all([fetchPublicCurve(url, false), fetchPublicCurve(rightUrl, false)]);
  const leftLevelDb = at(leftRaw, 1000), rightLevelDb = at(rightRaw, 1000);
  const leftPoints = leftRaw.map(([hz, db]) => [hz, +(db - leftLevelDb).toFixed(4)] as Point);
  const rightPoints = rightRaw.map(([hz, db]) => [hz, +(db - rightLevelDb).toFixed(4)] as Point);
  return { ...publicMeasurement(`${entry.name} · ${entry.source}`, entry.type, entry.rig, url,
      averageChannels(leftPoints, rightPoints), entry.source), device: entry.name.slice(0, 120),
    leftPoints, rightPoints, leftLevelDb, rightLevelDb,
    leftFileName: entry.leftPath.split("/").pop(), rightFileName: entry.rightPath.split("/").pop(),
    singlePoints: undefined };
}

export function publicMeasurement(name: string, type: "ie" | "oe", rig: string | null | undefined, url: string, points: Point[], source: string): HeadphoneMeasurement {
  return {
    id: crypto.randomUUID(),
    name: name.slice(0, 80),
    device: name.slice(0, 120),
    type,
    rig: (rig || "Rig not listed by source").slice(0, 120),
    fit: "",
    notes: `Imported from ${source}.`,
    source: url,
    origin: "imported",
    points,
    singlePoints: points,
    createdAt: Date.now(),
  };
}

export function nameFromMeasurementUrl(url: string) {
  const last = new URL(url).pathname.split("/").filter(Boolean).pop() || "Public measurement";
  try { return decodeURIComponent(last).replace(/\.(csv|txt)$/i, "").trim() || "Public measurement"; }
  catch { return last.replace(/\.(csv|txt)$/i, "") || "Public measurement"; }
}
