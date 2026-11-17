import { env } from "cloudflare:workers";
import { readJsonObject, RequestInputError } from "@/lib/request-json";

const lifetimeMs = 10 * 60_000;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export const browserProofHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie" };

// The browser ID comes from client storage. Only compare it to submissions
// already tied to the authenticated data session by the server.
const hasMatchingSubmission = `EXISTS (
  SELECT 1 FROM submission_owners o
  LEFT JOIN votes v ON o.record_kind='vote' AND o.record_id=v.id
  LEFT JOIN ranked_trials t ON o.record_kind='trial' AND o.record_id=t.id
  LEFT JOIN listening_runs r ON o.record_kind='run' AND o.record_id=r.id
  LEFT JOIN comparison_choices c ON o.record_kind='open' AND o.record_id=c.id
  LEFT JOIN feedback_submissions f ON o.record_kind='feedback' AND o.record_id=f.id
  LEFT JOIN research_measurements m ON o.record_kind='measurement' AND o.record_id=m.id
  WHERE o.subject_id=s.subject_id AND o.session_hash=s.token_hash
    AND COALESCE(v.voter_id,t.voter_id,r.voter_id,c.participant_id,f.participant_id,m.contributor_id)=?
)`;

export async function readBrowserProofRequest(request: Request) {
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    throw new RequestInputError("Invalid origin.", 403);
  }
  const body = await readJsonObject(request, 512);
  const browserId = typeof body.browserId === "string" ? body.browserId.trim() : "";
  if (!uuid.test(browserId)) throw new RequestInputError("Enter a valid browser ID.", 400);
  return { browserId, code: typeof body.code === "string" ? body.code.trim().toLowerCase() : "" };
}

async function codeHash(browserId: string, code: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${browserId}:${code}`));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function issueBrowserProof(sessionHash: string, subjectId: string, browserId: string) {
  const db = env.DB!;
  const code = crypto.randomUUID();
  const hash = await codeHash(browserId, code);
  const now = Date.now();
  const [, result] = await db.batch<{expiresAt: number}>([
    db.prepare("DELETE FROM browser_ownership_codes WHERE expires_at<=?").bind(now),
    db.prepare(`INSERT INTO browser_ownership_codes (session_hash,code_hash,expires_at)
      SELECT s.token_hash,?,MIN(?,s.expires_at) FROM privacy_sessions s
      WHERE s.token_hash=? AND s.subject_id=? AND s.expires_at>? AND ${hasMatchingSubmission}
      ON CONFLICT(session_hash) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at
      RETURNING expires_at AS expiresAt`)
      .bind(hash, now + lifetimeMs, sessionHash, subjectId, now, browserId),
  ]);
  const proof = result.results[0];
  if (!proof) {
    throw new RequestInputError("This ID could not be matched to a submission from this data session. Try the browser and sign-in you used when you submitted it, or ask the owner to review the specific record.", 409);
  }
  return { code, expiresAt: proof.expiresAt };
}

export async function consumeBrowserProof(browserId: string, code: string) {
  if (!uuid.test(code)) throw new RequestInputError("Enter a valid one-time code.", 400);
  const hash = await codeHash(browserId, code);
  const now = Date.now();
  // Recheck the session and evidence as part of the delete so concurrent
  // attempts, sign-out revocation and source erasure cannot race redemption.
  const match = await env.DB!.prepare(`DELETE FROM browser_ownership_codes
    WHERE code_hash=? AND expires_at>? AND EXISTS (
      SELECT 1 FROM privacy_sessions s WHERE s.token_hash=browser_ownership_codes.session_hash
        AND s.expires_at>? AND ${hasMatchingSubmission}
    )
    RETURNING
      (SELECT subject_id FROM privacy_sessions WHERE token_hash=browser_ownership_codes.session_hash) AS accountId,
      (SELECT n.nickname FROM privacy_sessions s LEFT JOIN listener_nicknames n ON n.subject_id=s.subject_id
        WHERE s.token_hash=browser_ownership_codes.session_hash) AS nickname`)
    .bind(hash, now, now, browserId).first<{accountId: string; nickname: string | null}>();
  if (!match) throw new RequestInputError("This ID and code could not be verified. Check both values or ask for a fresh code.", 409);
  return { browserId, ...match };
}
