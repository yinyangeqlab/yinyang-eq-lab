import {readServiceStatus} from '@/lib/service-status';
export async function GET(){try{return Response.json(await readServiceStatus(),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Service status is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});}}
