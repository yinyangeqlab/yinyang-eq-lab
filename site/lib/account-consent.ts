import {accountSyncPermission} from '@/lib/account-sync-permission';
import {digest} from '@/lib/device-sync.mjs';
import {VOTE_DATA_NOTICE_VERSION} from '@/lib/vote-data-notice';
import {ACTIVITY_MONITORING_NOTICE_VERSION} from '@/lib/activity-monitoring';
import {PERSONAL_RESEARCH_NOTICE_VERSION} from '@/lib/personal-research-notice';
import {COMMUNITY_NOTICE_VERSION} from '@/lib/community-notice';
export async function accountConsent(db:D1Database,subject:string){
 const [a,p,c,h,sync]=await Promise.all([
 db.prepare('SELECT submissions_enabled,share_music,agreement_version,agreed_at,activity_monitoring_enabled,activity_monitoring_version,activity_monitoring_agreed_at FROM privacy_accounts WHERE subject_id=?').bind(subject).first<Record<string,unknown>>(),
 db.prepare('SELECT enabled,notice_version,updated_at FROM personal_research_permissions WHERE subject_id=?').bind(subject).first<Record<string,unknown>>(),
 db.prepare('SELECT enabled,notice_version,updated_at FROM community_personal_permissions WHERE subject_id=?').bind(subject).first<Record<string,unknown>>(),
 db.prepare('SELECT study_id,enabled,notice_version,agreed_at,withdrawn_at FROM retrospective_permissions WHERE subject_id=? ORDER BY study_id').bind(subject).all(),accountSyncPermission(db,subject)]);
 const comparisons=a?.submissions_enabled===1&&a.agreement_version===VOTE_DATA_NOTICE_VERSION;
 return {syncEnabled:sync.enabled,stamp:await digest({a,p,c,h:h.results,sync:sync.row}),comparisons,music:comparisons&&a?.share_music===1,monitoring:comparisons&&a?.activity_monitoring_enabled===1&&a.activity_monitoring_version===ACTIVITY_MONITORING_NOTICE_VERSION,personalResearch:comparisons&&p?.enabled===1&&p.notice_version===PERSONAL_RESEARCH_NOTICE_VERSION,community:comparisons&&c?.enabled===1&&c.notice_version===COMMUNITY_NOTICE_VERSION};
}
