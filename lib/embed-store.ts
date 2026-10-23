import { env } from "cloudflare:workers";
import { inArray } from "drizzle-orm";
import credits from "@/data/curve-credits.json";
import { getDb } from "@/db";
import { targets } from "@/db/schema";
import {
  EMBED_MAX_RUNS, EMBED_RETENTION_DAYS, EMBED_SHARE_NOTICE, MANAGE_KEY_PATTERN, SHOOTOUT_ID_PATTERN, curveBands, hashManageKey,
  type ListenerKind, type RunRow, type StoredPick,
} from "@/lib/embed-shootout";

/**
 * Only targets whose recorded reuse license permits redistribution can be
 * offered through the public, unauthenticated embed: their curve numbers are
 * sent to any visitor's browser. Widening this list is an owner decision.
 */
export const EMBED_ALLOWED_LICENSES = ["MIT", "CC BY 4.0"];

type Credit = (typeof credits)["targets"][number];
const eligibleCredits = new Map<string, Credit>(credits.targets.filter(entry => EMBED_ALLOWED_LICENSES.includes(entry.license)).map(entry => [entry.id, entry]));

export type EmbedTargetInfo = { id: string; name: string; credit: string; license: string; licenseUrl: string; sourceUrl: string; changes: string };
const info = (id: string, name: string): EmbedTargetInfo => {
  const entry = eligibleCredits.get(id);
  return { id, name, credit: entry?.credit ?? "", license: entry?.license ?? "", licenseUrl: entry?.licenseUrl ?? "", sourceUrl: entry?.sourceUrl ?? "",
    changes: `${entry?.changes ?? "Imported numerical curve."} Resampled to one-third-octave bands for audition.` };
};

function db(): D1Database {
  if (!env.DB) throw new Error("Database unavailable");
  return env.DB;
}

/** Approved, openly licensed built-in targets that can be chosen for a shootout. */
export async function listEligibleTargets(): Promise<{ id: string; name: string; credit: string; license: string }[]> {
  const ids = [...eligibleCredits.keys()];
  const rows = await getDb().select({ id: targets.id, name: targets.name, status: targets.status }).from(targets).where(inArray(targets.id, ids));
  return rows.filter(row => row.status === "approved").map(row => ({ id: row.id, name: row.name, credit: eligibleCredits.get(row.id)!.credit, license: eligibleCredits.get(row.id)!.license }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Loads the chosen targets in the requested order, or null when one is missing or not eligible. */
export async function loadTargets(ids: readonly string[]): Promise<(EmbedTargetInfo & { bands: number[] })[] | null> {
  if (ids.some(id => !eligibleCredits.has(id))) return null;
  const rows = await getDb().select({ id: targets.id, name: targets.name, points: targets.points, status: targets.status }).from(targets).where(inArray(targets.id, [...ids]));
  const byId = new Map(rows.filter(row => row.status === "approved").map(row => [row.id, row]));
  const result: (EmbedTargetInfo & { bands: number[] })[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) return null;
    try { result.push({ ...info(id, row.name), bands: curveBands(JSON.parse(row.points)) }); } catch { return null; }
  }
  return result;
}

export type ShootoutRow = { id: string; manage_hash: string; title: string; target_ids: string; created_at: number; expires_at: number; owner_share: number; owner_share_at: number | null; owner_share_notice: string | null };

export type Shootout = ShootoutRow & { targetIds: string[] };

export async function getShootout(id: string): Promise<Shootout | null> {
  if (!SHOOTOUT_ID_PATTERN.test(id)) return null;
  const row = await db().prepare("SELECT * FROM embed_shootouts WHERE id = ? AND expires_at > ?").bind(id, Date.now()).first<ShootoutRow>();
  if (!row) return null;
  try { return { ...row, targetIds: JSON.parse(row.target_ids) as string[] }; } catch { return null; }
}

export async function createShootout(row: { id: string; manageHash: string; title: string; targetIds: string[] }): Promise<void> {
  const now = Date.now();
  await db().prepare("INSERT INTO embed_shootouts (id, manage_hash, title, target_ids, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(row.id, row.manageHash, row.title, JSON.stringify(row.targetIds), now, now + EMBED_RETENTION_DAYS * 86_400_000).run();
  // Housekeeping: expired shootouts and their runs are removed (cascade).
  if (crypto.getRandomValues(new Uint8Array(1))[0] < 16) await db().prepare("DELETE FROM embed_shootouts WHERE expires_at < ?").bind(now).run();
}

export async function countRuns(id: string): Promise<number> {
  const row = await db().prepare("SELECT COUNT(*) AS n FROM embed_shootout_runs WHERE shootout_id = ?").bind(id).first<{ n: number }>();
  return row?.n ?? 0;
}

/** Stores one finished run. Time is kept to the hour only. Returns false when the shootout is full. */
export async function insertRun(shootoutId: string, run: { kind: ListenerKind; sighted: boolean; picks: StoredPick[] }): Promise<boolean> {
  const hour = Math.floor(Date.now() / 3_600_000);
  const result = await db().prepare(
    `INSERT INTO embed_shootout_runs (id, shootout_id, hour, listener_kind, sighted, picks)
     SELECT ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM embed_shootout_runs WHERE shootout_id = ?) < ?`)
    .bind(crypto.randomUUID(), shootoutId, hour, run.kind, run.sighted ? 1 : 0, JSON.stringify(run.picks), shootoutId, EMBED_MAX_RUNS).run();
  return result.meta.changes === 1;
}

export async function loadRuns(id: string): Promise<RunRow[]> {
  const { results } = await db().prepare("SELECT hour, listener_kind, sighted, picks FROM embed_shootout_runs WHERE shootout_id = ? ORDER BY hour, id LIMIT ?")
    .bind(id, EMBED_MAX_RUNS).all<{ hour: number; listener_kind: ListenerKind; sighted: number; picks: string }>();
  return results.flatMap(row => { try { return [{ hour: row.hour, kind: row.listener_kind, sighted: row.sighted === 1, picks: JSON.parse(row.picks) as StoredPick[] }]; } catch { return []; } });
}

export async function setOwnerShare(id: string, enabled: boolean): Promise<void> {
  await db().prepare("UPDATE embed_shootouts SET owner_share = ?, owner_share_at = ?, owner_share_notice = ? WHERE id = ?")
    .bind(enabled ? 1 : 0, Date.now(), enabled ? EMBED_SHARE_NOTICE : null, id).run();
}

/** Extends retention whenever the sharer opens their results. */
export async function touchShootout(id: string): Promise<void> {
  await db().prepare("UPDATE embed_shootouts SET expires_at = ? WHERE id = ? AND expires_at < ?")
    .bind(Date.now() + EMBED_RETENTION_DAYS * 86_400_000, id, Date.now() + (EMBED_RETENTION_DAYS - 1) * 86_400_000).run();
}

export async function deleteShootout(id: string): Promise<void> {
  await db().prepare("DELETE FROM embed_shootouts WHERE id = ?").bind(id).run();
}

/** Resolves a sharer's manage key (Authorization: Bearer) against a shootout; constant-time compare. */
export async function authorizeManager(request: Request, id: string): Promise<{ shootout: Shootout } | Response> {
  const headers = { "Cache-Control": "private, no-store" };
  const bearer = request.headers.get("authorization") || "";
  const key = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  const shootout = await getShootout(id);
  if (!shootout || !MANAGE_KEY_PATTERN.test(key)) return Response.json({ error: "This results link is not valid." }, { status: 404, headers });
  const actual = await hashManageKey(key);
  let difference = actual.length ^ shootout.manage_hash.length;
  for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ (shootout.manage_hash.charCodeAt(i) || 0);
  return difference ? Response.json({ error: "This results link is not valid." }, { status: 404, headers }) : { shootout };
}

/** Per-client hourly cap on creating shootouts, keyed by an HMAC of the address (never stored raw). */
export async function createLimitResponse(request: Request): Promise<Response | null> {
  const secret = (env as unknown as Record<string, unknown>).ABUSE_RATE_SECRET;
  const ip = request.headers.get("CF-Connecting-IP");
  if (typeof secret !== "string" || secret.length < 32 || !ip) return Response.json({ error: "Creating shootouts is not available right now." }, { status: 503 });
  const hmac = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", hmac, new TextEncoder().encode("embed-create\0" + ip));
  const client = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  const window = 3_600_000, bucket = Math.floor(Date.now() / window);
  const row = await db().prepare(`
    INSERT INTO public_write_limits (key, window_start, count, expires_at) VALUES (?, ?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET count = CASE WHEN window_start = excluded.window_start THEN count + 1 ELSE 1 END, window_start = excluded.window_start, expires_at = excluded.expires_at
    RETURNING count`).bind(`embed-create:${client}`, bucket, (bucket + 2) * window).first<{ count: number }>();
  if (!row || row.count > 6) return Response.json({ error: "You have created several shootouts recently. Please try again in an hour." }, { status: 429, headers: { "Retry-After": "3600" } });
  return null;
}
