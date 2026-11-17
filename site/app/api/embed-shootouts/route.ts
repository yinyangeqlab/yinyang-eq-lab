import { maintenanceResponse } from "@/lib/maintenance";
import { publicWriteGate } from "@/lib/public-write-gate";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";
import {
  EMBED_MAX_TARGETS, EMBED_MIN_TARGETS, cleanTitle, hashManageKey, newManageKey, newShootoutId,
} from "@/lib/embed-shootout";
import { createLimitResponse, createShootout, listEligibleTargets, loadTargets } from "@/lib/embed-store";

const noStore = { "Cache-Control": "private, no-store" };

/** Targets a sharer may choose from: approved built-ins with an open license. */
export async function GET() {
  const maintenance = maintenanceResponse();
  if (maintenance) return maintenance;
  try {
    return Response.json({ targets: await listEligibleTargets(), min: EMBED_MIN_TARGETS, max: EMBED_MAX_TARGETS }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return Response.json({ error: "Targets are unavailable right now." }, { status: 503, headers: noStore });
  }
}

/** Creates a shootout. The manage key is returned once and only its hash is stored. */
export async function POST(request: Request) {
  try {
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const body = await readJsonObject(request, 4096);
    const ids = Array.isArray(body.targetIds) ? body.targetIds.map(String) : [];
    if (new Set(ids).size !== ids.length || ids.length < EMBED_MIN_TARGETS || ids.length > EMBED_MAX_TARGETS)
      return Response.json({ error: `Choose ${EMBED_MIN_TARGETS} to ${EMBED_MAX_TARGETS} different targets.` }, { status: 400, headers: noStore });
    if (!await loadTargets(ids)) return Response.json({ error: "One of those targets is not available for shareable shootouts." }, { status: 400, headers: noStore });
    const capped = await createLimitResponse(request);
    if (capped) return capped;
    const id = newShootoutId(), manageKey = newManageKey();
    await createShootout({ id, manageHash: await hashManageKey(manageKey), title: cleanTitle(body.title), targetIds: ids });
    return Response.json({ id, manageKey, path: `/s/${id}`, embedPath: `/embed/${id}`, resultsPath: `/s/${id}/results` }, { status: 201, headers: noStore });
  } catch (error) {
    return requestInputResponse(error) ?? Response.json({ error: "The shootout could not be created. Try again." }, { status: 503, headers: noStore });
  }
}
