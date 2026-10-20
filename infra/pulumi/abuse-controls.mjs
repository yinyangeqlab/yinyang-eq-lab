// Counters use Cloudflare's in-memory rate-limit binding, never D1.
// No cookie, IP address, submitted content or counter key is logged here.
export const abuseBindings = [
  {name:'ADMISSION_LIMIT',type:'ratelimit',namespaceId:'80101',simple:{limit:720,period:60}},
  {name:'SIGNIN_LIMIT',type:'ratelimit',namespaceId:'80102',simple:{limit:10,period:60}},
  {name:'WRITE_IP_LIMIT',type:'ratelimit',namespaceId:'80103',simple:{limit:60,period:60}},
  {name:'WRITE_LISTENER_LIMIT',type:'ratelimit',namespaceId:'80104',simple:{limit:30,period:60}},
  {name:'MEDIA_LISTENER_LIMIT',type:'ratelimit',namespaceId:'80105',simple:{limit:300,period:60}},
  {name:'READ_LISTENER_LIMIT',type:'ratelimit',namespaceId:'80106',simple:{limit:180,period:60}},
];
const safe = method => method==='GET'||method==='HEAD'||method==='OPTIONS';
const signIn = path => ['/admin-login','/owner-login','/api/profile-access','/access'].includes(path);
export function bodyLimit(path) {
  // A 512 KB authenticated sync snapshot may expand when form URL-encoded.
  // The sync handler independently caps unsigned requests at 2 KB.
  if(path==='/sync'||path.startsWith('/devices/'))return 3_145_728;
  if(signIn(path)||path.startsWith('/__private/admin/'))return 2048;
  // Preserve the existing three-file measurement upload envelope and target exports.
  return path==='/api/research-measurements'?12_100_000:1_048_576;
}
function rejection(message,status=429) {
  return Response.json({error:message},{status,headers:{'Cache-Control':'private, no-store','Retry-After':'60','X-YinYang-Abuse-Guard':'1'}});
}
async function key(env,value) {
  if(typeof env.ABUSE_RATE_SECRET!=='string'||env.ABUSE_RATE_SECRET.length<32)throw Error('Abuse protection unavailable');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.ABUSE_RATE_SECRET+'\0'+value));
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function allow(env,name,value) {
  if(!env[name]?.limit)throw Error('Abuse protection unavailable');
  const result=await env[name].limit({key:await key(env,value)});
  if(typeof result?.success!=='boolean')throw Error('Abuse protection unavailable');
  return result.success;
}
export async function preDatabaseGuard(request,env,owner) {
  const path=new URL(request.url).pathname;
  if(!['GET','HEAD','OPTIONS','POST','PATCH','PUT','DELETE'].includes(request.method))return rejection('Method not allowed.',405);
  if(!safe(request.method)) {
    const length=request.headers.get('Content-Length');
    if(length!==null&&(!/^\d+$/.test(length)||Number(length)>bodyLimit(path)))return rejection('Request is too large.',413);
  }
  // A signed owner session bypasses listener limits, but not sign-in/body checks.
  if(owner&&!(signIn(path)&&request.method==='POST'))return null;
  const ip=request.headers.get('CF-Connecting-IP');
  if(!ip)return rejection('The trusted deployment edge is required.',503);
  if(!await allow(env,'ADMISSION_LIMIT','ip:'+ip))return rejection('Too many requests. Please wait a minute.');
  if(signIn(path)&&request.method==='POST') {
    if(!await allow(env,'SIGNIN_LIMIT','ip:'+ip))return rejection('Too many sign-in attempts. Please wait a minute.');
  }else if(!safe(request.method)) {
    if(!await allow(env,'WRITE_IP_LIMIT','ip:'+ip))return rejection('Too many submissions. Please wait a minute.');
  }
  // A replayed listener cookie gets the same counter across IPs. Check it
  // BEFORE the session lookup; a forged token still cannot gain access.
  const token=request.headers.get('Cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith('__Host-yinyangeq_tester='))?.slice('__Host-yinyangeq_tester='.length);
  if(/^[A-Za-z0-9_-]{43}$/.test(token||'') && !['/my-data','/api/my-data','/api/my-data/legacy','/api/my-data/retrospective'].includes(path)) {
    const name=!safe(request.method)?'WRITE_LISTENER_LIMIT':path.startsWith('/api/listening-audio/')||path.startsWith('/music/')?'MEDIA_LISTENER_LIMIT':'READ_LISTENER_LIMIT';
    if(!await allow(env,name,'credential:'+token))return rejection('Too many requests. Please wait a minute.');
  }
  return null;
}
export async function listenerGuard(request,env,subject) {
  const path=new URL(request.url).pathname;
  // Privacy controls and erasure remain reachable during listener throttling.
  if(['/my-data','/api/my-data','/api/my-data/legacy','/api/my-data/retrospective'].includes(path))return null;
  const name=!safe(request.method)?'WRITE_LISTENER_LIMIT':path.startsWith('/api/listening-audio/')||path.startsWith('/music/')?'MEDIA_LISTENER_LIMIT':'READ_LISTENER_LIMIT';
  return await allow(env,name,subject)?null:rejection(name==='MEDIA_LISTENER_LIMIT'?'Too many audio requests. Please wait a minute before trying playback again.':'Too many requests. Please wait a minute.');
}
export async function boundedBody(request) {
  if(safe(request.method)||!request.body)return request;
  const max=bodyLimit(new URL(request.url).pathname),reader=request.body.getReader(),chunks=[];
  let size=0;
  for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;
    if(size>max){await reader.cancel();return rejection('Request is too large.',413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.byteLength;}
  return new Request(request,{body:bytes});
}
