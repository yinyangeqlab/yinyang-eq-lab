import { env } from "cloudflare:workers";

export function maintenanceEnabled(): boolean {
  const value = (env as unknown as Record<string, unknown>).MAINTENANCE_MODE;
  return value === "true" || value === "1";
}

export function maintenanceResponse(): Response | null {
  if (!maintenanceEnabled()) return null;
  return Response.json(
    { error: "The site is undergoing maintenance. Please try again shortly." },
    { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } },
  );
}
