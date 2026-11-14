import { sharedAutoEqTarget } from "@/lib/autoeq-target-sources";
import { cleanFitMetadata } from "@/lib/fitter-settings";
import { publicTargetPredicate } from "@/lib/public-targets";
import { curveVersion } from "@/lib/curve-version";
import { LISTENING_PROTOCOL, FREE_LISTENING_PROTOCOL } from "@/lib/listening-protocol";
import { comparisonRecords } from "@/db/schema";
import { submissionContext } from "@/lib/submission-ownership";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { listeningRuns, rankedTrials, targets } from "@/db/schema";
import { intervalStats, parseIntervals } from "@/lib/listening";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";
import { VOTE_DATA_NOTICE_VERSION } from "@/lib/vote-data-notice";
import { publicWriteGate } from "@/lib/public-write-gate";
import { markShootoutSubmissionFailure, type ShootoutSubmissionFailureReason, type ShootoutSubmissionStage } from "@/lib/shootout-submission-logs";

const uuid = /^[a-f0-9-]{36}$/i;

export async function POST(request: Request) {
  let stage: ShootoutSubmissionStage = "identity";
  const reject = (reason: ShootoutSubmissionFailureReason, status: number, error: string) =>
    markShootoutSubmissionFailure(stage, reason, Response.json({ error }, { status }));
  try {
    const ownership = await submissionContext("run");
    stage = "write_gate";
    const limited = await publicWriteGate(request);
    if (limited) return markShootoutSubmissionFailure(stage, "write_blocked", limited);
    stage = "request_body";
    const data = await readJsonObject(request, 32_768);
    if (data.voteDataNoticeVersion !== VOTE_DATA_NOTICE_VERSION) return reject("notice_outdated", 403, "Review the current data notice before participating.");
    const id = String(data.id ?? ""), voterId = String(data.voterId ?? "");
    const targetAId = String(data.targetAId ?? ""), targetBId = String(data.targetBId ?? "");
    const measurementId = data.measurementId == null ? null : String(data.measurementId);
    const testMode = String(data.testMode ?? ""), headphoneType = String(data.headphoneType ?? ""), result = String(data.result ?? "");
    if (![id, voterId, targetAId, targetBId].every(value => uuid.test(value)) || (measurementId && !uuid.test(measurementId)) || !["blind", "bring", "open"].includes(testMode) || !["ie", "oe"].includes(headphoneType) || !["a", "b", "tie"].includes(result)) return reject("invalid_comparison", 400, "Invalid comparison.");
    if (data.matchedPassageRequired !== undefined && typeof data.matchedPassageRequired !== "boolean") return reject("invalid_requirement", 400, "Invalid listening requirement.");
    stage = "listening_evidence";
    const intervals = parseIntervals(data.intervals);
    if (!Array.isArray(data.intervals) || data.intervals.length > 200 || intervals.length !== data.intervals.length) return reject("invalid_intervals", 400, "Invalid playback intervals.");
    const stats = intervalStats(intervals);
    const shareSong = testMode === "blind" || data.shareSong === true && ownership.shareMusic;
    const song = (key: string, max = 120) => shareSong ? String(data[key] ?? "").trim().slice(0, max) || null : null;
    stage = "trial";
    const db = getDb();
    const matchedPassageRequired=data.matchedPassageRequired!==false;
    const trialId = testMode === "open" || !matchedPassageRequired ? null : String(data.trialId ?? "");
    let protocolVersion = matchedPassageRequired ? LISTENING_PROTOCOL : FREE_LISTENING_PROTOCOL;
    let issuedVersions: string[] | null=null;
    if (trialId !== null) {
      if (!uuid.test(trialId)) return reject("invalid_trial", 400, "Invalid ranked trial.");
      await ownership.requireTrial(trialId);
      const issued = await db.select().from(rankedTrials).where(eq(rankedTrials.id, trialId)).get();
      if (!issued || issued.voterId !== voterId || issued.testMode !== testMode || issued.sideA !== targetAId || issued.sideB !== targetBId) return reject("trial_mismatch", 409, "Ranked trial does not match this comparison.");
      if(issued.headphoneType!==headphoneType)return reject("headphone_category_changed", 409, "Headphone category changed. Start a new pairing.");
      issuedVersions=JSON.parse(issued.targetVersions||"null");
      protocolVersion = issued.protocolVersion;
      if (protocolVersion !== LISTENING_PROTOCOL) return reject("protocol_changed", 409, "The listening protocol was updated. Start a new pairing; your older saved results remain available.");
      if (stats.overlapSeconds < 5) return reject("insufficient_overlap", 400, "Replay the same passage under A and B: at least 5 seconds must overlap.");
      if (stats.heardA + stats.heardB > (Date.now()-issued.issuedAt)/1000 + 1) return reject("playback_exceeds_trial_age", 400, "Playback intervals exceed the elapsed trial time.");
      if (Date.now() - issued.issuedAt < 10000 || stats.heardA < 5 || stats.heardB < 5) return reject("insufficient_playback", 400, "Blind comparisons require at least 5 seconds of playback per side.");
      if (Date.now() - issued.issuedAt > 7200000) return reject("trial_expired", 410, "This trial expired. Start a new pairing.");
    }
    stage = "listening_evidence";
    const context = data.researchContext && typeof data.researchContext === "object" ? data.researchContext as Record<string,unknown> : {};
    const cleanContext: Record<string,unknown> = { protocolVersion, matchedPassageRequired, matchedPassage:stats.heardA>=5&&stats.heardB>=5&&stats.overlapSeconds>=5 };
    // Technical provenance only; no audio bytes, filenames or raw headphone response.
    for (const key of ["rig","measurementType","normalizationStatus","loudnessTarget","recordingId","sha256","audioFormat"]) if(typeof context[key]==="string") cleanContext[key]=context[key].slice(0,160);
    for (const key of ["sampleRate","bitrate","duration"]) if(typeof context[key]==="number" && Number.isFinite(context[key]) && Number(context[key])>=0) cleanContext[key]=context[key];
    if (!shareSong) for (const key of ["recordingId","sha256","audioFormat","sampleRate","bitrate","duration"]) delete cleanContext[key];
    try { cleanContext.eqFits = cleanFitMetadata(context.eqFits); } catch { return reject("invalid_fitter_provenance", 400, "Both sides need valid matching EQ fitter provenance."); }
    stage = "targets";
    const targetRows = await db.select().from(targets).where(publicTargetPredicate);
    const targetVersions = await Promise.all([targetAId, targetBId].map(id => {
      const stored = targetRows.find(target => target.id === id);
      if (stored) return stored.status === "approved" ? curveVersion(stored.points) : null;
      return sharedAutoEqTarget(id)?.version ?? null;
    }));
    if (targetVersions.some(version => version === null)) {
      const error = testMode === "open" || !matchedPassageRequired
        ? "Private-target comparisons stay in this browser and are not collected."
        : "Only current approved targets can be collected.";
      return reject("target_unavailable", 400, error);
    }
    // Only new Blind choices from a page that disclosed the Free Listening ranking qualify.
    const countedInFreeListening = data.rankFreeListening === true && !matchedPassageRequired &&
      testMode !== "open" && targetAId !== targetBId;
    if (countedInFreeListening) cleanContext.freeListeningRanking = true;
    cleanContext.targetVersions = targetVersions;
    if((trialId && JSON.stringify(issuedVersions)!==JSON.stringify(cleanContext.targetVersions)) || JSON.stringify(context.targetVersions)!==JSON.stringify(cleanContext.targetVersions)) return reject("target_version_mismatch", 409, "Target curves changed or this page uses an older protocol. Refresh the page and start a new pairing.");
    stage = "save";
    await db.batch([db.insert(listeningRuns).values({
      id, voterId, testMode, headphoneType, targetAId, targetBId, trialId, protocolVersion, researchContext: JSON.stringify(cleanContext),
      targetAName: String(data.targetAName ?? "").trim().slice(0, 80),
      targetBName: String(data.targetBName ?? "").trim().slice(0, 80),
      measurementId, result, intervals: JSON.stringify(intervals), ...stats,
      songTitle: song("songTitle"), songArtist: song("songArtist"), songAlbum: song("songAlbum"), recordingId: song("recordingId", 80),
      createdAt: Date.now(),
    }), ownership.record(id), db.insert(comparisonRecords).values({recordKind:"run",recordId:id,comparisonId:trialId || id})]);
    return Response.json({ ok: true, countedInFreeListening }, { status: 201 });
  } catch (error) {
    if(/erased or changed/.test(String(error)+String((error as {cause?:unknown})?.cause))) return reject("comparison_changed", 409, "This comparison was erased or changed while saving. Start a new comparison.");
    const inputError = requestInputResponse(error);
    if (inputError) return markShootoutSubmissionFailure(stage, "request_input", inputError);
    return reject("internal_error", 500, "Listening run could not be saved.");
  }
}
