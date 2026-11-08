import {env} from 'cloudflare:workers';
import {ownerAccessResponse} from '@/lib/owner-access';
import {profileOrigin} from '@/lib/yinyangeq-account';
import {readJsonObject,RequestInputError} from '@/lib/request-json';
import {profileHeaders,profileFailure} from '@/lib/profile-api';
import {eraseData} from '@/lib/privacy-erasure';
const invite='layout-test-only',subject='invite:layout-test-only';
export async function GET(request:Request){const denied=await ownerAccessResponse(request);if(denied)return denied;try{const row=await env.DB!.prepare('SELECT revoked_at,session_expires_at FROM private_tester_invites WHERE id=?').bind(invite).first<{revoked_at:number|null;session_expires_at:number|null}>();return Response.json({exists:!!row,enabled:!!row&&row.revoked_at===null&&(row.session_expires_at||0)>Date.now()/1000},{headers:profileHeaders});}catch(e){return profileFailure(e);}}
export async function POST(request:Request){const denied=await ownerAccessResponse(request);if(denied)return denied;try{profileOrigin(request);const body=await readJsonObject(request,1024);
 if(body.action==='disable'){await env.DB!.batch([
  env.DB!.prepare('UPDATE private_tester_invites SET revoked_at=?,code_expires_at=0,session_expires_at=0 WHERE id=?').bind(Math.floor(Date.now()/1000),invite),
  env.DB!.prepare('DELETE FROM privacy_sessions WHERE subject_id=?').bind(subject),
  env.DB!.prepare('DELETE FROM browser_pairings WHERE invite_id=?').bind(invite),
  env.DB!.prepare('DELETE FROM private_tester_devices WHERE invite_id=?').bind(invite),
 ]);}else if(body.action==='clear'&&body.confirmation==='CLEAR PRIVATE TEST DATA'){await eraseData(subject);}else throw new RequestInputError('Choose Disable test access, or explicitly confirm clearing private test data.',400);
 return Response.json({ok:true},{headers:profileHeaders});}catch(e){return profileFailure(e);}}
