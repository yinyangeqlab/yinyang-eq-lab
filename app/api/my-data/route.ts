import { VOTE_DATA_NOTICE_VERSION } from "@/lib/vote-data-notice";
import { env } from "cloudflare:workers";
import { dataIdentity } from "@/lib/submission-ownership";
import { dataTables, eraseData } from "@/lib/privacy-erasure";
import { readJsonObject, RequestInputError, requestInputResponse } from "@/lib/request-json";
const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie" };
function origin(request: Request) { if (request.headers.get("Origin") !== new URL(request.url).origin) throw new RequestInputError("Invalid origin.", 403); }
function failed(error: unknown) { const response = requestInputResponse(error); if (response) { for (const [key,value] of Object.entries(headers)) response.headers.set(key,value); return response; } return Response.json({ error: "Your data could not be managed. Please try again or contact the site admin." }, { status: 503, headers }); }
export async function GET() {
  try {
    const identity = await dataIdentity();
    const titles: Record<string,string> = { vote:"'Preferred: ' || COALESCE((SELECT name FROM targets WHERE id=t.winner_id),t.winner_id) || ' / ' || COALESCE((SELECT name FROM targets WHERE id=t.loser_id),t.loser_id)", open:"'Open: ' || COALESCE((SELECT name FROM targets WHERE id=t.target_a_id),t.target_a_id) || ' / ' || COALESCE((SELECT name FROM targets WHERE id=t.target_b_id),t.target_b_id)", run:"t.target_a_name || ' / ' || t.target_b_name", feedback:"t.test_mode || ' description'", measurement:"t.name", export:"t.target_name || ' · ' || t.export_kind", target:"t.name", suggestion:"t.title" };
    const specs = Object.entries(dataTables).filter(([kind]) => kind !== "trial");
    const rows = await Promise.all(specs.map(async ([kind,table]) => {
      const result = await env.DB!.prepare(`SELECT t.id,t.created_at,${titles[kind]} AS display_title${kind === "run" ? ",t.trial_id" : ""} FROM ${table} t JOIN submission_owners o ON o.record_id=t.id AND o.record_kind=? WHERE o.subject_id=? ORDER BY t.created_at DESC`).bind(kind, identity.subjectId).all<Record<string,unknown>>();
      return (result.results || []).map(row => ({ kind, id: String(row.id), createdAt: Number(row.created_at), title: String(row.display_title || kind), localId: kind === "run" ? String(row.id) : undefined, trialId: row.trial_id || (kind === "vote" ? row.id : undefined) }));
    }));
    const music = await env.DB!.prepare("SELECT track_url,choice,updated_at FROM music_votes WHERE user_id=?").bind(identity.subjectId).all<{track_url:string;choice:string;updated_at:number}>();
    return Response.json({ submissionsEnabled: identity.submissionsEnabled, shareMusic: identity.shareMusic, agreementVersion:identity.agreementVersion, agreedAt:identity.agreedAt, sharedAdmin: identity.subjectId === "owner", records: [...rows.flat(), ...(music.results || []).map(row => ({ kind:"music", id:row.track_url, createdAt:row.updated_at, title:`${row.choice === "keep" ? "Upvote" : "Downvote"}: ${row.track_url}` }))] }, { headers });
  } catch (error) { return failed(error); }
}
export async function PATCH(request: Request) {
  try {
    origin(request); const identity = await dataIdentity(); const body = await readJsonObject(request, 1024);
    if (typeof body.submissionsEnabled !== "boolean" || typeof body.shareMusic !== "boolean") throw new RequestInputError("Choose your sharing settings.", 400);
    if (body.submissionsEnabled && (!identity.submissionsEnabled || body.acknowledged === true)) {
      if (body.acknowledged !== true || body.noticeVersion !== VOTE_DATA_NOTICE_VERSION) throw new RequestInputError("Read and explicitly agree to the current comparison-data notice on Shootout.",400);
      await env.DB!.prepare("UPDATE privacy_accounts SET submissions_enabled=1,share_music=?,agreement_version=?,agreed_at=?,withdrawn_at=NULL WHERE subject_id=?").bind(body.shareMusic?1:0,VOTE_DATA_NOTICE_VERSION,Date.now(),identity.subjectId).run();
    } else if (!body.submissionsEnabled) {
      await env.DB!.prepare("UPDATE privacy_accounts SET submissions_enabled=0,share_music=0,withdrawn_at=? WHERE subject_id=?").bind(Date.now(),identity.subjectId).run();
    } else {
      await env.DB!.prepare("UPDATE privacy_accounts SET share_music=? WHERE subject_id=?").bind(body.shareMusic?1:0,identity.subjectId).run();
    }
    return Response.json({ ok:true }, { headers });
  } catch (error) { return failed(error); }
}
export async function DELETE(request: Request) {
  try {
    origin(request); const identity = await dataIdentity(); const body = await readJsonObject(request, 4096);
    if (body.scope === "all" && body.confirmation === "DELETE ALL MY DATA") {
      await eraseData(identity.subjectId);
      const response = Response.json({ ok:true, all:true }, { headers });
      for (const name of ["__Host-yinyangeq_data", "__Host-yinyangeq_tester", "__Host-yinyangeq_owner"]) response.headers.append("Set-Cookie", `${name}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict`);
      return response;
    }
    if (body.scope !== "one" || body.confirmation !== "DELETE" || typeof body.kind !== "string" || typeof body.id !== "string") throw new RequestInputError("Confirm the deletion.", 400);
    await eraseData(identity.subjectId, { kind:body.kind, id:body.id });
    return Response.json({ ok:true }, { headers });
  } catch (error) { return failed(error); }
}
