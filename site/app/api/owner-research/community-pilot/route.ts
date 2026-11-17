import { env } from "cloudflare:workers";
import { ownerAccessResponse } from "@/lib/owner-access";
import { readJsonObject, RequestInputError, requestInputResponse } from "@/lib/request-json";
import { communityPilot, adaptiveCommunitySummary } from "@/lib/community-pilot";
export async function GET(request: Request) { const denied = await ownerAccessResponse(request); if (denied)
    return denied; const catalogs = await env.DB!.prepare('SELECT id,period,headphone_type,method_version FROM community_catalogs ORDER BY period DESC LIMIT 12').all(); const id = new URL(request.url).searchParams.get('catalog'); return Response.json({ catalogs: catalogs.results, adaptive: await adaptiveCommunitySummary(env.DB!), records: (await env.DB!.prepare("SELECT 'community' AS kind,c.id,c.result,c.headphone_type,c.created_at,COALESCE(m.excluded,0) AS excluded FROM community_personal_choices c LEFT JOIN community_moderation m ON m.record_kind='community' AND m.record_id=c.id UNION ALL SELECT 'community-reference',b.id,NULL,ca.headphone_type,b.created_at,COALESCE(m.excluded,0) FROM community_reference_blocks b JOIN community_catalogs ca ON ca.id=b.catalog_id LEFT JOIN community_moderation m ON m.record_kind='community-reference' AND m.record_id=b.id ORDER BY created_at DESC LIMIT 50").all()).results, analysis: id ? await communityPilot(env.DB!, id) : null, publicReady: false }, { headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' } }); }
export async function PATCH(request: Request) { const denied = await ownerAccessResponse(request); if (denied)
    return denied; try {
    if (request.headers.get('Origin') !== new URL(request.url).origin)
        throw new RequestInputError('Invalid origin.', 403);
    const b = await readJsonObject(request, 2048);
    if (!['community', 'community-reference'].includes(String(b.kind)) || typeof b.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(b.id) || typeof b.excluded !== 'boolean' || typeof b.note !== 'string' || !b.note.trim() || b.note.length > 240)
        throw new RequestInputError('Choose a record, exclusion state and a short reason.', 400);
    const table = b.kind === 'community' ? 'community_personal_choices' : 'community_reference_blocks';
    await env.DB!.prepare(`INSERT INTO community_moderation(record_kind,record_id,excluded,note) SELECT ?,id,?,? FROM ${table} WHERE id=? ON CONFLICT(record_kind,record_id) DO UPDATE SET excluded=excluded.excluded,note=excluded.note`).bind(String(b.kind), b.excluded ? 1 : 0, b.note.trim(), b.id).run();
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
}
catch (e) {
    return requestInputResponse(e) || Response.json({ error: 'Could not update pilot moderation.' }, { status: 503 });
} }
