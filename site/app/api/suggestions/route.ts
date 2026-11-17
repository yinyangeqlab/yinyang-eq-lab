import { submissionContext } from "@/lib/submission-ownership";
import { maintenanceResponse } from "@/lib/maintenance";
import { count, desc, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { suggestions, submissionOwners } from "@/db/schema";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";
import { publicWriteGate } from "@/lib/public-write-gate";

export async function GET() {
  const maintenance = maintenanceResponse();
  if (maintenance) return maintenance;
  const rows = await getDb().select().from(suggestions).where(sql`NOT EXISTS (SELECT 1 FROM ${submissionOwners} WHERE ${submissionOwners.recordKind}='suggestion' AND ${submissionOwners.recordId}=${suggestions.id} AND ${submissionOwners.subjectId}='owner')`).orderBy(desc(suggestions.createdAt)).limit(100);
  return Response.json(rows);
}

export async function POST(request: Request) {
  try {
    const ownership = await submissionContext("suggestion");
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const data = await readJsonObject(request, 2048);
    const title = String(data.title ?? "").trim().slice(0, 120);
    const artist = String(data.artist ?? "").trim().slice(0, 120);
    const album = String(data.album ?? "").trim().slice(0, 120);
    const recordingId = String(data.recordingId ?? "").trim().slice(0, 80);
    const note = String(data.note ?? "").trim().slice(0, 240);
    if (!title || !artist) return Response.json({ error: "Song title and artist are required." }, { status: 400 });
    const db = getDb(), now = Date.now();
    const [hourly, daily] = await Promise.all([
      db.select({ total: count() }).from(suggestions).where(gte(suggestions.createdAt, now - 3600000)),
      db.select({ total: count() }).from(suggestions).where(gte(suggestions.createdAt, now - 86400000)),
    ]);
    if (hourly[0].total >= 30 || daily[0].total >= 150)
      return Response.json({ error: "The suggestion queue is full. Please try later." }, { status: 429, headers: { "Retry-After": "3600" } });
    const id = crypto.randomUUID();
    await db.batch([db.insert(suggestions).values({ id, title, artist, album, recordingId, note, createdAt: now }), ownership.record(id)]);
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    const inputError = requestInputResponse(error);
    if (inputError) return inputError;
    return Response.json({ error: "Could not add suggestion." }, { status: 400 });
  }
}
