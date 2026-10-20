import { env } from "cloudflare:workers";
import { RequestInputError } from "@/lib/request-json";

export const dataTables = { vote: "votes", open: "comparison_choices", run: "listening_runs", feedback: "feedback_submissions", measurement: "research_measurements", export: "preference_exports", target: "targets", suggestion: "suggestions", trial: "ranked_trials" } as const;
export type DataKind = keyof typeof dataTables | "music";
const uuid = /^[a-f0-9-]{36}$/i;
// These statements execute in one D1 transaction, including the temporary audit-erasure authorization.
export async function eraseData(subjectId: string | null, selection?: { kind: string; id: string }) {
  const db = env.DB;
  if (!db) throw new Error("Database unavailable");
  if (selection && (!(Object.hasOwn(dataTables, selection.kind)) && selection.kind !== "music" || selection.kind !== "music" && !uuid.test(selection.id))) throw new RequestInputError("Invalid submission.", 400);
  if (!subjectId && (!selection || selection.kind === "music")) throw new RequestInputError("Choose a submission.", 400);
  const statements: D1PreparedStatement[] = [];
  const add = (sql: string, ...args: (string | number)[]) => statements.push(db.prepare(sql).bind(...args));
  const day = new Date().toISOString().slice(0, 10);
  const tally = (kind: string) => add(`INSERT INTO deletion_daily_totals(day,record_kind,deleted_count)
    SELECT ?,?,changes() WHERE changes()>0
    ON CONFLICT(day,record_kind) DO UPDATE SET deleted_count=deleted_count+excluded.deleted_count`, day, kind);
  // No submission IDs, subjects, content, actors, request IDs or exact times survive here.
  if (selection?.kind === "music") {
    add("DELETE FROM music_votes WHERE user_id=? AND track_url=?", subjectId!, selection.id);
    tally("music");
    add("DELETE FROM submission_owners WHERE record_kind='music' AND record_id=? AND subject_id=?", JSON.stringify([subjectId, selection.id]), subjectId!);
    await db.batch(statements); return;
  }
  if (selection && !subjectId) {
    const table = dataTables[selection.kind as keyof typeof dataTables];
    if (!table || !await db.prepare(`SELECT 1 AS found FROM ${table} WHERE id=?`).bind(selection.id).first()) throw new RequestInputError("Submission not found.",404);
  }
  if (selection && subjectId) {
    const own = await db.prepare("SELECT 1 AS found FROM submission_owners WHERE record_kind=? AND record_id=? AND subject_id=?").bind(selection.kind, selection.id, subjectId).first();
    if (!own) throw new RequestInputError("Submission not found in your verified ownership records. Older submissions need admin assistance.", 404);
  }
  if (selection) {
    add("INSERT OR IGNORE INTO privacy_erasure_scope(record_kind,record_id) VALUES (?,?)", selection.kind, selection.id);
    if (subjectId && ["vote", "run", "open", "trial"].includes(selection.kind)) {
      // Expand only through authenticated ownership, never through a supplied browser ID.
      let comparisonId = selection.id;
      if (selection.kind === "run") {
        const run = await db.prepare("SELECT trial_id FROM listening_runs WHERE id=?").bind(selection.id).first<{ trial_id: string | null }>();
        comparisonId = run?.trial_id || selection.id;
      }
      add(`INSERT OR IGNORE INTO privacy_erasure_scope(record_kind,record_id)
        SELECT record_kind,record_id FROM submission_owners WHERE subject_id=? AND (
          (record_kind IN ('vote','trial','open') AND record_id=?) OR
          (record_kind='run' AND record_id IN (SELECT id FROM listening_runs WHERE trial_id=? OR id=?)) OR
          (record_kind='feedback' AND record_id IN (SELECT id FROM feedback_submissions WHERE comparison_id=?)))`, subjectId, comparisonId, comparisonId, comparisonId, comparisonId);
    }
  } else {
    add("INSERT OR IGNORE INTO privacy_erasure_scope(record_kind,record_id) SELECT record_kind,record_id FROM submission_owners WHERE subject_id=?", subjectId!);
  }
  // Delete original attachment bytes explicitly as well as their metadata.
  add("DELETE FROM research_measurement_chunks WHERE measurement_id IN (SELECT record_id FROM privacy_erasure_scope WHERE record_kind='measurement')");
  tally("measurement_file_chunk");
  add("DELETE FROM moderation_events WHERE EXISTS (SELECT 1 FROM privacy_erasure_scope s WHERE s.record_kind=moderation_events.record_kind AND s.record_id=moderation_events.record_id)");
  tally("admin_note");
  for (const [kind, table] of Object.entries(dataTables)) {
    add(`DELETE FROM ${table} WHERE id IN (SELECT record_id FROM privacy_erasure_scope WHERE record_kind=?)`, kind);
    tally(kind);
  }
  add("DELETE FROM ranked_pair_claims WHERE trial_id IN (SELECT record_id FROM privacy_erasure_scope WHERE record_kind='trial' OR record_kind='vote')");
  add("DELETE FROM submission_owners WHERE EXISTS (SELECT 1 FROM privacy_erasure_scope s WHERE s.record_kind=submission_owners.record_kind AND s.record_id=submission_owners.record_id)");
  add("DELETE FROM privacy_erasure_scope");
  if (!selection) {
    add("DELETE FROM music_votes WHERE user_id=?", subjectId!);
    tally("music");
    add("DELETE FROM privacy_sessions WHERE subject_id=?", subjectId!);
    add("DELETE FROM privacy_accounts WHERE subject_id=?", subjectId!);
    if (subjectId!.startsWith("invite:")) add("DELETE FROM private_tester_invites WHERE id=?", subjectId!.slice(7));
  }
  await db.batch(statements);
}
