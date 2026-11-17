import { maintenanceResponse } from "@/lib/maintenance";
import autoEq from "@/data/autoeq-catalog.json";
import jaysAudio from "@/data/jaysaudio-catalog.json";

export async function GET() {
  const maintenance = maintenanceResponse();
  if (maintenance) return maintenance;
  return Response.json({ source: "AutoEq + Jay's Audio", checkedAt: autoEq.checkedAt,
    entries: [...autoEq.entries, ...jaysAudio.entries] }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
