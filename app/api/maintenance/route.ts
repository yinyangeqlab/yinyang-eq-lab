import { env } from 'cloudflare:workers';
import { ownerOnlyMaintenanceResponse } from '@/lib/maintenance-options';
import {readServiceStatus} from '@/lib/service-status';
export async function GET(){if (["true","1"].includes(String((env as unknown as Record<string,unknown>).OWNER_ONLY_MAINTENANCE))) {
  // The private gate already admitted this request. Report closure without making
  // the admitted viewer reload into the same closure-status response forever.
  const response = ownerOnlyMaintenanceResponse(new Request("https://yinyangeq.com/api/maintenance"));
  const status = await response.json() as Record<string, unknown>;
  return Response.json({...status, viewerHasAccess:true}, {headers:response.headers});
}try{return Response.json(await readServiceStatus(),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Service status is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});}}
