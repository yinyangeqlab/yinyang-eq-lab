import { and, desc, eq, gte, or } from "drizzle-orm";
import { getDb } from "@/db";
import { rankedPairClaims, rankedTrials, targets, votes } from "@/db/schema";
import { intervalStats, parseIntervals } from "@/lib/listening";
import { cleanFeedback } from "@/lib/feedback";
import { targetHeadphoneType } from "@/lib/target-type";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";
import { publicWriteGate } from "@/lib/public-write-gate";

export async function POST(request: Request) {
  try {
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const data = await readJsonObject(request, 32768);
    const { winnerId, loserId, voterId, trialId } = data as Record<string, string>;
    if (!winnerId || !loserId || winnerId === loserId || !/^[a-f0-9-]{36}$/.test(voterId ?? "") || !/^[a-f0-9-]{36}$/.test(trialId ?? "")) {
      return Response.json({ error: "Invalid vote." }, { status: 400 });
    }
    if (!(["blind", "bring"].includes(String(data.testMode))) || typeof data.heardA !== "number" || typeof data.heardB !== "number" || !Number.isFinite(data.heardA) || !Number.isFinite(data.heardB) || data.heardA < 5 || data.heardB < 5) {
      return Response.json({ error: "Blind votes require at least 5 seconds of playback on each side." }, { status: 400 });
    }
    if (data.headphoneType !== "ie" && data.headphoneType !== "oe") {
      return Response.json({ error: "Choose In-Ear or Over-Ear before voting." }, { status: 400 });
    }
    const db = getDb();
    const assigned = await db.select().from(rankedTrials).where(eq(rankedTrials.id, trialId)).limit(1);
    const trial = assigned[0];
    if (!trial || trial.voterId !== voterId || trial.testMode !== data.testMode ||
        !((trial.sideA === winnerId && trial.sideB === loserId) || (trial.sideA === loserId && trial.sideB === winnerId))) {
      return Response.json({ error: "This vote does not match a server-assigned trial." }, { status: 403 });
    }
    const trialAge = Date.now() - trial.issuedAt;
    if (trialAge < 10000) return Response.json({ error: "The trial has not been open long enough to listen to both sides." }, { status: 403 });
    if (trialAge > 7200000) return Response.json({ error: "This trial expired. Start a new pairing." }, { status: 410 });
    const alreadyUsed = await db.select({ id: votes.id }).from(votes).where(eq(votes.id, trialId)).limit(1);
    if (alreadyUsed.length) return Response.json({ error: "This trial has already been submitted." }, { status: 409 });
    const now = Date.now();
    const recentVotes = await db.select({ createdAt: votes.createdAt, otherReason: votes.otherReason }).from(votes)
      .where(and(eq(votes.voterId, voterId), gte(votes.createdAt, now - 86400000)))
      .orderBy(desc(votes.createdAt)).limit(51);
    if (recentVotes.length >= 50 || recentVotes.filter(row => row.createdAt >= now - 600000).length >= 6) {
      return Response.json({ error: "Submission limit reached. Please try again later." }, { status: 429, headers: { "Retry-After": "600" } });
    }
    const feedback = cleanFeedback(data);
    if (feedback.otherReason && recentVotes.filter(row => row.otherReason?.toLowerCase() === feedback.otherReason.toLowerCase()).length >= 2) {
      return Response.json({ error: "This feedback was already submitted. Add details specific to this comparison." }, { status: 429 });
    }
    const pair = await db.select().from(targets).where(eq(targets.id, winnerId));
    const other = await db.select().from(targets).where(eq(targets.id, loserId));
    if (!pair[0] || !other[0]) return Response.json({ error: "Target not found." }, { status: 404 });
    if (pair[0].status !== "approved" || other[0].status !== "approved") return Response.json({ error: "Both targets need owner approval before votes can be collected." }, { status: 403 });
    const pairType = targetHeadphoneType({ name: pair[0].name, measurement: pair[0].measurement });
    const otherType = targetHeadphoneType({ name: other[0].name, measurement: other[0].measurement });
    if ((pairType && pairType !== data.headphoneType) || (otherType && otherType !== data.headphoneType)) return Response.json({ error: "Targets must match the selected headphone type." }, { status: 400 });
    const prior = await db.select().from(votes).where(and(eq(votes.voterId, voterId), eq(votes.testMode, String(data.testMode)), or(
      and(eq(votes.winnerId, winnerId), eq(votes.loserId, loserId)),
      and(eq(votes.winnerId, loserId), eq(votes.loserId, winnerId)),
    )));
    if (prior.length) return Response.json({ error: "You already voted for this pairing." }, { status: 409 });
    const expected = 1 / (1 + Math.pow(10, (other[0].rating - pair[0].rating) / 400));
    const delta = 24 * (1 - expected);
    const safeNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
    const intervals = parseIntervals(data.intervals);
    const stats = intervalStats(intervals);
    const sha256 = String(data.sha256 ?? "");
    if (sha256 && !/^[a-f0-9]{64}$/.test(sha256)) return Response.json({ error: "Invalid file hash." }, { status: 400 });
    const [firstId, secondId] = [winnerId, loserId].sort();
    await db.batch([
      db.insert(rankedPairClaims).values({ voterId, testMode: String(data.testMode), firstId, secondId, trialId }),
      db.insert(votes).values({
        id: trialId, winnerId, loserId, voterId, createdAt: Date.now(),
        songTitle: String(data.songTitle ?? "").trim().slice(0, 120) || null,
        songArtist: String(data.songArtist ?? "").trim().slice(0, 120) || null,
        songAlbum: String(data.songAlbum ?? "").trim().slice(0, 120) || null,
        recordingId: String(data.recordingId ?? "").trim().slice(0, 80) || null,
        sha256: sha256 || null,
        intervals: JSON.stringify(intervals),
        ...stats, heardA: data.heardA, heardB: data.heardB, eligible: 1, testMode: String(data.testMode), headphoneType: data.headphoneType,
        reasonSide: feedback.reasonSide, reasonTags: JSON.stringify(feedback.reasonTags), otherReason: feedback.otherReason || null,
        audioFormat: String(data.audioFormat ?? "").trim().slice(0, 40) || null,
        sampleRate: safeNumber(data.sampleRate),
        bitrate: safeNumber(data.bitrate),
        duration: safeNumber(data.duration),
      }),
      db.update(targets).set({ rating: pair[0].rating + delta, wins: pair[0].wins + 1 }).where(eq(targets.id, winnerId)),
      db.update(targets).set({ rating: other[0].rating - delta, losses: other[0].losses + 1 }).where(eq(targets.id, loserId)),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    const inputError = requestInputResponse(error);
    if (inputError) return inputError;
    if (String(error).includes("UNIQUE constraint failed") || String((error as { cause?: unknown })?.cause).includes("UNIQUE constraint failed")) {
      return Response.json({ error: "This trial or pairing has already been submitted." }, { status: 409 });
    }
    return Response.json({ error: "Vote could not be saved." }, { status: 500 });
  }
}
