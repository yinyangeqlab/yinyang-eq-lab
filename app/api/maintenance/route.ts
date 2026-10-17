import { maintenanceEnabled } from "@/lib/maintenance";

export async function GET() {
  return Response.json(
    { enabled: maintenanceEnabled() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
