import { and, count, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { listeningRuns, rankedTrials } from "@/db/schema";
import { intervalStats, parseIntervals } from "@/lib/listening";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";
import { VOTE_DATA_NOTICE_VERSION } from "@/lib/vote-data-notice";
import { publicWriteGate } from "@/lib/public-write-gate";

const uuid = /^[a-f0-9-]{36}$/i;

export async function POST(request: Request) {
  try {
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const data = await readJsonObject(request, 32_768);
    if (data.voteDataNoticeVersion !== VOTE_DATA_NOTICE_VERSION) return Response.json({ error: "Review the current data notice before participating." }, { status: 403 });
    const id = String(data.id ?? ""), voterId = String(data.voterId ?? "");
    const targetAId = String(data.targetAId ?? ""), targetBId = String(data.targetBId ?? "");
    const measurementId = data.measurementId == null ? null : String(data.measurementId);
    const testMode = String(data.testMode ?? ""), headphoneType = String(data.headphoneType ?? ""), result = String(data.result ?? "");
    if (![id, voterId, targetAId, targetBId].every(value => uuid.test(value)) || (measurementId && !uuid.test(measurementId)) || !["blind", "bring", "open"].includes(testMode) || !["ie", "oe"].includes(headphoneType) || !["a", "b", "tie"].includes(result)) return Response.json({ error: "Invalid comparison." }, { status: 400 });
    const intervals = parseIntervals(data.intervals);
    const stats = intervalStats(intervals);
    const shareSong = testMode === "blind" || data.shareSong === true;
    const song = (key: string, max = 120) => shareSong ? String(data[key] ?? "").trim().slice(0, max) || null : null;
    const db = getDb();
    if (testMode !== "open") {
      const trialId = String(data.trialId ?? "");
      if (!uuid.test(trialId)) return Response.json({ error: "Invalid ranked trial." }, { status: 400 });
      const issued = await db.select().from(rankedTrials).where(eq(rankedTrials.id, trialId)).get();
      if (!issued || issued.voterId !== voterId || issued.testMode !== testMode || issued.sideA !== targetAId || issued.sideB !== targetBId) return Response.json({ error: "Ranked trial does not match this comparison." }, { status: 409 });
    }
    const recent = await db.select({ total: count() }).from(listeningRuns).where(and(eq(listeningRuns.voterId, voterId), gte(listeningRuns.createdAt, Date.now() - 3600000)));
    if (recent[0].total >= 120) return Response.json({ error: "Research run limit reached. Please try later." }, { status: 429 });
    await db.insert(listeningRuns).values({
      id, voterId, testMode, headphoneType, targetAId, targetBId,
      targetAName: String(data.targetAName ?? "").trim().slice(0, 80),
      targetBName: String(data.targetBName ?? "").trim().slice(0, 80),
      measurementId, result, intervals: JSON.stringify(intervals), ...stats,
      songTitle: song("songTitle"), songArtist: song("songArtist"), songAlbum: song("songAlbum"), recordingId: song("recordingId", 80),
      createdAt: Date.now(),
    }).onConflictDoNothing();
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    const inputError = requestInputResponse(error);
    if (inputError) return inputError;
    return Response.json({ error: "Listening run could not be saved." }, { status: 500 });
  }
}
