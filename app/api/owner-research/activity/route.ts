import { env } from "cloudflare:workers";
import { ownerAccessResponse } from "@/lib/owner-access";
import { ACTIVITY_LOG_RETENTION_MS, ACTIVITY_MONITORING_NOTICE_VERSION } from "@/lib/activity-monitoring";

const headers = { "Cache-Control": "private, no-store" };
const integer = (value: string | null) => value && /^\d+$/.test(value) ? Number(value) : null;

export async function GET(request: Request) {
  const denied = await ownerAccessResponse(request);
  if (denied) return denied;
  try {
    const db = env.DB!;
    const now = Date.now();
    await db.prepare("DELETE FROM activity_events WHERE subject_id NOT IN(SELECT subject_id FROM owner_public_profiles) AND (created_at<? OR subject_id IN (SELECT subject_id FROM privacy_accounts WHERE activity_monitoring_enabled!=1 OR activity_monitoring_version!=?))").bind(now - ACTIVITY_LOG_RETENTION_MS,ACTIVITY_MONITORING_NOTICE_VERSION).run();
    const url = new URL(request.url);
    const beforeAt = integer(url.searchParams.get("beforeAt"));
    const beforeId = url.searchParams.get("beforeId") || "";
    if (beforeAt !== null && !/^[a-f0-9-]{36}$/i.test(beforeId)) return Response.json({ error: "Invalid activity cursor." }, { status: 400, headers });
    const query = db.prepare(`SELECT e.id,e.subject_id,e.session_id,e.event_type,e.route,e.shootout_tab,e.test_mode,e.test_active,e.created_at,
      EXISTS(SELECT 1 FROM owner_public_profiles p WHERE p.subject_id=e.subject_id) AS retained_indefinitely,
      CASE WHEN EXISTS(SELECT 1 FROM owner_public_profiles p WHERE p.subject_id=e.subject_id) THEN 'YinYangEQ' WHEN e.subject_id='owner' THEN 'Owner/admin account'
        WHEN n.nickname IS NOT NULL THEN n.nickname
        WHEN e.subject_id LIKE 'invite:%' THEN COALESCE(i.label,'Tester '||substr(e.subject_id,8,10))
        ELSE 'Tester '||substr(e.subject_id,1,12) END AS listener_label
      FROM activity_events e LEFT JOIN listener_nicknames n ON n.subject_id=e.subject_id LEFT JOIN private_tester_invites i ON i.id=substr(e.subject_id,8)
      WHERE (e.created_at>=? OR e.subject_id IN(SELECT subject_id FROM owner_public_profiles)) ${beforeAt === null ? "" : "AND (e.created_at<? OR (e.created_at=? AND e.id<?))"}
      ORDER BY e.created_at DESC,e.id DESC LIMIT 201`);
    const rows = beforeAt === null
      ? await query.bind(now - ACTIVITY_LOG_RETENTION_MS).all<Record<string, unknown>>()
      : await query.bind(now - ACTIVITY_LOG_RETENTION_MS,beforeAt,beforeAt,beforeId).all<Record<string, unknown>>();
    const list = rows.results || [];
    const hasMore = list.length > 200;
    const events = list.slice(0,200);
    const last = events.at(-1) as { created_at?: number; id?: string } | undefined;
    return Response.json({ events, hasMore, next: hasMore && last ? { beforeAt: last.created_at, beforeId: last.id } : null, retentionDays: 30, protectedAccountRetention:"indefinite", activeWindowSeconds: 90 }, { headers });
  } catch {
    return Response.json({ error: "Activity monitoring records could not be loaded." }, { status: 503, headers });
  }
}
