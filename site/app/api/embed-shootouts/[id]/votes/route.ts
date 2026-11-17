import { publicWriteGate } from "@/lib/public-write-gate";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";
import { EmbedInputError, parseRun, summarize } from "@/lib/embed-shootout";
import { getShootout, insertRun, loadRuns, loadTargets } from "@/lib/embed-store";

const noStore = { "Cache-Control": "private, no-store" };

/**
 * Stores one finished run anonymously, then reveals the targets and the crowd
 * so far. Nothing identifying the listener is read from the request body or stored.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const { id } = await params;
    const shootout = await getShootout(id);
    if (!shootout) return Response.json({ error: "This shootout has ended or does not exist." }, { status: 404, headers: noStore });
    const loaded = await loadTargets(shootout.targetIds);
    if (!loaded) return Response.json({ error: "This shootout is no longer available." }, { status: 404, headers: noStore });
    const body = await readJsonObject(request, 4096);
    const run = parseRun(loaded.length, body);
    // A repeat listen still reveals the targets but is not stored a second time.
    if (body.practice !== true && !await insertRun(id, run)) return Response.json({ error: "This shootout has reached its listener limit." }, { status: 409, headers: noStore });
    const summary = summarize(loaded.length, await loadRuns(id));
    return Response.json({
      reveal: loaded,
      crowd: { runs: summary.runs, targets: summary.targets.map(({ index, score, favorite }) => ({ index, score, favorite })) },
    }, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof EmbedInputError) return Response.json({ error: error.message }, { status: 400, headers: noStore });
    return requestInputResponse(error) ?? Response.json({ error: "Your picks could not be saved. Try again." }, { status: 503, headers: noStore });
  }
}
