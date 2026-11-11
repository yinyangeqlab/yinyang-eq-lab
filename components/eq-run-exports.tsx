"use client";
import {isSourceAutoEqTarget} from "@/lib/autoeq-target-sources";
import {useEffect,useMemo,useRef,useState} from "react";
import type {Point} from "@/lib/curves";
import type {HeadphoneMeasurement} from "@/lib/measurement";
import {FIT_CANDIDATE_COUNT} from "@/lib/fitter-settings";
import {generateEqCandidates} from "@/lib/eq-candidates";
import {exportPeq,exportEqualizerApo,exportEasyEffects,exportQudelixGuide,type FinalizedVariant} from "@/lib/preference-finalize";
import {measurementChannelMatch,saveLibraryEq} from "@/lib/music-library-eq";
import {downloadLocalFile} from "@/lib/channel-match-export";
import {recordAdminTestIfNeeded} from "@/lib/admin-test-store";
import {useConsentPrompt} from "./use-consent-prompt";
import EqCandidateResults from "./eq-candidate-results";
import { useGeneratedEqResults } from "@/lib/use-generated-eq-results";
export default function EqRunExports({measurement,target,onCompare,scope="shootout"}:{onCompare?:()=>void;scope?:"shootout"|"personal";measurement:HeadphoneMeasurement;target:{id:string;name:string;creator?:string;points:Point[]}}){
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[message,setMessage]=useState("");
 const localAutoEq=isSourceAutoEqTarget(target.id);
 const consent=useConsentPrompt("Downloading EQ settings saves the selected target, curve and exported settings for private project research. Your music and raw headphone measurements are not sent.");
 const abort=useRef<AbortController|null>(null);
 const priorKey=useMemo(()=>JSON.stringify([measurement.id,measurement.points,target.id,target.points]),[measurement,target]);
 const key=JSON.stringify([priorKey,measurement.type]);
 const { current: result, heading: resultsHeading, save: saveResults } = useGeneratedEqResults(scope, key, priorKey);
 useEffect(()=>()=>abort.current?.abort(),[key]);
 async function generate(){abort.current?.abort();const request=new AbortController();abort.current=request;setBusy(true);setProgress(0);setMessage("");try{const variants=await generateEqCandidates(measurement.points,target.points,request.signal,setProgress,measurement.type);if(!request.signal.aborted)saveResults(variants);}catch(error){if(!request.signal.aborted)setMessage(error instanceof Error?error.message:"Could not calculate these EQs.");}finally{if(abort.current===request)setBusy(false);}}
 async function download(variant:FinalizedVariant,format:string){const run=async()=>{try{const contents=format==="equalizerapo"?exportEqualizerApo(variant):format==="easyeffects"?exportEasyEffects(variant):format==="qudelix5k"?exportQudelixGuide(variant):exportPeq(variant),filename=`shootout-${variant.method}-${variant.bands}band${format==="txt"?"":"-"+format}.txt`;
 const test=!localAutoEq&&await recordAdminTestIfNeeded("export",{targetName:target.name,exportKind:"eq",format,filename,contents,variant});
 if(!test&&!localAutoEq){const response=await fetch("/api/preference-exports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({targetId:target.id,targetName:target.name,targetCreator:target.creator||"Target creator",measurementName:measurement.name,exportKind:"eq",format,filename,contents,settings:{source:"shootout-results"},curve:target.points,variant})});if(!response.ok)throw Error(((await response.json()) as {error?:string}).error||"Could not save the export.");}
 downloadLocalFile(filename,contents,"text/plain");setMessage("EQ downloaded.");}catch(error){setMessage(error instanceof Error?error.message:"Could not download this EQ.");}};if(localAutoEq)await run();else await consent.ask(run);}
 function save(variant:FinalizedVariant){try{saveLibraryEq({id:crypto.randomUUID(),name:`${measurement.device||measurement.name} → ${target.name}`,fitter:{method:variant.method,bands:variant.bands},source:`Shootout result · ${variant.method} · ${variant.bands} bands`,engine:variant.engine,engineVersion:variant.engineVersion,filters:variant.filters,preamp:variant.preamp,measurementId:measurement.id,headphone:measurement.device||measurement.name,channelMatch:measurementChannelMatch(measurement),target:localAutoEq?undefined:{...target}});setMessage("EQ saved to My space, Tuning and Music library.");}catch(error){setMessage(error instanceof Error?error.message:"Could not save this EQ.");}}
 return <section className="eq-run-exports"><h3>EQs for {target.name}</h3><p>Compare downloadable EQs for this target and your selected headphones. This does not change your shootout answers or the fitter used in that test. Show any generated fit and see where it differs from the target.</p><button type="button" disabled={busy} onClick={()=>void generate()}>{busy?`Comparing ${progress} / ${FIT_CANDIDATE_COUNT} EQs…`:"Generate EQ comparisons"}</button>{result && <section className="eq-results-section">
   <header className="eq-results-heading">
     <h3 ref={resultsHeading} tabIndex={-1}>Generated EQ results</h3>
     <p>{result.saved ? "The last generated set is saved in this browser for this setup." : "These results are available in this tab. Browser storage is unavailable."}</p>
   </header>
   <EqCandidateResults comparisonContext={{headphones:measurement.device||measurement.name,target:target.name}} channelMatch={measurementChannelMatch(measurement)} onCompare={onCompare} key={key} variants={result.variants} raw={measurement.points} target={target.points} onDownload={(fit,format)=>void download(fit,format)} onSave={save}/>
 </section>}<p role="status">{message}</p>{consent.dialog}</section>;
}
