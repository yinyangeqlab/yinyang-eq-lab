import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { targetRemovalRequests, targets } from "@/db/schema";
import { ownerAccessResponse } from "@/lib/owner-access";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";

const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie" };

/** Open and recent removal requests with the target they name. */
export async function GET(request: Request) {
  const denied = await ownerAccessResponse(request);
  if (denied) return denied;
  const db = getDb();
  const rows = await db.select().from(targetRemovalRequests).orderBy(desc(targetRemovalRequests.createdAt)).limit(200);
  const ids = [...new Set(rows.map(row => row.targetId))];
  const named = ids.length ? await db.select({ id: targets.id, name: targets.name, creator: targets.creator, status: targets.status }).from(targets).where(inArray(targets.id, ids)) : [];
  const byId = new Map(named.map(row => [row.id, row]));
  return Response.json({ requests: rows.map(row => ({ id: row.id, targetId: row.targetId, message: row.message, status: row.status, adminNote: row.adminNote, createdAt: row.createdAt, resolvedAt: row.resolvedAt, targetName: byId.get(row.targetId)?.name ?? null, targetCreator: byId.get(row.targetId)?.creator ?? null, targetStatus: byId.get(row.targetId)?.status ?? null })) }, { headers });
}

/** Decide a request. "done" takes the target out of rankings by marking it withdrawn: the existing database triggers rebuild counts, bump the ranking revision and log a coarse ranking-change day. Votes are kept but stop counting. */
export async function POST(request: Request) {
  const denied = await ownerAccessResponse(request);
  if (denied) return denied;
  if (request.headers.get("Origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid origin." }, { status: 403, headers });
  try {
    const body = await readJsonObject(request, 4096);
    const id = typeof body.id === "string" ? body.id : "";
    const action = String(body.action ?? "");
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
    if (!/^[a-f0-9-]{36}$/i.test(id) || !["done", "declined"].includes(action)) return Response.json({ error: "Choose a request and an action." }, { status: 400, headers });
    const db = getDb();
    const [row] = await db.select().from(targetRemovalRequests).where(eq(targetRemovalRequests.id, id));
    if (!row) return Response.json({ error: "Request not found." }, { status: 404, headers });
    if (row.status !== "pending") return Response.json({ error: "This request was already answered." }, { status: 409, headers });
    const now = Date.now();
    if (action === "done") {
      await db.batch([
        db.update(targets).set({ status: "withdrawn" }).where(and(eq(targets.id, row.targetId), eq(targets.status, "approved"))),
        db.update(targetRemovalRequests).set({ status: "done", adminNote: note || null, resolvedAt: now }).where(and(eq(targetRemovalRequests.id, id), eq(targetRemovalRequests.status, "pending"))),
      ]);
    } else {
      await db.update(targetRemovalRequests).set({ status: "declined", adminNote: note || null, resolvedAt: now }).where(and(eq(targetRemovalRequests.id, id), eq(targetRemovalRequests.status, "pending")));
    }
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    const input = requestInputResponse(error);
    if (input) return input;
    return Response.json({ error: "The request could not be saved." }, { status: 400, headers });
  }
}
