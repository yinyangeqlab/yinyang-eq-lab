import { getDb } from "@/db";
import { targets, votes, listeningRuns, submissionOwners } from "@/db/schema";
import { activeSubmissions } from "@/lib/active-submissions";
import type { RankingVote } from "@/lib/preference-ranking";
export async function rankingEvidence() {
 const db=getDb();
 const [allTargets,allVotes,runs,owners]=await Promise.all([db.select().from(targets),db.select().from(votes),db.select().from(listeningRuns),db.select().from(submissionOwners)]);
 const active=await activeSubmissions();
 const approved=new Set(allTargets.filter(t=>t.status==="approved").map(t=>t.id));
 const ownership=new Map(owners.map(o=>[`${o.recordKind}:${o.recordId}`,o.subjectId]));
 const participant=(kind:string,id:string,browser:string)=>{const owner=ownership.get(`${kind}:${id}`);return owner?`account:${owner}`:`browser:${browser}`;};
 const valid=(mode:string,a:string,b:string,heardA:number|null,heardB:number|null)=>["blind","bring"].includes(mode)&&a!==b&&approved.has(a)&&approved.has(b)&&(heardA||0)>=5&&(heardB||0)>=5;
 const excludedTrials=new Set(runs.filter(run=>run.trialId&&!active("run",run.id)).map(run=>run.trialId));
 const decisive=allVotes.filter(v=>active("vote",v.id)&&!excludedTrials.has(v.id)&&v.eligible===1&&valid(v.testMode,v.winnerId,v.loserId,v.heardA,v.heardB)).map(v=>({...v,voterId:participant("vote",v.id,v.voterId),result:"preference"}));
 const ties=runs.filter(run=>run.result==="tie"&&active("run",run.id)&&(!run.trialId||active("vote",run.trialId))&&valid(run.testMode,run.targetAId,run.targetBId,run.heardA,run.heardB)).map(run=>({...run,id:`tie:${run.id}`,voterId:participant("run",run.id,run.voterId),winnerId:run.targetAId,loserId:run.targetBId,sha256:null,audioFormat:null,sampleRate:null,bitrate:null,duration:null,reasonTags:"[]",result:"tie"}));
 return {targets:allTargets.filter(t=>t.status==="approved"),votes:[...decisive,...ties]};
}
export type EvidenceVote=RankingVote & {testMode:string;headphoneType:string|null;protocolVersion:string;songTitle:string|null;songArtist:string|null;songAlbum:string|null;recordingId:string|null;sha256:string|null;reasonTags:string|null};
