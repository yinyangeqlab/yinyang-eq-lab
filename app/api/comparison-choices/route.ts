import { and, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { comparisonChoices, targets } from "@/db/schema";
import { targetHeadphoneType } from "@/lib/target-type";
import { readJsonObject, requestInputResponse } from "@/lib/request-json";
import { publicWriteGate } from "@/lib/public-write-gate";

const uuid = /^[a-f0-9-]{36}$/i;
export async function POST(request: Request) {
  try {
    const limited = await publicWriteGate(request);
    if (limited) return limited;
    const data = await readJsonObject(request, 4096);
    const id = String(data.comparisonId || ""), participantId = String(data.participantId || "");
    const aId = String(data.targetAId || ""), bId = String(data.targetBId || "");
    if (![id,participantId,aId,bId].every(value => uuid.test(value)) || aId === bId || data.testMode !== "open" || !["ie","oe"].includes(String(data.headphoneType)) || !["a","b","tie"].includes(String(data.result))) return Response.json({ error: "Invalid open comparison." }, { status: 400 });
    const db = getDb();
    const [a] = await db.select({ status: targets.status, name: targets.name, measurement: targets.measurement }).from(targets).where(eq(targets.id,aId)).limit(1);
    const [b] = await db.select({ status: targets.status, name: targets.name, measurement: targets.measurement }).from(targets).where(eq(targets.id,bId)).limit(1);
    if (!a || !b || a.status !== "approved" || b.status !== "approved") return Response.json({ error: "Only approved targets can enter owner research." }, { status: 403 });
    const aType = targetHeadphoneType({ name: a.name, measurement: a.measurement });
    const bType = targetHeadphoneType({ name: b.name, measurement: b.measurement });
    if ((aType && aType !== data.headphoneType) || (bType && bType !== data.headphoneType)) return Response.json({ error: "Targets must match the selected headphone type." }, { status: 400 });
    const now = Date.now();
    const recent = await db.select({ id: comparisonChoices.id, createdAt: comparisonChoices.createdAt }).from(comparisonChoices).where(and(eq(comparisonChoices.participantId,participantId),gte(comparisonChoices.createdAt,now-86400000))).limit(51);
    if (recent.length >= 50 || recent.filter(row => row.createdAt >= now-600000).length >= 6) return Response.json({ error: "Comparison limit reached. Please try later." }, { status: 429 });
    const shareSong = data.shareSong === true;
    await db.insert(comparisonChoices).values({ id, participantId, testMode:"open", headphoneType:String(data.headphoneType),targetAId:aId,targetBId:bId,result:String(data.result),songTitle:shareSong?String(data.songTitle||"").trim().slice(0,120)||null:null,songArtist:shareSong?String(data.songArtist||"").trim().slice(0,120)||null:null,songAlbum:shareSong?String(data.songAlbum||"").trim().slice(0,120)||null:null,createdAt:now });
    return Response.json({ ok:true }, { status:201 });
  } catch (error) {
    const inputError = requestInputResponse(error);
    if (inputError) return inputError;
    if (String(error).includes("UNIQUE constraint failed") || String((error as { cause?: unknown })?.cause).includes("UNIQUE constraint failed")) return Response.json({ error:"This comparison was already saved." }, { status:409 });
    return Response.json({ error:"Comparison could not be saved." }, { status:500 });
  }
}
