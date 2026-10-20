import { ownerAccessResponse } from "@/lib/owner-access";
import { getDb } from "@/db";
import { deletionDailyTotals, moderationEvents, comparisonChoices, feedbackSubmissions, listeningRuns, musicVotes, preferenceExports, researchMeasurements, targets, votes } from "@/db/schema";

export async function GET(request: Request) {
  const denied = await ownerAccessResponse(request);
  if (denied) return denied;
  try {
    const db = getDb();
    const [voteRows, feedbackRows, targetRows, openChoices, runRows, measurementRows, exportRows, musicVoteRows, reviewEvents, deletionTotals] = await Promise.all([
      db.select().from(votes),
      db.select().from(feedbackSubmissions),
      db.select({ id: targets.id, name: targets.name, creator: targets.creator }).from(targets),
      db.select().from(comparisonChoices),
      db.select().from(listeningRuns),
      db.select().from(researchMeasurements),
      db.select().from(preferenceExports),
      db.select().from(musicVotes),
      db.select().from(moderationEvents),
      db.select().from(deletionDailyTotals),
    ]);
    return Response.json({ votes: voteRows, feedback: feedbackRows, targets: targetRows, openChoices, listeningRuns: runRows, researchMeasurements: measurementRows, preferenceExports: exportRows, musicVotes: musicVoteRows, moderationEvents: reviewEvents, deletionTotals }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Research data could not be loaded. Check the feedback migration." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
