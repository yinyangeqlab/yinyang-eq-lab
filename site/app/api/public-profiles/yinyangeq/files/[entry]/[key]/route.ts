import { env } from "cloudflare:workers";
import { publicProfileFile } from "@/lib/yinyangeq-records";
import { profileHeaders,profileFailure } from "@/lib/profile-api";
export async function GET(_request:Request,{params}:{params:Promise<{entry:string;key:string}>}){try{const {entry,key}=await params,result=await publicProfileFile(env.DB!,entry,key);return new Response(result.contents,{headers:{...profileHeaders,"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="${result.filename}"`,"Content-Security-Policy":"sandbox"}});}catch(error){return profileFailure(error);}}
