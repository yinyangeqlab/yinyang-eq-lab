import { env } from "cloudflare:workers";
import manifest from "@/data/listening-pool-audio-manifest.json";
import { serveListeningAudio, type AudioAsset } from "@/lib/listening-audio";

async function audio(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const asset = (manifest as Record<string, AudioAsset>)[id];
  if (!asset || !Object.hasOwn(manifest,id)) return new Response(null,{status:404});
  const assets = (env as unknown as { ASSETS?: { fetch(request: Request): Promise<Response> } }).ASSETS;
  if (!assets) return new Response("Audio temporarily unavailable",{status:503,headers:{"Cache-Control":"private, no-store"}});
  return serveListeningAudio(request,asset,assets);
}
export const GET = audio;
export const HEAD = audio;
