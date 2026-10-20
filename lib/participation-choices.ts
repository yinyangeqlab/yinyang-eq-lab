import {VOTE_DATA_NOTICE_VERSION} from '@/lib/vote-data-notice';
import {ACTIVITY_MONITORING_NOTICE_VERSION} from '@/lib/activity-monitoring';
import {PERSONAL_RESEARCH_NOTICE_VERSION} from '@/lib/personal-research-notice';
import {COMMUNITY_NOTICE_VERSION} from '@/lib/community-notice';
export type ParticipationChoices={submit:boolean;shareMusic:boolean;activityMonitoring:boolean;personalResearch:boolean;community:boolean;nickname?:string};
// One reviewed Save acknowledges each enabled notice and saves all current choices atomically.
export function participationChoiceBody(choice:ParticipationChoices){
 const enabled=choice.submit;
 return {submissionsEnabled:enabled,shareMusic:enabled&&choice.shareMusic,activityMonitoringEnabled:enabled&&choice.activityMonitoring,personalResearchEnabled:enabled&&choice.personalResearch,communityEnabled:enabled&&choice.community,
 ...(choice.nickname!==undefined?{nickname:choice.nickname}:{}),...(enabled?{acknowledged:true,noticeVersion:VOTE_DATA_NOTICE_VERSION}:{}),
 ...(enabled&&choice.activityMonitoring?{activityMonitoringAcknowledged:true,activityMonitoringNoticeVersion:ACTIVITY_MONITORING_NOTICE_VERSION}:{}),
 ...(enabled&&choice.personalResearch?{personalResearchAcknowledged:true,personalResearchNoticeVersion:PERSONAL_RESEARCH_NOTICE_VERSION}:{}),
 ...(enabled&&choice.community?{communityAcknowledged:true,communityNoticeVersion:COMMUNITY_NOTICE_VERSION}:{})};
}
