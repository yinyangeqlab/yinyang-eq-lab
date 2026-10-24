export const MAINTENANCE_FEATURES = [
  {id:"shootouts",label:"Shootouts",description:"Shootout pages, new tests, comparisons, votes and feedback."},
  {id:"listeningPool",label:"Listening Pool",description:"Listening Pool page and music votes. Shared audio stays available to other enabled tools."},
  {id:"preferenceTuning",label:"Preference Tuning",description:"Preference Tuning pages and target/EQ downloads."},
  {id:"contributions",label:"Shared uploads & suggestions",description:"Submitting public targets, contributed measurements and song suggestions. Their forms also need the Shootout page unlocked."},
] as const;
export type MaintenanceFeature = typeof MAINTENANCE_FEATURES[number]["id"];
export const OWNER_ONLY_MAINTENANCE_MESSAGE = "We’re testing updates to YinYang EQ. The site is temporarily unavailable while we check that everything works as intended. Thank you for your patience.";

/** Whole-site closure. No app content, credentials, or visitor state is read. */
export function ownerOnlyMaintenanceResponse(request: Request, message = OWNER_ONLY_MAINTENANCE_MESSAGE): Response {
  const headers = { "Cache-Control": "private, no-store, max-age=0", "Retry-After": "300", "X-YinYang-Service": "owner-only-maintenance", "X-Robots-Tag": "noindex, nofollow", "Vary": "Cookie" };
  const status = { id: "owner-only-maintenance", active: true, enabled: true, ownerOnly: true, message, pauseSubmissions: true, lockedFeatures: MAINTENANCE_FEATURES.map(feature => feature.id) };
  // Existing open tabs can read only this operational notice, not application data.
  if (new URL(request.url).pathname === "/api/maintenance" && ["GET", "HEAD"].includes(request.method)) return new Response(request.method === "HEAD" ? null : JSON.stringify(status), { headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
  if (new URL(request.url).pathname.startsWith("/api/") || !["GET", "HEAD"].includes(request.method)) return new Response(request.method === "HEAD" ? null : JSON.stringify({ error: message, ownerOnly: true }), { status: 503, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
  const escaped = message.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Maintenance | YinYang EQ</title><style>html{color-scheme:dark;background:#081411}*{box-sizing:border-box}body{margin:0;min-height:100vh;min-height:100svh;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at top,#18362e,transparent 65%);color:#e2f5ed;font:18px/1.65 system-ui,sans-serif}main{width:100%;max-width:720px;padding:clamp(24px,6vw,56px);border:1px solid #416b59;border-radius:20px;background:#10251d}p{margin:18px 0 0;overflow-wrap:anywhere}small{color:#b3d6c5;font-size:12px;letter-spacing:.15em}h1{margin:18px 0;font-size:clamp(30px,7vw,48px);line-height:1.15;letter-spacing:-.025em}</style></head><body><main><small>YINYANG EQ · MAINTENANCE</small><h1>We’ll be back after testing.</h1><p>${escaped}</p></main></body></html>`;
  return new Response(request.method === "HEAD" ? null : html, { status: 503, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
}
export function validMaintenanceLocks(value:unknown):value is MaintenanceFeature[] {
  return Array.isArray(value) && value.every(v=>MAINTENANCE_FEATURES.some(f=>f.id===v)) && new Set(value).size===value.length;
}
export function maintenanceLocks(pause:boolean,value?:unknown):MaintenanceFeature[] {
  if(!pause)return [];
  return validMaintenanceLocks(value)&&value.length?[...value]:["shootouts"];
}
// Preserve independently saved locks; derive dependent availability at read time.
export function effectiveMaintenanceLocks(locks:MaintenanceFeature[]):MaintenanceFeature[] {
  return locks.includes("shootouts")&&!locks.includes("contributions")?[...locks,"contributions"]:[...locks];
}
const storagePrefix="yinyang-maintenance-v2:";
export function encodeMaintenanceNotice(message:string,lockedFeatures:MaintenanceFeature[]):string {
  return storagePrefix+JSON.stringify({message,lockedFeatures});
}
export function decodeMaintenanceNotice(stored:string,pause:boolean):{message:string;lockedFeatures:MaintenanceFeature[]} {
  if(stored.startsWith(storagePrefix))try {
    const value:unknown=JSON.parse(stored.slice(storagePrefix.length));
    if(value&&typeof value==="object"&&!Array.isArray(value)) {
      const row=value as Record<string,unknown>;
      if(typeof row.message==="string"&&validMaintenanceLocks(row.lockedFeatures))return {message:row.message,lockedFeatures:maintenanceLocks(pause,row.lockedFeatures)};
    }
  }catch{}
  return {message:stored,lockedFeatures:maintenanceLocks(pause)};
}
export function maintenanceFeatureFor(request:Request):MaintenanceFeature|null {
  const path=new URL(request.url).pathname.replace(/\/$/,""),read=["GET","HEAD"].includes(request.method);
  if(read&&(path==="/shootout"||path.startsWith("/shootout/")))return "shootouts";
  if(read&&path==="/music-library")return "listeningPool";
  if(read&&["/preference-tuning","/personal-tuning"].includes(path))return "preferenceTuning";
  if(["GET","HEAD","OPTIONS"].includes(request.method))return null;
  if(["/api/trials","/api/votes","/api/listening-runs","/api/comparison-choices","/api/feedback"].includes(path))return "shootouts";
  if(path==="/api/community-preferences/reference" || request.method==="POST" && ["/api/personal-research","/api/community-preferences/personal"].includes(path))return "shootouts";
  if(path==="/api/music-votes")return "listeningPool";
  if(path==="/api/preference-exports")return "preferenceTuning";
  if(["/api/targets","/api/targets/removal-request","/api/research-measurements","/api/suggestions"].includes(path))return "contributions";
  return null;
}
export function featureMaintenanceResponse(request:Request,status:{active:boolean;pauseSubmissions:boolean;lockedFeatures?:MaintenanceFeature[];message:string;expiresAt?:number|null}):Response|null {
  if(!status.active||!status.pauseSubmissions)return null;
  const feature=maintenanceFeatureFor(request),locks=effectiveMaintenanceLocks(maintenanceLocks(true,status.lockedFeatures));
  if(!feature||!locks.includes(feature))return null;
  const label=MAINTENANCE_FEATURES.find(f=>f.id===feature)!.label;
  const headers={"Cache-Control":"private, no-store","Retry-After":"60","X-YinYang-Service":"maintenance","X-YinYang-Maintenance-Feature":feature};
  if(!["GET","HEAD"].includes(request.method))return Response.json({error:status.message,feature},{status:503,headers});
  const escape=(value:string)=>value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const links=([['shootouts','/shootout','Open Shootouts'],['listeningPool','/music-library','Open Listening Pool'],['preferenceTuning','/preference-tuning','Open Preference Tuning']] as const).filter(([id])=>!locks.includes(id)).map(([,url,text])=>`<a href="${url}">${text}</a>`).join("");
  const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${label} paused | YinYang EQ League</title><style>html{color-scheme:dark}body{margin:0;background:#081411;color:#e2f5ed;font:16px/1.6 system-ui}main{box-sizing:border-box;max-width:760px;margin:8vh auto;padding:28px}section{border:1px solid #355b4c;border-radius:16px;padding:clamp(18px,4vw,36px);background:#10251d}h1{font-size:clamp(26px,5vw,40px);line-height:1.2}a{color:#a5e9ce}nav{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0}nav a{display:inline-flex;align-items:center;min-height:44px;padding:8px 16px;border:1px solid #4e806a;border-radius:8px;background:#173f2e;text-decoration:none}small{color:#bbd0c5}</style><main><section><small>YINYANG EQ LEAGUE · MAINTENANCE</small><h1>${label} temporarily paused</h1><p>${escape(status.message)}</p><p>Your saved data is preserved.${status.expiresAt?" These locks clear automatically when the notice expires.":" Please check back after maintenance."}</p><nav>${links}</nav><p><a href="/my-data">My data &amp; privacy choices</a> · <a href="/">Welcome</a></p></section></main></html>`;
  return new Response(request.method==="HEAD"?null:html,{status:503,headers:{...headers,"Content-Type":"text/html; charset=utf-8"}});
}
