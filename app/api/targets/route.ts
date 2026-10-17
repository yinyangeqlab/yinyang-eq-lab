import { maintenanceResponse } from "@/lib/maintenance";
import { count, desc, eq, gte, and } from "drizzle-orm";
import { getDb } from "@/db";
import { targets } from "@/db/schema";
import { parseCurve } from "@/lib/curves";
import { compareTargets } from "@/lib/target-review";
import { parseMeasurement } from "@/lib/measurement";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";
import { publicWriteGate } from "@/lib/public-write-gate";

export async function GET() {
  const maintenance = maintenanceResponse();
  if (maintenance) return maintenance;
  const rows = await getDb().select().from(targets).where(eq(targets.status, "approved")).orderBy(desc(targets.rating));
  return Response.json(rows.map(({ points, measurement, ...row }) => ({ ...row, points: JSON.parse(points), measurement: measurement ? JSON.parse(measurement) : null })));
}

export async function POST(request: Request) {
  try {
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const data = await readJsonObject(request, 300_000);
    const name = String(data.name ?? "").trim().slice(0, 80);
    const creator = String(data.creator ?? "").trim().slice(0, 60);
    const description = String(data.description ?? "").trim().slice(0, 240);
    if (!name || !creator) return Response.json({ error: "Name and creator are required." }, { status: 400 });
    const curveKind = data.curveKind === "preference" ? "preference" : "original";
    const parentTargetId = curveKind === "preference" ? String(data.parentTargetId ?? "").trim() : "";
    if (curveKind === "preference" && !parentTargetId) return Response.json({ error: "Select the target your preference curve is based on." }, { status: 400 });
    const points = parseCurve(String(data.csv ?? ""));
    const measurement = parseMeasurement(data.measurement);
    const db = getDb();
    const now = Date.now();
    const [hourly, daily] = await Promise.all([
      db.select({ total: count() }).from(targets).where(and(eq(targets.status, "pending"), gte(targets.createdAt, now - 3600000))),
      db.select({ total: count() }).from(targets).where(and(eq(targets.status, "pending"), gte(targets.createdAt, now - 86400000))),
    ]);
    if (hourly[0].total >= 20 || daily[0].total >= 100)
      return Response.json({ error: "The review queue is full. Please try later." }, { status: 429, headers: { "Retry-After": "3600" } });
    const existing = await db.select().from(targets);
    if (parentTargetId && !existing.some(target => target.id === parentTargetId && target.status === "approved"))
      return Response.json({ error: "Choose an available approved parent target." }, { status: 400 });
    const matches = compareTargets(name, points, existing.map(t => ({ id:t.id,name:t.name,points:JSON.parse(t.points) })));
    const id = crypto.randomUUID();
    await db.insert(targets).values({ id, name, creator, description, curveKind, parentTargetId: parentTargetId || null, points: JSON.stringify(points), measurement: JSON.stringify(measurement), createdAt: now, status:"pending", reviewReason:JSON.stringify(matches) });
    return Response.json({ id, status:"pending", matches }, { status: 201 });
  } catch (error) {
    const inputError = requestInputResponse(error);
    if (inputError) return inputError;
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
