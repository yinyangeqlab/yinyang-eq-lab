import {env} from 'cloudflare:workers';
export type ServiceStatus={id:string;active:boolean;message:string;pauseSubmissions:boolean;expiresAt:number|null;enabled:boolean};
export const DEFAULT_MAINTENANCE_MESSAGE='Major updates are underway. Shootouts are temporarily paused. Listening Pool and Preference Tuning remain available. Thanks for your patience!';
function database(){if(!env.DB)throw new Error('Service status is unavailable');return env.DB;}
const inactive:ServiceStatus={id:'',active:false,message:'',pauseSubmissions:false,expiresAt:null,enabled:false};
export async function readServiceStatus(fresh=false):Promise<ServiceStatus>{
 const forced=['true','1'].includes(String((env as unknown as Record<string,unknown>).MAINTENANCE_MODE));
 const key=new Request('https://yinyangeq.com/__internal/service-status/v1');
 const cache=typeof caches==='undefined'?null:(caches as CacheStorage & {default:Cache}).default;
 let row:ServiceStatus|null=null;
 if(!fresh&&cache){try{const hit=await cache.match(key);if(hit)row=await hit.json() as ServiceStatus;}catch{}}
 if(!row){
  const stored=await database().prepare('SELECT revision, message, pause_submissions, expires_at FROM site_service_status WHERE id=1').first<{revision:string;message:string;pause_submissions:number;expires_at:number}>();
  row=stored?{id:stored.revision,active:stored.expires_at>Date.now(),message:stored.message,pauseSubmissions:stored.pause_submissions===1,expiresAt:stored.expires_at,enabled:false}:{...inactive};
  if(cache)try{await cache.put(key,Response.json(row,{headers:{'Cache-Control':'public, max-age=15'}}));}catch{}
 }
 if(row.expiresAt!==null&&row.expiresAt<=Date.now())row={...inactive};
 return forced?{...row,id:row.id||'deployment-maintenance',active:true,message:row.message||DEFAULT_MAINTENANCE_MESSAGE,pauseSubmissions:true,enabled:true}:row;
}
export async function publishServiceStatus(input:{active:boolean;message:string;pauseSubmissions:boolean;hours?:number;durationMinutes?:number}){
 const revision=crypto.randomUUID();
 if(input.active)await database().prepare('INSERT INTO site_service_status(id,revision,message,pause_submissions,expires_at) VALUES(1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,message=excluded.message,pause_submissions=excluded.pause_submissions,expires_at=excluded.expires_at').bind(revision,input.message,input.pauseSubmissions?1:0,Date.now()+(input.durationMinutes??input.hours!*60)*60000).run();
 else await database().prepare('DELETE FROM site_service_status WHERE id=1').run();
 return readServiceStatus(true);
}
