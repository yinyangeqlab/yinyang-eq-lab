import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { submissionOwners, targetRemovalRequests, targets } from "@/db/schema";
import { requireParticipantSubject } from "@/lib/admin-contributions";
import { publicWriteGate } from "@/lib/public-write-gate";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";
import { dataIdentity } from "@/lib/submission-ownership";

const noStore = { "Cache-Control": "private, no-store", "Vary": "Cookie" };
const idPattern = /^[0-9a-f-]{36}$/i;

/** The signed-in participant's own removal requests, newest first. */
export async function GET() {
  try {
    const identity = await dataIdentity();
    requireParticipantSubject(identity.subjectId);
    const rows = await getDb().select({ id: targetRemovalRequests.id, targetId: targetRemovalRequests.targetId, status: targetRemovalRequests.status, createdAt: targetRemovalRequests.createdAt, resolvedAt: targetRemovalRequests.resolvedAt }).from(targetRemovalRequests).where(eq(targetRemovalRequests.subjectId, identity.subjectId)).orderBy(desc(targetRemovalRequests.createdAt)).limit(200);
    return Response.json({ requests: rows }, { headers: noStore });
  } catch (error) {
    const inputError = requestInputResponse(error);
    if (inputError) return inputError;
    return Response.json({ error: "Removal requests could not be loaded." }, { status: 400, headers: noStore });
  }
}

/** Ask the owner to take one of your approved targets out of public rankings. The owner decides; nothing is deleted here. */
export async function POST(request: Request) {
  try {
    const identity = await dataIdentity();
    requireParticipantSubject(identity.subjectId);
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const data = await readJsonObject(request, 2_000);
    const targetId = String(data.id ?? "").trim();
    const message = String(data.message ?? "").trim().slice(0, 500);
    if (!idPattern.test(targetId)) return Response.json({ error: "Choose one of your approved targets." }, { status: 400 });
    const db = getDb();
    const [owner] = await db.select({ id: submissionOwners.recordId }).from(submissionOwners).where(and(eq(submissionOwners.recordKind, "target"), eq(submissionOwners.recordId, targetId), eq(submissionOwners.subjectId, identity.subjectId)));
    if (!owner) return Response.json({ error: "This target was not submitted by your sign-in." }, { status: 403 });
    const [target] = await db.select({ status: targets.status }).from(targets).where(eq(targets.id, targetId));
    if (!target) return Response.json({ error: "This target is no longer listed." }, { status: 404 });
    if (target.status !== "approved") return Response.json({ error: target.status === "pending" ? "This target is still pending; withdraw it instead." : "This target is already removed from public rankings." }, { status: 409 });
    const [open] = await db.select({ id: targetRemovalRequests.id }).from(targetRemovalRequests).where(and(eq(targetRemovalRequests.targetId, targetId), eq(targetRemovalRequests.status, "pending")));
    if (open) return Response.json({ id: open.id, status: "pending", already: true });
    const id = crypto.randomUUID();
    await db.insert(targetRemovalRequests).values({ id, targetId, subjectId: identity.subjectId, message, status: "pending", createdAt: Date.now() });
    return Response.json({ id, status: "pending" }, { status: 201 });
  } catch (error) {
    const inputError = requestInputResponse(error);
    if (inputError) return inputError;
    return Response.json({ error: error instanceof Error ? error.message : "Request failed." }, { status: 400 });
  }
}

/** Cancel one of your own requests while it is still open. */
export async function DELETE(request: Request) {
  try {
    const identity = await dataIdentity();
    requireParticipantSubject(identity.subjectId);
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const data = await readJsonObject(request, 1_000);
    const id = String(data.id ?? "").trim();
    if (!idPattern.test(id)) return Response.json({ error: "Choose one of your requests." }, { status: 400 });
    const db = getDb();
    const [row] = await db.select({ status: targetRemovalRequests.status }).from(targetRemovalRequests).where(and(eq(targetRemovalRequests.id, id), eq(targetRemovalRequests.subjectId, identity.subjectId)));
    if (!row) return Response.json({ error: "This request was not made by your sign-in." }, { status: 403 });
    if (row.status !== "pending") return Response.json({ error: "The owner already answered this request." }, { status: 409 });
    await db.delete(targetRemovalRequests).where(and(eq(targetRemovalRequests.id, id), eq(targetRemovalRequests.subjectId, identity.subjectId), eq(targetRemovalRequests.status, "pending")));
    return Response.json({ cancelled: true });
  } catch (error) {
    const inputError = requestInputResponse(error);
    if (inputError) return inputError;
    return Response.json({ error: error instanceof Error ? error.message : "Cancel failed." }, { status: 400 });
  }
}
