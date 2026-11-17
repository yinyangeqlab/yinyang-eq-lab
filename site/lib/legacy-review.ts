import { env } from "cloudflare:workers";
import { RequestInputError } from "@/lib/request-json";
import {LEGACY_CUTOFF} from "@/lib/legacy-notice";
export {LEGACY_CUTOFF,RETROSPECTIVE_NOTICE_VERSION} from "@/lib/legacy-notice";
export const legacyKinds = ["vote", "open", "run"] as const;
export type LegacyKind = typeof legacyKinds[number];
export function legacyKind(value: unknown): value is LegacyKind { return legacyKinds.includes(value as LegacyKind); }
export function validId(value: unknown): value is string { return typeof value === "string" && /^[a-f0-9-]{36}$/i.test(value); }
export async function legacyGraph(kind: LegacyKind, id: string) {
 const db=env.DB!;
 const table={vote:"votes",open:"comparison_choices",run:"listening_runs"}[kind];
 const root=await db.prepare(`SELECT * FROM ${table} WHERE id=? AND created_at<?`).bind(id,LEGACY_CUTOFF).first<Record<string,unknown>>();
 if(!root)throw new RequestInputError("Historical submission is unavailable.",404);
 const browser=String(root.voter_id??root.participant_id),comparison=String(kind==="run"?root.trial_id||id:id);
 // Explicit comparison/trial keys and matching original browser only. Never bulk-claim a browser.
 const result=await db.prepare(`SELECT 'vote' kind,id FROM votes WHERE id=? AND voter_id=? AND created_at<?
 UNION SELECT 'trial',id FROM ranked_trials WHERE id=? AND voter_id=?
 UNION SELECT 'open',id FROM comparison_choices WHERE id=? AND participant_id=? AND created_at<?
 UNION SELECT 'run',id FROM listening_runs WHERE (trial_id=? OR id=?) AND voter_id=? AND created_at<?
 UNION SELECT 'feedback',id FROM feedback_submissions WHERE comparison_id=? AND participant_id=? AND created_at<?`).bind(comparison,browser,LEGACY_CUTOFF,comparison,browser,comparison,browser,LEGACY_CUTOFF,comparison,comparison,browser,LEGACY_CUTOFF,comparison,browser,LEGACY_CUTOFF).all<{kind:string;id:string}>();
 const rows=result.results||[];
 if(!rows.some(r=>r.kind===kind&&r.id===id))throw new RequestInputError("Comparison linkage is inconsistent; review it manually.",409);
 return {root,rows};
}
