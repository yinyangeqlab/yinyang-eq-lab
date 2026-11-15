import { env } from "cloudflare:workers";
import { isTestSubject, LAYOUT_TEST_SUBJECT, requireParticipantSubject } from "@/lib/admin-contributions";
import { getPublishedEqPreview } from "@/lib/eq-rankings";
import { publicWriteGate } from "@/lib/public-write-gate";
import { readJsonObject, RequestInputError, requestInputResponse } from "@/lib/request-json";
import { dataIdentity, type DataIdentity } from "@/lib/submission-ownership";
import { VOTE_DATA_NOTICE_VERSION } from "@/lib/vote-data-notice";

const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie" };
type PresetKey = [model: string, preset: string, version: string];

function presetEntry(model: unknown, preset: unknown, version: unknown) {
  const entry = typeof model === "string" && typeof preset === "string" && typeof version === "string"
    ? getPublishedEqPreview(model, preset, version) : null;
  if (!entry) throw new RequestInputError("This preset preview is unavailable.", 404);
  return { key: [entry.model.id, entry.preset.id, entry.preview.sha256] as PresetKey, path: entry.preview.path };
}

async function snapshot(key: PresetKey, identity: DataIdentity | null) {
  const participant = identity && !isTestSubject(identity.subjectId) ? identity : null;
  const result = await env.DB!.prepare(`
    SELECT COUNT(CASE WHEN choice='up' THEN 1 END) AS up,
           COUNT(CASE WHEN choice='down' THEN 1 END) AS down,
           MAX(CASE WHEN subject_id=? THEN choice END) AS mine
    FROM eq_preset_reactions
    WHERE model_id=? AND preset_id=? AND preset_version=? AND subject_id NOT IN ('owner', ?)
  `).bind(participant?.subjectId ?? null, ...key, LAYOUT_TEST_SUBJECT).first<{ up: number; down: number; mine: "up" | "down" | null }>();
  return { up: result?.up ?? 0, down: result?.down ?? 0, mine: result?.mine ?? null, canReact: participant?.submissionsEnabled === true };
}

function failure(error: unknown) {
  const response = requestInputResponse(error);
  if (!response) return Response.json({ error: "Preset reactions are temporarily unavailable." }, { status: 503, headers });
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  return response;
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { key, path } = presetEntry(params.get("model"), params.get("preset"), params.get("version"));
    if (params.get("preview") === "1") {
      const assets = (env as typeof env & { ASSETS?: { fetch(input: Request): Promise<Response> } }).ASSETS;
      if (!assets) throw Error("Asset binding unavailable");
      const response = await assets.fetch(new Request(new URL(path, request.url)));
      if (!response.ok) throw new RequestInputError("This preset preview is unavailable.", 404);
      return new Response(response.body, { headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } });
    }
    const identity = await dataIdentity().catch(error => {
      if (error instanceof RequestInputError && error.status === 401) return null;
      throw error;
    });
    return Response.json(await snapshot(key, identity), { headers });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("Origin") !== new URL(request.url).origin) throw new RequestInputError("Invalid origin.", 403);
    const identity = await dataIdentity();
    requireParticipantSubject(identity.subjectId);
    const { model, preset, version, choice } = await readJsonObject(request, 2048);
    const { key } = presetEntry(model, preset, version);
    if (choice !== "up" && choice !== "down" && choice !== null) throw new RequestInputError("Choose thumbs up or thumbs down.", 400);
    if (choice !== null && !identity.submissionsEnabled) throw new RequestInputError("Review participation to save a reaction.", 403);
    const limited = await publicWriteGate(request);
    if (limited) return limited;

    const now = Date.now();
    if (choice === null) {
      await env.DB!.prepare(`DELETE FROM eq_preset_reactions
        WHERE subject_id=? AND model_id=? AND preset_id=? AND preset_version=?
          AND EXISTS (SELECT 1 FROM privacy_sessions WHERE token_hash=? AND subject_id=? AND expires_at>?)`)
        .bind(identity.subjectId, ...key, identity.sessionHash, identity.subjectId, now).run();
    } else {
      // Verify the active session and the agreement inside the write.
      const saved = await env.DB!.prepare(`
        INSERT INTO eq_preset_reactions(id, subject_id, model_id, preset_id, preset_version, choice, created_at)
        SELECT ?, a.subject_id, ?, ?, ?, ?, ?
        FROM privacy_sessions s JOIN privacy_accounts a ON a.subject_id=s.subject_id
        WHERE s.token_hash=? AND a.subject_id=? AND s.expires_at>? AND a.submissions_enabled=1 AND a.agreement_version=?
        ON CONFLICT(model_id, preset_id, preset_version, subject_id)
        DO UPDATE SET choice=excluded.choice, created_at=excluded.created_at
        RETURNING id
      `).bind(crypto.randomUUID(), ...key, choice, now, identity.sessionHash, identity.subjectId, now, VOTE_DATA_NOTICE_VERSION).first();
      if (!saved) throw new RequestInputError("Your session or participation settings changed. Review them and try again.", 403);
    }
    return Response.json(await snapshot(key, identity), { headers });
  } catch (error) { return failure(error); }
}
