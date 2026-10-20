import { testerSubject } from "./invite-settings.mjs";
import { browserSyncScript, validateSyncPayload, SYNC_MAX_BYTES } from "./browser-sync.mjs";
// Browser linking runs at the private gate, before application access is granted.
// All times here are epoch seconds (privacy_sessions uses milliseconds).
const testerCookie = "__Host-yinyangeq_tester", pairingCookie = "__Host-yinyangeq_pairing", dataCookie = "__Host-yinyangeq_data";
const encoder = new TextEncoder();
const nowSeconds = () => Math.floor(Date.now() / 1000);
const b64 = bytes => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
const token = () => b64(crypto.getRandomValues(new Uint8Array(32)));
const digest = async value => new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
export const pairingHash = async value => Array.from(await digest(value), byte => byte.toString(16).padStart(2, "0")).join("");
const cookie = (request, name) => request.headers.get("Cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith(name + "="))?.slice(name.length + 1) || "";
const escape = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const form = (action, content, text) => {
  const name = action.startsWith('/devices/') ? action.slice(9) : 'claim';
  return `<form method="post" action="/sync" data-action="${name}">${hidden('action',name)}${name==='create'?hidden('payload',''):''}${content}<button type="submit">${text}</button></form>`;
};
const hidden = (name, value) => `<input type="hidden" name="${name}" value="${escape(value)}">`;
const setCookie = (name, value, seconds) => `${name}=${value}; Max-Age=${seconds}; Path=/; Secure; HttpOnly; SameSite=Strict`;
function renderPage(content, status = 200, refresh = false, invites = true) {
  const nonce=token();
  // Keep same-origin form Origin headers usable for CSRF checks. A no-referrer
  // policy made Chromium submit these navigation POSTs with Origin: null.
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">${refresh ? '<meta http-equiv="refresh" content="10">' : ""}<title>Sync browsers · YinYang EQ</title><style>html{color-scheme:dark}body{margin:0;background:#050c10;color:#e9f1f2;font:16px/1.6 system-ui,sans-serif}main{max-width:650px;margin:40px auto;padding:24px}p{color:#b7cbd2}a{color:#85e1d3}form,article{margin:20px 0;padding:18px;border:1px solid #40575f;border-radius:12px}label{display:block}input,button{font:inherit;padding:12px;margin:8px 0;border-radius:7px;max-width:100%;box-sizing:border-box}input{background:#0b1920;color:white;border:1px solid #6c8b96}button{background:#83e1d0;color:#05201c;border:0;cursor:pointer}code{font-size:1.6rem;letter-spacing:.12em;overflow-wrap:anywhere}nav{display:flex;gap:20px;flex-wrap:wrap}.sync-warning{border-color:#bf9954;background:#241e12}input[type=checkbox]{width:20px;height:20px;vertical-align:middle;margin-right:8px}#sync-error{padding:14px;border:1px solid #bf7575;color:#ffd8d8}@media(min-width:2400px){html{--display-scale:1.15;zoom:var(--display-scale)}body{min-height:calc(100vh / var(--display-scale))}}@media(min-width:3200px){html{--display-scale:1.25}}@media(min-width:4800px){html{--display-scale:1.5}}</style></head><body><main><nav><a href="/shootout">Shootout</a><a href="/my-data">My data</a>${invites ? '<a href="/access">Invitation sign in</a>' : ""}</nav>${content}<p id="sync-error" role="alert" hidden></p><script nonce="${nonce}">${browserSyncScript()}</script></main></body></html>`, {status, headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Referrer-Policy":"strict-origin","X-Content-Type-Options":"nosniff","Content-Security-Policy":`default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`}});
}
const redirect = () => new Response(null, {status:303,headers:{Location:"/sync","Cache-Control":"no-store"}});
async function limited(db, key, maximum) {
  const now = Date.now(), window = Math.floor(now / 900_000);
  const row = await db.prepare("INSERT INTO public_write_limits(key,window_start,count,expires_at) VALUES(?,?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_start=excluded.window_start THEN count+1 ELSE 1 END,window_start=excluded.window_start,expires_at=excluded.expires_at RETURNING count").bind(key,window,(window+2)*900_000).first();
  return !row || row.count > maximum;
}
export async function linkedTester(request, db) {
  const value = cookie(request,testerCookie);
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) return null;
  return db.prepare("SELECT i.id,i.label,d.session_hash AS linkedSessionHash FROM private_tester_devices d JOIN private_tester_invites i ON i.id=d.invite_id WHERE d.session_hash=? AND d.expires_at>? AND i.revoked_at IS NULL AND i.redeemed_at IS NOT NULL AND i.session_expires_at>? LIMIT 1").bind(await pairingHash(value),nowSeconds(),nowSeconds()).first();
}
export async function browserPairing(request, env, tester, isOwner=false, invites=true) {
  const page = (content, status = 200, refresh = false) => renderPage(content.replace("Access still ends with the invitation.", invites ? "Access still ends with the invitation." : "Access uses a secure browser credential."), status, refresh, invites);
  if(isOwner)return page('<h1>Use a tester browser for syncing</h1><p>Admin access cannot be shared through browser sync. Open another browser profile with your tester sign-in.</p>',403);
  const url = new URL(request.url), db = env.DB, now = nowSeconds();
  let path=url.pathname, action="";
  const json=(value,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
  if (!['GET','POST'].includes(request.method)) return page("<h1>Method not allowed</h1>",405);
  let fields;
  if (request.method === 'POST') {
    if (request.headers.get('Origin') !== new URL(request.url).origin) return page("<h1>Invalid origin</h1>",403);
    const contentType=request.headers.get('Content-Type') || '';
    if (!contentType.startsWith('application/x-www-form-urlencoded') && !contentType.startsWith('application/json')) return page("<h1>Use the browser sync form</h1>",400);
    // Bound the stream as well as Content-Length; never parse an unbounded body.
    const reader = request.body?.getReader(); let body = '', size = 0; const decoder=new TextDecoder(); const maxBody=tester ? SYNC_MAX_BYTES*6 : 2048;
    if (reader) { while (true) {const {done,value} = await reader.read(); if (done) break; size += value.byteLength; if(size > maxBody) {await reader.cancel(); return page('<h1>Request too large</h1>',413);} body += decoder.decode(value,{stream:true}); } }
    body+=decoder.decode();
    try { fields = contentType.startsWith('application/json') ? new Map(Object.entries(JSON.parse(body))) : new URLSearchParams(body); }
    catch {return json({error:'Invalid request.'},400);}
    action=fields.get('action') || '';
  }
  if (path==='/sync') {
    if(request.method==='GET') path=url.searchParams.get('reset')==='1'?'/pair/reset':tester && url.searchParams.get('receive')!=='1'?'/devices':'/pair';
    else if(['create','approve','cancel','revoke'].includes(action)) path='/devices/'+action;
    else if(['claim','download','complete'].includes(action)) path='/pair';
    else return json({error:'Choose a sync action.'},400);
  }
  if (path.startsWith('/devices')) {
    if (!tester) return page('<h1>Sign in on this browser first</h1><p>Use the original approved browser to create and approve a link. Admin sign-in cannot be shared this way.</p>',403);
    const sourceHash = await pairingHash(cookie(request,testerCookie));
    if (request.method === 'POST') {
      if (await limited(db,`pair-source:${tester.id}`,20)) return page('<h1>Too many linking attempts</h1><p>Try again in 15 minutes.</p>',429);
      if (path === '/devices/create') {
        if (await limited(db,`pair-create:${tester.id}`,5)) return page('<h1>Too many new codes</h1><p>Try again in 15 minutes.</p>',429);
        const bytes = crypto.getRandomValues(new Uint8Array(10)), alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        // 32 symbols, ten random characters: 50 bits of code entropy.
        const code = Array.from(bytes, n => alphabet[n & 31]).join('');
        const codeHash = await pairingHash(code);
        let transferPayload=null,payloadHash=null;
        try {
          if(fields.get('payload')) transferPayload=JSON.stringify(validateSyncPayload(JSON.parse(fields.get('payload'))));
          else if(url.pathname==='/sync') throw Error('Browser data could not be read. Enable JavaScript and try again.');
          if(transferPayload)payloadHash=await pairingHash(transferPayload);
        } catch(cause) {return page(`<h1>Sync could not start</h1><p>${escape(cause.message)}</p><p><a href="/sync">Return to Sync browsers</a></p>`,400);}
        await db.batch([
          db.prepare('DELETE FROM browser_pairings WHERE expires_at<=? OR source_hash=?').bind(now,sourceHash),
          db.prepare('INSERT INTO browser_pairings(code_hash,invite_id,source_hash,created_at,expires_at,transfer_payload,payload_hash) VALUES(?,?,?,?,?,?,?)').bind(codeHash,tester.id,sourceHash,now,now+600,transferPayload,payloadHash),
        ]);
        return page(`<h1>Sync browsers</h1><p>Open this same page on your other browser: <strong>${escape(url.origin)}/sync</strong>. Enter this code there:</p><p><code>${code.slice(0,5)}-${code.slice(5)}</code></p><p>Expires in 10 minutes. Only link your own browser. The receiving browser must agree to replace its saved site data. After entering the code there, return here to compare the confirmation number.</p><p><a href="/sync">Check for the other browser →</a></p>`);
      }
      if (path === '/devices/approve' || path === '/devices/cancel') {
        const key = fields.get('pairing') || '';
        if (!/^[a-f0-9]{64}$/.test(key)) return page('<h1>Invalid request</h1>',400);
        const result = await db.prepare("UPDATE browser_pairings SET transfer_payload=CASE WHEN ?='cancelled' THEN NULL ELSE transfer_payload END,state=? WHERE code_hash=? AND invite_id=? AND source_hash=? AND expires_at>? AND state IN ('waiting','claimed','approved') AND (?='cancelled' OR (state='claimed' AND confirmation=?))").bind(path.endsWith('/approve')?'approved':'cancelled',path.endsWith('/approve')?'approved':'cancelled',key,tester.id,sourceHash,now,path.endsWith('/approve')?'approved':'cancelled',fields.get('confirmation') || '').run();
        if (result.meta.changes !== 1) return page('<h1>This request is no longer available</h1><p><a href="/sync">Return to linked browsers</a></p>',409);
        return redirect();
      }
      if (path === '/devices/revoke') {
        const key = fields.get('device') || '';
        await db.batch([
          db.prepare('DELETE FROM privacy_sessions WHERE token_hash IN (SELECT data_token_hash FROM private_tester_devices WHERE session_hash=? AND invite_id=?)').bind(key,tester.id),
          db.prepare('DELETE FROM browser_pairings WHERE (claim_hash=? OR source_hash=?) AND invite_id=?').bind(key,key,tester.id),
          db.prepare('DELETE FROM private_tester_devices WHERE session_hash=? AND invite_id=?').bind(key,tester.id),
        ]);
        return redirect();
      }
      return page('<h1>Unknown action</h1>',404);
    }
    if (path !== '/devices') return page('<h1>Unknown page</h1>',404);
    const pending = await db.prepare("SELECT code_hash,state,confirmation FROM browser_pairings WHERE source_hash=? AND invite_id=? AND expires_at>? AND state IN ('waiting','claimed','approved')").bind(sourceHash,tester.id,now).all();
    const devices = await db.prepare('SELECT session_hash,created_at,expires_at FROM private_tester_devices WHERE invite_id=? AND expires_at>? ORDER BY created_at DESC').bind(tester.id,now).all();
    return page(`<h1>Sync browsers</h1>${url.searchParams.get("linked")==="1"?'<p role="status">Sync finished. This browser now uses the original browser’s saved data and tester identity.</p>':""}<p>Open <strong>${escape(url.origin)}/sync</strong> on both browsers. This browser is signed in. Create a code here, enter it on your other browser, then compare the confirmation numbers.</p><p>Saved results, measurements, private targets, EQ settings and your browser identity will replace the receiving browser’s site data after confirmation. Creating a code temporarily sends this saved data to the private sync service.</p><p><a href="/sync?receive=1">Replace this browser’s data from another browser instead →</a></p>${form('/devices/create','','Create code to sync this browser')}<h2>Confirm the other browser</h2>${pending.results.map(row => `<article>${row.state==='claimed'?`<p>Compare this number with the number on your other browser:</p><code>${escape(row.confirmation)}</code>${form('/devices/approve',hidden('pairing',row.code_hash)+hidden('confirmation',row.confirmation),'Numbers match — approve this browser')}`:`<p>${row.state==='approved'?'Approved. Waiting for the other browser to finish.':'Waiting for the other browser to enter the code.'}</p>`}${form('/devices/cancel',hidden('pairing',row.code_hash),'Cancel request')}</article>`).join('') || '<p>No pending requests.</p>'}<p><a href="/sync">Refresh requests</a></p><h2>Additional browsers (${devices.results.length}/4)</h2>${devices.results.map(row=>`<article><p>Linked ${escape(new Date(row.created_at*1000).toLocaleString('en-US',{timeZone:'UTC'}))} UTC${row.session_hash===sourceHash?' · this browser':''}</p>${form('/devices/revoke',hidden('device',row.session_hash),'Disconnect this browser')}</article>`).join('') || '<p>No additional browsers linked.</p>'}<details><summary>What syncing shares</summary><p>Browsers share the same tester account, submitted data, privacy choices, deletion controls and browser voter identity. Sync copies saved site data once; later local edits are not continuously mirrored. Music files and unfinished tests stay on their original browser. Previous server submissions are not erased or reassigned. Any account activity-monitoring choice also applies to linked browsers. Access still ends with the invitation. The transfer is held privately for up to ten minutes of validity and cleared on completion or cancellation; expired transfers are purged when another code is created.</p><p>Disconnecting removes that browser’s site access and associated data-management session. It does not erase copies already transferred.</p></details>`);
  }
  if (path === '/pair/reset' && request.method === 'GET') {
    return new Response(null,{status:303,headers:{Location:'/sync','Cache-Control':'no-store','Set-Cookie':setCookie(pairingCookie,'',0)}});
  }
  if (path !== '/pair') return page('<h1>Unknown page</h1>',404);
  if (tester && !(url.pathname==='/sync' && (url.searchParams.get('receive')==='1' || ['claim','download','complete'].includes(action)))) return page('<h1>This browser is already signed in</h1><p><a href="/sync">Manage linked browsers</a></p>');
  let claimToken = cookie(request,pairingCookie), claimHash = /^[A-Za-z0-9_-]{43}$/.test(claimToken) ? await pairingHash(claimToken) : '';
  if (request.method === 'POST' && !['download','complete'].includes(action)) {
    // Hash network keys with the server secret; retain only the short-lived limiter key.
    const key = await pairingHash(`${env.PRIVATE_ACCESS_PASSWORD}:pair:${request.headers.get('CF-Connecting-IP') || 'unknown'}`);
    if (await limited(db,`pair-claim:${key}`,10)) return page('<h1>Too many code attempts</h1><p>Try again in 15 minutes.</p>',429);
    const code = String(fields.get('code') || '').toUpperCase().replace(/[ -]/g,'');
    if (!/^[A-Z2-9]{10}$/.test(code)) return page('<h1>Invalid code</h1><p><a href="/sync">Try again</a></p>',400);
    claimToken = token(); claimHash = await pairingHash(claimToken);
    const confirmation = String(new DataView((await digest(`confirm:${claimToken}`)).buffer).getUint32(0)%1_000_000).padStart(6,'0');
    const result = await db.prepare("UPDATE browser_pairings SET state='claimed',claim_hash=?,confirmation=?,replacement_accepted=? WHERE code_hash=? AND state='waiting' AND (payload_hash IS NULL OR ?=1) AND expires_at>? AND EXISTS(SELECT 1 FROM private_tester_invites i WHERE i.id=browser_pairings.invite_id AND i.revoked_at IS NULL AND i.session_expires_at>?)").bind(claimHash,confirmation,fields.get('replace')==='yes'?1:0,await pairingHash(code),fields.get('replace')==='yes'?1:0,now,now).run();
    if (result.meta.changes !== 1) return page('<h1>Code unavailable</h1><p>It may be expired or already used. Create a new code on your signed-in browser.</p><p><a href="/sync">Try another code</a></p>',409);
    const response = new Response(null,{status:303,headers:{Location:'/sync?receive=1','Cache-Control':'no-store'}});
    response.headers.append('Set-Cookie',setCookie(pairingCookie,claimToken,600)); return response;
  }
  if (!claimHash && ['download','complete'].includes(action)) return json({error:'Start a handshake on this browser first.'},401);
  if (!claimHash) return page(`<h1>Sync browsers</h1><p>Open this same page on the browser you already use: <strong>${escape(url.origin)}/sync</strong>. Create a code there and enter it below.</p><article class="sync-warning"><h2>This browser’s site data will be replaced</h2><p>Its saved results, measurements, private targets, EQ settings and browser identity will be replaced with the original browser’s data. Previous server submissions stay with their original account. Close other YinYang EQ tabs here before continuing.</p><p id="local-data-count"></p></article>${form('/pair','<label for="code">Code from your original browser</label><input id="code" name="code" required maxlength="11" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCDE-23456"><label><input type="checkbox" name="replace" value="yes" required> I understand and agree to replace this browser’s saved site data and use the original browser’s identity.</label>','Continue with handshake')}`);
  const row = await db.prepare('SELECT p.*,i.revoked_at,i.session_expires_at FROM browser_pairings p JOIN private_tester_invites i ON i.id=p.invite_id WHERE p.claim_hash=?').bind(claimHash).first();
  if (['download','complete'].includes(action) && (!row || row.expires_at<=now || row.revoked_at!==null || row.session_expires_at<=now || row.state==='cancelled')) return json({error:'This handshake expired or was cancelled. Create a new code.'},410);
  if (!row || row.expires_at<=now || row.revoked_at!==null || row.session_expires_at<=now || row.state==='cancelled') return page('<h1>Linking request ended</h1><p>Create a new code on the signed-in browser.</p><p><a href="/sync?reset=1">Start again</a></p>',410);
  if (['download','complete'].includes(action) && !['approved','consumed'].includes(row.state)) return json({error:'Wait for approval on the original browser.'},403);
  if (row.state === 'claimed') return page(`<h1>Compare these numbers</h1><p>On your original browser, stay on the same Sync browsers page and refresh requests. Approve only if both browsers show:</p><p><code>${escape(row.confirmation)}</code></p><p>This page checks for approval every 10 seconds until the request expires. Linking shares account privacy choices and access to submitted data and deletion controls. After approval, you can replace this browser’s saved site data and finish syncing. Music files are not copied.</p><p><a href="/sync?receive=1">Check now</a></p>`,200,true);
  if (row.state !== 'approved' && row.state !== 'consumed') return page('<h1>Request unavailable</h1>',409);
  if (row.payload_hash) {
    if (row.replacement_accepted!==1) return json({error:'Accept the replacement warning before syncing.'},403);
    if(action==='download') {
      if(!row.transfer_payload)return json({error:'This transfer was already used. Return to the tab where you started syncing and choose Finish sync.'},409);
      return json({payload:JSON.parse(row.transfer_payload)});
    }
    if(action!=='complete') return page(`<h1>Ready to sync</h1><p>The original browser approved this handshake.</p><article class="sync-warning"><h2>Replace this browser’s saved site data?</h2><p>Your saved results, measurements, private targets, EQ settings and browser identity will be replaced with the original browser’s data. This cannot be merged with your current local data. Close other YinYang EQ tabs here first.</p><p>Both browsers will use the same tester identity going forward. This copies saved data once; subsequent local changes are not automatically mirrored.</p></article><input id="sync-payload-hash" type="hidden" value="${row.payload_hash}"><button id="apply-sync" type="button">Replace saved data and finish sync</button>`);
    if(fields.get('payloadHash')!==row.payload_hash || fields.get('replacementApplied')!==true) return json({error:'Copy the approved browser data before finishing the handshake.'},400);
  } else if(['download','complete'].includes(action)) return json({error:'Create a new sync code on the original browser.'},409);
  const dataToken = b64(await digest(`pair-data:${claimToken}`)), dataHash = await pairingHash(dataToken);
  // INSERT SELECT enforces the device cap in the same write, including concurrent approvals.
  // Retry after a lost response reuses the same device and credentials; never extends expiry.
  await db.batch([
    db.prepare("INSERT INTO private_tester_devices(session_hash,invite_id,data_token_hash,created_at,expires_at) SELECT claim_hash,invite_id,?,?,MIN(?,(SELECT session_expires_at FROM private_tester_invites WHERE id=invite_id)) FROM browser_pairings WHERE claim_hash=? AND state='approved' AND expires_at>? AND EXISTS(SELECT 1 FROM private_tester_invites i WHERE i.id=invite_id AND i.revoked_at IS NULL AND i.session_expires_at>?) AND (SELECT count(*) FROM private_tester_devices d WHERE d.invite_id=browser_pairings.invite_id AND d.expires_at>?)<4 ON CONFLICT(session_hash) DO NOTHING").bind(dataHash,now,row.session_expires_at,claimHash,now,now,now),
    db.prepare('INSERT INTO privacy_accounts(subject_id) SELECT ? FROM private_tester_devices WHERE session_hash=? ON CONFLICT(subject_id) DO NOTHING').bind(testerSubject(row.invite_id),claimHash),
    db.prepare('INSERT INTO privacy_sessions(token_hash,subject_id,expires_at) SELECT data_token_hash,?,expires_at*1000 FROM private_tester_devices WHERE session_hash=? ON CONFLICT(token_hash) DO NOTHING').bind(testerSubject(row.invite_id),claimHash),
    db.prepare("UPDATE browser_pairings SET state='consumed',transfer_payload=NULL WHERE claim_hash=? AND EXISTS(SELECT 1 FROM private_tester_devices d WHERE d.session_hash=claim_hash)").bind(claimHash),
  ]);
  const device = await db.prepare('SELECT expires_at FROM private_tester_devices WHERE session_hash=?').bind(claimHash).first();
  if (!device && action==='complete') return json({error:'No browser slot is available, or this handshake was revoked. Disconnect an existing browser or create a new code.'},409);
  if (!device) return page('<h1>Browser could not be linked</h1><p>Up to four additional browsers can be linked. Disconnect one on your signed-in browser, or create a new code if this link was revoked.</p>',409);
  const response = action==='complete' ? json({ok:true,redirect:'/sync?linked=1'}) : new Response(null,{status:303,headers:{Location:'/sync?linked=1','Cache-Control':'no-store'}});
  response.headers.append('Set-Cookie',setCookie(testerCookie,claimToken,device.expires_at-now));
  response.headers.append('Set-Cookie',setCookie(dataCookie,dataToken,device.expires_at-now));
  response.headers.append('Set-Cookie',setCookie(pairingCookie,'',0)); return response;
}
