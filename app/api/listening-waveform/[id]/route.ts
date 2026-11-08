import {env} from "cloudflare:workers";
import manifest from "@/data/listening-pool-audio-manifest.json";
import {serveWaveformPeaks} from "@/lib/serve-waveform-peaks";
async function peaks(request:Request,context:{params:Promise<{id:string}>}){
 const {id}=await context.params;if(!Object.hasOwn(manifest,id))return new Response(null,{status:404});
 const asset=(manifest as Record<string,{sha256:string}>)[id];
 const assets=(env as unknown as {ASSETS?:{fetch(request:Request):Promise<Response>}}).ASSETS;
 return assets?serveWaveformPeaks(request,asset.sha256,assets):new Response(null,{status:503});
}
export const GET=peaks;export const HEAD=peaks;
