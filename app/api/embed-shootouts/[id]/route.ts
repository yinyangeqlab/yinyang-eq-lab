import { maintenanceResponse } from "@/lib/maintenance";
import { BAND_HZ, planRounds, playbackTrims } from "@/lib/embed-shootout";
import { countRuns, getShootout, loadTargets } from "@/lib/embed-store";

/**
 * Public listening setup. Target names are withheld until a run is submitted,
 * so the page can stay blind; the curves themselves are sent as 28 coarse
 * one-third-octave gains from openly licensed targets only.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const maintenance = maintenanceResponse();
  if (maintenance) return maintenance;
  const { id } = await params;
  try {
    const shootout = await getShootout(id);
    if (!shootout) return Response.json({ error: "This shootout has ended or does not exist." }, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
    const loaded = await loadTargets(shootout.targetIds);
    if (!loaded) return Response.json({ error: "This shootout is no longer available." }, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
    const bands = loaded.map(target => target.bands);
    return Response.json({
      id: shootout.id, title: shootout.title, hz: BAND_HZ, bands, trims: playbackTrims(bands), rounds: planRounds(loaded.length), runs: await countRuns(id),
    }, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch {
    return Response.json({ error: "This shootout could not be loaded. Try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
