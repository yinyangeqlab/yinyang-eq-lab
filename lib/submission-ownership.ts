import { VOTE_DATA_NOTICE_VERSION } from "@/lib/vote-data-notice";
import { ACTIVITY_MONITORING_NOTICE_VERSION } from "@/lib/activity-monitoring";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { submissionOwners } from "@/db/schema";
import { RequestInputError } from "@/lib/request-json";

export type DataIdentity = { subjectId: string; sessionHash: string; submissionsEnabled: boolean; shareMusic: boolean; agreementVersion: string | null; agreedAt: number | null; activityMonitoringEnabled: boolean; activityMonitoringVersion: string | null };
export async function dataIdentity(): Promise<DataIdentity> {
  const h = await headers();
  const sessionHash = h.get("x-yinyang-data-session") || "";
  if (!/^[a-f0-9]{64}$/.test(sessionHash)) throw new RequestInputError("Open My data to verify your data-management session.", 401);
  const row = await env.DB!.prepare("SELECT s.subject_id, a.submissions_enabled, a.share_music, a.agreement_version, a.agreed_at, a.activity_monitoring_enabled, a.activity_monitoring_version FROM privacy_sessions s JOIN privacy_accounts a ON a.subject_id=s.subject_id WHERE s.token_hash=? AND s.expires_at>?").bind(sessionHash, Date.now()).first<{ subject_id: string; submissions_enabled: number; share_music: number; agreement_version:string|null; agreed_at:number|null; activity_monitoring_enabled?:number; activity_monitoring_version?:string|null }>();
  if (!row) throw new RequestInputError("Your data-management session expired. Sign in again.", 401);
  return { subjectId: row.subject_id, sessionHash, submissionsEnabled: row.submissions_enabled === 1 && row.agreement_version === VOTE_DATA_NOTICE_VERSION, shareMusic: row.share_music === 1, agreementVersion:row.agreement_version, agreedAt:row.agreed_at, activityMonitoringEnabled: row.activity_monitoring_enabled === 1 && row.activity_monitoring_version === ACTIVITY_MONITORING_NOTICE_VERSION, activityMonitoringVersion: row.activity_monitoring_version ?? null };
}
export async function submissionContext(kind: string) {
  const identity = await dataIdentity();
  if (!identity.submissionsEnabled)
    throw new RequestInputError("Agreement to comparison-data collection is required to use the listening tools. Review the agreement on Shootout.", 403);
  return { ...identity, requireTrial: async (id: string) => {
    const owner = await env.DB!.prepare("SELECT subject_id FROM submission_owners WHERE record_kind='trial' AND record_id=?").bind(id).first<{subject_id:string}>();
    if (!owner || owner.subject_id !== identity.subjectId) throw new RequestInputError("This pairing is not owned by your sign-in. Start a new comparison.",403);
  }, record: (id: string) => getDb().insert(submissionOwners).values({ recordKind: kind, recordId: id, subjectId: identity.subjectId, sessionHash: identity.sessionHash }).onConflictDoUpdate({ target: [submissionOwners.recordKind, submissionOwners.recordId], set: { sessionHash: identity.sessionHash }, setWhere: eq(submissionOwners.subjectId, identity.subjectId) }) };
}
