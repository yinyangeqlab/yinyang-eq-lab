import { renderShootoutCard } from "@/lib/embed-card";
import { getShootout } from "@/lib/embed-store";

// Rendering takes a few hundred ms, so each isolate keeps the most recent cards.
const recent = new Map<string, Uint8Array>();
const headers = { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" };

/** Link-preview image for a shootout (Discord, Slack, iMessage…). Art only; no target data. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const shootout = await getShootout(id);
    if (!shootout) return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
    const key = `${id}:${shootout.targetIds.length}`;
    let png = recent.get(key);
    if (!png) {
      png = await renderShootoutCard(id, shootout.targetIds.length);
      recent.set(key, png);
      if (recent.size > 6) recent.delete(recent.keys().next().value!);
    }
    return new Response(png as BodyInit, { headers });
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function HEAD(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try { return new Response(null, { status: await getShootout(id) ? 200 : 404, headers }); }
  catch { return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
