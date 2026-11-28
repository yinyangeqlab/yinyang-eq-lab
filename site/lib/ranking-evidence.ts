import { oratoryInEarId, oratoryInEarLabel } from "@/lib/target-labels";
import { autoEqRankingTargets } from "@/lib/autoeq-target-sources";
import { cleanFitMetadata, fitterCohort, isJointFitPair, JOINT_FITTER_COHORT, MAIN_FITTER_COHORT } from "@/lib/fitter-settings";
import { isTestSubject } from "@/lib/admin-contributions";
import { getDb } from "@/db";
import { runFileFingerprint } from "@/lib/file-fingerprint";
import { targets, votes, listeningRuns, submissionOwners } from "@/db/schema";
import { activeSubmissions } from "@/lib/active-submissions";
import type { RankingVote } from "@/lib/preference-ranking";
import { intervalStats, parseIntervals } from "@/lib/listening";
import { isRankedPassageProtocol, LEVEL_MATCHED_LISTENING_PROTOCOL, FREE_LISTENING_PROTOCOL, MIN_SIDE_SECONDS, MIN_COMMON_SECONDS, cleanPassageLevelMatch, matchedPassageContains } from "@/lib/listening-protocol";
export async function rankingEvidence() {
 const db=getDb();
 const [storedTargets,allVotes,runs,owners]=await Promise.all([db.select().from(targets),db.select().from(votes),db.select().from(listeningRuns),db.select().from(submissionOwners)]);
 const allTargets=[...storedTargets.map(row => row.id === oratoryInEarId ? { ...row, name: oratoryInEarLabel } : row), ...autoEqRankingTargets];
 const active=await activeSubmissions();
 const ownership=new Map(owners.map(o=>[`${o.recordKind}:${o.recordId}`,o.subjectId]));
 const official=(kind:string,id:string)=>!isTestSubject(ownership.get(`${kind}:${id}`)||"");
 const approved=new Set(allTargets.filter(t=>t.status==="approved"&&official("target",t.id)).map(t=>t.id));
 const participant=(kind:string,id:string,browser:string)=>{const owner=ownership.get(`${kind}:${id}`);return owner?`account:${owner}`:`browser:${browser}`;};
 const validPair = (mode: string, a: string, b: string) =>
   (mode === "blind" || mode === "bring") && a !== b && approved.has(a) && approved.has(b);
 const valid=(mode:string,a:string,b:string,heardA:number|null,heardB:number|null,protocolVersion:string,intervals:string|null)=>{
  if(protocolVersion===FREE_LISTENING_PROTOCOL)return false;
  if(!validPair(mode,a,b)||(heardA||0)<MIN_SIDE_SECONDS||(heardB||0)<MIN_SIDE_SECONDS)return false;
  // Historical cohorts retain their original rules. Current-protocol evidence
  // must independently meet the same-passage rule when rankings are read, too.
  if(!isRankedPassageProtocol(protocolVersion))return true;
  try {
   const stats=intervalStats(parseIntervals(JSON.parse(intervals||"[]")));
   return stats.heardA>=MIN_SIDE_SECONDS&&stats.heardB>=MIN_SIDE_SECONDS&&stats.overlapSeconds>=MIN_COMMON_SECONDS;
  } catch {return false;}
 };
 const excludedTrials=new Set(runs.filter(run=>run.trialId&&(!official("run",run.id)||!active("run",run.id))).map(run=>run.trialId));
 const levelMatchedDecisions = new Map<string, { winnerId: string; loserId: string; headphoneType: string | null; testMode: string }>();
 function verifiedLevelMatch(run: typeof runs[number]) {
   if (!run.trialId || run.protocolVersion !== LEVEL_MATCHED_LISTENING_PROTOCOL || excludedTrials.has(run.trialId)) return false;
   if (!valid(run.testMode, run.targetAId, run.targetBId, run.heardA, run.heardB, run.protocolVersion, run.intervals)) return false;
   try {
     const context = JSON.parse(run.researchContext || "{}");
     const match = cleanPassageLevelMatch(context.passageLevelMatch);
     const fits = cleanFitMetadata(context.eqFits);
     return !!match && isJointFitPair(fits) && matchedPassageContains(match, parseIntervals(JSON.parse(run.intervals || "[]")));
   } catch { return false; }
 }
 const runCohorts = new Map<string, ReturnType<typeof fitterCohort>>();
 for (const run of runs) if (run.trialId && official("run",run.id) && active("run",run.id)) {
   if (verifiedLevelMatch(run) && (run.result === "a" || run.result === "b")) {
     const firstWins = run.result === "a";
     levelMatchedDecisions.set(run.trialId, {
       winnerId: firstWins ? run.targetAId : run.targetBId,
       loserId: firstWins ? run.targetBId : run.targetAId,
       headphoneType: run.headphoneType,
       testMode: run.testMode,
     });
   }
   const cohort = fitterCohort(run.researchContext), prior = runCohorts.get(run.trialId);
   runCohorts.set(run.trialId, prior && prior.key !== cohort.key ? { key: "mixed", label: "Inconsistent fitter records · excluded" } : cohort);
 }
 const decisive=allVotes.filter(v=>official("vote",v.id)&&official("trial",v.id)&&(!isTestSubject(v.voterId)||ownership.has(`vote:${v.id}`))&&active("vote",v.id)&&!excludedTrials.has(v.id)&&v.eligible===1&&valid(v.testMode,v.winnerId,v.loserId,v.heardA,v.heardB,v.protocolVersion,v.intervals)).map(v=>({...v,voterId:participant("vote",v.id,v.voterId),result:"preference", fitterCohort:runCohorts.get(v.id) ?? fitterCohort(null)}));
 const ties=runs.filter(run=>run.result==="tie"&&official("run",run.id)&&(!run.trialId||official("trial",run.trialId)&&official("vote",run.trialId))&&(!isTestSubject(run.voterId)||ownership.has(`run:${run.id}`))&&active("run",run.id)&&(!run.trialId||active("vote",run.trialId))&&(run.protocolVersion!==LEVEL_MATCHED_LISTENING_PROTOCOL||verifiedLevelMatch(run))&&valid(run.testMode,run.targetAId,run.targetBId,run.heardA,run.heardB,run.protocolVersion,run.intervals)).map(run=>({...run,id:`tie:${run.id}`,voterId:participant("run",run.id,run.voterId),winnerId:run.targetAId,loserId:run.targetBId,sha256:runFileFingerprint(run.researchContext),audioFormat:null,sampleRate:null,bitrate:null,duration:null,reasonTags:"[]",result:"tie", fitterCohort:fitterCohort(run.researchContext)}));
 const freeListeningVotes: EvidenceVote[] = [];
 for (const run of runs) {
   if (run.protocolVersion !== FREE_LISTENING_PROTOCOL || run.trialId ||
     !validPair(run.testMode, run.targetAId, run.targetBId) ||
     !official("run", run.id) || !ownership.has(`run:${run.id}`) ||
     isTestSubject(run.voterId) || !active("run", run.id)) continue;
   if (run.result !== "a" && run.result !== "b" && run.result !== "tie") continue;
   try {
     if (JSON.parse(run.researchContext || "{}")?.freeListeningRanking !== true) continue;
   } catch {
     continue;
   }
   freeListeningVotes.push({
     ...run,
     voterId: participant("run", run.id, run.voterId),
     winnerId: run.result === "b" ? run.targetBId : run.targetAId,
     loserId: run.result === "b" ? run.targetAId : run.targetBId,
     result: run.result === "tie" ? "tie" : "preference",
     sha256: runFileFingerprint(run.researchContext),
     reasonTags: "[]",
   });
 }
 const eligible = [...decisive,...ties].filter(v=>v.fitterCohort.key!=="mixed");
 const rankedVotes = eligible.filter(v => {
   if (v.protocolVersion !== LEVEL_MATCHED_LISTENING_PROTOCOL) return v.fitterCohort.key !== JOINT_FITTER_COHORT;
   if (v.fitterCohort.key !== JOINT_FITTER_COHORT) return false;
   if (v.result === "tie") return true;
   const run = levelMatchedDecisions.get(v.id);
   return run?.winnerId === v.winnerId && run.loserId === v.loserId && run.headphoneType === v.headphoneType && run.testMode === v.testMode;
 });
 return {
   targets: allTargets.filter(t => approved.has(t.id)),
   votes: rankedVotes.filter(v => v.fitterCohort.key === MAIN_FITTER_COHORT || v.fitterCohort.key === JOINT_FITTER_COHORT),
   allFitterVotes: rankedVotes,
   freeListeningVotes,
 };
}
export type EvidenceVote=RankingVote & {fitterCohort?:{key:string;label:string};testMode:string;headphoneType:string|null;protocolVersion:string;songTitle:string|null;songArtist:string|null;songAlbum:string|null;recordingId:string|null;sha256:string|null;reasonTags:string|null};
