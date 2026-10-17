import { env } from "cloudflare:workers";
import { maintenanceResponse } from "@/lib/maintenance";

type Counter = { count: number };

/** Shared, atomic limits for anonymous hosted writes, independent of browser IDs. */
export async function publicWriteGate(request: Request): Promise<Response | null> {
  const maintenance = maintenanceResponse();
  if (maintenance) return maintenance;
  const secret = (env as unknown as Record<string, unknown>).ABUSE_RATE_SECRET;
  if (typeof secret !== "string" || secret.length < 32 || !env.DB) {
    return Response.json({ error: "Public submissions are not configured." }, { status: 503 });
  }
  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip) return Response.json({ error: "Public submissions require the trusted deployment edge." }, { status: 503 });
  const hmacKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(ip));
  const client = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  const now = Date.now();
  try {
    for (const [period, window, limit] of [["minute", 60_000, 30], ["day", 86_400_000, 500]] as const) {
      const bucket = Math.floor(now / window);
      const row = await env.DB.prepare(`
        INSERT INTO public_write_limits (key, window_start, count, expires_at) VALUES (?, ?, 1, ?)
        ON CONFLICT(key) DO UPDATE SET
          count = CASE WHEN window_start = excluded.window_start THEN count + 1 ELSE 1 END,
          window_start = excluded.window_start,
          expires_at = excluded.expires_at
        RETURNING count
      `).bind(`${period}:${client}`, bucket, (bucket + 2) * window).first<Counter>();
      if (!row || row.count > limit) {
        return Response.json({ error: "Submission limit reached. Please try later." }, {
          status: 429, headers: { "Retry-After": String(Math.ceil((window - now % window) / 1000)) },
        });
      }
    }
    if (crypto.getRandomValues(new Uint8Array(1))[0] === 0) {
      await env.DB.prepare("DELETE FROM public_write_limits WHERE expires_at < ?").bind(now).run();
    }
  } catch {
    return Response.json({ error: "Public submissions are temporarily unavailable." }, { status: 503 });
  }
  return null;
}
