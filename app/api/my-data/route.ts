import { normalizeListenerNickname } from "@/lib/listener-nickname";
import { targetLabelText } from "@/lib/target-labels";
import { VOTE_DATA_NOTICE_VERSION } from "@/lib/vote-data-notice";
import { ACTIVITY_MONITORING_NOTICE_VERSION } from "@/lib/activity-monitoring";
import { env } from "cloudflare:workers";
import { dataIdentity } from "@/lib/submission-ownership";
import { dataTables, eraseData } from "@/lib/privacy-erasure";
import { readJsonObject, RequestInputError, requestInputResponse } from "@/lib/request-json";
const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie" };
function origin(request: Request) { if (request.headers.get("Origin") !== new URL(request.url).origin) throw new RequestInputError("Invalid origin.", 403); }
function failed(error: unknown) { const response = requestInputResponse(error); if (response) { for (const [key,value] of Object.entries(headers)) response.headers.set(key,value); return response; } return Response.json({ error: "Your data could not be managed. Please try again or contact the site admin." }, { status: 503, headers }); }
export async function GET() {
  try {
    const identity = await dataIdentity();
    await env.DB!.prepare("DELETE FROM activity_events WHERE created_at<? OR subject_id IN (SELECT subject_id FROM privacy_accounts WHERE activity_monitoring_enabled!=1 OR activity_monitoring_version!=?)").bind(Date.now()-30*86400000,ACTIVITY_MONITORING_NOTICE_VERSION).run();
    const profile = await env.DB!.prepare("SELECT nickname FROM listener_nicknames WHERE subject_id=?").bind(identity.subjectId).first<{nickname:string}>();
    const titles: Record<string,string> = { vote:"'Preferred: ' || COALESCE((SELECT name FROM targets WHERE id=t.winner_id),t.winner_id) || ' / ' || COALESCE((SELECT name FROM targets WHERE id=t.loser_id),t.loser_id)", open:"'Open: ' || COALESCE((SELECT name FROM targets WHERE id=t.target_a_id),t.target_a_id) || ' / ' || COALESCE((SELECT name FROM targets WHERE id=t.target_b_id),t.target_b_id)", run:"t.target_a_name || ' / ' || t.target_b_name", feedback:"t.test_mode || ' description'", measurement:"t.name", export:"t.target_name || ' · ' || t.export_kind", target:"t.name", suggestion:"t.title" };
    const specs = Object.entries(dataTables).filter(([kind]) => kind !== "trial");
    const rows = await Promise.all(specs.map(async ([kind,table]) => {
      const result = await env.DB!.prepare(`SELECT t.id,t.created_at,${titles[kind]} AS display_title${kind === "run" ? ",t.trial_id" : ""} FROM ${table} t JOIN submission_owners o ON o.record_id=t.id AND o.record_kind=? WHERE o.subject_id=? ORDER BY t.created_at DESC`).bind(kind, identity.subjectId).all<Record<string,unknown>>();
      return (result.results || []).map(row => ({ kind, id: String(row.id), createdAt: Number(row.created_at), title: ["vote","open","run","export","target"].includes(kind) ? targetLabelText(String(row.display_title || kind)) : String(row.display_title || kind), localId: kind === "run" ? String(row.id) : undefined, trialId: row.trial_id || (kind === "vote" ? row.id : undefined) }));
    }));
    const music = await env.DB!.prepare("SELECT track_url,choice,updated_at FROM music_votes WHERE user_id=?").bind(identity.subjectId).all<{track_url:string;choice:string;updated_at:number}>();
    const activity = identity.activityMonitoringEnabled ? await env.DB!.prepare("SELECT id,event_type,route,shootout_tab,test_mode,test_active,created_at FROM activity_events WHERE subject_id=? AND created_at>=? ORDER BY created_at DESC LIMIT 500").bind(identity.subjectId,Date.now()-30*86400000).all() : { results: [] };
    return Response.json({ nickname: profile?.nickname ?? "", submissionsEnabled: identity.submissionsEnabled, shareMusic: identity.shareMusic, agreementVersion:identity.agreementVersion, agreedAt:identity.agreedAt, activityMonitoringEnabled:identity.activityMonitoringEnabled, activityMonitoringVersion:identity.activityMonitoringVersion, activityLogs:activity.results || [], activityLogLimit:500, sharedAdmin: identity.subjectId === "owner", records: [...rows.flat(), ...(music.results || []).map(row => ({ kind:"music", id:row.track_url, createdAt:row.updated_at, title:`${row.choice === "keep" ? "Upvote" : "Downvote"}: ${row.track_url}` }))] }, { headers });
  } catch (error) { return failed(error); }
}
export async function PATCH(request: Request) {
  try {
    origin(request); const identity = await dataIdentity(); const body = await readJsonObject(request, 1024);
    if (body.action === "nickname") {
      if (identity.subjectId === "owner") throw new RequestInputError("The shared admin account cannot have a listener nickname.", 400);
      const nickname = normalizeListenerNickname(body.nickname);
      if (nickname === null) throw new RequestInputError("Use a nickname of up to 40 characters, without email addresses or control characters.", 400);
      if (nickname) await env.DB!.prepare("INSERT INTO listener_nicknames(subject_id,nickname) VALUES(?,?) ON CONFLICT(subject_id) DO UPDATE SET nickname=excluded.nickname").bind(identity.subjectId,nickname).run();
      else await env.DB!.prepare("DELETE FROM listener_nicknames WHERE subject_id=?").bind(identity.subjectId).run();
      return Response.json({ok:true,nickname}, {headers});
    }
    if (typeof body.submissionsEnabled !== "boolean" || typeof body.shareMusic !== "boolean") throw new RequestInputError("Choose your sharing settings.", 400);
    if (body.activityMonitoringEnabled !== undefined && typeof body.activityMonitoringEnabled !== "boolean") throw new RequestInputError("Choose whether to share testing activity.", 400);
    const monitor = body.activityMonitoringEnabled === undefined ? identity.activityMonitoringEnabled : body.activityMonitoringEnabled;
    if (monitor && !identity.activityMonitoringEnabled && (body.activityMonitoringAcknowledged !== true || body.activityMonitoringNoticeVersion !== ACTIVITY_MONITORING_NOTICE_VERSION)) throw new RequestInputError("Read and explicitly opt in to the current activity-monitoring notice.",400);
    if (body.submissionsEnabled && (!identity.submissionsEnabled || body.acknowledged === true)) {
      if (body.acknowledged !== true || body.noticeVersion !== VOTE_DATA_NOTICE_VERSION) throw new RequestInputError("Read and explicitly agree to the current comparison-data notice on Shootout.",400);
      await env.DB!.prepare("UPDATE privacy_accounts SET submissions_enabled=1,share_music=?,agreement_version=?,agreed_at=?,withdrawn_at=NULL,activity_monitoring_enabled=?,activity_monitoring_version=CASE WHEN ?=1 THEN ? ELSE activity_monitoring_version END,activity_monitoring_agreed_at=CASE WHEN ?=1 AND activity_monitoring_enabled=0 THEN ? ELSE activity_monitoring_agreed_at END,activity_monitoring_withdrawn_at=CASE WHEN ?=1 THEN NULL ELSE activity_monitoring_withdrawn_at END WHERE subject_id=?").bind(body.shareMusic?1:0,VOTE_DATA_NOTICE_VERSION,Date.now(),monitor?1:0,monitor?1:0,ACTIVITY_MONITORING_NOTICE_VERSION,monitor?1:0,Date.now(),monitor?1:0,identity.subjectId).run();
    } else if (!body.submissionsEnabled) {
      const now=Date.now();
      await env.DB!.batch([
        env.DB!.prepare("UPDATE privacy_accounts SET submissions_enabled=0,share_music=0,withdrawn_at=?,activity_monitoring_enabled=0,activity_monitoring_withdrawn_at=CASE WHEN activity_monitoring_enabled=1 THEN ? ELSE activity_monitoring_withdrawn_at END WHERE subject_id=?").bind(now,now,identity.subjectId),
        env.DB!.prepare("DELETE FROM activity_events WHERE subject_id=?").bind(identity.subjectId),
        env.DB!.prepare("UPDATE retrospective_permissions SET enabled=0,withdrawn_at=? WHERE subject_id=? AND enabled=1").bind(now,identity.subjectId),
      ]);
    } else {
      const now=Date.now();
      await env.DB!.batch([
        env.DB!.prepare("UPDATE privacy_accounts SET share_music=?,activity_monitoring_enabled=?,activity_monitoring_version=CASE WHEN ?=1 THEN ? ELSE activity_monitoring_version END,activity_monitoring_agreed_at=CASE WHEN ?=1 AND activity_monitoring_enabled=0 THEN ? ELSE activity_monitoring_agreed_at END,activity_monitoring_withdrawn_at=CASE WHEN ?=1 THEN NULL WHEN activity_monitoring_enabled=1 THEN ? ELSE activity_monitoring_withdrawn_at END WHERE subject_id=?").bind(body.shareMusic?1:0,monitor?1:0,monitor?1:0,ACTIVITY_MONITORING_NOTICE_VERSION,monitor?1:0,now,monitor?1:0,now,identity.subjectId),
        ...(monitor ? [] : [env.DB!.prepare("DELETE FROM activity_events WHERE subject_id=?").bind(identity.subjectId)]),
      ]);
    }
    return Response.json({ ok:true }, { headers });
  } catch (error) { return failed(error); }
}
export async function DELETE(request: Request) {
  try {
    origin(request); const identity = await dataIdentity(); const body = await readJsonObject(request, 4096);
    if (body.scope === "all" && body.confirmation === "DELETE ALL MY DATA") {
      await eraseData(identity.subjectId);
      const response = Response.json({ ok:true, all:true }, { headers });
      for (const name of ["__Host-yinyangeq_data", "__Host-yinyangeq_tester", "__Host-yinyangeq_owner"]) response.headers.append("Set-Cookie", `${name}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict`);
      return response;
    }
    if (body.scope !== "one" || body.confirmation !== "DELETE" || typeof body.kind !== "string" || typeof body.id !== "string") throw new RequestInputError("Confirm the deletion.", 400);
    const erased = await eraseData(identity.subjectId, { kind:body.kind, id:body.id });
    return Response.json({ ok:true, browserIds: erased?.browserIds || [] }, { headers });
  } catch (error) { return failed(error); }
}
