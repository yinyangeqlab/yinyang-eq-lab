import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { researchMeasurements, researchMeasurementChunks } from "@/db/schema";
import { ownerAccessResponse } from "@/lib/owner-access";
import { MEASUREMENT_FILE_LIMIT, measurementKinds, measurementFileHash, type MeasurementFileRecord } from "@/lib/research-measurement-files";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request) {
  const denied = await ownerAccessResponse(request);
  if (denied) return denied;
  const params = new URL(request.url).searchParams, id = params.get("id") || "", kind = params.get("kind") || "";
  if (!/^[a-f0-9-]{36}$/i.test(id) || !measurementKinds.some(value => value === kind))
    return Response.json({ error: "Invalid measurement file." }, { status: 400, headers });
  try {
    const db = getDb();
    const row = await db.select().from(researchMeasurements).where(eq(researchMeasurements.id, id)).get();
    const file = row && (JSON.parse(row.files) as MeasurementFileRecord[]).find(item => item.kind === kind);
    if (!file) return Response.json({ error: "Measurement file not found." }, { status: 404, headers });
    if (!Number.isInteger(file.bytes) || file.bytes < 1 || file.bytes > MEASUREMENT_FILE_LIMIT || !Number.isInteger(file.chunks) || file.chunks < 1 || file.chunks > 8)
      return Response.json({ error: "Original bytes are unavailable for this record." }, { status: 404, headers });
    const chunks = await db.select().from(researchMeasurementChunks)
      .where(and(eq(researchMeasurementChunks.measurementId, id), eq(researchMeasurementChunks.kind, kind)))
      .orderBy(asc(researchMeasurementChunks.chunkIndex)).all();
    if (chunks.length !== file.chunks) throw new Error("Incomplete stored file.");
    const bytes = new Uint8Array(file.bytes);
    let offset = 0;
    for (const [index, chunk] of chunks.entries()) {
      if (chunk.chunkIndex !== index) throw new Error("Invalid chunk sequence.");
      const binary = atob(chunk.base64);
      if (offset + binary.length > bytes.length) throw new Error("Invalid stored length.");
      for (let i = 0; i < binary.length; i++) bytes[offset++] = binary.charCodeAt(i);
    }
    if (offset !== file.bytes || await measurementFileHash(bytes) !== file.sha256) throw new Error("Stored file checksum differs.");
    const filename = file.name.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(-180);
    return new Response(bytes, { headers: { ...headers, "Content-Type": "application/octet-stream", "Content-Length": String(bytes.length),
      "Content-Disposition": `attachment; filename="measurement.${filename.toLowerCase().endsWith(".csv") ? "csv" : "txt"}"; filename*=UTF-8''${encodeURIComponent(filename).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}` } });
  } catch {
    return Response.json({ error: "Original measurement could not be read." }, { status: 503, headers });
  }
}
