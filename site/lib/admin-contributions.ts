import { RequestInputError } from "@/lib/request-json";

export const ADMIN_TEST_ONLY_MESSAGE = "Admin test only: this activity cannot be submitted to research, public rankings or community votes. Use your separate participant account for real contributions.";
export function isAdminSubject(subjectId: string) { return subjectId === "owner"; }
export const LAYOUT_TEST_SUBJECT = "invite:layout-test-only";
export function isTestSubject(subjectId:string) { return isAdminSubject(subjectId)||subjectId===LAYOUT_TEST_SUBJECT; }
export function requireParticipantSubject(subjectId: string) {
  if (subjectId===LAYOUT_TEST_SUBJECT) throw new RequestInputError("Private test only: this account cannot submit research, public rankings or community votes.",403);
  if (isAdminSubject(subjectId)) throw new RequestInputError(ADMIN_TEST_ONLY_MESSAGE, 403);
}
