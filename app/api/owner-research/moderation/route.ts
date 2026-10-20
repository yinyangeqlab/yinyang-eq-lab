import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { comparisonChoices, feedbackSubmissions, listeningRuns, moderationEvents, preferenceExports, researchMeasurements, votes } from "@/db/schema";
import { ownerAccessResponse } from "@/lib/owner-access";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";
import { recordKinds, type RecordKind } from "@/lib/moderation";

export async function POST(request: Request) {
  const denied = await ownerAccessResponse(request);
  if (denied) return denied;
  if (request.headers.get("Origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const body = await readJsonObject(request, 4096);
    const kind = body.kind as RecordKind;
    const id = typeof body.id === "string" ? body.id : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const action = body.action;
    if (!recordKinds.includes(kind) || !/^[a-f0-9-]{36}$/i.test(id) || !["remove", "restore"].includes(String(action)) || reason.length < 3 || reason.length > 1000)
      return Response.json({ error: "Choose a submission and enter a reason (3–1000 characters)." }, { status: 400, headers });
    const db = getDb();
    const table = { vote: votes, open: comparisonChoices, run: listeningRuns, feedback: feedbackSubmissions, measurement: researchMeasurements, export: preferenceExports }[kind];
    const row = await db.select({ id: table.id }).from(table).where(eq(table.id, id)).get();
    if (!row) return Response.json({ error: "Submission not found." }, { status: 404, headers });
    // Shared admin credential: do not imply a verified individual identity.
    await db.insert(moderationEvents).values({ recordKind: kind, recordId: id, action: String(action), reason, actor: "admin (shared credential)", createdAt: Date.now() });
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    const input = requestInputResponse(error);
    if (input) return input;
    return Response.json({ error: "Review could not be saved. Check the admin moderation migration." }, { status: 500, headers });
  }
}
