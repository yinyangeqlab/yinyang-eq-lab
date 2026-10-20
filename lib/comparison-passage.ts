import type { TrackAnalysis } from './loudness';
export type ComparisonPassage = { start: number; end: number };
export const PASSAGE_SECONDS = 5;
export type PassageShuffleBook = Map<string, ComparisonPassage[]>;
const EPSILON = 1e-7;
function mergedCoverage(history: ComparisonPassage[], limit: number): ComparisonPassage[] {
  const rows = history.filter(p=>Number.isFinite(p.start)&&Number.isFinite(p.end)&&p.end>p.start)
    .map(p=>({start:Math.max(0,p.start),end:Math.min(limit,p.end)})).filter(p=>p.end>p.start).sort((a,b)=>a.start-b.start);
  const merged: ComparisonPassage[]=[];
  for(const row of rows){const last=merged.at(-1);if(last&&row.start<=last.end+EPSILON)last.end=Math.max(last.end,row.end);else merged.push({...row});}
  return merged;
}
export function rememberComparisonPassage(history: ComparisonPassage[], passage: ComparisonPassage, duration: number) {
  return mergedCoverage([...history,passage],duration);
}
/** Randomized coverage without replacement, weighted toward active audio.
 * Energy is a convenience heuristic, not a claim about musical or scientific quality.
 * A short leftover gap may need minimal overlap to preserve the chosen duration.
 */
export function shuffleComparisonPassage(duration: number, waveform: TrackAnalysis['waveform'] | undefined,
  history: ComparisonPassage[] = [], requestedLength = PASSAGE_SECONDS, random = Math.random, previous?: ComparisonPassage
): { passage: ComparisonPassage; history: ComparisonPassage[]; restarted: boolean; partialOverlap: boolean } | null {
  if(!Number.isFinite(duration)||duration<PASSAGE_SECONDS||!Number.isFinite(requestedLength))return null;
  const limit=duration>=PASSAGE_SECONDS+.1?duration-.1:duration, length=Math.min(limit,Math.max(PASSAGE_SECONDS,requestedLength));
  let coverage=mergedCoverage(history,limit);
  function gaps(){const result:ComparisonPassage[]=[];let cursor=0;for(const p of coverage){if(p.start>cursor+EPSILON)result.push({start:cursor,end:p.start});cursor=Math.max(cursor,p.end);}if(cursor<limit-EPSILON)result.push({start:cursor,end:limit});return result;}
  let remaining=gaps();const restarted=remaining.length===0;
  if(restarted){coverage=[];remaining=[{start:0,end:limit}];}
  const full=remaining.filter(g=>g.end-g.start>=length-EPSILON), candidates:ComparisonPassage[]=[];
  const clamp=(start:number)=>Math.max(0,Math.min(limit-length,start));
  if(full.length){
    // Bound work for very long files, while scanning every remaining gap.
    const available=full.reduce((n,g)=>n+g.end-g.start,0),stride=Math.max(length,available/512);
    for(const gap of full){const count=Math.max(1,Math.ceil((gap.end-gap.start-length)/stride));for(let i=0;i<=count;i++){const start=clamp(gap.start+(gap.end-gap.start-length)*i/count);candidates.push({start,end:start+length});}}
  }else{
    // Finish all uncovered tails before starting a fresh cycle. Prefer the window
    // covering the most new time; some overlap is unavoidable for gaps < length.
    for(const gap of remaining)for(const anchor of [gap.start,gap.end-length]){const start=clamp(anchor);candidates.push({start,end:start+length});}
  }
  const novelty=(p:ComparisonPassage)=>remaining.reduce((n,g)=>n+Math.max(0,Math.min(p.end,g.end)-Math.max(p.start,g.start)),0);
  const bestNovelty=Math.max(...candidates.map(novelty));
  let choices=candidates.filter(p=>novelty(p)>=bestNovelty-EPSILON);
  if(restarted&&previous&&choices.length>1){const different=choices.filter(p=>Math.abs(p.start-previous.start)>=Math.min(1,(limit-length)/2));if(different.length)choices=different;}
  function energy(p:ComparisonPassage){
    if(!waveform)return 0;
    const count=Math.min(waveform.minL.length,waveform.maxL.length,waveform.minR.length,waveform.maxR.length);
    const from=Math.max(0,Math.floor(p.start/duration*count)),to=Math.min(count,Math.ceil(p.end/duration*count));let sum=0;
    for(let i=from;i<to;i++){const l=Math.max(Math.abs(waveform.minL[i]),Math.abs(waveform.maxL[i])),r=Math.max(Math.abs(waveform.minR[i]),Math.abs(waveform.maxR[i]));if(Number.isFinite(l)&&Number.isFinite(r))sum+=l*l+r*r;}
    return sum/Math.max(1,to-from);
  }
  const energies=choices.map(energy),peak=Math.max(...energies),weights=energies.map(e=>peak>0?.05+.95*Math.sqrt(e/peak):1);
  const raw=random(),unit=Number.isFinite(raw)?Math.max(0,Math.min(1-Number.EPSILON,raw)):0;
  let threshold=unit*weights.reduce((a,b)=>a+b,0),index=weights.length-1;
  for(let i=0;i<weights.length;i++){threshold-=weights[i];if(threshold<0){index=i;break;}}
  const passage=choices[index];
  return {passage,history:rememberComparisonPassage(coverage,passage,limit),restarted,partialOverlap:bestNovelty<length-EPSILON};
}
/** Stateless convenience entry point; player shuffles retain the entire cycle. */
export function chooseComparisonPassage(duration: number, waveform?: TrackAnalysis['waveform'], random = Math.random, previous?: ComparisonPassage): ComparisonPassage | null {
  return shuffleComparisonPassage(duration,waveform,previous?[previous]:[],PASSAGE_SECONDS,random,previous)?.passage??null;
}
export function comparisonOrder(random = Math.random): [0 | 1, 0 | 1] { return random() < .5 ? [0, 1] : [1, 0]; }

/** Every drag moves the fixed five-second window; it cannot grow or shrink. */
export function adjustComparisonPassage(passage: ComparisonPassage, mode: "move" | "start" | "end", delta: number, duration: number): ComparisonPassage {
  if (!Number.isFinite(duration) || !Number.isFinite(delta) || duration <= 0) return passage;
  const limit = duration >= PASSAGE_SECONDS + .1 ? duration - .1 : duration;
  const length = Math.min(PASSAGE_SECONDS, limit);
  const start = Math.round(Math.max(0, Math.min(limit - length, passage.start + delta)) * 100) / 100;
  return { start, end: Math.min(duration, start + length) };
}

/** Personal exploration: body moves preserve length; only edges resize, min 5s. */
export function adjustResizablePassage(passage: ComparisonPassage, mode: "move" | "start" | "end", delta: number, duration: number): ComparisonPassage {
  if (!Number.isFinite(duration)||!Number.isFinite(delta)||duration<PASSAGE_SECONDS) return passage;
  const limit=duration>=PASSAGE_SECONDS+.1?duration-.1:duration;
  const round=(n:number)=>Math.round(n*100)/100;
  const length=Math.min(limit,Math.max(PASSAGE_SECONDS,passage.end-passage.start));
  const baseStart=Math.max(0,Math.min(limit-length,passage.start));
  const baseEnd=baseStart+length;
  if(mode==="start")return {start:Math.min(baseEnd-PASSAGE_SECONDS,Math.max(0,round(baseStart+delta))),end:baseEnd};
  if(mode==="end")return {start:baseStart,end:Math.max(baseStart+PASSAGE_SECONDS,Math.min(limit,round(baseEnd+delta)))};
  const start=Math.max(0,Math.min(limit-length,round(baseStart+delta)));
  return {start,end:start+length};
}
