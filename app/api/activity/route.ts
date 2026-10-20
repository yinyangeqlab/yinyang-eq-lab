import { env } from "cloudflare:workers";
import { VOTE_DATA_NOTICE_VERSION } from "@/lib/vote-data-notice";
import { ACTIVITY_LOG_RETENTION_MS, ACTIVITY_MONITORING_NOTICE_VERSION } from "@/lib/activity-monitoring";
import { dataIdentity } from "@/lib/submission-ownership";
import { readJsonObject, RequestInputError, requestInputResponse } from "@/lib/request-json";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const routes = new Set(["/", "/home", "/shootout", "/preference-tuning", "/personal-tuning", "/music-library", "/my-data", "/privacy", "/curve-credits"]);
const eventTypes = new Set(["page_view", "heartbeat", "shootout_tab", "test_started", "test_ended"]);
const tabs = new Set(["shootout", "rankings", "music", "upload", "measurements", "profile"]);
const modes = new Set(["blind", "bring", "open"]);
const uuid = /^[a-f0-9-]{36}$/i;

export async function POST(request: Request) {
  try {
    if (request.headers.get("Origin") !== new URL(request.url).origin) throw new RequestInputError("Invalid origin.", 403);
    const identity = await dataIdentity();
    if (!identity.submissionsEnabled || !identity.activityMonitoringEnabled || identity.activityMonitoringVersion !== ACTIVITY_MONITORING_NOTICE_VERSION)
      throw new RequestInputError("Activity monitoring is not enabled for this account.", 403);
    const body = await readJsonObject(request, 2048);
    if (typeof body.sessionId !== "string" || !uuid.test(body.sessionId) || typeof body.eventType !== "string" || !eventTypes.has(body.eventType) || typeof body.route !== "string" || !routes.has(body.route))
      throw new RequestInputError("Invalid activity event.", 400);
    const tab = typeof body.shootoutTab === "string" && tabs.has(body.shootoutTab) ? body.shootoutTab : null;
    const mode = typeof body.testMode === "string" && modes.has(body.testMode) ? body.testMode : null;
    const testActive = body.testActive === true && body.route === "/shootout" ? 1 : 0;
    const now = Date.now();
    const db = env.DB!;
    await db.batch([
      db.prepare("DELETE FROM activity_events WHERE created_at<? OR subject_id IN (SELECT subject_id FROM privacy_accounts WHERE activity_monitoring_enabled!=1 OR activity_monitoring_version!=?)").bind(now - ACTIVITY_LOG_RETENTION_MS,ACTIVITY_MONITORING_NOTICE_VERSION),
      db.prepare("INSERT INTO activity_events(id,subject_id,session_id,event_type,route,shootout_tab,test_mode,test_active,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM privacy_accounts WHERE subject_id=? AND submissions_enabled=1 AND agreement_version=? AND activity_monitoring_enabled=1 AND activity_monitoring_version=?) AND (SELECT COUNT(*) FROM activity_events WHERE subject_id=? AND created_at>?) < 120").bind(crypto.randomUUID(),identity.subjectId,body.sessionId,body.eventType,body.route,tab,mode,testActive,now,identity.subjectId,VOTE_DATA_NOTICE_VERSION,ACTIVITY_MONITORING_NOTICE_VERSION,identity.subjectId,now - 60_000),
    ]);
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    return requestInputResponse(error) || Response.json({ error: "Activity could not be saved." }, { status: 503, headers });
  }
}
