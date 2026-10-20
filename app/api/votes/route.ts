import { publicTargetPredicate } from "@/lib/public-targets";
import { env } from "cloudflare:workers";
import { LISTENING_PROTOCOL } from "@/lib/listening-protocol";
import { comparisonRecords } from "@/db/schema";
import { submissionContext } from "@/lib/submission-ownership";
import { activeSubmissions } from "@/lib/active-submissions";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { listeningRuns, rankedTrials, targets, votes } from "@/db/schema";
import { intervalStats, parseIntervals } from "@/lib/listening";
import { cleanFeedback } from "@/lib/feedback";
import { targetHeadphoneType } from "@/lib/target-type";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";
import { publicWriteGate } from "@/lib/public-write-gate";

export async function POST(request: Request) {
  try {
    const ownership = await submissionContext("vote");
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const data = await readJsonObject(request, 32768);
    if (data.testMode !== "blind" && !ownership.shareMusic) for (const key of ["songTitle","songArtist","songAlbum","recordingId","sha256"]) delete data[key];
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
    await ownership.requireTrial(trialId);
    const trialAge = Date.now() - trial.issuedAt;
    if (trialAge < 10000) return Response.json({ error: "The trial has not been open long enough to listen to both sides." }, { status: 403 });
    if (trialAge > 7200000) return Response.json({ error: "This trial expired. Start a new pairing." }, { status: 410 });
    const alreadyUsed = await db.select({ id: votes.id }).from(votes).where(eq(votes.id, trialId)).limit(1);
    if (alreadyUsed.length) return Response.json({ error: "This trial has already been submitted." }, { status: 409 });
    const completed = await db.select().from(listeningRuns).where(eq(listeningRuns.trialId,trialId)).get();
    if (!completed || completed.voterId!==voterId || completed.testMode!==data.testMode || completed.headphoneType!==data.headphoneType || completed.targetAId!==trial.sideA || completed.targetBId!==trial.sideB || completed.result==="tie" || (completed.result==="a" ? trial.sideA : trial.sideB)!==winnerId || completed.protocolVersion!==LISTENING_PROTOCOL || trial.protocolVersion!==LISTENING_PROTOCOL) return Response.json({error:"A matching completed listening record is required before a ranked vote."},{status:409});
    const owner = await env.DB!.prepare("SELECT subject_id FROM submission_owners WHERE record_kind='run' AND record_id=?").bind(completed.id).first<{subject_id:string}>();
    if(owner?.subject_id!==ownership.subjectId) return Response.json({error:"The listening record is not owned by your sign-in."},{status:403});
    const activeRun=await activeSubmissions();
    if(!activeRun("run",completed.id)) return Response.json({error:"This listening record was excluded from research."},{status:409});
    const now = Date.now();
    const recentVotes = await db.select({ createdAt: votes.createdAt, otherReason: votes.otherReason }).from(votes)
      .where(and(eq(votes.voterId, voterId), gte(votes.createdAt, now - 86400000)))
      .orderBy(desc(votes.createdAt)).limit(51);
    // Listening trials can continue without a per-browser vote quota. The shared
    // edge write limits and one-use trial validation still protect rankings.
    const feedback = cleanFeedback(data);
    if (feedback.otherReason && recentVotes.filter(row => row.otherReason?.toLowerCase() === feedback.otherReason.toLowerCase()).length >= 2) {
      return Response.json({ error: "This feedback was already submitted. Add details specific to this comparison." }, { status: 429 });
    }
    const pair = await db.select().from(targets).where(and(eq(targets.id, winnerId),publicTargetPredicate));
    const other = await db.select().from(targets).where(and(eq(targets.id, loserId),publicTargetPredicate));
    if (!pair[0] || !other[0]) return Response.json({ error: "Target not found." }, { status: 404 });
    if (pair[0].status !== "approved" || other[0].status !== "approved") return Response.json({ error: "Both targets need owner approval before votes can be collected." }, { status: 403 });
    const pairType = targetHeadphoneType({ name: pair[0].name, measurement: pair[0].measurement });
    const otherType = targetHeadphoneType({ name: other[0].name, measurement: other[0].measurement });
    if ((pairType && pairType !== data.headphoneType) || (otherType && otherType !== data.headphoneType)) return Response.json({ error: "Targets must match the selected headphone type." }, { status: 400 });
    if (data.result !== undefined && data.result !== "preference") return Response.json({ error: "Submit a tie through its completed listening record; this endpoint accepts decisive votes." }, { status: 400 });
    const safeNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
    const intervals = parseIntervals(JSON.parse(completed.intervals));
    const stats = intervalStats(intervals);
    if(stats.heardA<5||stats.heardB<5||stats.overlapSeconds<5) return Response.json({error:"The completed run does not meet the same-passage listening requirement."},{status:400});
    const shareDetails=data.testMode==="blind" || ownership.shareMusic;
    const provenance = shareDetails ? JSON.parse(completed.researchContext || "{}") : {};
    const sha256 = String(provenance.sha256 ?? "");
    if (sha256 && !/^[a-f0-9]{64}$/.test(sha256)) return Response.json({ error: "Invalid file hash." }, { status: 400 });
    // Check outcomes remain diagnostics; no unvalidated hearing-ability weights.
    const reliabilityWeight = 1;
    await db.batch([
      db.insert(votes).values({
        id: trialId, protocolVersion: LISTENING_PROTOCOL, winnerId, loserId, voterId, reliabilityWeight, createdAt: Date.now(),
        songTitle: String(shareDetails ? completed.songTitle ?? "" : "").trim().slice(0, 120) || null,
        songArtist: String(shareDetails ? completed.songArtist ?? "" : "").trim().slice(0, 120) || null,
        songAlbum: String(shareDetails ? completed.songAlbum ?? "" : "").trim().slice(0, 120) || null,
        recordingId: String(provenance.recordingId ?? "").trim().slice(0, 80) || null,
        sha256: sha256 || null,
        intervals: JSON.stringify(intervals),
        ...stats, eligible: 1, testMode: String(data.testMode), headphoneType: data.headphoneType,
        reasonSide: feedback.reasonSide, reasonTags: JSON.stringify(feedback.reasonTags), otherReason: feedback.otherReason || null,
        audioFormat: String(provenance.audioFormat ?? "").trim().slice(0, 40) || null,
        sampleRate: safeNumber(provenance.sampleRate),
        bitrate: safeNumber(provenance.bitrate),
        duration: safeNumber(provenance.duration),
      }),
      ownership.record(trialId), db.insert(comparisonRecords).values({recordKind:"vote",recordId:trialId,comparisonId:trialId}),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    if(/erased or changed/.test(String(error)+String((error as {cause?:unknown})?.cause))) return Response.json({error:"This comparison was erased or changed while saving. Start a new comparison."},{status:409});
    const inputError = requestInputResponse(error);
    if (inputError) return inputError;
    if (String(error).includes("UNIQUE constraint failed") || String((error as { cause?: unknown })?.cause).includes("UNIQUE constraint failed")) {
      return Response.json({ error: "This trial has already been submitted." }, { status: 409 });
    }
    return Response.json({ error: "Vote could not be saved." }, { status: 500 });
  }
}
