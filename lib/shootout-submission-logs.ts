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

export function logShootoutSubmissionFailure(endpoint: "/api/listening-runs" | "/api/votes",
  stage: ShootoutSubmissionStage, reason: ShootoutSubmissionFailureReason, response: Response): Response {
  // Pass only fixed codes and the HTTP status. Error text, identifiers, and request data
  // stay out of the diagnostic event, including when a database operation fails.
  const event = { event: "shootout_submission_failed", endpoint, stage, reason, status: response.status };
  if (response.status >= 500) console.error(event);
  else console.warn(event);
  return response;
}
