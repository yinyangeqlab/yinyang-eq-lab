import { submissionContext } from "@/lib/submission-ownership";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackSubmissions, rankedTrials, targets } from "@/db/schema";
import { cleanFeedback } from "@/lib/feedback";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";
import { publicWriteGate } from "@/lib/public-write-gate";

const uuid = /^[a-f0-9-]{36}$/i;

export async function POST(request: Request) {
  try {
    const ownership = await submissionContext("feedback");
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const data = await readJsonObject(request, 8192);
    const participantId = String(data.participantId || "");
    const comparisonId = String(data.comparisonId || "");
    const targetAId = String(data.targetAId || "");
    const targetBId = String(data.targetBId || "");
    const testMode = String(data.testMode || "");
    if (![participantId, comparisonId, targetAId, targetBId].every(value => uuid.test(value)) || !["blind", "bring", "open"].includes(testMode) || !["ie", "oe"].includes(String(data.headphoneType)) || !["a", "b"].includes(String(data.reasonSide))) {
      return Response.json({ error: "Invalid feedback context." }, { status: 400 });
    }
    const { reasonSide, reasonTags, otherReason } = cleanFeedback(data);
    if (!reasonTags.length && !otherReason) return Response.json({ error: "Choose a description or enter feedback before submitting." }, { status: 400 });
    const db = getDb();
    if (testMode !== "open") {
      await ownership.requireTrial(comparisonId);
      const [trial] = await db.select().from(rankedTrials).where(eq(rankedTrials.id, comparisonId)).limit(1);
      if (!trial || trial.voterId !== participantId || trial.testMode !== testMode || trial.sideA !== targetAId || trial.sideB !== targetBId || Date.now() - trial.issuedAt > 7200000) {
        return Response.json({ error: "This feedback does not match an active trial." }, { status: 403 });
      }
    }
    const [a] = await db.select({ status: targets.status }).from(targets).where(eq(targets.id, targetAId)).limit(1);
    const [b] = await db.select({ status: targets.status }).from(targets).where(eq(targets.id, targetBId)).limit(1);
    if (!a || !b || a.status !== "approved" || b.status !== "approved") return Response.json({ error: "Shared feedback needs approved targets." }, { status: 403 });
    const now = Date.now();
    const recent = await db.select({ createdAt: feedbackSubmissions.createdAt, otherReason: feedbackSubmissions.otherReason }).from(feedbackSubmissions)
      .where(and(eq(feedbackSubmissions.participantId, participantId), gte(feedbackSubmissions.createdAt, now - 86400000)))
      .orderBy(desc(feedbackSubmissions.createdAt)).limit(13);
    if (recent.length >= 12 || recent.filter(row => row.createdAt >= now - 900000).length >= 3) {
      return Response.json({ error: "Feedback limit reached. Please try later." }, { status: 429, headers: { "Retry-After": "900" } });
    }
    if (otherReason && recent.filter(row => row.otherReason?.toLowerCase() === otherReason.toLowerCase()).length >= 2) {
      return Response.json({ error: "This same feedback was already submitted twice." }, { status: 429 });
    }
    const existing = await db.select({ id: feedbackSubmissions.id }).from(feedbackSubmissions).where(and(eq(feedbackSubmissions.participantId, participantId), eq(feedbackSubmissions.comparisonId, comparisonId), eq(feedbackSubmissions.side, reasonSide))).limit(1);
    if (existing.length) return Response.json({ error: "Feedback for this sample was already submitted." }, { status: 409 });
    const shareSong = data.shareSong === true && (testMode === "blind" || ownership.shareMusic);
    const id = crypto.randomUUID();
    await db.batch([db.insert(feedbackSubmissions).values({
      id, participantId, comparisonId, testMode, headphoneType: String(data.headphoneType), side: reasonSide,
      targetAId, targetBId, reasonTags: JSON.stringify(reasonTags), otherReason: otherReason || null,
      songTitle: shareSong ? String(data.songTitle || "").trim().slice(0, 120) || null : null,
      songArtist: shareSong ? String(data.songArtist || "").trim().slice(0, 120) || null : null,
      songAlbum: shareSong ? String(data.songAlbum || "").trim().slice(0, 120) || null : null,
      createdAt: now, reviewStatus: "pending",
    }), ownership.record(id)]);
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    const inputError = requestInputResponse(error);
    if (inputError) return inputError;
    if (String(error).includes("UNIQUE constraint failed") || String((error as { cause?: unknown })?.cause).includes("UNIQUE constraint failed")) return Response.json({ error: "Feedback for this sample was already submitted." }, { status: 409 });
    return Response.json({ error: "Feedback could not be saved." }, { status: 500 });
  }
}
