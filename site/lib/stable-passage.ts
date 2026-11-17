import {adjustComparisonPassage,rememberComparisonPassage,shuffleComparisonPassage,type ComparisonPassage} from "@/lib/comparison-passage";
import type {TrackAnalysis} from "@/lib/loudness";
export type StablePassageSelection=NonNullable<ReturnType<typeof shuffleComparisonPassage>>&{track:string};
/** Later waveform/metadata updates must not choose a different listening window. */
export function stablePassageSelection(current:StablePassageSelection|null,track:string,duration:number,waveform:TrackAnalysis["waveform"]|undefined,history:ComparisonPassage[],random=Math.random):StablePassageSelection|null{
 if(!track||!Number.isFinite(duration)||duration<5)return null;
 if(current?.track===track){
  const limit=duration>=5.1?duration-.1:duration;
  if(current.passage.end<=limit)return current;
  const passage=adjustComparisonPassage(current.passage,"move",0,duration);
  return{...current,passage,history:rememberComparisonPassage(history,passage,duration)};
 }
 const selected=shuffleComparisonPassage(duration,waveform,history,5,random);
 return selected?{...selected,track}:null;
}
