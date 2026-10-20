import { sql } from "drizzle-orm";
import { targets, submissionOwners } from "@/db/schema";
// Admin-owned historical uploads stay quarantined until a reviewed ownership migration.
export const publicTargetPredicate = sql`NOT EXISTS (SELECT 1 FROM ${submissionOwners} WHERE ${submissionOwners.recordKind}='target' AND ${submissionOwners.recordId}=${targets.id} AND ${submissionOwners.subjectId} IN ('owner','invite:layout-test-only'))`;
