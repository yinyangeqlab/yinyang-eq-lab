import { env } from "cloudflare:workers";
import { EAR_PRACTICE_PROTOCOL, EAR_PRACTICE_MAX_STAGE, type EarPracticeDistribution } from "@/lib/ear-practice-ranking";
import { ownerAccessResponse } from "@/lib/owner-access";

export async function GET(request: Request) {
  const denied = await ownerAccessResponse(request);
  if (denied) return denied;
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const params = new URL(request.url).searchParams;
    const all = params.get("all") === "1";
    const rawPage = params.get("page") ?? "0";
    const page = Number(rawPage);
    if (!/^\d+$/.test(rawPage) || !Number.isSafeInteger(page) || page > 1_000_000) {
      return Response.json({ error: "Choose a valid results page." }, { status: 400, headers });
    }
    const [rows, population] = await env.DB!.batch([
      env.DB!.prepare("SELECT p.username,s.furthest,s.correct,s.attempts,s.accuracy_sum/s.attempts AS accuracy,s.subject_id AS participantId,RANK() OVER(ORDER BY s.correct DESC,(s.attempts-s.correct) ASC,ROUND(s.accuracy_sum/s.attempts,1) DESC,s.furthest DESC) AS rank FROM ear_practice_scores s JOIN ear_practice_profiles p USING(subject_id) WHERE s.protocol=? AND p.username IS NOT NULL AND s.subject_id NOT IN ('owner','invite:layout-test-only') ORDER BY rank,lower(p.username) LIMIT ? OFFSET ?")
        .bind(EAR_PRACTICE_PROTOCOL, all ? -1 : 100, all ? 0 : page * 100),
      env.DB!.prepare("SELECT s.furthest AS level,count(*) AS count FROM ear_practice_scores s JOIN ear_practice_profiles p USING(subject_id) WHERE s.protocol=? AND p.username IS NOT NULL AND s.subject_id NOT IN ('owner','invite:layout-test-only') GROUP BY s.furthest")
        .bind(EAR_PRACTICE_PROTOCOL),
    ]);
    const counts = new Map((population.results as EarPracticeDistribution[]).map(row => [row.level, row.count]));
    const distribution = Array.from({ length: EAR_PRACTICE_MAX_STAGE + 1 }, (_, level) => ({ level, count: counts.get(level) ?? 0 }));
    return Response.json({ rows: rows.results, distribution, participants: distribution.reduce((total, bin) => total + bin.count, 0), page: all ? 0 : page, pageSize: all ? Math.max(1, rows.results.length) : 100 }, { headers });
  } catch {
    return Response.json({ error: "The practice leaderboard is temporarily unavailable." }, { status: 503, headers });
  }
}
