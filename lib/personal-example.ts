import { checkpointPersonalRun, createPersonalRun, recordPersonalChoice, type Candidate } from "./personal-shootout";

/** Read-only, in-memory fixture. Never persist or submit these choices. */
export function createPersonalExample(candidates: Candidate[], now: number) {
  let run = createPersonalRun("local-example-results", "Example headphones · Over-Ear", candidates.slice(0,12), 20);
  const at = () => now - 7 * 86400000 + run.choices.length * 60000;
  for (let repeat=0; repeat<2; repeat++) for (let a=0; a<run.candidates.length; a++) for (let b=a+1; b<run.candidates.length; b++) {
    run.pending=[run.candidates[a].id,run.candidates[b].id];
    run=recordPersonalChoice(run,{pair:run.pending,result:"a",recording:`example-song-${repeat}`,start:0,end:6,at:at(),phase:"explore"});
    if (run.choices.length%30===0) run=checkpointPersonalRun(run);
  }
  run.phase="confirm";run.finalists=run.candidates.slice(0,3).map(row=>row.id);
  for (let song=0; song<2; song++) for (let a=0; a<run.finalists.length; a++) for (let b=a+1; b<run.finalists.length; b++) {
    run.pending=[run.finalists[a],run.finalists[b]];
    run=recordPersonalChoice(run,{pair:run.pending,result:"a",recording:`example-finalist-${song}`,start:0,end:6,at:at(),phase:"confirm"});
  }
  return checkpointPersonalRun({...run,paused:true,pending:null});
}
