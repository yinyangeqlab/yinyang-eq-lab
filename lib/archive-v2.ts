import { ARCHIVE_TARGETS } from "@/lib/archive-targets";
export const ARCHIVE_V2_METHOD="account-fraction-discrete-laplace-v2";
export const ARCHIVE_V2_NOTICE="2026-10-18-v7";
export const ARCHIVE_V2_BOUND=25/16;
export type ArchiveStudy={id:string;target_a:string;target_b:string;mode:string;headphone_type:string;start_at:number;end_at:number;notice_version:string;methodology:string};
export type ArchiveAccount={subject_id:string;a_wins:number;comparisons:number};
export type ArchiveV2Release={sequence:number;studyId:string;methodology:string;epsilon:{numerator:number;denominator:string};result:{preferencePercent:number|null;lowerPercent:number;upperPercent:number;outcome:"a-leaning"|"b-leaning"|"inconclusive"};uncertainty:"at-least-95-percent-noise-only";quantisationPercent:1};
const allowed=new Set<string>(ARCHIVE_TARGETS.map(t=>t.id));
export function validTargets(a:string,b:string){return a<b&&allowed.has(a)&&allowed.has(b);}
export function releaseScale(sequence:number){
 if(!Number.isSafeInteger(sequence)||sequence<0)throw new Error("Invalid archive sequence");
 const block=BigInt(sequence+1).toString(2).length-1;
 return BigInt(128) << BigInt(2*block);
}
export function archiveAccounting(count:number){
 if(!Number.isSafeInteger(count)||count<0)throw new Error("Invalid ledger");
 if(!count)return {completed:0,spentNumerator:"0",spentDenominator:"1",programBound:ARCHIVE_V2_BOUND,nextScale:releaseScale(0).toString()};
 const n=BigInt(count),q=BigInt(1)<<BigInt(n.toString(2).length-1),den=BigInt(128)*q*q;
 const num=BigInt(200)*(q*q-q)+BigInt(100)*(n-q+BigInt(1));
 return {completed:count,spentNumerator:num.toString(),spentDenominator:den.toString(),programBound:ARCHIVE_V2_BOUND,nextScale:releaseScale(count).toString()};
}

// Integer-only rational sampler based on Canonne–Kamath–Steinke (2020),
// Discrete Laplace sampling. No floating-point inverse CDF or truncated tails.
// The public scale is integer t and mass is proportional to exp(-|z|/t).
function uniform(bound:bigint){
 if(bound<=BigInt(0))throw new Error("Invalid random bound");if(bound===BigInt(1))return BigInt(0);
 const bits=(bound-BigInt(1)).toString(2).length,bytes=Math.ceil(bits/8),mask=(BigInt(1)<<BigInt(bits))-BigInt(1);
 while(true){const buffer=new Uint8Array(bytes);crypto.getRandomValues(buffer);let value=BigInt(0);for(const byte of buffer)value=(value<<BigInt(8))|BigInt(byte);value&=mask;if(value<bound)return value;}
}
function expCoin(numerator:bigint,denominator:bigint){
 if(numerator<BigInt(0)||numerator>denominator||denominator<=BigInt(0))throw new Error("Invalid exponential coin");
 let k=BigInt(1);while(uniform(denominator*k)<numerator)k++;
 return (k&BigInt(1))===BigInt(1);
}
export function sampleDiscreteLaplace(scale:bigint){
 if(scale<=BigInt(0))throw new Error("Invalid noise scale");
 while(true){
  let u:bigint;do{u=uniform(scale);}while(!expCoin(u,scale));
  let v=BigInt(0);while(expCoin(BigInt(1),BigInt(1)))v++;
  const magnitude=v*scale+u,negative=uniform(BigInt(2))===BigInt(1);
  if(negative&&magnitude===BigInt(0))continue;
  return negative?-magnitude:magnitude;
 }
}
function maxZero(n:bigint){return n<BigInt(0)?BigInt(0):n;}
export function boundedHistogram(accounts:ArchiveAccount[]){
 const seen=new Set<string>();let a=BigInt(0),b=BigInt(0);
 for(const row of accounts){
  if(!row.subject_id.startsWith("invite:")||seen.has(row.subject_id)||!Number.isSafeInteger(row.comparisons)||!Number.isSafeInteger(row.a_wins)||row.comparisons<=0||row.a_wins<0||row.a_wins>row.comparisons)throw new Error("Invalid bounded account input");
  seen.add(row.subject_id);const n=BigInt(row.comparisons),wins=BigInt(row.a_wins);
  const part=(BigInt(200)*wins+n)/(BigInt(2)*n);a+=part;b+=BigInt(100)-part;
 }
 return {a,b};
}
export function buildArchiveV2(sequence:number,studyId:string,accounts:ArchiveAccount[],noise:(scale:bigint)=>bigint=sampleDiscreteLaplace):ArchiveV2Release{
 const scale=releaseScale(sequence),{a,b}=boundedHistogram(accounts);
 const noisyA=a+noise(scale),noisyB=b+noise(scale);
 // Each of two discrete-Laplace tails is <=2 exp(-radius/t).
 // radius=5t gives joint failure <=4 exp(-5)<0.05. Add 0.5pp
 // account-mean quantisation error, then round outward to 5pp steps.
 const radius=BigInt(5)*scale,al=maxZero(noisyA-radius),ah=maxZero(noisyA+radius),bl=maxZero(noisyB-radius),bh=maxZero(noisyB+radius);
 let lower=0,upper=100,point:number|null=null;
 const lowDen=al+bh,highDen=ah+bl;
 if(lowDen&&BigInt(200)*al>lowDen)lower=5*Number((BigInt(200)*al-lowDen)/(BigInt(10)*lowDen));
 if(highDen){const num=BigInt(200)*ah+highDen,den=BigInt(10)*highDen;upper=Math.min(100,5*Number((num+den-BigInt(1))/den));}
 const ca=maxZero(noisyA),cb=maxZero(noisyB);
 // This is a post-processing gate using noisy values only, never exact N.
 if((noisyA>radius||noisyB>radius)&&ca+cb>BigInt(0))point=5*Number((BigInt(40)*ca+(ca+cb))/(BigInt(2)*(ca+cb)));
 else {lower=0;upper=100;}
 let outcome:ArchiveV2Release['result']['outcome']="inconclusive";
 if(point!==null&&upper-lower<=50){if(lower>50)outcome="a-leaning";else if(upper<50)outcome="b-leaning";}
 return {sequence,studyId,methodology:ARCHIVE_V2_METHOD,epsilon:{numerator:100,denominator:scale.toString()},result:{preferencePercent:point,lowerPercent:lower,upperPercent:upper,outcome},uncertainty:"at-least-95-percent-noise-only",quantisationPercent:1};
}
