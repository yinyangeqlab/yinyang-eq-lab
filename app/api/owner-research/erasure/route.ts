import { ownerAccessResponse } from "@/lib/owner-access";
import { eraseData } from "@/lib/privacy-erasure";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";
export async function POST(request: Request) {
  const denied = await ownerAccessResponse(request); if (denied) return denied;
  const headers = { "Cache-Control": "private, no-store" };
  if (request.headers.get("Origin") !== new URL(request.url).origin) return Response.json({ error:"Invalid origin." }, { status:403, headers });
  try {
    const body = await readJsonObject(request, 4096);
    if (body.confirmation !== "ERASE VERIFIED SUBMISSION" || typeof body.kind !== "string" || typeof body.id !== "string") return Response.json({ error:"Verify the requester's ownership and confirm erasure." }, { status:400, headers });
    await eraseData(null, { kind:body.kind, id:body.id },body.includeOwnerAccount===true&&body.ownerAccountConfirmation==="INCLUDE YINYANGEQ ACCOUNT");
    return Response.json({ ok:true }, { headers });
  } catch (error) { return requestInputResponse(error) || Response.json({ error:"Erasure failed; no partial deletion was saved." }, { status:503, headers }); }
}
