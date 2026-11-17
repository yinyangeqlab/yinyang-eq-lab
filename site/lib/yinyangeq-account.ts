import { RequestInputError } from "@/lib/request-json";
import { validateSyncPayload } from "@/lib/browser-sync.mjs";
export const PROFILE_SLUG="yinyangeq";
export const PROFILE_NAME="YinYangEQ";
export const PROFILE_CLAIM_COOKIE="__Host-yinyangeq_profile_claim";
const encoder=new TextEncoder();
export const profileHash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(value))),byte=>byte.toString(16).padStart(2,"0")).join("");
const base64=(value:Uint8Array)=>btoa(String.fromCharCode(...value)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
export const profileSecret=()=>base64(crypto.getRandomValues(new Uint8Array(32)));
const derived=async(secret:string,label:string)=>base64(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(`${label}:${secret}`))));
export type ProfileAccount={slug:string;subject_id:string;invite_id:string;policy_at:number;created_at:number};
export async function profileAccount(db:D1Database){return db.prepare("SELECT slug,subject_id,invite_id,policy_at,created_at FROM owner_public_profiles WHERE slug=?").bind(PROFILE_SLUG).first<ProfileAccount>();}
export function profileOrigin(request:Request){if(request.headers.get("Origin")!==new URL(request.url).origin)throw new RequestInputError("Invalid origin.",403);}
export function profileCookie(request:Request,name:string){return request.headers.get("Cookie")?.split(";").map(part=>part.trim()).find(part=>part.startsWith(name+"="))?.slice(name.length+1)||"";}
export const profileSetCookie=(name:string,value:string,seconds:number)=>`${name}=${value}; Max-Age=${seconds}; Path=/; Secure; HttpOnly; SameSite=Strict`;
export function profileLabel(value:unknown){const label=typeof value==="string"?value.trim():"";if(!label||label.length>60||/[\x00-\x1f\x7f]/.test(label))throw new RequestInputError("Use a device or snapshot label of 1–60 characters.",400);return label;}
export async function requireProfileAccount(db:D1Database){const profile=await profileAccount(db);if(!profile)throw new RequestInputError("Create the YinYangEQ participant identity in the admin console first.",409);return profile;}
export async function createProfileAccount(db:D1Database){
 const existing=await profileAccount(db);if(existing)return existing;
 const now=Date.now(),seconds=Math.floor(now/1000),invite=crypto.randomUUID(),subject=`invite:${invite}`;
 await db.batch([
  db.prepare("INSERT INTO privacy_accounts(subject_id) VALUES(?)").bind(subject),
  // This invitation is a non-login container. Every real device needs an admin-approved grant.
  db.prepare("INSERT INTO private_tester_invites(id,label,code_hash,created_at,code_expires_at,redeemed_at,session_hash,session_expires_at) VALUES(?,?,?,?,?,?,?,?)").bind(invite,PROFILE_NAME,await profileHash(profileSecret()),seconds,seconds,seconds,await profileHash(profileSecret()),seconds+365*86400),
  db.prepare("INSERT INTO owner_public_profiles(slug,subject_id,invite_id,policy_at,created_at) VALUES(?,?,?,?,?)").bind(PROFILE_SLUG,subject,invite,now,now),
 ]);
 return requireProfileAccount(db);
}
// Revalidate source ownership at recovery time. Deleted server records never return via old snapshots.
export async function currentProfileSnapshot(db:D1Database,profile:ProfileAccount,raw:unknown){return currentAccountSnapshot(db,profile.subject_id,raw);}
export async function currentAccountSnapshot(db:D1Database,subject:string,raw:unknown,segmentedAccount=false){
 const payload=validateSyncPayload(raw,segmentedAccount);
 const result=await db.prepare("SELECT record_kind,record_id FROM submission_owners WHERE subject_id=?").bind(subject).all<{record_kind:string;record_id:string}>();
 const owned=new Set(result.results.map(row=>`${row.record_kind}:${row.record_id}`));
 const values:Record<string,string>={...payload.values};
 for(const key of ["target-lab-trials","target-lab-measurements","target-lab-private-targets"]){
  if(!values[key])continue;const entries=JSON.parse(values[key]);if(!Array.isArray(entries))throw new RequestInputError("Invalid saved snapshot.",400);
  values[key]=JSON.stringify(entries.filter(row=>{
   if(row.adminTestOnly)return false;
   if(key==="target-lab-trials"&&row.recorded===true)return owned.has(`vote:${row.serverTrialId||row.id}`)||owned.has(`run:${row.id}`)||owned.has(`open:${row.id}`);
   if(key==="target-lab-measurements"&&row.researchContributionId)return owned.has(`measurement:${row.researchContributionId}`);
   if(key==="target-lab-private-targets"&&row.submissionId)return owned.has(`target:${row.submissionId}`);
   return true;
  }));
 }
 return validateSyncPayload({version:1,values},segmentedAccount);
}
export async function saveProfileSnapshot(db:D1Database,subject:string,label:unknown,raw:unknown){
 const profile=await requireProfileAccount(db);if(subject!==profile.subject_id)throw new RequestInputError("Only the YinYangEQ participant session can save its browser snapshot.",403);
 const payload=await currentProfileSnapshot(db,profile,raw),id=crypto.randomUUID(),now=Date.now();
 const count=await db.prepare("SELECT COUNT(*) total FROM owner_profile_snapshots WHERE profile_slug=?").bind(PROFILE_SLUG).first<{total:number}>();
 if((count?.total||0)>=20)throw new RequestInputError("Twenty snapshots are retained. Delete a snapshot before saving another.",409);
 await db.prepare("INSERT INTO owner_profile_snapshots(id,profile_slug,label,payload,created_at) VALUES(?,?,?,?,?)").bind(id,PROFILE_SLUG,profileLabel(label),JSON.stringify(payload),now).run();return {id,createdAt:now};
}
export async function createProfileGrant(db:D1Database,label:unknown,snapshotId?:string){
 const profile=await requireProfileAccount(db),code=profileSecret(),id=crypto.randomUUID(),now=Date.now();
 // Sanitized recovery keeps the identity but invalidates every old credential.
 // Recreate only an unusable root container; real access still needs this fresh grant.
 await db.prepare("INSERT INTO private_tester_invites(id,label,code_hash,created_at,code_expires_at,redeemed_at,session_hash,session_expires_at,revoked_at) VALUES(?,?,?,?,?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET revoked_at=NULL,redeemed_at=excluded.redeemed_at,code_hash=excluded.code_hash,code_expires_at=excluded.code_expires_at,session_hash=excluded.session_hash,session_expires_at=MAX(private_tester_invites.session_expires_at,excluded.session_expires_at) WHERE private_tester_invites.revoked_at IS NOT NULL").bind(profile.invite_id,PROFILE_NAME,await profileHash(profileSecret()),Math.floor(now/1000),Math.floor(now/1000),Math.floor(now/1000),await profileHash(profileSecret()),Math.floor(now/1000)).run();
 if(snapshotId&&!await db.prepare("SELECT 1 FROM owner_profile_snapshots WHERE id=? AND profile_slug=?").bind(snapshotId,PROFILE_SLUG).first())throw new RequestInputError("Snapshot not found.",404);
 const active=await db.prepare("SELECT COUNT(*) total FROM private_tester_devices WHERE invite_id=? AND expires_at>?").bind(profile.invite_id,Math.floor(now/1000)).first<{total:number}>();
 if((active?.total||0)>=12)throw new RequestInputError("Twelve devices are active. Revoke a device before adding another.",409);
 await db.prepare("INSERT INTO owner_profile_grants(id,profile_slug,token_hash,label,snapshot_id,created_at,expires_at) VALUES(?,?,?,?,?,?,?)").bind(id,PROFILE_SLUG,await profileHash(code),profileLabel(label),snapshotId||null,now,now+10*60_000).run();
 return {id,code,expiresAt:now+10*60_000};
}
type Grant={id:string;label:string;snapshot_id:string|null;claim_hash:string|null;device_id:string|null;completed_at:number|null;cancelled_at:number|null;expires_at:number};
export async function claimProfileGrant(db:D1Database,code:unknown){
 if(typeof code!=="string"||!/^[A-Za-z0-9_-]{43}$/.test(code))throw new RequestInputError("Enter the single-use code from the admin console.",400);
 const secret=profileSecret(),claim=await profileHash(secret),device=crypto.randomUUID(),now=Date.now();
 const row=await db.prepare("UPDATE owner_profile_grants SET used_at=?,claim_hash=?,device_id=? WHERE token_hash=? AND used_at IS NULL AND cancelled_at IS NULL AND expires_at>? RETURNING id,label,snapshot_id").bind(now,claim,device,await profileHash(code),now).first<Grant>();
 if(!row)throw new RequestInputError("This code expired, was cancelled or was already claimed. Ask the admin for a new code.",409);
 return {secret,label:row.label};
}
async function claimedGrant(db:D1Database,secret:string){
 if(!/^[A-Za-z0-9_-]{43}$/.test(secret))throw new RequestInputError("Claim a valid device sign-in code first.",401);
 const row=await db.prepare("SELECT id,label,snapshot_id,claim_hash,device_id,completed_at,cancelled_at,expires_at FROM owner_profile_grants WHERE claim_hash=? AND cancelled_at IS NULL AND expires_at>?").bind(await profileHash(secret),Date.now()).first<Grant>();
 if(!row)throw new RequestInputError("This device sign-in was cancelled or expired.",403);return row;
}
export async function profileGrantPreview(db:D1Database,secret:string){
 const grant=await claimedGrant(db,secret),profile=await requireProfileAccount(db);
 const snapshot=grant.snapshot_id?await db.prepare("SELECT payload,label FROM owner_profile_snapshots WHERE id=? AND profile_slug=?").bind(grant.snapshot_id,PROFILE_SLUG).first<{payload:string;label:string}>():null;
 if(grant.snapshot_id&&!snapshot)throw new RequestInputError("The recovery snapshot was deleted. Request a fresh sign-in code.",409);
 const payload=snapshot?await currentProfileSnapshot(db,profile,JSON.parse(snapshot.payload)):null;
 return {label:grant.label,completed:grant.completed_at!==null,snapshot:payload,snapshotDigest:payload?await profileHash(JSON.stringify(payload)):null,snapshotLabel:snapshot?.label||null};
}
export async function completeProfileGrant(db:D1Database,secret:string,replacementAccepted:boolean,snapshotDigest?:string){
 const grant=await claimedGrant(db,secret),profile=await requireProfileAccount(db);
 if(grant.snapshot_id&&!replacementAccepted)throw new RequestInputError("Review the snapshot and explicitly replace this browser's saved site data before signing in.",400);
 if(grant.snapshot_id){const preview=await profileGrantPreview(db,secret);if(snapshotDigest!==preview.snapshotDigest)throw new RequestInputError("The recovery data changed. Review the fresh snapshot before replacing anything.",409);}
 const access=await derived(secret,"yinyangeq-participant-device"),data=await derived(secret,"yinyangeq-participant-data"),accessHash=await profileHash(access),dataHash=await profileHash(data),now=Date.now(),until=Math.floor(now/1000)+90*86400,nonce=crypto.randomUUID();
 await db.batch([
  db.prepare("UPDATE owner_profile_grants SET completed_at=?,activation_nonce=? WHERE id=? AND claim_hash=? AND completed_at IS NULL AND cancelled_at IS NULL AND expires_at>?").bind(now,nonce,grant.id,await profileHash(secret),now),
  db.prepare("UPDATE private_tester_invites SET session_expires_at=MAX(session_expires_at,?) WHERE id=? AND EXISTS(SELECT 1 FROM owner_profile_grants WHERE id=? AND activation_nonce=?)").bind(until,profile.invite_id,grant.id,nonce),
  db.prepare("INSERT INTO private_tester_devices(session_hash,invite_id,data_token_hash,created_at,expires_at) SELECT ?,?,?,?,? FROM owner_profile_grants WHERE id=? AND activation_nonce=? AND (SELECT COUNT(*) FROM private_tester_devices WHERE invite_id=? AND expires_at>?)<12").bind(accessHash,profile.invite_id,dataHash,Math.floor(now/1000),until,grant.id,nonce,profile.invite_id,Math.floor(now/1000)),
  db.prepare("INSERT INTO privacy_sessions(token_hash,subject_id,expires_at) SELECT ?,?,? FROM owner_profile_grants WHERE id=? AND activation_nonce=? AND EXISTS(SELECT 1 FROM private_tester_devices WHERE session_hash=?)").bind(dataHash,profile.subject_id,until*1000,grant.id,nonce,accessHash),
  db.prepare("INSERT INTO owner_profile_devices(id,profile_slug,session_hash,label,created_at) SELECT device_id,profile_slug,?,label,? FROM owner_profile_grants WHERE id=? AND activation_nonce=? AND EXISTS(SELECT 1 FROM private_tester_devices WHERE session_hash=?)").bind(accessHash,now,grant.id,nonce,accessHash),
 ]);
 // An idempotent retry may return an existing active device, but can never recreate a revoked one.
 const active=await db.prepare("SELECT d.expires_at FROM private_tester_devices d JOIN owner_profile_devices p ON p.session_hash=d.session_hash WHERE d.session_hash=? AND d.expires_at>? AND p.revoked_at IS NULL").bind(accessHash,Math.floor(now/1000)).first<{expires_at:number}>();
 if(!active)throw new RequestInputError("This device was revoked. Only a fresh admin approval can sign it in again.",403);
 return {access,data,seconds:active.expires_at-Math.floor(now/1000)};
}
export async function revokeProfileDevice(db:D1Database,id:string){
 const profile=await requireProfileAccount(db);const row=await db.prepare("SELECT session_hash FROM owner_profile_devices WHERE id=? AND profile_slug=?").bind(id,PROFILE_SLUG).first<{session_hash:string|null}>();
 if(!row)throw new RequestInputError("Device not found.",404);const hash=row.session_hash;
 await db.batch([
  db.prepare("DELETE FROM privacy_sessions WHERE token_hash IN(SELECT data_token_hash FROM private_tester_devices WHERE session_hash=? AND invite_id=?)").bind(hash,profile.invite_id),
  db.prepare("DELETE FROM browser_pairings WHERE invite_id=? AND (source_hash=? OR claim_hash=?)").bind(profile.invite_id,hash,hash),
  db.prepare("DELETE FROM private_tester_devices WHERE invite_id=? AND session_hash=?").bind(profile.invite_id,hash),
  db.prepare("UPDATE owner_profile_devices SET revoked_at=COALESCE(revoked_at,?),session_hash=NULL WHERE id=? AND profile_slug=?").bind(Date.now(),id,PROFILE_SLUG),
 ]);
}
