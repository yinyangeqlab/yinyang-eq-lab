import { eq, isNotNull } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { ownerAccessResponse } from "@/lib/owner-access";
import { getDb } from "@/db";
import { communityPersonalChoices, communityReferenceAssignments, communityReferenceBlocks, comparisonChoices, deletionDailyTotals, feedbackSubmissions, listeningRuns, moderationEvents, musicVotes, personalResearchChoices, preferenceExports, researchMeasurements, suggestions, targets, votes } from "@/db/schema";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET(request: Request) {
  const denied = await ownerAccessResponse(request);
  if (denied) return denied;
  try {
    const db = getDb();
    const [voteRows, feedbackRows, targetRows, openChoices, runRows, measurementRows, exportRows, musicVoteRows, reviewEvents, deletionTotals, songSuggestions, personalChoices, communityChoices, referenceChoices, owners, profiles] = await Promise.all([
      db.select().from(votes),
      db.select().from(feedbackSubmissions),
      db.select({ id: targets.id, name: targets.name, creator: targets.creator, status: targets.status, createdAt: targets.createdAt, curveKind: targets.curveKind, submissionKind: targets.submissionKind, headphoneType: targets.headphoneType }).from(targets),
      db.select().from(comparisonChoices),
      db.select().from(listeningRuns),
      db.select().from(researchMeasurements),
      db.select().from(preferenceExports),
      db.select({ userId: musicVotes.userId, userName: musicVotes.userName, trackUrl: musicVotes.trackUrl, choice: musicVotes.choice, updatedAt: musicVotes.updatedAt }).from(musicVotes),
      db.select().from(moderationEvents),
      db.select().from(deletionDailyTotals),
      db.select().from(suggestions),
      db.select({ id: personalResearchChoices.id, targetAId: personalResearchChoices.targetAId, targetBId: personalResearchChoices.targetBId, result: personalResearchChoices.result, phase: personalResearchChoices.phase, recordingId: personalResearchChoices.recordingId, createdAt: personalResearchChoices.createdAt }).from(personalResearchChoices),
      db.select({ id: communityPersonalChoices.id, targetAId: communityPersonalChoices.targetAId, targetBId: communityPersonalChoices.targetBId, result: communityPersonalChoices.result, phase: communityPersonalChoices.phase, recordingId: communityPersonalChoices.recordingId, createdAt: communityPersonalChoices.createdAt }).from(communityPersonalChoices),
      db.select({
        id: communityReferenceAssignments.id, accountId: communityReferenceBlocks.subjectId,
        targetAId: communityReferenceAssignments.targetAId, targetBId: communityReferenceAssignments.targetBId,
        recordingId: communityReferenceAssignments.recordingId, result: communityReferenceAssignments.result,
        createdAt: communityReferenceAssignments.answeredAt,
      }).from(communityReferenceAssignments)
        .innerJoin(communityReferenceBlocks, eq(communityReferenceBlocks.id, communityReferenceAssignments.blockId))
        .where(isNotNull(communityReferenceAssignments.answeredAt)),
      // The session hash is used only inside the DB. A linked device ID is not the
      // original browser UUID and the current ownership session can change.
      env.DB!.prepare(`WITH device_ids AS (
        SELECT d.data_token_hash, MIN(s.id) AS id
        FROM private_tester_devices d JOIN account_device_status s ON s.session_hash=d.session_hash
        GROUP BY d.data_token_hash HAVING COUNT(*)=1
      )
      SELECT o.record_kind,o.record_id,o.subject_id,d.id AS linked_device_id
      FROM submission_owners o LEFT JOIN device_ids d ON d.data_token_hash=o.session_hash
      WHERE o.record_kind IN ('vote','feedback','target','open','run','measurement','export','music','suggestion','personal','community')`)
        .all<{record_kind:string;record_id:string;subject_id:string;linked_device_id:string|null}>(),
      env.DB!.prepare("SELECT subject_id,nickname FROM listener_nicknames").all<{subject_id:string;nickname:string}>(),
    ]);
    const ownership = new Map(owners.results.map(row => [`${row.record_kind}:${row.record_id}`, row]));
    const nicknames = new Map(profiles.results.map(row => [row.subject_id, row.nickname]));
    function attribution(kind: string, id: string, browserId: string | null = null, fallbackAccountId: string | null = null) {
      const owner = ownership.get(`${kind}:${id}`);
      const accountId = fallbackAccountId ?? owner?.subject_id ?? null;
      return { accountId, listenerNickname: accountId ? nicknames.get(accountId) ?? null : null, browserId,
        linkedDeviceId: !browserId && accountId === owner?.subject_id ? owner?.linked_device_id ?? null : null };
    }
    const named = <T extends {id:string}>(kind:string, rows:T[], browserId?: (row:T) => string) =>
      rows.map(row => ({ ...row, ...attribution(kind, row.id, browserId?.(row)) }));
    return Response.json({
      votes: named("vote", voteRows, row => row.voterId), feedback: named("feedback", feedbackRows, row => row.participantId),
      targets: named("target", targetRows), openChoices: named("open", openChoices, row => row.participantId),
      listeningRuns: named("run", runRows, row => row.voterId), researchMeasurements: named("measurement", measurementRows, row => row.contributorId),
      preferenceExports: named("export", exportRows), songSuggestions: named("suggestion", songSuggestions),
      personalChoices: named("personal", personalChoices), communityChoices: named("community", communityChoices),
      referenceChoices: referenceChoices.map(({ accountId, ...row }) => ({
        ...row, phase: "reference", ...attribution("community-reference-answer", row.id, null, accountId),
      })),
      musicVotes: musicVoteRows.map(row => ({ ...row, ...attribution("music", JSON.stringify([row.userId, row.trackUrl]), null, row.userId) })),
      moderationEvents: reviewEvents, deletionTotals,
    }, { headers });
  } catch {
    return Response.json({ error: "Research data could not be loaded. Try again." }, { status: 500, headers });
  }
}
