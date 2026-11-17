import { env } from "cloudflare:workers";
import { publicProfilePage } from "@/lib/yinyangeq-records";
import { profileHeaders,profileFailure,profilePageNumber } from "@/lib/profile-api";
export async function GET(request:Request){try{return Response.json(await publicProfilePage(env.DB!,profilePageNumber(request)),{headers:profileHeaders});}catch(error){return profileFailure(error);}}
