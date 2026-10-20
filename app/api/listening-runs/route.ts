import { publicTargetPredicate } from "@/lib/public-targets";
import { targetHeadphoneType } from "@/lib/target-type";
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

const uuid = /^[a-f0-9-]{36}$/i;

export async function POST(request: Request) {
  try {
    const ownership = await submissionContext("run");
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const data = await readJsonObject(request, 32_768);
    if (data.voteDataNoticeVersion !== VOTE_DATA_NOTICE_VERSION) return Response.json({ error: "Review the current data notice before participating." }, { status: 403 });
    const id = String(data.id ?? ""), voterId = String(data.voterId ?? "");
    const targetAId = String(data.targetAId ?? ""), targetBId = String(data.targetBId ?? "");
    const measurementId = data.measurementId == null ? null : String(data.measurementId);
    const testMode = String(data.testMode ?? ""), headphoneType = String(data.headphoneType ?? ""), result = String(data.result ?? "");
    if (![id, voterId, targetAId, targetBId].every(value => uuid.test(value)) || (measurementId && !uuid.test(measurementId)) || !["blind", "bring", "open"].includes(testMode) || !["ie", "oe"].includes(headphoneType) || !["a", "b", "tie"].includes(result)) return Response.json({ error: "Invalid comparison." }, { status: 400 });
    if (data.matchedPassageRequired !== undefined && typeof data.matchedPassageRequired !== "boolean") return Response.json({error:"Invalid listening requirement."},{status:400});
    const intervals = parseIntervals(data.intervals);
    if (!Array.isArray(data.intervals) || data.intervals.length > 200 || intervals.length !== data.intervals.length) return Response.json({error:"Invalid playback intervals."},{status:400});
    const stats = intervalStats(intervals);
    const shareSong = testMode === "blind" || data.shareSong === true && ownership.shareMusic;
    const song = (key: string, max = 120) => shareSong ? String(data[key] ?? "").trim().slice(0, max) || null : null;
    const db = getDb();
    const matchedPassageRequired=data.matchedPassageRequired!==false;
    const trialId = testMode === "open" || !matchedPassageRequired ? null : String(data.trialId ?? "");
    let protocolVersion = matchedPassageRequired ? LISTENING_PROTOCOL : FREE_LISTENING_PROTOCOL;
    let issuedVersions: string[] | null=null;
    if (trialId !== null) {
      if (!uuid.test(trialId)) return Response.json({ error: "Invalid ranked trial." }, { status: 400 });
      await ownership.requireTrial(trialId);
      const issued = await db.select().from(rankedTrials).where(eq(rankedTrials.id, trialId)).get();
      if (!issued || issued.voterId !== voterId || issued.testMode !== testMode || issued.sideA !== targetAId || issued.sideB !== targetBId) return Response.json({ error: "Ranked trial does not match this comparison." }, { status: 409 });
      if(issued.headphoneType!==headphoneType)return Response.json({error:"Headphone category changed. Start a new pairing."},{status:409});
      issuedVersions=JSON.parse(issued.targetVersions||"null");
      protocolVersion = issued.protocolVersion;
      if (protocolVersion !== LISTENING_PROTOCOL) return Response.json({ error: "The listening protocol was updated. Start a new pairing; your older saved results remain available." }, {status:409});
      if (stats.overlapSeconds < 5) return Response.json({error:"Replay the same passage under A and B: at least 5 seconds must overlap."},{status:400});
      if (stats.heardA + stats.heardB > (Date.now()-issued.issuedAt)/1000 + 1) return Response.json({error:"Playback intervals exceed the elapsed trial time."},{status:400});
      if (Date.now() - issued.issuedAt < 10000 || stats.heardA < 5 || stats.heardB < 5) return Response.json({ error: "Blind comparisons require at least 5 seconds of playback per side." }, { status: 400 });
      if (Date.now() - issued.issuedAt > 7200000) return Response.json({ error: "This trial expired. Start a new pairing." }, { status: 410 });
    }
    const context = data.researchContext && typeof data.researchContext === "object" ? data.researchContext as Record<string,unknown> : {};
    const cleanContext: Record<string,unknown> = { protocolVersion, matchedPassageRequired, matchedPassage:stats.heardA>=5&&stats.heardB>=5&&stats.overlapSeconds>=5 };
    // Technical provenance only; no audio bytes, filenames or raw headphone response.
    for (const key of ["rig","measurementType","normalizationStatus","loudnessTarget","recordingId","sha256","audioFormat"]) if(typeof context[key]==="string") cleanContext[key]=context[key].slice(0,160);
    for (const key of ["sampleRate","bitrate","duration"]) if(typeof context[key]==="number" && Number.isFinite(context[key]) && Number(context[key])>=0) cleanContext[key]=context[key];
    if (!shareSong) for (const key of ["recordingId","sha256","audioFormat","sampleRate","bitrate","duration"]) delete cleanContext[key];
    const fits=Array.isArray(context.eqFits)?context.eqFits:[];
    cleanContext.eqFits=fits.slice(0,2).map(value=>{const f=value as Record<string,unknown>;return Object.fromEntries(["bands","rms","preamp"].filter(k=>typeof f?.[k]==="number"&&Number.isFinite(f[k])).map(k=>[k,f[k]]));});
    const targetRows=await db.select().from(targets).where(publicTargetPredicate);
    if ((testMode === "open" || !matchedPassageRequired) && [targetAId,targetBId].some(id=>!targetRows.some(target=>target.id===id && target.status==="approved"))) return Response.json({error:"Private-target comparisons stay in this browser and are not collected."},{status:400});
    if ([targetAId,targetBId].some(id=>{const target=targetRows.find(t=>t.id===id);if(!target)return true;const type=targetHeadphoneType(target);return type!==null&&type!==headphoneType;})) return Response.json({error:"Target headphone category does not match this comparison."},{status:400});
    cleanContext.targetVersions=await Promise.all([targetAId,targetBId].map(async targetId=>{const target=targetRows.find(t=>t.id===targetId);if(!target)return null;return curveVersion(target.points);}));
    if((trialId && JSON.stringify(issuedVersions)!==JSON.stringify(cleanContext.targetVersions)) || JSON.stringify(context.targetVersions)!==JSON.stringify(cleanContext.targetVersions)) return Response.json({error:"Target curves changed or this page uses an older protocol. Refresh the page and start a new pairing."},{status:409});
    await db.batch([db.insert(listeningRuns).values({
      id, voterId, testMode, headphoneType, targetAId, targetBId, trialId, protocolVersion, researchContext: JSON.stringify(cleanContext),
      targetAName: String(data.targetAName ?? "").trim().slice(0, 80),
      targetBName: String(data.targetBName ?? "").trim().slice(0, 80),
      measurementId, result, intervals: JSON.stringify(intervals), ...stats,
      songTitle: song("songTitle"), songArtist: song("songArtist"), songAlbum: song("songAlbum"), recordingId: song("recordingId", 80),
      createdAt: Date.now(),
    }), ownership.record(id), db.insert(comparisonRecords).values({recordKind:"run",recordId:id,comparisonId:trialId || id})]);
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if(/erased or changed/.test(String(error)+String((error as {cause?:unknown})?.cause))) return Response.json({error:"This comparison was erased or changed while saving. Start a new comparison."},{status:409});
    const inputError = requestInputResponse(error);
    if (inputError) return inputError;
    return Response.json({ error: "Listening run could not be saved." }, { status: 500 });
  }
}
