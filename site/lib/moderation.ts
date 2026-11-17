export const recordKinds = ["vote", "open", "run", "feedback", "measurement", "export"] as const;
export type RecordKind = typeof recordKinds[number];
export type ModerationEvent = { sequence: number; recordKind: string; recordId: string; action: string; reason: string; actor: string; createdAt: number };
export function moderationIndex(events: ModerationEvent[]) {
  const latest = new Map<string, ModerationEvent>();
  for (const event of events) {
    const key = `${event.recordKind}:${event.recordId}`;
    if (!latest.has(key) || latest.get(key)!.sequence < event.sequence) latest.set(key, event);
  }
  return latest;
}
export function isRemoved(events: ModerationEvent[], kind: string, id: string) {
  return moderationIndex(events).get(`${kind}:${id}`)?.action === "remove";
}
