import type { TrackAnalysis } from "@/lib/loudness";
export type WaveformPeaks=Pick<TrackAnalysis,"waveform">;
export function peakColumns(wave:TrackAnalysis["waveform"],start:number,end:number,columns:number){
 const count=wave.minL.length,output=new Float32Array(columns*4);
 for(let x=0;x<columns;x++){
  const first=Math.max(0,Math.min(count-1,Math.floor((start+(end-start)*x/columns)*count)));
  const last=Math.max(first+1,Math.min(count,Math.ceil((start+(end-start)*(x+1)/columns)*count)));
  let minL=Infinity,maxL=-Infinity,minR=Infinity,maxR=-Infinity;
  for(let i=first;i<last;i++){minL=Math.min(minL,wave.minL[i]);maxL=Math.max(maxL,wave.maxL[i]);minR=Math.min(minR,wave.minR[i]);maxR=Math.max(maxR,wave.maxR[i]);}
  output.set([minL,maxL,minR,maxR],x*4);
 }
 return output;
}
export function decodePeakLevel(bytes:ArrayBuffer):WaveformPeaks{
 if(!bytes.byteLength||bytes.byteLength%16||bytes.byteLength>16_777_216)throw Error("Invalid waveform peak data");
 const data=new DataView(bytes),count=bytes.byteLength/16,minL=new Float32Array(count),maxL=new Float32Array(count),minR=new Float32Array(count),maxR=new Float32Array(count);
 for(let i=0;i<count;i++)for(const [channel,offset]of [[minL,0],[maxL,4],[minR,8],[maxR,12]]as const){const value=data.getFloat32(i*16+offset,true);if(!Number.isFinite(value))throw Error("Invalid waveform sample");channel[i]=value;}
 return{waveform:{minL,maxL,minR,maxR}};
}
export function waveformRecordingId(url:string){
 const match=/^\/(?:api\/listening-audio|__local-listening-pool)\/([a-zA-Z0-9_-]+)$/.exec(url);
 if(match)return match[1];
 const shantae=/^\/music\/shantae\/([a-zA-Z0-9_-]+)\.[a-zA-Z0-9]+$/.exec(url);
 return shantae?"shantae-"+shantae[1]:null;
}
