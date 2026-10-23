import { serveWorkerMedia } from "./media-route.mjs";
import { withMediaLength } from "./media-response.mjs";
import app from "./index.js";
import {readServiceStatus} from "./service-status.mjs";
import {featureMaintenanceResponse} from "./maintenance-options.mjs";
import { preDatabaseGuard, listenerGuard, boundedBody } from "./abuse-controls.mjs";
import { isPublicAsset } from "./public-assets.mjs";
import { invitesEnabled, testerSubject } from "./invite-settings.mjs";
import { browserPairing, linkedTester } from "./browser-pairing.mjs";
import { sharePageFor, shareHtml, isUnfurlCrawler } from "./share-pages.mjs";

const encoder = new TextEncoder();
const ownerCookie = "__Host-yinyangeq_owner";
const testerCookie = "__Host-yinyangeq_tester";
const ownerSeconds = 12 * 60 * 60;
const testerSeconds = 48 * 60 * 60;
const denied = "Admin access denied.";

function b64(bytes) { return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); }
function unb64(value) { const text = value.replaceAll("-", "+").replaceAll("_", "/"); return Uint8Array.from(atob(text.padEnd(Math.ceil(text.length / 4) * 4, "=")), char => char.charCodeAt(0)); }
function randomToken() { return b64(crypto.getRandomValues(new Uint8Array(32))); }
async function hash(value) { const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))); return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join(""); }
async function equal(actual, expected) { return typeof expected === "string" && expected.length >= 32 && Boolean(actual) && await hash(actual) === await hash(expected); }
function cookie(request, name) { return request.headers.get("Cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(name + "="))?.slice(name.length + 1) || ""; }
async function ownerKey(password) { return crypto.subtle.importKey("raw", encoder.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]); }
async function makeOwnerSession(password) {
  const message = `${Math.floor(Date.now() / 1000)}.${b64(crypto.getRandomValues(new Uint8Array(16)))}`;
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await ownerKey(password), encoder.encode(message)));
  return `${message}.${b64(signature)}`;
}
async function validOwnerSession(request, password) {
  const match = /^(\d+)\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/.exec(cookie(request, ownerCookie));
  if (!match) return false;
  const issued = Number(match[1]), now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(issued) || issued > now + 60 || now - issued > ownerSeconds) return false;
  try { return await crypto.subtle.verify("HMAC", await ownerKey(password), unb64(match[3]), encoder.encode(`${match[1]}.${match[2]}`)); }
  catch { return false; }
}
async function validTester(request, db, enabled) {
  const value = cookie(request, testerCookie);
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) return null;
  const tester = await db.prepare("SELECT id, label FROM private_tester_invites WHERE session_hash = ? AND redeemed_at IS NOT NULL AND revoked_at IS NULL AND session_expires_at > ? LIMIT 1").bind(await hash(value), Math.floor(Date.now() / 1000)).first() || await linkedTester(request, db);
  return enabled && tester?.id.startsWith("open-") ? null : tester;
}
// Separate, narrowly scoped cookie keeps deletion available after tester access expires.
const dataCookie = "__Host-yinyangeq_data";
const requiredDataNoticeVersion = "2026-10-18-v7";
const dataSeconds = 365 * 24 * 60 * 60;
async function dataSession(request, env, subject, linkedSessionHash = null) {
  const token = cookie(request, dataCookie);
  const tokenHash = /^[A-Za-z0-9_-]{43}$/.test(token) ? await hash(token) : "";
  const existing = tokenHash ? await env.DB.prepare("SELECT s.subject_id,a.submissions_enabled,a.agreement_version FROM privacy_sessions s JOIN privacy_accounts a ON a.subject_id=s.subject_id WHERE s.token_hash=? AND s.expires_at>?").bind(tokenHash, Date.now()).first() : null;
  if (existing && (!subject || existing.subject_id === subject)) return { subject: existing.subject_id, tokenHash, canParticipate:existing.submissions_enabled===1 && existing.agreement_version===requiredDataNoticeVersion, setCookie: null };
  // Only an authenticated safe navigation can create a fresh data session.
  if (!subject || request.method !== "GET") return null;
  const fresh = randomToken(), freshHash = await hash(fresh);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM privacy_sessions WHERE expires_at<=?").bind(Date.now()),
    env.DB.prepare("INSERT INTO privacy_accounts(subject_id) VALUES (?) ON CONFLICT(subject_id) DO NOTHING").bind(subject),
    linkedSessionHash
      ? env.DB.prepare("INSERT INTO privacy_sessions(token_hash,subject_id,expires_at) SELECT ?,?,expires_at*1000 FROM private_tester_devices WHERE session_hash=? AND expires_at>?").bind(freshHash,subject,linkedSessionHash,Math.floor(Date.now()/1000))
      : env.DB.prepare("INSERT INTO privacy_sessions(token_hash,subject_id,expires_at) VALUES (?,?,?)").bind(freshHash, subject, Date.now() + dataSeconds * 1000),
    // If a linked browser loses only its data cookie, replace its management
    // credential too so Disconnect still revokes every credential it issued.
    env.DB.prepare("DELETE FROM privacy_sessions WHERE token_hash IN (SELECT data_token_hash FROM private_tester_devices WHERE session_hash=?)").bind(await hash(cookie(request,testerCookie))),
    env.DB.prepare("UPDATE private_tester_devices SET data_token_hash=? WHERE session_hash=?").bind(freshHash,await hash(cookie(request,testerCookie))),
  ]);
  const freshSession = await env.DB.prepare("SELECT expires_at FROM privacy_sessions WHERE token_hash=?").bind(freshHash).first();
  // A concurrent Disconnect must not leave a newly issued management token.
  if (!freshSession) return null;
  const profile = await env.DB.prepare("SELECT submissions_enabled,agreement_version FROM privacy_accounts WHERE subject_id=?").bind(subject).first();
  return { subject, tokenHash: freshHash, canParticipate:profile?.submissions_enabled===1 && profile?.agreement_version===requiredDataNoticeVersion, setCookie: `${dataCookie}=${fresh}; Max-Age=${Math.max(0,Math.floor((freshSession.expires_at-Date.now())/1000))}; Path=/; Secure; HttpOnly; SameSite=Strict` };
}
function adminSignOut(request) {
  const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie" };
  if (request.method !== "POST") return new Response("Method not allowed.", { status: 405, headers: { ...headers, Allow: "POST" } });
  if (request.headers.get("Origin") !== new URL(request.url).origin) return new Response("Invalid origin.", { status: 403, headers });
  const response = new Response(null, { status: 303, headers: { ...headers, Location: "/" } });
  // End this browser's admin and data-management sessions without deleting saved tests.
  for (const name of [ownerCookie, dataCookie]) response.headers.append("Set-Cookie", `${name}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict`);
  return response;
}
function safeReturnTo(value, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try { const url = new URL(value, "https://return.invalid"); return url.origin === "https://return.invalid" ? `${url.pathname}${url.search}` : fallback; }
  catch { return fallback; }
}
function decodedReturnTo(value) { try { return safeReturnTo(decodeURIComponent(String(value || "/"))); } catch { return "/"; } }
const pageStyle = 'html{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#e9f1f2;font:16px/1.6 system-ui,sans-serif}main{box-sizing:border-box;min-width:0;width:calc(100% - 32px);max-width:550px;margin:16px;padding:clamp(16px,5vw,34px);border:1px solid #34434a;border-radius:16px;background:#101a20}h1{margin:0 0 16px;font-size:28px}p{color:#bdccd1}a{color:#79ddd1}form{display:grid;gap:12px;margin-top:24px}label{font-weight:600}input,button{box-sizing:border-box;min-width:0;max-width:100%;font:inherit;padding:12px;border-radius:8px}input{width:100%}input{background:#061016;border:1px solid #56727c;color:#fff}button{border:0;background:#58cbbb;color:#071115;font-weight:700;cursor:pointer}@media(min-width:2400px){html{--display-scale:1.15;zoom:var(--display-scale)}body{min-height:calc(100vh / var(--display-scale))}}@media(min-width:3200px){html{--display-scale:1.25}}@media(min-width:4800px){html{--display-scale:1.5}}';
function htmlResponse(body, status = 200) { return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>YinYang EQ access</title><style>${pageStyle}</style></head><body><main>${body}</main></body></html>`, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } }); }
function ownerLoginPage(error = "", status = error ? 401 : 200, enabled = false) { return htmlResponse(`<h1>Admin sign in</h1><p>Enter your admin password to open the private admin view.</p>${error ? `<p role="alert">${error}</p>` : ""}<form method="post" action="/admin-login"><label for="password">Admin password</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256"><button type="submit">Sign in</button></form>${enabled ? '<p><a href="/access">Approved listener sign in</a></p>' : '<p><a href="/">Welcome</a></p>'}`, status); }
async function ownerFormLogin(request, env, enabled) {
  const loginPage = (error, status) => ownerLoginPage(error, status, enabled);
  if (!(request.headers.get("Content-Type") || "").startsWith("application/x-www-form-urlencoded")) return loginPage("Use the sign-in form.");
  if (Number(request.headers.get("Content-Length") || 0) > 2048) return loginPage("The request is too large.");
  const now = Date.now(), windowMs = 15 * 60_000;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = `owner-login:${await hash(`${env.PRIVATE_ACCESS_PASSWORD}:${ip}`)}`;
  const bucket = Math.floor(now / windowMs);
  const rate = await env.DB.prepare("INSERT INTO public_write_limits (key, window_start, count, expires_at) VALUES (?, ?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN window_start = excluded.window_start THEN count + 1 ELSE 1 END, window_start = excluded.window_start, expires_at = excluded.expires_at RETURNING count").bind(key, bucket, (bucket + 2) * windowMs).first();
  if (!rate || rate.count > 10) return loginPage("Too many sign-in attempts. Try again in 15 minutes.", 429);
  const submitted = String((await request.formData()).get("password") || "");
  if (!(await equal(submitted, env.PRIVATE_ACCESS_PASSWORD))) return loginPage("That password was not recognized.");
  return new Response(null, { status: 303, headers: { Location: "/owner-research", "Cache-Control": "no-store", "Set-Cookie": `${ownerCookie}=${await makeOwnerSession(env.PRIVATE_ACCESS_PASSWORD)}; Max-Age=${ownerSeconds}; Path=/; Secure; HttpOnly; SameSite=Strict` } });
}
function page(detail, form = false, returnTo = "/") {
  const action = form
    ? `<form method="post" action="/access"><label for="code">One-time invitation code</label><input id="code" name="code" type="password" autocomplete="off" required minlength="32" maxlength="100"><input type="hidden" name="return_to" value="${encodeURIComponent(returnTo)}"><button type="submit">Sign in</button></form>`
    : '<p><a href="/access">I have an invitation code</a></p>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Approved listener sign in · YinYang EQ</title><style>${pageStyle}</style></head><body><main><h1>Approved listener sign in</h1><p>${detail}</p>${action}<p><a href="/sync">Already signed in elsewhere? Link this browser</a></p><p><a href="/admin-login">Admin sign in</a></p></main></body></html>`;
}
function privateResponse(status = 403, detail = denied, form = false, returnTo = "/") {
  return new Response(page(detail, form, returnTo), { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } });
}
function json(value, status = 200) { return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }); }
function sameOrigin(request) { return request.headers.get("Origin") === new URL(request.url).origin; }
async function redeem(request, db, layoutOnly = false) {
  // The one-time code is the only authority for this endpoint. Some private
  // browsers omit Origin on a normal form POST, so do not require that header.
  if (!(request.headers.get("Content-Type") || "").startsWith("application/x-www-form-urlencoded")) return privateResponse(400, "Use the invitation form.", true);
  if (Number(request.headers.get("Content-Length") || 0) > 2048) return privateResponse(413, "The invitation code is too long.", true);
  const form = await request.formData();
  const code = String(form.get("code") || "").trim();
  if (!/^[A-Za-z0-9_-]{43}$/.test(code)) return privateResponse(403, "This invitation code is invalid.", true);
  const now = Math.floor(Date.now() / 1000), session = randomToken();
  const result = await db.prepare("UPDATE private_tester_invites SET redeemed_at = ?, session_hash = ?, session_expires_at = ? WHERE code_hash = ? AND redeemed_at IS NULL AND revoked_at IS NULL AND code_expires_at > ? AND (?=0 OR id='layout-test-only')").bind(now, await hash(session), now + testerSeconds, await hash(code), now,layoutOnly?1:0).run();
  if (result.meta.changes !== 1) return privateResponse(403, "This invitation is invalid, expired, or already used on another browser.", true);
  const response = new Response(null, { status: 303, headers: { Location: layoutOnly ? "/participation?review=1&return_to=/preference-tuning" : decodedReturnTo(form.get("return_to")), "Cache-Control": "no-store", "Set-Cookie": `${testerCookie}=${session}; Max-Age=${testerSeconds}; Path=/; Secure; HttpOnly; SameSite=Strict` } });
  if(layoutOnly)for(const name of [ownerCookie,dataCookie])response.headers.append("Set-Cookie",`${name}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict`);
  return response;
}
async function admin(request, env, path) {
  if (path === "/__private/admin/invite-system") {
    if (request.method === "GET") return json({enabled: await invitesEnabled(env.DB)});
    if (request.method !== "PATCH") return json({error: "Method not allowed."}, 405);
    if (!sameOrigin(request)) return json({error: "Invalid origin."}, 403);
    const body = await request.json().catch(() => null);
    if (typeof body?.enabled !== "boolean") return json({error: "Choose whether invitations are enabled."}, 400);
    await env.DB.prepare("INSERT INTO site_access_settings(id,invites_enabled) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET invites_enabled=excluded.invites_enabled").bind(body.enabled ? 1 : 0).run();
    return json({enabled: body.enabled});
  }
  if (!await invitesEnabled(env.DB)) return json({error: "Not found."}, 404);
  const db = env.DB;
  if (request.method === "GET" && path === "/__private/admin/invites") {
    const result = await db.prepare("SELECT id, label, created_at, code_expires_at, redeemed_at, session_expires_at, revoked_at FROM private_tester_invites WHERE id NOT LIKE 'open-%' AND NOT EXISTS(SELECT 1 FROM owner_public_profiles p WHERE p.invite_id=private_tester_invites.id) ORDER BY created_at DESC LIMIT 200").all();
    return json({ invites: result.results });
  }
  if (request.method === "POST" && path === "/__private/admin/invites") {
    if (!sameOrigin(request)) return json({ error: "Invalid origin." }, 403);
    if (Number(request.headers.get("Content-Length") || 0) > 2048) return json({ error: "Request too large." }, 413);
    const body = await request.json().catch(() => null);
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    if (!label || label.length > 80) return json({ error: "Enter a tester name or label (up to 80 characters)." }, 400);
    const id = crypto.randomUUID(), code = randomToken(), now = Math.floor(Date.now() / 1000);
    await db.prepare("INSERT INTO private_tester_invites (id, label, code_hash, created_at, code_expires_at) VALUES (?, ?, ?, ?, ?)").bind(id, label, await hash(code), now, now + testerSeconds).run();
    return json({ id, label, code, codeExpiresAt: now + testerSeconds }, 201);
  }
  const change = /^\/__private\/admin\/invites\/([a-f0-9-]{36})(\/revoke)?$/.exec(path);
  if(change && await db.prepare("SELECT 1 FROM owner_public_profiles WHERE invite_id=?").bind(change[1]).first())return json({error:"Use the dedicated YinYangEQ device controls for this account."},409);
  if (request.method === "POST" && change?.[2] === "/revoke") {
    if (!sameOrigin(request)) return json({ error: "Invalid origin." }, 403);
    const result = await db.prepare("UPDATE private_tester_invites SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL").bind(Math.floor(Date.now() / 1000), change[1]).run();
    return result.meta.changes === 1 ? json({ revoked: true }) : json({ error: "Invitation not found or already revoked." }, 404);
  }
  if (request.method === "DELETE" && change && !change[2]) {
    if (!sameOrigin(request)) return json({ error: "Invalid origin." }, 403);
    const result = await db.prepare("DELETE FROM private_tester_invites WHERE id = ?").bind(change[1]).run();
    return result.meta.changes === 1 ? json({ deleted: true }) : json({ error: "Invitation not found." }, 404);
  }
  return json({ error: "Not found." }, 404);
}
const privateGate = {
  async fetch(request, env, context) {
    const url = new URL(request.url), path = url.pathname;
    // Link-preview crawlers (Discord, Slack, iMessage...) cannot sign in, so gated
    // pages would redirect them to a generic page. Answer with public copy only:
    // no session, no database, no app content.
    if ((request.method === "GET" || request.method === "HEAD") && isUnfurlCrawler(request.headers.get("User-Agent"))) {
      const page = sharePageFor(path, url.search);
      if (page) return new Response(request.method === "HEAD" ? null : shareHtml(page, { pathname: page.path }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300", "Vary": "User-Agent", ...(page.private ? { "X-Robots-Tag": "noindex, nofollow" } : {}) } });
    }
    const publicLandingAsset = isPublicAsset(path);
    const publicProfile = path === "/listeners/yinyangeq" || path === "/api/public-profiles/yinyangeq" || /^\/api\/public-profiles\/yinyangeq\/files\/[a-f0-9-]{36}\/(single|left|right|curve|export)$/.test(path);
    if ((request.method === "GET" || request.method === "HEAD") && (path === "/" || path === "/privacy" || path === "/curve-credits" || path === "/version" || path === "/shortcuts" || path === "/api/maintenance" || path === "/listeners/yinyangeq" || path === "/api/public-profiles/yinyangeq" || /^\/api\/public-profiles\/yinyangeq\/files\/[a-f0-9-]{36}\/(single|left|right|curve|export)$/.test(path) || publicLandingAsset)) {
      if (publicLandingAsset) return env.ASSETS.fetch(request);
      if(publicProfile){const limited=await preDatabaseGuard(request,env,false);if(limited)return limited;}
      const headers = new Headers(request.headers);
      for (const name of ["oai-authenticated-user-id", "oai-authenticated-user-email", "oai-authenticated-user-full-name", "oai-authenticated-user-full-name-encoding", "x-yinyang-data-session"]) headers.delete(name);
      return app.fetch(new Request(request, { headers }), env, context);
    }
    const password = env.PRIVATE_ACCESS_PASSWORD;
    if (typeof password !== "string" || password.length < 32 || !env.DB) return new Response("Private access is not configured.", { status: 503, headers: { "Cache-Control": "no-store" } });
    try {
      const hasOwnerSession = await validOwnerSession(request, password);
      const admission = await preDatabaseGuard(request, env, hasOwnerSession);
      if(admission)return admission;
      if(path==="/admin-logout")return adminSignOut(request);
      if(path==="/api/admin-session"){
        if(!["GET","HEAD"].includes(request.method))return json({error:"Method not allowed."},405);
        // Only the validated host-only admin cookie controls this indicator.
        const issued=hasOwnerSession?Number(cookie(request,ownerCookie).split(".")[0]):null;
        return Response.json({admin:hasOwnerSession,expiresAt:issued===null?null:(issued+ownerSeconds)*1000},{headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});
      }
      if(request.method !== "GET" && request.method !== "HEAD" && (hasOwnerSession || ["/access","/admin-login","/owner-login"].includes(path))) {
        const bounded=await boundedBody(request);if(bounded instanceof Response)return bounded;request=bounded;
      }
      const enabled = await invitesEnabled(env.DB);
      if (path === "/api/invite-system" && request.method === "GET") return json({enabled});
      if ((path === "/owner-login" || path === "/admin-login") && request.method === "POST") return await ownerFormLogin(request, env, enabled);
      if ((path === "/owner-login" || path === "/admin-login") && !hasOwnerSession) return request.method === "GET" ? ownerLoginPage("", 200, enabled) : new Response(null, { status: 405 });
      if ((path === "/owner-login" || path === "/admin-login")) return new Response(null, { status: 303, headers: { Location: "/owner-research", "Cache-Control": "no-store" } });
      // The tester session is host-only. Redirect www to the canonical apex before invite redemption.
      const canonical = new URL(env.CANONICAL_ORIGIN || "https://yinyangeq.com");
      if (canonical.protocol !== "https:" || canonical.pathname !== "/" || canonical.username || canonical.password || canonical.search || canonical.hash) throw new Error("Invalid canonical origin");
      if (url.hostname === `www.${canonical.hostname}` && !hasOwnerSession) return Response.redirect(`${canonical.origin}${url.pathname}${url.search}`, 307);
      const owner = hasOwnerSession;
      if (path.startsWith("/__private/admin/")) return owner ? await admin(request, env, path) : json({ error: denied }, 403);
      // This form can redeem only the pre-provisioned hidden fixture identity.
      // No account creation or admin credentials are exposed through this route.
      if(path==="/access"&&url.searchParams.get("test")==="consent"){
        if(owner)return json({error:"Use an isolated browser without an admin session."},403);
        if(request.method==="POST")return redeem(request,env.DB,true);
        if(request.method!=="GET")return json({error:"Method not allowed."},405);
        return htmlResponse('<h1>Isolated consent test sign in</h1><p>Private test account only. No research, rankings, votes, monitoring or Sync contributions. Enter the short-lived one-use fixture code.</p><form method="post" action="/access?test=consent"><label for="test-code">One-use test code</label><input id="test-code" name="code" type="password" autocomplete="off" required maxlength="43"><button type="submit">Use isolated consent test account</button></form>');
      }
      if (path === "/access" && !enabled) return new Response(null, {status: 303, headers: {Location: "/shootout", "Cache-Control": "no-store"}});
      if (path === "/access") {
        if (request.method === "POST") return await redeem(request, env.DB);
        return request.method === "GET" ? privateResponse(200, "Enter your approved invitation code to submit votes and other contributions. Your browser stays signed in for 48 hours.", true, safeReturnTo(url.searchParams.get("return_to"))) : privateResponse(405);
      }
      // Device grants use their own one-use credential and cannot inherit admin headers.
      if(path==="/profile-access"||path==="/api/profile-access"){
        if(!["GET","HEAD","POST"].includes(request.method)||path==="/profile-access"&&request.method==="POST")return json({error:"Method not allowed."},405);
        const bounded=request.method==="POST"?await boundedBody(request):request;if(bounded instanceof Response)return bounded;
        const clean=new Headers(bounded.headers);for(const name of ["authorization","oai-authenticated-user-id","oai-authenticated-user-email","oai-authenticated-user-full-name","oai-authenticated-user-full-name-encoding","x-yinyang-data-session"])clean.delete(name);
        return app.fetch(new Request(bounded,{headers:clean}),env,context);
      }
      let tester = owner ? null : await validTester(request, env.DB, enabled);
      if(tester?.id==="layout-test-only" && !["GET","HEAD","OPTIONS"].includes(request.method) && !(path==="/api/my-data"&&request.method==="PATCH"))return json({error:"Private test account: submissions, uploads, sync and public contributions are disabled."},403);
      if(tester?.id==="layout-test-only" && (path==="/sync" || path==="/pair" || path.startsWith("/devices"))) return htmlResponse('<h1>Private test account</h1><p>Browser Sync is unavailable for this hidden test account. Its local tests stay in this browser and cannot be copied into a participant account.</p><p><a href="/test-history">Review local test history</a></p><p><a href="/shootout/personal">Return to Personal Tournament</a></p>',403);
      // Open access still uses host-only credentials and the existing ownership,
      // consent, erasure and sync tables. No usable invitation code is created.
      let accessCookie = null;
      const syncReceive = path === "/pair" || path === "/pair/reset" || path === "/sync" && (url.searchParams.get("receive") === "1" || request.method !== "GET");
      const adminPath = path === "/owner-research" || path.startsWith("/api/owner-research");
      const communityManagement=path==="/api/community-preferences/personal"&&["GET","HEAD","PATCH"].includes(request.method);
      const managementOnly = ["/my-data", "/api/my-data", "/api/my-data/legacy", "/api/my-data/retrospective", "/api/my-data/yinyangeq-link", "/my-profile", "/api/my-profile", "/api/my-profile/sync", "/api/my-profile/devices", "/account-sync"].includes(path) && cookie(request, dataCookie) || communityManagement && cookie(request,dataCookie);
      if (!enabled && !owner && !tester && request.method === "GET" && !path.startsWith("/api/") && !path.startsWith("/music/") && !path.startsWith("/devices") && !adminPath && !syncReceive && !managementOnly) {
        const id = `open-${crypto.randomUUID()}`, session = randomToken(), now = Math.floor(Date.now()/1000);
        await env.DB.prepare("INSERT INTO private_tester_invites(id,label,code_hash,created_at,code_expires_at,redeemed_at,session_hash,session_expires_at) VALUES(?,?,?,?,?,?,?,?)").bind(id,"Listener",await hash(randomToken()),now,now,now,await hash(session),now+dataSeconds).run();
        tester = {id, label: "Listener"};
        accessCookie = `${testerCookie}=${session}; Max-Age=${dataSeconds}; Path=/; Secure; HttpOnly; SameSite=Strict`;
        const headers = new Headers(request.headers);
        headers.set("Cookie", [...(request.headers.get("Cookie") || "").split(";").filter(part => !part.trim().startsWith(testerCookie + "=")), `${testerCookie}=${session}`].filter(Boolean).join("; "));
        request = new Request(request, {headers});
      }
      // Carry a newly issued access cookie through every response, including
      // consent redirects and sync. Only this synthetic cookie is captured.
      const finish = response => {
        if (!accessCookie) return response;
        const result = new Response(response.body, response);
        result.headers.append("Set-Cookie", accessCookie);
        return result;
      };
      if (path === "/sync" || path === "/pair" || path === "/pair/reset" || path === "/devices" || path.startsWith("/devices/")) return finish(await browserPairing(request, env, tester, owner, enabled));

      if(tester){const limited=await listenerGuard(request,env,testerSubject(tester.id));if(limited)return limited;}
      if(tester && request.method!=="GET" && request.method!=="HEAD") {
        const bounded=await boundedBody(request);if(bounded instanceof Response)return bounded;request=bounded;
      }
      const dataRoute = ["/my-data", "/api/my-data", "/api/my-data/legacy", "/api/my-data/retrospective", "/api/my-data/yinyangeq-link", "/my-profile", "/api/my-profile", "/api/my-profile/sync", "/api/my-profile/devices", "/account-sync"].includes(path) || communityManagement;
      const data = (owner || tester || dataRoute) ? await dataSession(request, env, owner ? "owner" : tester ? testerSubject(tester.id) : null, tester?.linkedSessionHash) : null;
      // Management-only cookies remain isolated after the tester session expires.
      if(data?.subject==="invite:layout-test-only"&&!tester){
        if(!["GET","HEAD","OPTIONS"].includes(request.method))return json({error:"Sign in again with the isolated test account before saving consent."},403);
        if(path.includes("sync")||path.includes("devices"))return json({error:"Sync is disabled for the isolated test account."},403);
      }
      if (path === "/home" && (request.method === "GET" || request.method === "HEAD")) {
        const redirect = new Response(null, { status: 303, headers: { Location: "/", "Cache-Control": "no-store" } });
        if(data?.setCookie) redirect.headers.append("Set-Cookie",data.setCookie);
        return finish(redirect);
      }
      if (!owner && path === "/owner-research") return Response.redirect(new URL("/admin-login", request.url), 303);
      if (!owner && path.startsWith("/api/owner-research")) return json({ error: "Admin access denied." }, 403);
      if (!owner && !tester && !((path === "/my-data" && request.method === "GET") || dataRoute && data)) {
        if (path.startsWith("/api/") || path.startsWith("/music/") || request.method !== "GET" && request.method !== "HEAD") return json({ error: enabled ? "Sign in with an approved invitation to use this site." : "Open Shootout to start this browser session." }, 401);
        const signIn = new URL(enabled ? "/access" : "/shootout", request.url);
        signIn.searchParams.set("return_to", `${url.pathname}${url.search}`);
        return new Response(null, { status: 303, headers: { Location: signIn.toString(), "Cache-Control": "no-store" } });
      }
      const agreementException = dataRoute || ["/shootout","/participation"].includes(path) && (request.method === "GET" || request.method === "HEAD") || owner && (path === "/owner-research" || path.startsWith("/api/owner-research"));
      if (!owner && tester && !data?.canParticipate && !agreementException) {
        const blocked = path.startsWith("/api/") || path.startsWith("/music/") || request.method !== "GET" && request.method !== "HEAD"
          ? json({ error:"Agreement to comparison-data collection is required. Review the notice at /participation; My data remains available for withdrawal and deletion." },403)
          : new Response(null,{status:303,headers:{Location:"/participation?return_to="+encodeURIComponent(url.pathname),"Cache-Control":"no-store"}});
        if(data?.setCookie) blocked.headers.append("Set-Cookie",data.setCookie);
        return finish(blocked);
      }
      if (!owner && (["/shootout","/music-library","/preference-tuning","/personal-tuning"].includes(path.replace(/\/$/,"")) || path.startsWith("/shootout/") || !["GET","HEAD","OPTIONS"].includes(request.method) && !dataRoute)) {
        const paused = featureMaintenanceResponse(request, await readServiceStatus());
        if (paused) { if(data?.setCookie)paused.headers.append("Set-Cookie",data.setCookie); return finish(paused); }
      }
      const headersForApp = new Headers(request.headers);
      for (const name of ["oai-authenticated-user-id", "oai-authenticated-user-email", "oai-authenticated-user-full-name", "oai-authenticated-user-full-name-encoding", "x-yinyang-data-session"]) headersForApp.delete(name);
      if (owner || tester) {
        headersForApp.set("oai-authenticated-user-id", owner ? "owner" : testerSubject(tester.id));
        headersForApp.set("oai-authenticated-user-full-name", encodeURIComponent(owner ? "Owner" : tester.label));
        headersForApp.set("oai-authenticated-user-full-name-encoding", "percent-encoded-utf-8");
      }
      if (data) headersForApp.set("x-yinyang-data-session", data.tokenHash);
      if (owner && path.startsWith("/api/owner-research")) headersForApp.set("Authorization", `Bearer ${env.OWNER_ANALYTICS_TOKEN}`);
      const appRequest = new Request(request, { headers: headersForApp });
      // This cache is consulted only AFTER owner/tester validation. Cache only
      // aggregate rankings; never research records, music, HTML or auth responses.
      const rankingCache = typeof caches !== "undefined" ? caches.default : null;
      let rankingKey = new Request(`${url.origin}/__internal/ranking-cache/v3-participant-only`);
      const cacheRanking = request.method === "GET" && path === "/api/research" && env.MAINTENANCE_MODE !== "true";
      if (cacheRanking && rankingCache) {
        // Revision keys prevent stale results after erasure across cache locations
        // and prevent an in-flight old computation from repopulating the new key.
        const version=await env.DB.prepare("SELECT revision FROM ranking_revision WHERE id=1").first();
        if(!version) throw new Error("Ranking revision unavailable");
        rankingKey=new Request(`${url.origin}/__internal/ranking-cache/v3-participant-only/${version.revision}`);
        try {
          const cached = await rankingCache.match(rankingKey);
          if (cached) { const hit=rankingResponse(cached, "HIT"); if(data?.setCookie) hit.headers.append("Set-Cookie",data.setCookie); return hit; }
        } catch { console.warn("ranking_cache_read_failed"); }
      }
      const response = path.startsWith("/api/listening-audio/") ? await serveWorkerMedia(request, env) : path.startsWith("/_next/static/") || path.startsWith("/music/shantae/") ? await env.ASSETS.fetch(request) : await app.fetch(appRequest, env, context);
      if (cacheRanking && response.status === 200 && rankingCache) {
        const cached = new Response(response.clone().body, { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=30" } });
        context.waitUntil(rankingCache.put(rankingKey, cached).catch(() => console.warn("ranking_cache_write_failed")));
        const miss=rankingResponse(response, "MISS"); if(data?.setCookie) miss.headers.append("Set-Cookie",data.setCookie); return miss;
      }
      if (rankingCache && response.ok && request.method === "POST" && ["/api/votes", "/api/listening-runs", "/api/owner-research/legacy", "/api/targets", "/api/owner-research/moderation", "/api/owner-research/erasure"].includes(path)) {
        try { await rankingCache.delete(rankingKey); } catch { console.warn("ranking_cache_invalidation_failed"); }
      }
      if (rankingCache && response.ok && request.method === "DELETE" && path === "/api/my-data") {
        try { await rankingCache.delete(rankingKey); } catch { console.warn("ranking_cache_invalidation_failed"); }
      }
      if (data?.setCookie) { const result = new Response(response.body, response); result.headers.append("Set-Cookie", data.setCookie); return finish(result); }
      return finish(response);
    } catch {
      // Keep credentials, invitation codes, cookies and request bodies out of logs.
      console.error("private_gate_request_failed");
      return new Response("Private access is temporarily unavailable.", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
    }
  },
};

// Diagnostics for verifying selective routing without logging visitor data.
// Direct static delivery never executes this wrapper and has no such header.
export default {
  async fetch(request, env, context) {
    const response = await privateGate.fetch(request, env, context);
    const headers = new Headers(response.headers);
    headers.set("X-YinYang-Worker", "1");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    if (!headers.has("Referrer-Policy")) headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (headers.get("Content-Type")?.includes("text/html")) headers.append("Content-Security-Policy", "frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    return withMediaLength(request, new Response(response.body, { status: response.status, statusText: response.statusText, headers }));
  },
};

function rankingResponse(response, state) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Ranking-Cache", state);
  return new Response(response.body, { status: response.status, headers });
}
