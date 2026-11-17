export type ShootoutSubmissionStage = "identity" | "write_gate" | "request_body" | "trial" |
  "listening_record" | "feedback" | "targets" | "listening_evidence" | "save";

export type ShootoutSubmissionFailureReason = "request_input" | "write_blocked" | "internal_error" | "notice_outdated" |
  "invalid_comparison" | "invalid_requirement" | "invalid_intervals" | "invalid_trial" |
  "trial_mismatch" | "headphone_category_changed" | "protocol_changed" | "insufficient_overlap" |
  "playback_exceeds_trial_age" | "insufficient_playback" | "trial_expired" | "invalid_fitter_provenance" |
  "target_unavailable" | "target_unapproved" | "target_version_mismatch" | "comparison_changed" |
  "invalid_vote" | "invalid_headphone_category" | "vote_already_saved" | "listening_record_mismatch" |
  "listening_record_not_owned" | "listening_record_excluded" | "repeated_feedback" |
  "invalid_result_type" | "invalid_recording_fingerprint";

export function markShootoutSubmissionFailure(
  stage: ShootoutSubmissionStage, reason: ShootoutSubmissionFailureReason, response: Response): Response {
  // The private gate reads and strips this marker before sending the response.
  // Only fixed codes cross this boundary. The gate already knows the route and status.
  response.headers.set("X-Internal-Shootout-Failure", `${stage}:${reason}`);
  return response;
}
