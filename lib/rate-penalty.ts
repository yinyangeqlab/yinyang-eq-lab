// Persistent shared-IP cooldowns. One violation gets its normal wait; only
// sustained retries (10 blocked requests, with further escalations spaced by
// at least a minute) move through the longer waits. Records decay after 48 quiet hours.
export const COOLDOWN_SECONDS = [60, 900, 3600, 21600, 86400] as const;
export type Penalty = { level: number; hits: number; blocked_until: number; last_escalated_at: number; expires_at: number };
export const READ_PENALTY_SQL = "SELECT level, hits, blocked_until, last_escalated_at, expires_at FROM public_write_penalties WHERE key = ?";
export const BLOCKED_HIT_SQL = `UPDATE public_write_penalties SET hits = hits + 1 WHERE key = ? AND blocked_until > ? RETURNING level, hits, blocked_until, last_escalated_at, expires_at`;
export const ESCALATE_PENALTY_SQL = `UPDATE public_write_penalties SET
  level = min(level + 1, 5),
  blocked_until = max(blocked_until, ? + CASE level WHEN 1 THEN 900000 WHEN 2 THEN 3600000 WHEN 3 THEN 21600000 ELSE 86400000 END),
  hits = 0, last_escalated_at = ?, expires_at = ?
  WHERE key = ? AND hits >= 10 AND (level = 1 OR last_escalated_at <= ?) AND blocked_until > ?
  RETURNING level, hits, blocked_until, last_escalated_at, expires_at`;
// A completed cooldown always resets the next incident to the normal wait.
// Only ESCALATE_PENALTY_SQL may increase a level, while a block is active.
export const START_PENALTY_SQL = `INSERT INTO public_write_penalties (key, level, hits, blocked_until, last_escalated_at, expires_at)
  VALUES (?, 1, 0, ?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET
    level = 1, hits = 0,
    blocked_until = excluded.blocked_until,
    last_escalated_at = excluded.last_escalated_at,
    expires_at = excluded.expires_at
  WHERE public_write_penalties.blocked_until <= ?
  RETURNING level, hits, blocked_until, last_escalated_at, expires_at`;
export function cooldownResponse(until: number, now: number, level: number) {
  return Response.json({ error: "Thanks for listening! You’ve reached a temporary submission limit. Please come back again later.", cooldownLevel: level }, {
    status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((until - now) / 1000))), "Cache-Control": "no-store" },
  });
}
