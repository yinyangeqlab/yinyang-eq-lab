import { parseCurve, type Point } from "@/lib/curves";
import type { ChannelMatchPreset } from "@/lib/peq-preset";

export type HeadphoneMeasurement = {
  id: string;
  name: string;
  device: string;
  type: "ie" | "oe";
  rig: string;
  fit: string;
  notes: string;
  source: string;
  origin?: "upload" | "imported";
  driverType?: string;
  nozzleDiameterMm?: number;
  researchContributionId?: string;
  points: Point[];
  singlePoints?: Point[];
  leftPoints?: Point[];
  rightPoints?: Point[];
  responseFileName?: string;
  leftFileName?: string;
  rightFileName?: string;
  channelMatchFileName?: string;
  leftLevelDb?: number;
  rightLevelDb?: number;
  channelMatchMode?: "auto" | "custom";
  channelMatchPreset?: ChannelMatchPreset;
  createdAt: number;
};

export function parseMeasurement(value: unknown): HeadphoneMeasurement {
  if (!value || typeof value !== "object") throw new Error("A raw headphone measurement is required.");
  const row = value as Record<string, unknown>;
  const field = (name: string, max: number, required = false) => {
    const text = String(row[name] ?? "").trim();
    if (text.length > max || (required && !text)) throw new Error(`Invalid measurement ${name}.`);
    return text;
  };
  if (row.type !== "ie" && row.type !== "oe") throw new Error("Choose in ear or over ear.");
  if (!Array.isArray(row.points) || row.points.length < 10 || row.points.length > 2000) throw new Error("Invalid raw measurement points.");
  const csv = row.points.map(point => {
    if (!Array.isArray(point) || point.length !== 2 || !point.every(x => typeof x === "number" && Number.isFinite(x))) throw new Error("Invalid raw measurement point.");
    return `${point[0]},${point[1]}`;
  }).join("\n");
  const channel = (key: "singlePoints" | "leftPoints" | "rightPoints") => Array.isArray(row[key]) ? parseCurve((row[key] as Point[]).map(point => `${point[0]},${point[1]}`).join("\n")) : undefined;
  const singlePoints = channel("singlePoints"), leftPoints = channel("leftPoints"), rightPoints = channel("rightPoints");
  const parsePreset = (value: unknown): ChannelMatchPreset => {
    if (!value || typeof value !== "object" || !Array.isArray((value as { channels?: unknown }).channels) || (value as { channels: unknown[] }).channels.length !== 2)
      throw new Error("Invalid channel-match preset.");
    const channels = (value as { channels: unknown[] }).channels.map(channel => {
      if (!channel || typeof channel !== "object") throw new Error("Invalid channel-match preset.");
      const entry = channel as Record<string, unknown>;
      if (typeof entry.preampDb !== "number" || !Number.isFinite(entry.preampDb) || Math.abs(entry.preampDb) > 40 || !Array.isArray(entry.filters) || entry.filters.length > 32)
        throw new Error("Invalid channel-match preset.");
      const filters = entry.filters.map(filter => {
        if (!filter || typeof filter !== "object") throw new Error("Invalid channel-match preset.");
        const item = filter as Record<string, unknown>;
        if (!["PK", "LSC", "HSC"].includes(String(item.type)) || typeof item.hz !== "number" || !Number.isFinite(item.hz) || item.hz < 20 || item.hz > 20000 || typeof item.gain !== "number" || !Number.isFinite(item.gain) || Math.abs(item.gain) > 40 || typeof item.q !== "number" || !Number.isFinite(item.q) || item.q < .1 || item.q > 20)
          throw new Error("Invalid channel-match preset.");
        return { type: item.type as "PK" | "LSC" | "HSC", hz: item.hz, gain: item.gain, q: item.q };
      });
      return { preampDb: entry.preampDb, filters };
    });
    return { channels: channels as ChannelMatchPreset["channels"] };
  };
  const channelMatchMode = row.channelMatchMode === "custom" ? "custom" : "auto";
  const channelMatchPreset = channelMatchMode === "custom" ? parsePreset(row.channelMatchPreset) : undefined;
  const level = (key: "leftLevelDb" | "rightLevelDb") => typeof row[key] === "number" && Number.isFinite(row[key]) && Math.abs(row[key]) <= 200 ? row[key] as number : undefined;
  return { id: field("id", 80), name: field("name", 80, true), device: field("device", 120, true), type: row.type,
    rig: field("rig", 120, true), fit: field("fit", 120), notes: field("notes", 500), source: field("source", 500),
    origin: row.origin === "imported" || row.origin === "upload" ? row.origin : undefined,
    driverType: field("driverType", 80), nozzleDiameterMm: typeof row.nozzleDiameterMm === "number" && Number.isFinite(row.nozzleDiameterMm) && row.nozzleDiameterMm > 0 && row.nozzleDiameterMm <= 30 ? row.nozzleDiameterMm : undefined,
    researchContributionId: field("researchContributionId", 80),
    points: parseCurve(csv), singlePoints, leftPoints, rightPoints,
    responseFileName: field("responseFileName", 180), leftFileName: field("leftFileName", 180),
    rightFileName: field("rightFileName", 180), channelMatchFileName: field("channelMatchFileName", 180),
    leftLevelDb: level("leftLevelDb"), rightLevelDb: level("rightLevelDb"), channelMatchMode,
    channelMatchPreset, createdAt: typeof row.createdAt === "number" && Number.isFinite(row.createdAt) ? row.createdAt : Date.now() };
}

export function isImportedMeasurement(row: HeadphoneMeasurement) {
  return row.origin === "imported" || row.origin !== "upload" && /^Imported from /i.test(row.notes) && /^https?:\/\//i.test(row.source);
}
