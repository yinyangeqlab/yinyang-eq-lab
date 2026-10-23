import { env } from "cloudflare:workers";
import { ownerAccessResponse } from "@/lib/owner-access";
import { SHOOTOUT_ID_PATTERN, summarize } from "@/lib/embed-shootout";
import { getShootout, loadRuns, loadTargets } from "@/lib/embed-store";

const headers = { "Cache-Control": "private, no-store" };

/**
 * Anonymous shootouts whose sharers chose to share their data with the lab.
 * Without ?id the list shows summaries only; with ?id the anonymous run rows
 * are included. A shootout the sharer has since un-shared or deleted is never returned.
 */
export async function GET(request: Request) {
  const denied = await ownerAccessResponse(request);
  if (denied) return denied;
  try {
    const url = new URL(request.url), id = url.searchParams.get("id");
    if (id !== null) {
      const shootout = SHOOTOUT_ID_PATTERN.test(id) ? await getShootout(id) : null;
      if (!shootout || shootout.owner_share !== 1) return Response.json({ error: "This shootout is not shared with the lab." }, { status: 404, headers });
      const rows = await loadRuns(id);
      return Response.json({ id, title: shootout.title, createdAt: shootout.created_at, sharedAt: shootout.owner_share_at, notice: shootout.owner_share_notice,
        targets: (await loadTargets(shootout.targetIds)) ?? [], summary: summarize(shootout.targetIds.length, rows), runs: rows }, { headers });
    }
    const { results } = await env.DB!.prepare(
      `SELECT s.id, s.title, s.created_at, s.owner_share_at, s.owner_share_notice, s.target_ids,
              (SELECT COUNT(*) FROM embed_shootout_runs r WHERE r.shootout_id = s.id) AS runs
       FROM embed_shootouts s WHERE s.owner_share = 1 AND s.expires_at > ? ORDER BY s.owner_share_at DESC LIMIT 100`)
      .bind(Date.now()).all<{ id: string; title: string; created_at: number; owner_share_at: number; owner_share_notice: string; target_ids: string; runs: number }>();
    return Response.json({ shootouts: results.map(row => ({ id: row.id, title: row.title, createdAt: row.created_at, sharedAt: row.owner_share_at, notice: row.owner_share_notice, targetIds: JSON.parse(row.target_ids), runs: row.runs })) }, { headers });
  } catch {
    return Response.json({ error: "Shared shootouts could not be loaded." }, { status: 503, headers });
  }
}
