import {accountSyncPermission,accountSyncPermissionStatement} from '@/lib/account-sync-permission';
import {ACCOUNT_SYNC_NOTICE_VERSION} from '@/lib/account-sync-notice.mjs';
import {requireParticipantSubject} from '@/lib/admin-contributions';
import {consentStudies,consentStudyStatements} from '@/lib/consent-studies';
import { COMMUNITY_NOTICE_VERSION } from "@/lib/community-notice";
import { communityPermission, communityPermissionStatement } from "@/lib/community-server";
import { isTestSubject } from "@/lib/admin-contributions";
import { PERSONAL_RESEARCH_NOTICE_VERSION } from "@/lib/personal-research-notice";
import { personalPermission, personalPermissionStatement } from "@/lib/personal-research-server";
import { normalizeListenerNickname, listenerNicknameError } from "@/lib/listener-nickname";
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
    await env.DB!.prepare("DELETE FROM activity_events WHERE subject_id NOT IN(SELECT subject_id FROM owner_public_profiles) AND (created_at<? OR subject_id IN (SELECT subject_id FROM privacy_accounts WHERE activity_monitoring_enabled!=1 OR activity_monitoring_version!=?))").bind(Date.now()-30*86400000,ACTIVITY_MONITORING_NOTICE_VERSION).run();
    const profile = await env.DB!.prepare("SELECT nickname FROM listener_nicknames WHERE subject_id=?").bind(identity.subjectId).first<{nickname:string}>();
    const titles: Record<string,string> = {community:"'Community Personal: ' || COALESCE((SELECT name FROM targets WHERE id=t.target_a_id),t.target_a_id) || ' / ' || COALESCE((SELECT name FROM targets WHERE id=t.target_b_id),t.target_b_id) || ' · ' || t.result", "community-reference":"'Community reference block · ' || COALESCE((SELECT period FROM community_catalogs WHERE id=t.catalog_id),'reference checks')", vote:"'Preferred: ' || COALESCE((SELECT name FROM targets WHERE id=t.winner_id),t.winner_id) || ' / ' || COALESCE((SELECT name FROM targets WHERE id=t.loser_id),t.loser_id)", open:"'Open: ' || COALESCE((SELECT name FROM targets WHERE id=t.target_a_id),t.target_a_id) || ' / ' || COALESCE((SELECT name FROM targets WHERE id=t.target_b_id),t.target_b_id)", run:"t.target_a_name || ' / ' || t.target_b_name", feedback:"t.test_mode || ' description'", measurement:"t.name", export:"t.target_name || ' · ' || t.export_kind", target:"t.name", suggestion:"t.title", personal:"'Personal: ' || COALESCE((SELECT name FROM targets WHERE id=t.target_a_id),t.target_a_id) || ' / ' || COALESCE((SELECT name FROM targets WHERE id=t.target_b_id),t.target_b_id)" };
    const specs = Object.entries(dataTables).filter(([kind]) => kind !== "trial");
    const rows = await Promise.all(specs.map(async ([kind,table]) => {
      const result = await env.DB!.prepare(`SELECT t.id,t.created_at,${titles[kind]} AS display_title${kind === "run" ? ",t.trial_id" : ""} FROM ${table} t JOIN submission_owners o ON o.record_id=t.id AND o.record_kind=? WHERE o.subject_id=? ORDER BY t.created_at DESC`).bind(kind, identity.subjectId).all<Record<string,unknown>>();
      return (result.results || []).map(row => ({ kind, id: String(row.id), createdAt: Number(row.created_at), title: ["vote","open","run","export","target"].includes(kind) ? targetLabelText(String(row.display_title || kind)) : String(row.display_title || kind), localId: kind === "run" ? String(row.id) : undefined, trialId: row.trial_id || (kind === "vote" ? row.id : undefined) }));
    }));
    const music = await env.DB!.prepare("SELECT track_url,choice,updated_at FROM music_votes WHERE user_id=?").bind(identity.subjectId).all<{track_url:string;choice:string;updated_at:number}>();
    const protectedAccount=!!await env.DB!.prepare("SELECT 1 FROM owner_public_profiles WHERE subject_id=?").bind(identity.subjectId).first();
    const activity = identity.activityMonitoringEnabled||protectedAccount ? await env.DB!.prepare("SELECT id,event_type,route,shootout_tab,test_mode,test_active,created_at FROM activity_events WHERE subject_id=? AND (created_at>=? OR subject_id IN(SELECT subject_id FROM owner_public_profiles)) ORDER BY created_at DESC LIMIT 500").bind(identity.subjectId,Date.now()-30*86400000).all() : { results: [] };
    const syncPermission=await accountSyncPermission(env.DB!,identity.subjectId);
    const historicalStudies = await consentStudies(env.DB!,identity.subjectId);
    const community = await communityPermission(env.DB!,identity.subjectId,identity.submissionsEnabled);
    const personal = await personalPermission(env.DB!,identity.subjectId,identity.submissionsEnabled);
    return Response.json({ syncEnabled:syncPermission.enabled,historicalStudies, communityEnabled:community.enabled, protectedAccount, personalResearchEnabled:personal.enabled, nickname: profile?.nickname ?? "", submissionsEnabled: identity.submissionsEnabled, shareMusic: identity.shareMusic, agreementVersion:identity.agreementVersion, agreedAt:identity.agreedAt, activityMonitoringEnabled:identity.activityMonitoringEnabled, activityMonitoringVersion:identity.activityMonitoringVersion, activityLogs:activity.results || [], activityLogLimit:500, sharedAdmin: identity.subjectId === "owner", testOnly:isTestSubject(identity.subjectId), records: [...rows.flat(), ...(music.results || []).map(row => ({ kind:"music", id:row.track_url, createdAt:row.updated_at, title:`${row.choice === "keep" ? "Upvote" : "Downvote"}: ${row.track_url}` }))] }, { headers });
  } catch (error) { return failed(error); }
}
export async function PATCH(request: Request) {
  try {
    origin(request); const identity = await dataIdentity(); const body = await readJsonObject(request, 20000);
    if (body.action === "nickname") {
      if (identity.subjectId === "owner") throw new RequestInputError("The shared admin account cannot have a listener nickname.", 400);
      const nickname = normalizeListenerNickname(body.nickname);
      if (nickname === null) throw new RequestInputError(listenerNicknameError(body.nickname)!, 400);
      if (nickname) await env.DB!.prepare("INSERT INTO listener_nicknames(subject_id,nickname) VALUES(?,?) ON CONFLICT(subject_id) DO UPDATE SET nickname=excluded.nickname").bind(identity.subjectId,nickname).run();
      else await env.DB!.prepare("DELETE FROM listener_nicknames WHERE subject_id=?").bind(identity.subjectId).run();
      return Response.json({ok:true,nickname}, {headers});
    }
    if (typeof body.submissionsEnabled !== "boolean" || typeof body.shareMusic !== "boolean") throw new RequestInputError("Choose your sharing settings.", 400);
    if (body.activityMonitoringEnabled !== undefined && typeof body.activityMonitoringEnabled !== "boolean") throw new RequestInputError("Choose whether to share testing activity.", 400);
    if (body.personalResearchEnabled !== undefined && typeof body.personalResearchEnabled !== "boolean") throw new RequestInputError("Choose whether to contribute personal comparisons.",400);
    if (body.personalResearchEnabled === true && (body.personalResearchAcknowledged !== true || body.personalResearchNoticeVersion !== PERSONAL_RESEARCH_NOTICE_VERSION)) throw new RequestInputError("Review and explicitly enable the personal research notice.",400);
    if(body.communityEnabled!==undefined&&typeof body.communityEnabled!=="boolean")throw new RequestInputError("Choose whether to contribute to Community Preferences.",400);
    if(body.communityEnabled===true&&(body.communityAcknowledged!==true||body.communityNoticeVersion!==COMMUNITY_NOTICE_VERSION))throw new RequestInputError("Review and explicitly enable Personal research sharing, including Community use.",400);
    const nicknameProvided = body.nickname !== undefined;
    const nickname = nicknameProvided ? normalizeListenerNickname(body.nickname) : undefined;
    if (nicknameProvided && (identity.subjectId === "owner" || nickname === null)) throw new RequestInputError(identity.subjectId === "owner" ? "The shared admin account does not use a listener nickname." : listenerNicknameError(body.nickname)!,400);
    const statements: D1PreparedStatement[] = [];
    if(body.syncEnabled!==undefined){if(typeof body.syncEnabled!=='boolean')throw new RequestInputError('Choose whether to sync saved account data.',400);if(body.syncEnabled){requireParticipantSubject(identity.subjectId);if(body.syncAcknowledged!==true||body.syncNoticeVersion!==ACCOUNT_SYNC_NOTICE_VERSION)throw new RequestInputError('Review and explicitly opt in to private account sync.',400);}statements.push(accountSyncPermissionStatement(env.DB!,identity.subjectId,body.syncEnabled));}
    const monitor = body.activityMonitoringEnabled === undefined ? identity.activityMonitoringEnabled : body.activityMonitoringEnabled;
    if (monitor && !identity.activityMonitoringEnabled && (body.activityMonitoringAcknowledged !== true || body.activityMonitoringNoticeVersion !== ACTIVITY_MONITORING_NOTICE_VERSION)) throw new RequestInputError("Read and explicitly opt in to the current activity-monitoring notice.",400);
    if (body.submissionsEnabled && (!identity.submissionsEnabled || body.acknowledged === true)) {
      if (body.acknowledged !== true || body.noticeVersion !== VOTE_DATA_NOTICE_VERSION) throw new RequestInputError("Read and explicitly agree to the current comparison-data notice on Tournament.",400);
      statements.push(env.DB!.prepare("UPDATE privacy_accounts SET submissions_enabled=1,share_music=?,agreement_version=?,agreed_at=?,withdrawn_at=NULL,activity_monitoring_enabled=?,activity_monitoring_version=CASE WHEN ?=1 THEN ? ELSE activity_monitoring_version END,activity_monitoring_agreed_at=CASE WHEN ?=1 AND activity_monitoring_enabled=0 THEN ? ELSE activity_monitoring_agreed_at END,activity_monitoring_withdrawn_at=CASE WHEN ?=1 THEN NULL ELSE activity_monitoring_withdrawn_at END WHERE subject_id=?").bind(body.shareMusic?1:0,VOTE_DATA_NOTICE_VERSION,Date.now(),monitor?1:0,monitor?1:0,ACTIVITY_MONITORING_NOTICE_VERSION,monitor?1:0,Date.now(),monitor?1:0,identity.subjectId));
    } else if (!body.submissionsEnabled) {
      const now=Date.now();
      statements.push(
        env.DB!.prepare("UPDATE privacy_accounts SET submissions_enabled=0,share_music=0,withdrawn_at=?,activity_monitoring_enabled=0,activity_monitoring_withdrawn_at=CASE WHEN activity_monitoring_enabled=1 THEN ? ELSE activity_monitoring_withdrawn_at END WHERE subject_id=?").bind(now,now,identity.subjectId),
        env.DB!.prepare("DELETE FROM activity_events WHERE subject_id=? AND subject_id NOT IN(SELECT subject_id FROM owner_public_profiles)").bind(identity.subjectId),
        env.DB!.prepare("UPDATE retrospective_permissions SET enabled=0,withdrawn_at=? WHERE subject_id=? AND enabled=1").bind(now,identity.subjectId),
      );
    } else {
      const now=Date.now();
      statements.push(
        env.DB!.prepare("UPDATE privacy_accounts SET share_music=?,activity_monitoring_enabled=?,activity_monitoring_version=CASE WHEN ?=1 THEN ? ELSE activity_monitoring_version END,activity_monitoring_agreed_at=CASE WHEN ?=1 AND activity_monitoring_enabled=0 THEN ? ELSE activity_monitoring_agreed_at END,activity_monitoring_withdrawn_at=CASE WHEN ?=1 THEN NULL WHEN activity_monitoring_enabled=1 THEN ? ELSE activity_monitoring_withdrawn_at END WHERE subject_id=?").bind(body.shareMusic?1:0,monitor?1:0,monitor?1:0,ACTIVITY_MONITORING_NOTICE_VERSION,monitor?1:0,now,monitor?1:0,now,identity.subjectId),
        ...(monitor ? [] : [env.DB!.prepare("DELETE FROM activity_events WHERE subject_id=? AND subject_id NOT IN(SELECT subject_id FROM owner_public_profiles)").bind(identity.subjectId)]),
      );
    }
    if (!body.submissionsEnabled || body.personalResearchEnabled !== undefined) statements.push(personalPermissionStatement(env.DB!,identity.subjectId,body.submissionsEnabled && body.personalResearchEnabled === true));
    if(!body.submissionsEnabled||body.communityEnabled!==undefined)statements.push(communityPermissionStatement(env.DB!,identity.subjectId,body.submissionsEnabled&&body.communityEnabled===true));
    if (nicknameProvided) statements.push(nickname
      ? env.DB!.prepare("INSERT INTO listener_nicknames(subject_id,nickname) VALUES(?,?) ON CONFLICT(subject_id) DO UPDATE SET nickname=excluded.nickname").bind(identity.subjectId,nickname)
      : env.DB!.prepare("DELETE FROM listener_nicknames WHERE subject_id=?").bind(identity.subjectId));
    statements.push(...await consentStudyStatements(env.DB!,identity.subjectId,body.retrospectiveChoices,body.retrospectiveAcknowledged,body.retrospectiveNoticeVersion,body.submissionsEnabled));
    await env.DB!.batch(statements);
    return Response.json({ ok:true, ...(nicknameProvided ? {nickname} : {}), activityMonitoringEnabled:body.submissionsEnabled && monitor }, { headers });
  } catch (error) { return failed(error); }
}
export async function DELETE(request: Request) {
  try {
    origin(request); const identity = await dataIdentity(); const body = await readJsonObject(request, 4096);
    if (body.scope === "all" && body.confirmation === "DELETE ALL MY DATA") {
      await eraseData(identity.subjectId,undefined,body.includeOwnerAccount===true&&body.ownerAccountConfirmation==="INCLUDE YINYANGEQ ACCOUNT");
      const response = Response.json({ ok:true, all:true }, { headers });
      for (const name of ["__Host-yinyangeq_data", "__Host-yinyangeq_tester", "__Host-yinyangeq_owner"]) response.headers.append("Set-Cookie", `${name}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict`);
      return response;
    }
    if (body.scope !== "one" || body.confirmation !== "DELETE" || typeof body.kind !== "string" || typeof body.id !== "string") throw new RequestInputError("Confirm the deletion.", 400);
    const erased = await eraseData(identity.subjectId, { kind:body.kind, id:body.id },body.includeOwnerAccount===true&&body.ownerAccountConfirmation==="INCLUDE YINYANGEQ ACCOUNT");
    return Response.json({ ok:true, browserIds: erased?.browserIds || [] }, { headers });
  } catch (error) { return failed(error); }
}
