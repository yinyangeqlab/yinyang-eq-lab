import { requestInputResponse } from "@/lib/request-json";
export const profileHeaders={"Cache-Control":"private, no-store","Vary":"Cookie","X-Content-Type-Options":"nosniff"};
export function profileFailure(error:unknown){const response=requestInputResponse(error)||Response.json({error:"Profile controls are temporarily unavailable. No publication was confirmed."},{status:503});for(const [key,value]of Object.entries(profileHeaders))response.headers.set(key,value);return response;}
export function profilePageNumber(request:Request){return Math.max(1,Math.min(1000,Number.parseInt(new URL(request.url).searchParams.get("page")||"1",10)||1));}
