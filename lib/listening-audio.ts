export type AudioAsset = { bytes: number; sha256: string; mime: string; parts: { path: string; bytes: number }[] };
type AssetFetcher = { fetch(request: Request): Promise<Response> };

// The site's private gate checks identity and participation before this route.
// Source bytes are streamed, never decoded, normalized or joined in memory.
export async function serveListeningAudio(request: Request, asset: AudioAsset, assets: AssetFetcher) {
  const headers = new Headers({ "Content-Type": asset.mime, "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", ETag: `"${asset.sha256}"`, "X-Content-Type-Options": "nosniff" });
  let start = 0, end = asset.bytes - 1;
  const range = request.headers.get("Range");
  let partial = false;
  if (range && (!request.headers.has("If-Range") || request.headers.get("If-Range") === headers.get("ETag"))) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return invalidRange();
    start = match[1] ? Number(match[1]) : Math.max(0, asset.bytes - Number(match[2]));
    end = match[1] && match[2] ? Math.min(asset.bytes - 1, Number(match[2])) : asset.bytes - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= asset.bytes) return invalidRange();
    partial = true; headers.set("Content-Range", `bytes ${start}-${end}/${asset.bytes}`);
  }
  headers.set("Content-Length", String(end-start+1));
  headers.set("X-Listening-Content-Length", String(end-start+1));
  if (request.method === "HEAD") return new Response(null, { status: partial ? 206 : 200, headers });
  // Pipe range-capable asset bodies natively. Reading every network chunk in
  // JavaScript can exhaust the Free Worker's CPU budget on a large FLAC seek.
  const output = new TransformStream<Uint8Array, Uint8Array>();
  async function pipeParts() {
    let offset = 0;
    try {
      for (const part of asset.parts) {
        const first = offset, last = offset + part.bytes - 1; offset += part.bytes;
        if (last < start || first > end) continue;
        const localStart = Math.max(0, start-first), localEnd = Math.min(part.bytes-1, end-first);
        const response = await assets.fetch(new Request(new URL(part.path, request.url), { headers: { Range: `bytes=${localStart}-${localEnd}` } }));
        if (!response.ok || !response.body) throw new Error("Audio asset unavailable");
        if (response.status === 206) {
          if (response.headers.get("Content-Range") !== `bytes ${localStart}-${localEnd}/${part.bytes}`) {
            await response.body.cancel(); throw new Error("Audio asset range mismatch");
          }
          await response.body.pipeTo(output.writable, { preventClose: true });
        } else {
          // Compatibility fallback for asset stores that ignore Range. The live
          // Cloudflare binding honors it and uses the native path above.
          const reader = response.body.getReader(), writer = output.writable.getWriter();
          let position = first;
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              const low = Math.max(0, start-position), high = Math.min(value.length, end-position+1);
              position += value.length;
              if (high > low) await writer.write(value.subarray(low, high));
              if (position > end) break;
            }
          } finally { await reader.cancel(); writer.releaseLock(); }
        }
      }
      const writer = output.writable.getWriter();
      try { await writer.close(); } finally { writer.releaseLock(); }
    } catch (error) {
      console.warn("listening_audio_stream_failed", error instanceof Error ? error.message : "stream failure");
      const writer = output.writable.getWriter();
      try { await writer.abort(error); } finally { writer.releaseLock(); }
    }
  }
  void pipeParts().catch(() => {});
  return new Response(output.readable, { status: partial ? 206 : 200, headers });
  function invalidRange() { headers.set("Content-Range", `bytes */${asset.bytes}`); return new Response(null,{status:416,headers}); }
}
