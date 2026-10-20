import { isTestSubject } from "@/lib/admin-contributions";
import { getDb } from "@/db";
import { runFileFingerprint } from "@/lib/file-fingerprint";
import { targets, votes, listeningRuns, submissionOwners } from "@/db/schema";
import { activeSubmissions } from "@/lib/active-submissions";
import type { RankingVote } from "@/lib/preference-ranking";
import { intervalStats, parseIntervals } from "@/lib/listening";
import { LISTENING_PROTOCOL, FREE_LISTENING_PROTOCOL, MIN_SIDE_SECONDS, MIN_COMMON_SECONDS } from "@/lib/listening-protocol";
export async function rankingEvidence() {
 const db=getDb();
 const [allTargets,allVotes,runs,owners]=await Promise.all([db.select().from(targets),db.select().from(votes),db.select().from(listeningRuns),db.select().from(submissionOwners)]);
 const active=await activeSubmissions();
 const ownership=new Map(owners.map(o=>[`${o.recordKind}:${o.recordId}`,o.subjectId]));
 const official=(kind:string,id:string)=>!isTestSubject(ownership.get(`${kind}:${id}`)||"");
 const approved=new Set(allTargets.filter(t=>t.status==="approved"&&official("target",t.id)).map(t=>t.id));
 const participant=(kind:string,id:string,browser:string)=>{const owner=ownership.get(`${kind}:${id}`);return owner?`account:${owner}`:`browser:${browser}`;};
 const valid=(mode:string,a:string,b:string,heardA:number|null,heardB:number|null,protocolVersion:string,intervals:string|null)=>{
  if(protocolVersion===FREE_LISTENING_PROTOCOL)return false;
  if(!["blind","bring"].includes(mode)||a===b||!approved.has(a)||!approved.has(b)||(heardA||0)<MIN_SIDE_SECONDS||(heardB||0)<MIN_SIDE_SECONDS)return false;
  // Historical cohorts retain their original rules. Current-protocol evidence
  // must independently meet the same-passage rule when rankings are read, too.
  if(protocolVersion!==LISTENING_PROTOCOL)return true;
  try {
   const stats=intervalStats(parseIntervals(JSON.parse(intervals||"[]")));
   return stats.heardA>=MIN_SIDE_SECONDS&&stats.heardB>=MIN_SIDE_SECONDS&&stats.overlapSeconds>=MIN_COMMON_SECONDS;
  } catch {return false;}
 };
 const excludedTrials=new Set(runs.filter(run=>run.trialId&&(!official("run",run.id)||!active("run",run.id))).map(run=>run.trialId));
 const decisive=allVotes.filter(v=>official("vote",v.id)&&official("trial",v.id)&&(!isTestSubject(v.voterId)||ownership.has(`vote:${v.id}`))&&active("vote",v.id)&&!excludedTrials.has(v.id)&&v.eligible===1&&valid(v.testMode,v.winnerId,v.loserId,v.heardA,v.heardB,v.protocolVersion,v.intervals)).map(v=>({...v,voterId:participant("vote",v.id,v.voterId),result:"preference"}));
 const ties=runs.filter(run=>run.result==="tie"&&official("run",run.id)&&(!run.trialId||official("trial",run.trialId)&&official("vote",run.trialId))&&(!isTestSubject(run.voterId)||ownership.has(`run:${run.id}`))&&active("run",run.id)&&(!run.trialId||active("vote",run.trialId))&&valid(run.testMode,run.targetAId,run.targetBId,run.heardA,run.heardB,run.protocolVersion,run.intervals)).map(run=>({...run,id:`tie:${run.id}`,voterId:participant("run",run.id,run.voterId),winnerId:run.targetAId,loserId:run.targetBId,sha256:runFileFingerprint(run.researchContext),audioFormat:null,sampleRate:null,bitrate:null,duration:null,reasonTags:"[]",result:"tie"}));
 return {targets:allTargets.filter(t=>approved.has(t.id)),votes:[...decisive,...ties]};
}
export type EvidenceVote=RankingVote & {testMode:string;headphoneType:string|null;protocolVersion:string;songTitle:string|null;songArtist:string|null;songAlbum:string|null;recordingId:string|null;sha256:string|null;reasonTags:string|null};
