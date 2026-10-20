import { getDb } from "@/db";
import { moderationEvents } from "@/db/schema";
import { moderationIndex } from "@/lib/moderation";
export async function activeSubmissions() {
  const latest = moderationIndex(await getDb().select().from(moderationEvents));
  return (kind: string, id: string) => latest.get(`${kind}:${id}`)?.action !== "remove";
}
