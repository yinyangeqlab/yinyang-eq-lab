"use client";
import {useEffect,useState} from "react";
import {decodePeakLevel,waveformRecordingId,type WaveformPeaks} from "@/lib/waveform-peaks";
const cache=new Map<string,WaveformPeaks>();
// Bounded per-tab cache. Long recordings fetch peak envelopes, never full PCM.
export function useWaveformPeaks(url:string|undefined,requestedBins:number){
 const [failed,setFailed]=useState("");
 const [loaded,setLoaded]=useState<{key:string;value:WaveformPeaks}|null>(null);
 const id=url?waveformRecordingId(url):null;
 const resolution=Math.min(524288,Math.max(512,2**Math.ceil(Math.log2(Math.max(512,requestedBins)))));
 const key=id?`${id}:${resolution}`:"";
 useEffect(()=>{
  if(!key)return;
  const saved=cache.get(key);if(saved){void Promise.resolve().then(()=>setLoaded({key,value:saved}));return;}
  const controller=new AbortController();let current=true;
  void fetch(`/api/listening-waveform/${id}?bins=${resolution}`,{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error("Waveform unavailable");const value=decodePeakLevel(await response.arrayBuffer());if(!current)return;cache.set(key,value);while(cache.size>3)cache.delete(cache.keys().next().value!);setLoaded({key,value});}).catch(()=>{if(current)setFailed(key);});
  return()=>{current=false;controller.abort();};
 },[id,key,resolution]);
 return {waveform:loaded?.key.split(":")[0]===id?loaded.value:null,status:!key?"none":loaded?.key===key?"ready":failed===key?"unavailable":"loading"};
}
