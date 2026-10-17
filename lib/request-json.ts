export class RequestInputError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export async function readJsonObject(request: Request, maxBytes: number): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json")
    throw new RequestInputError("Expected JSON.", 415);
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes) throw new RequestInputError("Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestInputError("Request is empty.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new RequestInputError("Request is too large.", 413);
    }
    chunks.push(value);
  }
  if (!size) throw new RequestInputError("Request is empty.", 400);
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new RequestInputError("Invalid JSON.", 400); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new RequestInputError("Expected a JSON object.", 400);
  return parsed as Record<string, unknown>;
}

export function requestInputResponse(error: unknown): Response | null {
  return error instanceof RequestInputError ? Response.json({ error: error.message }, { status: error.status }) : null;
}
