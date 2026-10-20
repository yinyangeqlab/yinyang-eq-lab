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
  if (request.method === "HEAD") return new Response(null, { status: partial ? 206 : 200, headers });
  async function* streamParts() {
    let offset = 0;
    for (const part of asset.parts) {
      const first = offset, last = offset + part.bytes - 1; offset += part.bytes;
      if (last < start || first > end) continue;
      const localStart = Math.max(0, start-first), localEnd = Math.min(part.bytes-1, end-first);
      const response = await assets.fetch(new Request(new URL(part.path, request.url), { headers: { Range: `bytes=${localStart}-${localEnd}` } }));
      if (!response.ok || !response.body) throw new Error("Audio asset unavailable");
      const reader = response.body.getReader();
      if (response.status === 206 && response.headers.get("Content-Range") !== `bytes ${localStart}-${localEnd}/${part.bytes}`) throw new Error("Audio asset range mismatch");
      let position = first + (response.status === 206 ? localStart : 0);
      try {
        while (true) {
          const {value, done} = await reader.read();
          if (done) break;
          const low = Math.max(0, start-position), high = Math.min(value.length, end-position+1);
          position += value.length;
          if (high > low) yield value.subarray(low, high);
          if (position > end) break;
        }
      } finally { await reader.cancel(); }
    }
  }
  const iterator = streamParts();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) { try { const item = await iterator.next(); if (item.done) controller.close(); else controller.enqueue(item.value); } catch (error) { controller.error(error); } },
    async cancel() { await iterator.return(undefined); },
  });
  // Workers derive Content-Length from the body; a plain stream loses it.
  // The fixed-length identity stream preserves exact lengths without buffering.
  let responseBody: ReadableStream = body;
  if (typeof FixedLengthStream !== "undefined") {
    const fixed = new FixedLengthStream(end-start+1);
    void body.pipeTo(fixed.writable).catch(() => {});
    responseBody = fixed.readable;
  }
  return new Response(responseBody, { status: partial ? 206 : 200, headers });
  function invalidRange() { headers.set("Content-Range", `bytes */${asset.bytes}`); return new Response(null,{status:416,headers}); }
}
