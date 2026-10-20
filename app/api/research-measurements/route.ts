import { getDb } from "@/db";
import { researchMeasurements, researchMeasurementChunks } from "@/db/schema";
import { parseCurve } from "@/lib/curves";
import { publicWriteGate } from "@/lib/public-write-gate";
import { readRequestBytes, RequestInputError, requestInputResponse } from "@/lib/request-json";
import { MEASUREMENT_FILE_LIMIT, encodeMeasurementChunks, measurementFileHash, type MeasurementFileRecord } from "@/lib/research-measurement-files";
import { VOTE_DATA_NOTICE_VERSION } from "@/lib/vote-data-notice";

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const privateHeaders = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new RequestInputError("Invalid origin.", 403);
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data;"))
      throw new RequestInputError("Expected a measurement upload.", 415);
    const bytes = await readRequestBytes(request, 12_100_000);
    let form: FormData;
    try { form = await new Response(bytes as Uint8Array<ArrayBuffer>, { headers: { "Content-Type": contentType } }).formData(); }
    catch { throw new RequestInputError("Invalid measurement upload.", 400); }
    if (form.get("voteDataNoticeVersion") !== VOTE_DATA_NOTICE_VERSION || form.get("rights") !== "yes")
      throw new RequestInputError("Review the data notice and confirm permission to contribute these files.", 403);
    const field = (name: string, max: number, required = false) => {
      const value = form.get(name);
      if (value !== null && typeof value !== "string") throw new RequestInputError(`Invalid ${name}.`, 400);
      const text = (value || "").trim();
      if (text.length > max || (required && !text)) throw new RequestInputError(`Invalid ${name}.`, 400);
      return text;
    };
    const contributorId = field("contributorId", 36, true), localId = field("localId", 36, true);
    const type = field("type", 2, true);
    if (!uuid.test(contributorId) || !uuid.test(localId) || !["ie", "oe"].includes(type))
      throw new RequestInputError("Invalid measurement identity or type.", 400);
    const nozzle = field("nozzleDiameterMm", 16);
    const nozzleDiameterMm = nozzle ? Number(nozzle) : null;
    if (nozzleDiameterMm !== null && (!Number.isFinite(nozzleDiameterMm) || nozzleDiameterMm < 0.1 || nozzleDiameterMm > 30))
      throw new RequestInputError("Invalid nozzle diameter.", 400);
    const metadata = {
      contributorId, localId, type, name: field("name", 80, true), device: field("device", 120, true), rig: field("rig", 120, true),
      fit: field("fit", 120), notes: field("notes", 500), source: field("source", 500), driverType: field("driverType", 80) || null, nozzleDiameterMm,
    };
    const files: MeasurementFileRecord[] = [];
    const chunks: { kind: string; chunkIndex: number; base64: string }[] = [];
    for (const [key, kind] of [["file", "single"], ["leftFile", "left"], ["rightFile", "right"]] as const) {
      if (form.getAll(key).length > 1) throw new RequestInputError("Duplicate measurement attachment.", 400);
      const file = form.get(key);
      if (file === null || (file instanceof File && !file.size)) continue;
      if (!(file instanceof File) || !/\.(csv|txt)$/i.test(file.name))
        throw new RequestInputError("Use original CSV or TXT measurement files.", 400);
      if (file.size > MEASUREMENT_FILE_LIMIT) throw new RequestInputError("Measurement file exceeds 4 MB.", 413);
      const original = new Uint8Array(await file.arrayBuffer());
      let points: number;
      try { points = parseCurve(new TextDecoder("utf-8", { fatal: true }).decode(original), false).length; }
      catch { throw new RequestInputError("Each attachment must be a UTF-8 response with at least 10 valid frequency/gain rows.", 400); }
      const encoded = encodeMeasurementChunks(original);
      const name = file.name.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(-180);
      files.push({ kind, name, points, bytes: original.length, sha256: await measurementFileHash(original), chunks: encoded.length });
      chunks.push(...encoded.map((base64, chunkIndex) => ({ kind, chunkIndex, base64 })));
    }
    if (!files.length) throw new RequestInputError("Attach an original response file.", 400);
    const id = crypto.randomUUID(), db = getDb();
    // Atomic metadata + at most 24 chunk rows, retaining the exact uploaded bytes.
    await db.batch([
      db.insert(researchMeasurements).values({ id, ...metadata, files: JSON.stringify(files), createdAt: Date.now() }),
      ...chunks.map(chunk => db.insert(researchMeasurementChunks).values({ measurementId: id, ...chunk })),
    ]);
    return Response.json({ id }, { status: 201, headers: privateHeaders });
  } catch (error) {
    const invalid = requestInputResponse(error);
    if (invalid) { invalid.headers.set("Cache-Control", "private, no-store"); return invalid; }
    return Response.json({ error: "Measurement contribution could not be saved. Check the research storage migrations." }, { status: 503, headers: privateHeaders });
  }
}
