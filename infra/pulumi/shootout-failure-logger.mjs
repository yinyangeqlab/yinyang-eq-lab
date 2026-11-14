export const shootoutFailureHeader = "X-Internal-Shootout-Failure";

const endpoints = new Set(["/api/listening-runs", "/api/votes"]);
const stages = new Set([
  "edge", "identity", "write_gate", "request_body", "trial", "listening_record",
  "feedback", "targets", "listening_evidence", "save", "response",
]);
const reasons = new Set([
  "maintenance", "access_unavailable", "edge_guard", "request_body", "test_account",
  "listener_guard", "sign_in_required", "agreement_required", "edge_error", "unclassified",
  "request_input", "write_blocked", "internal_error", "notice_outdated",
  "invalid_comparison", "invalid_requirement", "invalid_intervals", "invalid_trial",
  "trial_mismatch", "headphone_category_changed", "protocol_changed", "insufficient_overlap",
  "playback_exceeds_trial_age", "insufficient_playback", "trial_expired", "invalid_fitter_provenance",
  "target_unavailable", "target_unapproved", "target_version_mismatch", "comparison_changed",
  "invalid_vote", "invalid_headphone_category", "vote_already_saved", "listening_record_mismatch",
  "listening_record_not_owned", "listening_record_excluded", "repeated_feedback",
  "invalid_result_type", "invalid_recording_fingerprint",
]);

export function shootoutSubmissionEndpoint(request, pathname) {
  return request.method === "POST" && endpoints.has(pathname) ? pathname : null;
}

function validFailure({ endpoint, status, stage, reason }) {
  return endpoints.has(endpoint) && Number.isInteger(status) && status >= 400 && status <= 599 &&
    stages.has(stage) && reasons.has(reason);
}

function emitFailure({ endpoint, status, stage, reason }) {
  const event = { event: "shootout_submission_failed", endpoint, stage, reason, status };
  if (status >= 500) console.error(event);
  else console.warn(event);
}

export function recordShootoutFailure(env, context, endpoint, status, marker) {
  const [stage, reason, extra] = (marker || "").split(":");
  const diagnostic = { endpoint, status, stage, reason };
  const failure = !extra && validFailure(diagnostic)
    ? diagnostic : { endpoint, status, stage: "response", reason: "unclassified" };
  if (!env.SHOOTOUT_FAILURE_LOGGER) {
    emitFailure(failure);
    return;
  }
  // The collector receives only these four fields. Delivery runs after the
  // response is ready and never retries or modifies the submission itself.
  context.waitUntil((async () => {
    try {
      const receipt = await env.SHOOTOUT_FAILURE_LOGGER.fetch("https://shootout-failure-logger.internal/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(failure),
      });
      if (receipt.status === 204) return;
    } catch {
      // If the collector is unavailable, retain the main Worker's sampled log.
    }
    emitFailure(failure);
  })());
}

const failureLogger = {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== "POST" || url.origin !== "https://shootout-failure-logger.internal" || url.pathname !== "/") {
      return new Response(null, { status: 404 });
    }
    const failure = await request.json().catch(() => null);
    if (!failure || !validFailure(failure)) return new Response(null, { status: 400 });
    emitFailure(failure);
    return new Response(null, { status: 204 });
  },
};

export default failureLogger;
