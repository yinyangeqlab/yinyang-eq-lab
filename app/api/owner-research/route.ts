import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { comparisonChoices, feedbackSubmissions, listeningRuns, musicVotes, preferenceExports, researchMeasurements, targets, votes } from "@/db/schema";

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes));
}

export async function GET(request: Request) {
  const secret = (env as unknown as Record<string, unknown>).OWNER_ANALYTICS_TOKEN;
  if (typeof secret !== "string" || secret.length < 32) return Response.json({ error: "Owner access is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const bearer = request.headers.get("authorization") || "";
  const candidate = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  const [a, b] = await Promise.all([digest(secret), digest(candidate)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  if (difference || !candidate) return Response.json({ error: "Owner access denied." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  try {
    const db = getDb();
    const [voteRows, feedbackRows, targetRows, openChoices, runRows, measurementRows, exportRows, musicVoteRows] = await Promise.all([
      db.select().from(votes),
      db.select().from(feedbackSubmissions),
      db.select({ id: targets.id, name: targets.name, creator: targets.creator }).from(targets),
      db.select().from(comparisonChoices),
      db.select().from(listeningRuns),
      db.select().from(researchMeasurements),
      db.select().from(preferenceExports),
      db.select().from(musicVotes),
    ]);
    return Response.json({ votes: voteRows, feedback: feedbackRows, targets: targetRows, openChoices, listeningRuns: runRows, researchMeasurements: measurementRows, preferenceExports: exportRows, musicVotes: musicVoteRows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Research data could not be loaded. Check the feedback migration." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
