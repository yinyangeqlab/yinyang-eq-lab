import { env } from "cloudflare:workers";
import { dataIdentity } from "@/lib/submission-ownership";
import { captureBraveHistory } from "@/lib/yinyangeq-history";
import { profileOrigin } from "@/lib/yinyangeq-account";
import { readJsonObject } from "@/lib/request-json";
import { profileHeaders,profileFailure } from "@/lib/profile-api";
export async function POST(request:Request){try{profileOrigin(request);const user=await dataIdentity(),body=await readJsonObject(request,530000);return Response.json(await captureBraveHistory(env.DB!,user.subjectId,user.sessionHash,body.code,body.payload),{headers:profileHeaders});}catch(error){return profileFailure(error);}}
