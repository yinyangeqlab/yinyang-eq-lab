import { env } from "cloudflare:workers";
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
    const profiles = await env.DB!.prepare("SELECT o.record_kind,o.record_id,n.nickname FROM submission_owners o JOIN listener_nicknames n ON n.subject_id=o.subject_id").all<{record_kind:string;record_id:string;nickname:string}>();
    const nicknames = new Map((profiles.results || []).map(row=>[`${row.record_kind}:${row.record_id}`,row.nickname]));
    const named = <T extends {id:string}>(kind:string,rows:T[]) => rows.map(row=>({...row,listenerNickname:nicknames.get(`${kind}:${row.id}`) || null}));
    const musicProfiles = await env.DB!.prepare("SELECT subject_id,nickname FROM listener_nicknames").all<{subject_id:string;nickname:string}>();
    const musicNames = new Map((musicProfiles.results || []).map(row=>[row.subject_id,row.nickname]));
    return Response.json({ votes: named("vote",voteRows), feedback: named("feedback",feedbackRows), targets: targetRows, openChoices: named("open",openChoices), listeningRuns: named("run",runRows), researchMeasurements: named("measurement",measurementRows), preferenceExports: named("export",exportRows), musicVotes: musicVoteRows.map(row=>({...row,listenerNickname:musicNames.get(row.userId) || null})), moderationEvents: reviewEvents, deletionTotals }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Research data could not be loaded. Check the feedback migration." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
