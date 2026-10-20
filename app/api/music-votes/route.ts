import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { musicVotes } from "@/db/schema";
import type { MusicCounts } from "@/lib/music-preferences";
import { musicCandidates } from "@/lib/music-catalog";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";

const privateHeaders = { "Cache-Control": "private, no-store" };
const knownTracks = new Set(musicCandidates.map(track => track.url));

async function snapshot(userId?: string) {
  const db = getDb();
  const rows = await db.select({ userId: musicVotes.userId, trackUrl: musicVotes.trackUrl, choice: musicVotes.choice }).from(musicVotes);
  const totals = { keep: 0, pass: 0 };
  const byTrack: MusicCounts = {};
  const mine: Record<string, "keep" | "pass"> = {};
  for (const row of rows) {
    if (!knownTracks.has(row.trackUrl)) continue;
    if (row.choice === "keep" || row.choice === "pass") {
      totals[row.choice]++;
      const counts = byTrack[row.trackUrl] ??= { keep: 0, pass: 0 };
      counts[row.choice]++;
      if (userId && row.userId === userId) mine[row.trackUrl] = row.choice;
    }
  }
  return { totals, byTrack, mine, signedIn: Boolean(userId) };
}

export async function GET() {
  try {
    const user = await getChatGPTUser();
    return Response.json(await snapshot(user?.userId), { headers: privateHeaders });
  } catch {
    return Response.json({ error: "Music votes could not be loaded." }, { status: 500, headers: privateHeaders });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in to submit music votes." }, { status: 401, headers: privateHeaders });
  try {
    const data = await readJsonObject(request, 4096);
    const trackUrl = data.trackUrl;
    const choice = data.choice;
    if (typeof trackUrl !== "string" || !knownTracks.has(trackUrl) || (choice !== "keep" && choice !== "pass" && choice !== null)) {
      return Response.json({ error: "Invalid music vote." }, { status: 400, headers: privateHeaders });
    }
    const db = getDb();
    if (choice === null) {
      await db.delete(musicVotes).where(and(eq(musicVotes.userId, user.userId), eq(musicVotes.trackUrl, trackUrl)));
    } else {
      await db.insert(musicVotes).values({ userId: user.userId, trackUrl, choice, userEmail: user.email, userName: user.displayName, updatedAt: Date.now() })
        .onConflictDoUpdate({ target: [musicVotes.userId, musicVotes.trackUrl], set: { choice, userEmail: user.email, userName: user.displayName, updatedAt: Date.now() } });
    }
    return Response.json(await snapshot(user.userId), { headers: privateHeaders });
  } catch (error) {
    const badInput = requestInputResponse(error);
    if (badInput) return badInput;
    return Response.json({ error: "Music vote could not be saved." }, { status: 500, headers: privateHeaders });
  }
}
