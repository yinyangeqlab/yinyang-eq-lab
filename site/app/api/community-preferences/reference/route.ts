import { env } from "cloudflare:workers";
import { dataIdentity } from "@/lib/submission-ownership";
import { readJsonObject, RequestInputError, requestInputResponse } from "@/lib/request-json";
import { publicWriteGate } from "@/lib/public-write-gate";
import { nextReference, startReference, answerReference } from "@/lib/community-reference";
const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie" };
function failure(e: unknown) { const response = requestInputResponse(e) || Response.json({ error: 'Community reference checks are unavailable.' }, { status: 503 }); for (const [key, value] of Object.entries(headers)) response.headers.set(key, value); return response; }
export async function GET(request: Request) { try {
    const i = await dataIdentity();
    return Response.json(await nextReference(env.DB!, i.subjectId, i.submissionsEnabled, new URL(request.url).searchParams.get('type') || 'ie',new URL(request.url).searchParams.get('rig')), { headers });
}
catch (e) {
    return failure(e);
} }
export async function POST(request: Request) { try {
    if (request.headers.get('Origin') !== new URL(request.url).origin)
        throw new RequestInputError('Invalid origin.', 403);
    const limited = await publicWriteGate(request);
    if (limited)
        return limited;
    const i = await dataIdentity(), b = await readJsonObject(request, 16384);
    if (b.action !== 'start' && b.action !== 'answer') throw new RequestInputError('Choose start or answer.', 400);
    return Response.json(b.action === 'start' ? await startReference(env.DB!, i.subjectId, i.sessionHash, i.submissionsEnabled, b.headphoneType, b.setupFingerprint,b.rig) : await answerReference(env.DB!, i.subjectId, i.submissionsEnabled, b), { headers });
}
catch (e) {
    return failure(e);
} }
