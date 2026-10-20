import { env } from "cloudflare:workers";
import { ownerAccessResponse } from "@/lib/owner-access";
export async function GET(request: Request) { const denied = await ownerAccessResponse(request); if (denied)
    return denied; const rows = await env.DB!.prepare("SELECT day,reason,method_version FROM ranking_change_days ORDER BY day DESC,reason LIMIT 120").all(); return Response.json({ rows: rows.results }, { headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } }); }
