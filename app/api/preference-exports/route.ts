import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { preferenceExports, targets } from "@/db/schema";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";

const kinds = ["original-target", "preference-target", "eq"] as const;
const formats = ["csv", "txt", "equalizerapo", "easyeffects", "qudelix5k"] as const;
const restricted = (name: string, creator: string) =>
  name.trim().toLowerCase() === "peqdb nirvana" ||
  (name.trim().toLowerCase() === "nirvana" && creator.trim().toLowerCase() === "peqdb");

export async function POST(request: Request) {
  try {
    const data = await readJsonObject(request, 180_000);
    const targetId = String(data.targetId ?? "").trim().slice(0, 120);
    const targetName = String(data.targetName ?? "").trim().slice(0, 120);
    const targetCreator = String(data.targetCreator ?? "").trim().slice(0, 120);
    const measurementName = data.measurementName == null ? null : String(data.measurementName).trim().slice(0, 120);
    const exportKind = String(data.exportKind ?? "");
    const format = String(data.format ?? "");
    const filename = String(data.filename ?? "");
    const contents = data.contents;
    const curve = data.curve;
    const settings = data.settings;
    const variant = data.variant;
    if (!targetId || !targetName || !targetCreator || restricted(targetName, targetCreator) || !kinds.includes(exportKind as typeof kinds[number]) || !formats.includes(format as typeof formats[number]) ||
        !/^[a-z0-9][a-z0-9._-]{0,100}\.(?:csv|txt)$/.test(filename) || typeof contents !== "string" || !contents.length || contents.length > 120_000 ||
        !Array.isArray(curve) || curve.length < 2 || curve.length > 2000 || !curve.every(point => Array.isArray(point) && point.length === 2 && point.every(value => typeof value === "number" && Number.isFinite(value))) ||
        !settings || typeof settings !== "object" || Array.isArray(settings) || JSON.stringify(settings).length > 2000 ||
        (exportKind === "eq" && (!measurementName || !variant || typeof variant !== "object" || Array.isArray(variant))) ||
        (exportKind !== "eq" && format !== "csv"))
      return Response.json({ error: "Invalid preference export." }, { status: 400 });

    const fit = variant as Record<string, unknown> | undefined;
    const bands = exportKind === "eq" ? Number(fit?.bands) : null;
    const method = exportKind === "eq" ? String(fit?.method ?? "") : null;
    const priority = exportKind === "eq" ? String(fit?.priority ?? "") : null;
    const preamp = exportKind === "eq" ? Number(fit?.preamp) : null;
    const rms = exportKind === "eq" ? Number(fit?.rms) : null;
    const filters = exportKind === "eq" ? fit?.filters : null;
    if (exportKind === "eq" && (![10, 15, 20].includes(bands!) || !["standard", "precise"].includes(method!) || !["smooth", "close"].includes(priority!) || !Number.isFinite(preamp) || !Number.isFinite(rms) || !Array.isArray(filters) || filters.length !== bands || JSON.stringify(filters).length > 10_000))
      return Response.json({ error: "Invalid EQ export." }, { status: 400 });

    const db = getDb();
    const known = await db.select({ name: targets.name, creator: targets.creator }).from(targets).where(eq(targets.id, targetId)).limit(1);
    if (known[0] && restricted(known[0].name, known[0].creator)) return Response.json({ error: "This target cannot be exported." }, { status: 403 });
    const id = crypto.randomUUID();
    await db.insert(preferenceExports).values({
      id, targetId, targetName, targetCreator, measurementName, exportKind, format, filename, contents,
      settings: JSON.stringify(settings), curve: JSON.stringify(curve), bands, method, priority, preamp, rms,
      filters: filters == null ? null : JSON.stringify(filters), createdAt: Date.now(),
    });
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    const inputError = requestInputResponse(error);
    if (inputError) return inputError;
    return Response.json({ error: "Export could not be recorded. Please try again." }, { status: 500 });
  }
}
