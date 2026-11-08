import type {ComparisonPassage} from "./comparison-passage";

export function parsePassageTime(value:string):number|null {
  const parts=value.trim().split(":");
  if(!parts.length||parts.length>3||parts.some((part,i)=>!new RegExp(i===parts.length-1?"^\\d+(?:\\.\\d{1,3})?$":"^\\d+$").test(part)))return null;
  const numbers=parts.map(Number);
  if(numbers.some(n=>!Number.isFinite(n))||numbers.slice(1).some(n=>n>=60))return null;
  const seconds=numbers.reduce((sum,n)=>sum*60+n,0);
  return Number.isSafeInteger(Math.floor(seconds))?seconds:null;
}

export function formatPassageTime(seconds:number) {
  const ticks=Math.max(0,Math.round(seconds*100));
  return `${Math.floor(ticks/6000)}:${String(Math.floor(ticks/100)%60).padStart(2,"0")}.${String(ticks%100).padStart(2,"0")}`;
}

export function passageFromTimes(start:number|null,end:number|null,duration:number):{passage:ComparisonPassage;error?:never}|{error:string;passage?:never} {
  if(start===null||end===null||!Number.isFinite(start)||!Number.isFinite(end))return {error:"Enter a time such as 1:05.50, or a number of seconds."};
  const limit=Math.max(0,duration-.1);
  if(!Number.isFinite(duration)||limit<5)return {error:"Choose a song longer than five seconds first."};
  if(start<0||end>limit+1e-7)return {error:`Keep both times between 0:00.00 and ${formatPassageTime(Math.floor(limit*100)/100)}.`};
  if(end-start<5-1e-7)return {error:"The end must be at least five seconds after the start."};
  return {passage:{start,end}};
}
