import { publicTargetPredicate } from "@/lib/public-targets";
import { rankingEvidence } from "@/lib/ranking-evidence";
import { rankPreferences } from "@/lib/preference-ranking";
import { dataIdentity, submissionContext } from "@/lib/submission-ownership";
import { requireParticipantSubject } from "@/lib/admin-contributions";
import { maintenanceResponse } from "@/lib/maintenance";
import { count, eq, gte, and } from "drizzle-orm";
import { getDb } from "@/db";
import { submissionOwners, targets } from "@/db/schema";
import { parseCurve } from "@/lib/curves";
import { compareTargets } from "@/lib/target-review";
import { targetSubmissionContext } from "@/lib/target-submission";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";
import { publicWriteGate } from "@/lib/public-write-gate";

export async function GET() {
  const maintenance = maintenanceResponse();
  if (maintenance) return maintenance;
  const evidence = await rankingEvidence();
  const ratings = new Map(rankPreferences(evidence.targets,evidence.votes).rows.map(row=>[row.id,row]));
  const rows = evidence.targets.map(target=>({...target,rating:ratings.get(target.id)?.rating??1500,wins:ratings.get(target.id)?.wins??0,losses:ratings.get(target.id)?.losses??0})).sort((a,b)=>b.rating-a.rating||a.id.localeCompare(b.id));
  return Response.json(rows.map(({ points, measurement, ...row }) => ({ ...row, points: JSON.parse(points), measurement: measurement ? JSON.parse(measurement) : null })));
}

export async function POST(request: Request) {
  try {
    const ownership = await submissionContext("target");
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const data = await readJsonObject(request, 300_000);
    // Private targets never leave the participant's device; only an explicit public-review choice is accepted.
    if (data.visibility === "private") return Response.json({ error: "Private targets stay on your device. Choose public review to submit one." }, { status: 400 });
    const name = String(data.name ?? "").trim().slice(0, 80);
    const creator = String(data.creator ?? "").trim().slice(0, 60);
    const description = String(data.description ?? "").trim().slice(0, 240);
    if (!name || !creator) return Response.json({ error: "Name and creator are required." }, { status: 400 });
    const curveKind = data.curveKind === "preference" ? "preference" : "original";
    const parentTargetId = curveKind === "preference" ? String(data.parentTargetId ?? "").trim() : "";
    if (curveKind === "preference" && !parentTargetId) return Response.json({ error: "Select the target your preference curve is based on." }, { status: 400 });
    const points = parseCurve(String(data.csv ?? ""));
    const {measurement,headphoneType,referenceSystem,submissionKind} = targetSubmissionContext(data);
    const db = getDb();
    const now = Date.now();
    const [hourly, daily] = await Promise.all([
      db.select({ total: count() }).from(targets).where(and(eq(targets.status, "pending"), gte(targets.createdAt, now - 3600000),publicTargetPredicate)),
      db.select({ total: count() }).from(targets).where(and(eq(targets.status, "pending"), gte(targets.createdAt, now - 86400000),publicTargetPredicate)),
    ]);
    if (hourly[0].total >= 20 || daily[0].total >= 100)
      return Response.json({ error: "The review queue is full. Please try later." }, { status: 429, headers: { "Retry-After": "3600" } });
    const existing = await db.select().from(targets).where(publicTargetPredicate);
    if (parentTargetId && !existing.some(target => target.id === parentTargetId && target.status === "approved"))
      return Response.json({ error: "Choose an available approved parent target." }, { status: 400 });
    const matches = compareTargets(name, points, existing.map(t => ({ id:t.id,name:t.name,points:JSON.parse(t.points) })));
    const id = crypto.randomUUID();
    await db.batch([db.insert(targets).values({ id, name, creator, description, curveKind, parentTargetId: parentTargetId || null, points: JSON.stringify(points), measurement: measurement ? JSON.stringify(measurement) : null, headphoneType, referenceSystem, submissionKind, createdAt: now, status:"pending", reviewReason:JSON.stringify(matches) }), ownership.record(id)]);
    return Response.json({ id, status:"pending", matches }, { status: 201 });
  } catch (error) {
    const inputError = requestInputResponse(error);
    if (inputError) return inputError;
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}

/** Withdraw your own submission while it is still pending review. Approved targets may already carry votes and rankings, so they are never deleted here. */
export async function DELETE(request: Request) {
  try {
    const identity = await dataIdentity();
    requireParticipantSubject(identity.subjectId);
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const data = await readJsonObject(request, 1_000);
    const id = String(data.id ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Choose one of your submitted targets." }, { status: 400 });
    const db = getDb();
    const [owner] = await db.select({ id: submissionOwners.recordId }).from(submissionOwners).where(and(eq(submissionOwners.recordKind, "target"), eq(submissionOwners.recordId, id), eq(submissionOwners.subjectId, identity.subjectId)));
    if (!owner) return Response.json({ error: "This target was not submitted by your sign-in." }, { status: 403 });
    const [row] = await db.select({ status: targets.status }).from(targets).where(eq(targets.id, id));
    if (!row) return Response.json({ withdrawn: true, already: true });
    if (row.status !== "pending") return Response.json({ error: "This target is already approved or reviewed, so it cannot be withdrawn here. Ask the owner to remove it." }, { status: 409 });
    await db.batch([
      db.delete(targets).where(and(eq(targets.id, id), eq(targets.status, "pending"))),
      db.delete(submissionOwners).where(and(eq(submissionOwners.recordKind, "target"), eq(submissionOwners.recordId, id), eq(submissionOwners.subjectId, identity.subjectId))),
    ]);
    return Response.json({ withdrawn: true });
  } catch (error) {
    const inputError = requestInputResponse(error);
    if (inputError) return inputError;
    return Response.json({ error: error instanceof Error ? error.message : "Withdrawal failed." }, { status: 400 });
  }
}
