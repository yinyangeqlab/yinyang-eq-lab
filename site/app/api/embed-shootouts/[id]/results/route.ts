import { maintenanceResponse } from "@/lib/maintenance";
import { publicWriteGate } from "@/lib/public-write-gate";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";
import { EMBED_SHARE_NOTICE, summarize } from "@/lib/embed-shootout";
import { authorizeManager, deleteShootout, loadRuns, loadTargets, setOwnerShare, touchShootout, type Shootout } from "@/lib/embed-store";

const noStore = { "Cache-Control": "private, no-store" };

async function view(id: string, shootout: Shootout) {
  const loaded = await loadTargets(shootout.targetIds);
  const rows = await loadRuns(id);
  return {
    id, title: shootout.title, createdAt: shootout.created_at, expiresAt: shootout.expires_at,
    targets: loaded ?? [],
    summary: summarize(shootout.targetIds.length, rows),
    runs: rows,
    ownerShare: { enabled: shootout.owner_share === 1, at: shootout.owner_share_at, notice: shootout.owner_share_notice, currentNotice: EMBED_SHARE_NOTICE },
  };
}

/** The sharer's private results. Requires the manage key from the results link. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const maintenance = maintenanceResponse();
  if (maintenance) return maintenance;
  try {
    const { id } = await params;
    const auth = await authorizeManager(request, id);
    if (auth instanceof Response) return auth;
    await touchShootout(id);
    return Response.json(await view(id, auth.shootout), { headers: noStore });
  } catch {
    return Response.json({ error: "Results could not be loaded. Try again." }, { status: 503, headers: noStore });
  }
}

/** Turns sharing this shootout's anonymous data with the lab owner on or off. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const { id } = await params;
    const auth = await authorizeManager(request, id);
    if (auth instanceof Response) return auth;
    const body = await readJsonObject(request, 1024);
    if (typeof body.ownerShare !== "boolean") return Response.json({ error: "Choose whether to share." }, { status: 400, headers: noStore });
    await setOwnerShare(id, body.ownerShare);
    return Response.json(await view(id, { ...auth.shootout, owner_share: body.ownerShare ? 1 : 0, owner_share_at: Date.now(), owner_share_notice: body.ownerShare ? EMBED_SHARE_NOTICE : null }), { headers: noStore });
  } catch (error) {
    return requestInputResponse(error) ?? Response.json({ error: "Your choice could not be saved. Try again." }, { status: 503, headers: noStore });
  }
}

/** Permanently deletes the shootout, its link and every anonymous run. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const { id } = await params;
    const auth = await authorizeManager(request, id);
    if (auth instanceof Response) return auth;
    await deleteShootout(id);
    return Response.json({ deleted: true }, { headers: noStore });
  } catch {
    return Response.json({ error: "The shootout could not be deleted. Try again." }, { status: 503, headers: noStore });
  }
}
