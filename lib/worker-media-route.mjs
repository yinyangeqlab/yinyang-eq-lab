import { serveListeningAudio } from './media-stream.mjs';
import manifest from './media-manifest.mjs';

// Called only after the private gate has checked access and participation.
// Avoid booting the application renderer for each audio range request.
export function serveWorkerMedia(request, env) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {status:405,headers:{Allow:'GET, HEAD','Cache-Control':'private, no-store'}});
  const match = /^\/api\/listening-audio\/([^/]+)$/.exec(new URL(request.url).pathname);
  const id = match?.[1];
  if (!id || !Object.hasOwn(manifest, id)) return new Response(null, {status:404,headers:{'Cache-Control':'private, no-store'}});
  if (!env.ASSETS) return new Response('Audio temporarily unavailable', {status:503,headers:{'Cache-Control':'private, no-store'}});
  return serveListeningAudio(request, manifest[id], env.ASSETS);
}
