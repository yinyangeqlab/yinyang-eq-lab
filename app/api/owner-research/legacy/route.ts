import {env} from "cloudflare:workers";
import {ownerAccessResponse} from "@/lib/owner-access";
import {legacyGraph,legacyKind,validId} from "@/lib/legacy-review";
import {readJsonObject,requestInputResponse,RequestInputError} from "@/lib/request-json";
const headers={"Cache-Control":"private, no-store"};
export async function GET(request:Request){const denied=await ownerAccessResponse(request);if(denied)return denied;
 try{const rows=await env.DB!.prepare("SELECT r.*,CASE WHEN r.subject_id='owner' THEN 'Shared admin' ELSE i.label END requester_label FROM legacy_review_requests r LEFT JOIN private_tester_invites i ON r.subject_id='invite:'||i.id ORDER BY (r.status='pending') DESC,r.created_at DESC LIMIT 20").all();
 const requests=await Promise.all((rows.results||[]).map(async row=>{try{if(row.status!=="pending"||!legacyKind(row.record_kind))return row;const graph=await legacyGraph(row.record_kind,String(row.record_id));return {...row,preview:{createdAt:graph.root.created_at,mode:graph.root.test_mode,targetA:graph.root.target_a_id||graph.root.winner_id,targetB:graph.root.target_b_id||graph.root.loser_id,linkedRecords:graph.rows}};}catch{return {...row,preview:null};}}));return Response.json({requests},{headers});
 }catch{return Response.json({error:"Legacy review queue could not be loaded."},{status:503,headers});}}
export async function POST(request:Request){const denied=await ownerAccessResponse(request);if(denied)return denied;
 if(request.headers.get("Origin")!==new URL(request.url).origin)return Response.json({error:"Invalid origin."},{status:403,headers});
 try{const body=await readJsonObject(request,2048);if(!validId(body.requestId)||!["approve","reject"].includes(String(body.action))||typeof body.reason!=="string"||body.reason.trim().length<10||body.reason.length>500)throw new RequestInputError("Choose a request and record a minimal verification or rejection reason (10–500 characters).",400);
 const db=env.DB!,row=await db.prepare("SELECT * FROM legacy_review_requests WHERE id=?").bind(body.requestId).first<{id:string;subject_id:string;record_kind:string;record_id:string;status:string}>();if(!row)throw new RequestInputError("Request unavailable.",404);
 if(row.status!=='pending')throw new RequestInputError("This request has already been reviewed.",409);
 if(body.action==='reject'){await db.prepare("UPDATE legacy_review_requests SET status='rejected',admin_reason=?,reviewed_at=? WHERE id=? AND status='pending'").bind(body.reason.trim(),Date.now(),row.id).run();return Response.json({ok:true},{headers});}
 if(body.confirmation!=="VERIFY SPECIFIC LEGACY OWNERSHIP"||body.independentlyVerified!==true||!legacyKind(row.record_kind))throw new RequestInputError("Verify independently that these specific linked records belong to this requester; a browser ID alone is insufficient.",400);
 const graph=await legacyGraph(row.record_kind,row.record_id);if(graph.rows.length>20)throw new RequestInputError("This comparison graph requires manual review.",409);
 const session=await db.prepare("SELECT token_hash FROM privacy_sessions WHERE subject_id=? AND expires_at>? ORDER BY expires_at DESC LIMIT 1").bind(row.subject_id,Date.now()).first<{token_hash:string}>();if(!session)throw new RequestInputError("Ask the requester to open My data again before approval.",409);
 const statements=[db.prepare("UPDATE legacy_review_requests SET status='approved',admin_reason=?,reviewed_at=? WHERE id=? AND status='pending'").bind(body.reason.trim(),Date.now(),row.id)];
 for(const record of graph.rows){statements.push(db.prepare("INSERT INTO legacy_record_verifications(record_kind,record_id,subject_id,request_id) VALUES (?,?,?,?)").bind(record.kind,record.id,row.subject_id,row.id));statements.push(db.prepare("INSERT INTO submission_owners(record_kind,record_id,subject_id,session_hash) VALUES (?,?,?,?) ON CONFLICT(record_kind,record_id) DO NOTHING").bind(record.kind,record.id,row.subject_id,session.token_hash));}
 for(const record of graph.rows) statements.push(db.prepare("INSERT OR IGNORE INTO comparison_records(record_kind,record_id,comparison_id) VALUES (?,?,?)").bind(record.kind,record.id,String(graph.root.trial_id||graph.root.id)));
 await db.batch(statements);return Response.json({ok:true,linkedRecords:graph.rows.length},{headers});
 }catch(e){return requestInputResponse(e)||Response.json({error:"Approval conflicted with an erasure or ownership change. No partial claim was saved."},{status:409,headers});}
}
