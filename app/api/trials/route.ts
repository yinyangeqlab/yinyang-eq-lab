import { submissionContext } from "@/lib/submission-ownership";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { rankedTrials, targets, votes } from "@/db/schema";
import { targetHeadphoneType, type HeadphoneType } from "@/lib/target-type";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";
import { publicWriteGate } from "@/lib/public-write-gate";

const validVoter = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9-]{36}$/.test(value);

export async function POST(request: Request) {
  try {
    const ownership = await submissionContext("trial");
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const data = await readJsonObject(request, 1024);
    if (!validVoter(data.voterId) || (data.testMode !== "blind" && data.testMode !== "bring") || (data.headphoneType !== "ie" && data.headphoneType !== "oe")) {
      return Response.json({ error: "Invalid trial request." }, { status: 400 });
    }
    const headphoneType = data.headphoneType as HeadphoneType;
    const db = getDb();
    const now = Date.now();
    const recent = await db.select({ issuedAt: rankedTrials.issuedAt }).from(rankedTrials)
      .where(eq(rankedTrials.voterId, data.voterId)).orderBy(desc(rankedTrials.issuedAt)).limit(1);
    if (recent[0] && now - recent[0].issuedAt < 1000) {
      return Response.json({ error: "Please wait a moment before starting another pairing." }, { status: 429 });
    }
    const approvedRows = await db.select({ id: targets.id, name: targets.name, measurement: targets.measurement }).from(targets).where(eq(targets.status, "approved"));
    const approved = approvedRows.filter(target => {
      let measurement: unknown = null;
      try { measurement = target.measurement ? JSON.parse(target.measurement) : null; } catch {}
      const kind = targetHeadphoneType({ name: target.name, measurement: measurement && typeof measurement === "object" ? measurement as { type?: unknown } : null });
      return !kind || kind === headphoneType;
    });
    if (approved.length < 2) return Response.json({ error: `At least two approved ${headphoneType === "ie" ? "In-Ear" : "Over-Ear"} targets are needed.` }, { status: 503 });
    const previous = await db.select({ winnerId: votes.winnerId, loserId: votes.loserId }).from(votes)
      .where(and(eq(votes.voterId, data.voterId), eq(votes.testMode, data.testMode)));
    const seen = new Set(previous.map(row => [row.winnerId, row.loserId].sort().join("|")));
    const candidates: [string, string][] = [];
    for (let a = 0; a < approved.length; a++) for (let b = a + 1; b < approved.length; b++) {
      const pair: [string, string] = [approved[a].id, approved[b].id];
      if (!seen.has(pair.slice().sort().join("|"))) candidates.push(pair);
    }
    const random = (length: number) => crypto.getRandomValues(new Uint32Array(1))[0] % length;
    let pair: [string, string];
    if (previous.length > 0 && random(20) === 0) {
      const id = approved[random(approved.length)].id;
      pair = [id, id];
    } else {
      const pool = candidates.length ? candidates : approved.flatMap((left, a) => approved.slice(a + 1).map(right => [left.id, right.id] as [string, string]));
      pair = pool[random(pool.length)];
      if (random(2)) pair = [pair[1], pair[0]];
    }
    const id = crypto.randomUUID();
    await db.batch([db.insert(rankedTrials).values({ id, voterId: data.voterId, testMode: data.testMode, sideA: pair[0], sideB: pair[1], issuedAt: now }), ownership.record(id)]);
    return Response.json({ trialId: id, pair }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const inputError = requestInputResponse(error);
    if (inputError) return inputError;
    return Response.json({ error: "Could not start the ranked pairing." }, { status: 500 });
  }
}
