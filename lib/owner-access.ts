import { env } from "cloudflare:workers";

export async function ownerAccessResponse(request: Request): Promise<Response | null> {
  const secret = (env as unknown as Record<string, unknown>).OWNER_ANALYTICS_TOKEN;
  const headers = { "Cache-Control": "private, no-store" };
  if (typeof secret !== "string" || secret.length < 32)
    return Response.json({ error: "Owner access is not configured." }, { status: 503, headers });
  const bearer = request.headers.get("authorization") || "";
  const candidate = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  const [a, b] = await Promise.all([digest(secret), digest(candidate)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference || !candidate
    ? Response.json({ error: "Owner access denied." }, { status: 403, headers })
    : null;
}
