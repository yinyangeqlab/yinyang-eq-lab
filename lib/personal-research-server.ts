import { requireParticipantSubject, isTestSubject } from "@/lib/admin-contributions";
import { PERSONAL_RESEARCH_NOTICE_VERSION } from "@/lib/personal-research-notice";
export function personalPermissionStatement(db: D1Database, subject: string, enabled: boolean) {
  if (enabled) requireParticipantSubject(subject);
  return db.prepare("INSERT INTO personal_research_permissions(subject_id,enabled,notice_version,consent_token,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(subject_id) DO UPDATE SET enabled=excluded.enabled,notice_version=excluded.notice_version,consent_token=excluded.consent_token,updated_at=excluded.updated_at")
    .bind(subject,enabled?1:0,PERSONAL_RESEARCH_NOTICE_VERSION,crypto.randomUUID(),Date.now());
}
export async function personalPermission(db: D1Database, subject: string, participating: boolean) {
  if (isTestSubject(subject)) return {enabled:false,token:null,testOnly:true};
  const row=await db.prepare("SELECT enabled,notice_version,consent_token FROM personal_research_permissions WHERE subject_id=?").bind(subject).first<{enabled:number;notice_version:string;consent_token:string}>();
  const enabled=participating&&row?.enabled===1&&row.notice_version===PERSONAL_RESEARCH_NOTICE_VERSION;
  return {enabled,token:enabled?row.consent_token:null,testOnly:false};
}
