import { sql } from "drizzle-orm";
import { check, uniqueIndex, index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const targets = sqliteTable("targets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  creator: text("creator").notNull(),
  description: text("description").notNull().default(""),
  curveKind: text("curve_kind").notNull().default("original"),
  parentTargetId: text("parent_target_id"),
  points: text("points").notNull(),
  rating: real("rating").notNull().default(1500),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  status: text("status").notNull().default("pending"),
  reviewReason: text("review_reason").notNull().default(""),
  measurement: text("measurement"),
  headphoneType: text("headphone_type"),
  referenceSystem: text("reference_system").notNull().default("Unknown"),
  submissionKind: text("submission_kind").notNull().default("target"),
});

export const researchMeasurements = sqliteTable("research_measurements", {
  id: text("id").primaryKey(),
  contributorId: text("contributor_id").notNull(),
  localId: text("local_id").notNull(),
  name: text("name").notNull(),
  device: text("device").notNull(),
  type: text("type").notNull(),
  rig: text("rig").notNull(),
  fit: text("fit").notNull().default(""),
  notes: text("notes").notNull().default(""),
  source: text("source").notNull().default(""),
  driverType: text("driver_type"),
  nozzleDiameterMm: real("nozzle_diameter_mm"),
  files: text("files").notNull(),
  createdAt: integer("created_at").notNull(),
}, table => [index("research_measurements_contributor_idx").on(table.contributorId)]);

// Original bytes are split so each row remains below D1's 2 MB row limit.
export const researchMeasurementChunks = sqliteTable("research_measurement_chunks", {
  measurementId: text("measurement_id").notNull().references(() => researchMeasurements.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  base64: text("base64").notNull(),
}, table => [primaryKey({ columns: [table.measurementId, table.kind, table.chunkIndex] })]);

export const preferenceExports = sqliteTable("preference_exports", {
  id: text("id").primaryKey(),
  targetId: text("target_id").notNull(),
  targetName: text("target_name").notNull(),
  targetCreator: text("target_creator").notNull(),
  measurementName: text("measurement_name"),
  exportKind: text("export_kind").notNull(),
  format: text("format").notNull(),
  filename: text("filename").notNull(),
  contents: text("contents").notNull(),
  settings: text("settings").notNull(),
  curve: text("curve").notNull(),
  bands: integer("bands"),
  method: text("method"),
  priority: text("priority"),
  preamp: real("preamp"),
  rms: real("rms"),
  filters: text("filters"),
  createdAt: integer("created_at").notNull(),
}, table => [index("preference_exports_created_idx").on(table.createdAt)]);

export const listeningRuns = sqliteTable("listening_runs", {
  id: text("id").primaryKey(),
  voterId: text("voter_id").notNull(),
  testMode: text("test_mode").notNull(),
  headphoneType: text("headphone_type").notNull(),
  targetAId: text("target_a_id").notNull(),
  targetBId: text("target_b_id").notNull(),
  targetAName: text("target_a_name").notNull(),
  targetBName: text("target_b_name").notNull(),
  measurementId: text("measurement_id"),
  trialId: text("trial_id"),
  protocolVersion: text("protocol_version").notNull().default("legacy-v1"),
  researchContext: text("research_context"),
  result: text("result").notNull(),
  intervals: text("intervals").notNull(),
  heardA: real("heard_a").notNull(),
  heardB: real("heard_b").notNull(),
  overlapSeconds: real("overlap_seconds").notNull(),
  songTitle: text("song_title"),
  songArtist: text("song_artist"),
  songAlbum: text("song_album"),
  recordingId: text("recording_id"),
  createdAt: integer("created_at").notNull(),
}, table => [index("listening_runs_voter_created_idx").on(table.voterId, table.createdAt), uniqueIndex("listening_runs_trial_idx").on(table.trialId)]);

export const votes = sqliteTable("votes", {
  id: text("id").primaryKey(),
  winnerId: text("winner_id").notNull(),
  loserId: text("loser_id").notNull(),
  voterId: text("voter_id").notNull(),
  createdAt: integer("created_at").notNull(),
  songTitle: text("song_title"),
  songArtist: text("song_artist"),
  songAlbum: text("song_album"),
  recordingId: text("recording_id"),
  sha256: text("sha256"),
  intervals: text("intervals"),
  heardA: real("heard_a"),
  heardB: real("heard_b"),
  overlapSeconds: real("overlap_seconds"),
  audioFormat: text("audio_format"),
  sampleRate: integer("sample_rate"),
  bitrate: integer("bitrate"),
  duration: real("duration"),
  protocolVersion: text("protocol_version").notNull().default("legacy-v1"),
  reliabilityWeight: real("reliability_weight").notNull().default(0.5),
  eligible: integer("eligible").notNull().default(0),
  testMode: text("test_mode").notNull().default("open"),
  headphoneType: text("headphone_type"),
  reasonSide: text("reason_side"),
  reasonTags: text("reason_tags"),
  otherReason: text("other_reason"),
}, table => [index("votes_voter_id_idx").on(table.voterId),index("votes_winner_idx").on(table.winnerId),index("votes_loser_idx").on(table.loserId)]);

export const rankedTrials = sqliteTable("ranked_trials", {
  targetVersions: text("target_versions"),
  headphoneType: text("headphone_type"),
  protocolVersion: text("protocol_version").notNull().default("legacy-v1"),
  id: text("id").primaryKey(),
  voterId: text("voter_id").notNull(),
  testMode: text("test_mode").notNull(),
  sideA: text("side_a").notNull(),
  sideB: text("side_b").notNull(),
  issuedAt: integer("issued_at").notNull(),
}, table => [index("ranked_trials_voter_issued_idx").on(table.voterId, table.issuedAt)]);

export const rankedPairClaims = sqliteTable("ranked_pair_claims", {
  voterId: text("voter_id").notNull(),
  testMode: text("test_mode").notNull(),
  firstId: text("first_id").notNull(),
  secondId: text("second_id").notNull(),
  trialId: text("trial_id").notNull(),
}, table => [primaryKey({ columns: [table.voterId, table.testMode, table.firstId, table.secondId] })]);

export const feedbackSubmissions = sqliteTable("feedback_submissions", {
  id: text("id").primaryKey(),
  participantId: text("participant_id").notNull(),
  comparisonId: text("comparison_id").notNull(),
  testMode: text("test_mode").notNull(),
  headphoneType: text("headphone_type").notNull(),
  side: text("side").notNull(),
  targetAId: text("target_a_id").notNull(),
  targetBId: text("target_b_id").notNull(),
  reasonTags: text("reason_tags").notNull(),
  otherReason: text("other_reason"),
  songTitle: text("song_title"),
  songArtist: text("song_artist"),
  songAlbum: text("song_album"),
  createdAt: integer("created_at").notNull(),
  reviewStatus: text("review_status").notNull().default("pending"),
}, table => [
  index("feedback_participant_created_idx").on(table.participantId, table.createdAt),
  index("feedback_comparison_idx").on(table.comparisonId),
]);

export const comparisonChoices = sqliteTable("comparison_choices", {
  protocolVersion:text("protocol_version").notNull().default("legacy-v1"),
  id: text("id").primaryKey(),
  participantId: text("participant_id").notNull(),
  testMode: text("test_mode").notNull(),
  headphoneType: text("headphone_type").notNull(),
  targetAId: text("target_a_id").notNull(),
  targetBId: text("target_b_id").notNull(),
  result: text("result").notNull(),
  songTitle: text("song_title"),
  songArtist: text("song_artist"),
  songAlbum: text("song_album"),
  createdAt: integer("created_at").notNull(),
}, table => [index("comparison_choices_participant_idx").on(table.participantId, table.createdAt)]);

export const suggestions = sqliteTable("suggestions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  album: text("album").notNull().default(""),
  recordingId: text("recording_id").notNull().default(""),
  note: text("note").notNull().default(""),
  createdAt: integer("created_at").notNull(),
});

export const musicVotes = sqliteTable("music_votes", {
  userId: text("user_id").notNull(),
  trackUrl: text("track_url").notNull(),
  choice: text("choice").notNull(),
  userEmail: text("user_email").notNull(),
  userName: text("user_name").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, table => [primaryKey({ columns: [table.userId, table.trackUrl] }), index("music_votes_track_idx").on(table.trackUrl)]);

// These tables are also used by raw SQL in the edge and write gate. Keep them
// in the schema so future generated migrations do not propose dropping them.
export const publicWriteLimits = sqliteTable("public_write_limits", {
  key: text("key").primaryKey().notNull(),
  windowStart: integer("window_start").notNull(),
  count: integer("count").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, table => [index("public_write_limits_expiry_idx").on(table.expiresAt)]);

export const publicWritePenalties = sqliteTable("public_write_penalties", {
  key: text("key").primaryKey().notNull(),
  level: integer("level").notNull(),
  hits: integer("hits").notNull(),
  blockedUntil: integer("blocked_until").notNull(),
  lastEscalatedAt: integer("last_escalated_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const privateTesterInvites = sqliteTable("private_tester_invites", {
  id: text("id").primaryKey().notNull(),
  label: text("label").notNull(),
  codeHash: text("code_hash").notNull().unique(),
  createdAt: integer("created_at").notNull(),
  codeExpiresAt: integer("code_expires_at").notNull(),
  redeemedAt: integer("redeemed_at"),
  sessionHash: text("session_hash").unique(),
  sessionExpiresAt: integer("session_expires_at"),
  revokedAt: integer("revoked_at"),
}, table => [index("private_tester_invites_session_idx").on(table.sessionHash)]);

// Append-only review history. Original submissions and one-use trial IDs remain intact.
export const moderationEvents = sqliteTable("moderation_events", {
  sequence: integer("sequence").primaryKey({ autoIncrement: true }),
  recordKind: text("record_kind").notNull(),
  recordId: text("record_id").notNull(),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  actor: text("actor").notNull(),
  createdAt: integer("created_at").notNull(),
}, table => [index("moderation_record_idx").on(table.recordKind, table.recordId, table.sequence)]);

export const privacyAccounts = sqliteTable("privacy_accounts", {
  subjectId: text("subject_id").primaryKey(),
  submissionsEnabled: integer("submissions_enabled").notNull().default(0),
  shareMusic: integer("share_music").notNull().default(0),
  agreementVersion: text("agreement_version"),
  agreedAt: integer("agreed_at"),
  withdrawnAt: integer("withdrawn_at"),
  activityMonitoringEnabled: integer("activity_monitoring_enabled").notNull().default(0),
  activityMonitoringVersion: text("activity_monitoring_version"),
  activityMonitoringAgreedAt: integer("activity_monitoring_agreed_at"),
  activityMonitoringWithdrawnAt: integer("activity_monitoring_withdrawn_at"),
});
// Identifiable, user-opted-in first-party activity only. No raw URL query,
// typed content, IP address, device fingerprint, audio, or general clickstream.
export const activityEvents = sqliteTable("activity_events", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id").notNull(),
  sessionId: text("session_id").notNull(),
  eventType: text("event_type").notNull(),
  route: text("route").notNull(),
  shootoutTab: text("shootout_tab"),
  testMode: text("test_mode"),
  testActive: integer("test_active").notNull().default(0),
  createdAt: integer("created_at").notNull(),
}, table => [
  index("activity_events_subject_created_idx").on(table.subjectId, table.createdAt),
  index("activity_events_session_created_idx").on(table.sessionId, table.createdAt),
]);
export const privacySessions = sqliteTable("privacy_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  subjectId: text("subject_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
export const submissionOwners = sqliteTable("submission_owners", {
  recordKind: text("record_kind").notNull(), recordId: text("record_id").notNull(),
  subjectId: text("subject_id").notNull(), sessionHash: text("session_hash").notNull(),
}, table => [primaryKey({ columns: [table.recordKind, table.recordId] }), index("submission_owner_subject_idx").on(table.subjectId)]);
export const privacyErasureScope = sqliteTable("privacy_erasure_scope", {
  recordKind: text("record_kind").notNull(), recordId: text("record_id").notNull(),
}, table => [primaryKey({ columns: [table.recordKind, table.recordId] })]);

// Admin-only date/category totals; never store identity or erased-record linkage.
export const deletionDailyTotals = sqliteTable("deletion_daily_totals", {
  day: text("day").notNull(), recordKind: text("record_kind").notNull(),
  deletedCount: integer("deleted_count").notNull(),
}, table => [primaryKey({ columns: [table.day, table.recordKind] }),
  check("deletion_totals_positive", sql`${table.deletedCount} > 0`),
  check("deletion_totals_kind", sql`${table.recordKind} IN ('vote','open','run','feedback','measurement','export','target','suggestion','trial','music','measurement_file_chunk','admin_note')`),
]);

// No participant IDs, vote IDs, fingerprints, per-user hashes or source membership lists.
export const statisticsArchive = sqliteTable("statistics_archive", {
  year: integer("year").primaryKey().notNull(), methodology: text("methodology").notNull(), payload: text("payload").notNull(),
}, table=>[
  check("archive_supported_year",sql`${table.year} IN (2026,2027,2028)`),
  check("archive_method",sql`${table.methodology}='bounded-geometric-v1'`),
  check("archive_payload_json",sql`json_valid(${table.payload})`),
]);
export const archiveSourceRevision = sqliteTable("archive_source_revision", {
  id: integer("id").primaryKey().notNull(), revision: integer("revision").notNull(),
}, table=>[check("archive_revision_singleton",sql`${table.id}=1`)]);

export const archiveStudies = sqliteTable("archive_studies", {
 id:text("id").primaryKey().notNull(), targetA:text("target_a").notNull(), targetB:text("target_b").notNull(),
 mode:text("mode").notNull(), headphoneType:text("headphone_type").notNull(), startAt:integer("start_at").notNull(), endAt:integer("end_at").notNull(),
 noticeVersion:text("notice_version").notNull(),methodology:text("methodology").notNull(),
 sourceMode:text("source_mode").notNull().default("prospective"),sealAfter:integer("seal_after"),
},table=>[uniqueIndex("archive_studies_query_unique").on(table.targetA,table.targetB,table.mode,table.headphoneType,table.startAt,table.endAt),
check("archive_study_mode",sql`${table.mode} IN ('blind','bring')`),check("archive_study_headphone",sql`${table.headphoneType} IN ('ie','oe')`),check("archive_study_window",sql`${table.endAt}>${table.startAt}`)]);
export const archiveReleases = sqliteTable("archive_releases", {
 sequence:integer("sequence").primaryKey().notNull(), studyId:text("study_id").notNull().unique("archive_releases_study_id_unique").references(()=>archiveStudies.id),payload:text("payload").notNull(),
},table=>[check("archive_release_nonnegative",sql`${table.sequence}>=0`),check("archive_release_json",sql`json_valid(${table.payload})`)]);

// Private verification/permission records: erased with their linked source/account.
export const legacyReviewRequests = sqliteTable("legacy_review_requests", {
 id:text("id").primaryKey().notNull(),subjectId:text("subject_id").notNull(),recordKind:text("record_kind").notNull(),recordId:text("record_id").notNull(),
 message:text("message").notNull(),status:text("status").notNull().default("pending"),adminReason:text("admin_reason"),createdAt:integer("created_at").notNull(),reviewedAt:integer("reviewed_at"),
},t=>[index("legacy_requests_subject_idx").on(t.subjectId),check("legacy_request_status",sql`${t.status} IN ('pending','approved','rejected')`),check("legacy_request_kind",sql`${t.recordKind} IN ('vote','open','run')`)]);
export const legacyRecordVerifications = sqliteTable("legacy_record_verifications", {
 recordKind:text("record_kind").notNull(),recordId:text("record_id").notNull(),subjectId:text("subject_id").notNull(),requestId:text("request_id").notNull().references(()=>legacyReviewRequests.id,{onDelete:"cascade"}),
},t=>[primaryKey({columns:[t.recordKind,t.recordId]}),index("legacy_verified_subject_idx").on(t.subjectId)]);
export const retrospectivePermissions = sqliteTable("retrospective_permissions", {
 studyId:text("study_id").notNull().references(()=>archiveStudies.id),subjectId:text("subject_id").notNull(),enabled:integer("enabled").notNull().default(0),noticeVersion:text("notice_version").notNull(),agreedAt:integer("agreed_at").notNull(),withdrawnAt:integer("withdrawn_at"),
},t=>[primaryKey({columns:[t.studyId,t.subjectId]}),check("retrospective_permission_enabled",sql`${t.enabled} IN (0,1)`)]);

export const comparisonRecords = sqliteTable("comparison_records", {
 recordKind: text("record_kind").notNull(), recordId: text("record_id").notNull(), comparisonId: text("comparison_id").notNull(),
}, table => [primaryKey({columns:[table.recordKind,table.recordId]}),index("comparison_records_group_idx").on(table.comparisonId)]);

export const rankingRevision = sqliteTable("ranking_revision", { id:integer("id").primaryKey(), revision:integer("revision").notNull() });

// Explicit browser linking; all browsers retain one invitation/account identity.
export const privateTesterDevices = sqliteTable("private_tester_devices", {
  sessionHash: text("session_hash").primaryKey(),
  inviteId: text("invite_id").notNull(),
  dataTokenHash: text("data_token_hash").notNull(),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, table => [index("tester_devices_invite_idx").on(table.inviteId)]);
export const browserPairings = sqliteTable("browser_pairings", {
  codeHash: text("code_hash").primaryKey(),
  inviteId: text("invite_id").notNull(),
  sourceHash: text("source_hash").notNull(),
  claimHash: text("claim_hash").unique(),
  confirmation: text("confirmation"),
  state: text("state").notNull().default("waiting"),
  transferPayload: text("transfer_payload"),
  payloadHash: text("payload_hash"),
  replacementAccepted: integer("replacement_accepted").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, table => [index("browser_pairings_invite_idx").on(table.inviteId)]);

// Site-wide admission mode; existing ownership, consent and private media stay intact.
export const siteAccessSettings = sqliteTable("site_access_settings", {
  id: integer("id").primaryKey(),
  invitesEnabled: integer("invites_enabled").notNull().default(0),
});

// Optional account-level nickname; never an authentication credential.
export const listenerNicknames = sqliteTable("listener_nicknames", {
  subjectId: text("subject_id").primaryKey().references(() => privacyAccounts.subjectId, { onDelete: "cascade" }),
  nickname: text("nickname").notNull(),
});

// Optional adaptive-discovery research, deliberately separate from ranking inputs.
export const personalResearchPermissions = sqliteTable("personal_research_permissions", {
  subjectId:text("subject_id").primaryKey().references(()=>privacyAccounts.subjectId,{onDelete:"cascade"}),
  enabled:integer("enabled").notNull().default(0), noticeVersion:text("notice_version").notNull(),
  consentToken:text("consent_token").notNull(), updatedAt:integer("updated_at").notNull(),
},table=>[check("personal_permission_enabled",sql`${table.enabled} IN (0,1)`)]);
export const personalResearchChoices = sqliteTable("personal_research_choices", {
  id:text("id").primaryKey(), subjectId:text("subject_id").notNull().references(()=>privacyAccounts.subjectId,{onDelete:"cascade"}),
  consentToken:text("consent_token").notNull(), noticeVersion:text("notice_version").notNull(),
  targetAId:text("target_a_id").notNull(),targetBId:text("target_b_id").notNull(),
  result:text("result").notNull(),headphoneType:text("headphone_type").notNull(),setupFingerprint:text("setup_fingerprint").notNull(),
  recordingId:text("recording_id").notNull(),playbackJson:text("playback_json").notNull(),selectionJson:text("selection_json").notNull(),
  phase:text("phase").notNull(),roundNumber:integer("round_number").notNull(),protocolVersion:text("protocol_version").notNull(),schedulerVersion:text("scheduler_version").notNull(),createdAt:integer("created_at").notNull(),
},table=>[index("personal_research_subject_created").on(table.subjectId,table.createdAt),check("personal_result",sql`${table.result} IN ('a','b','tie')`),check("personal_category",sql`${table.headphoneType} IN ('ie','oe')`),check("personal_phase",sql`${table.phase} IN ('explore','confirm')`),check("personal_pair_distinct",sql`${table.targetAId} != ${table.targetBId}`)]);

export const personalResearchDeletionTotals = sqliteTable("personal_research_deletion_totals", {day:text("day").primaryKey(),deletedCount:integer("deleted_count").notNull()},table=>[check("personal_deletion_positive",sql`${table.deletedCount}>0`)]);

// One owner-controlled ordinary participant identity. Public projection is opt-in per entry.
export const ownerPublicProfiles = sqliteTable("owner_public_profiles", {
  slug:text("slug").primaryKey(),subjectId:text("subject_id").notNull().unique().references(()=>privacyAccounts.subjectId,{onDelete:"cascade"}),
  inviteId:text("invite_id").notNull().unique(),policyAt:integer("policy_at").notNull(),createdAt:integer("created_at").notNull(),
},t=>[check("owner_profile_reserved_slug",sql`${t.slug}='yinyangeq'`)]);
export const ownerProfileSnapshots = sqliteTable("owner_profile_snapshots", {
  id:text("id").primaryKey(),profileSlug:text("profile_slug").notNull().references(()=>ownerPublicProfiles.slug,{onDelete:"cascade"}),
  label:text("label").notNull(),payload:text("payload").notNull(),createdAt:integer("created_at").notNull(),
},t=>[check("owner_snapshot_json",sql`json_valid(${t.payload})`)]);
export const ownerProfileGrants = sqliteTable("owner_profile_grants", {
  id:text("id").primaryKey(),profileSlug:text("profile_slug").notNull().references(()=>ownerPublicProfiles.slug,{onDelete:"cascade"}),
  tokenHash:text("token_hash").notNull().unique(),label:text("label").notNull(),snapshotId:text("snapshot_id").references(()=>ownerProfileSnapshots.id,{onDelete:"cascade"}),
  claimHash:text("claim_hash").unique(),deviceId:text("device_id"),completedAt:integer("completed_at"),activationNonce:text("activation_nonce"),
  createdAt:integer("created_at").notNull(),expiresAt:integer("expires_at").notNull(),usedAt:integer("used_at"),cancelledAt:integer("cancelled_at"),
});
export const ownerProfileDevices = sqliteTable("owner_profile_devices", {
  id:text("id").primaryKey(),profileSlug:text("profile_slug").notNull().references(()=>ownerPublicProfiles.slug,{onDelete:"cascade"}),
  sessionHash:text("session_hash").unique(),label:text("label").notNull(),createdAt:integer("created_at").notNull(),revokedAt:integer("revoked_at"),
});
export const ownerProfileEntries = sqliteTable("owner_profile_entries", {
  id:text("id").primaryKey(),profileSlug:text("profile_slug").notNull().references(()=>ownerPublicProfiles.slug,{onDelete:"cascade"}),
  recordKind:text("record_kind").notNull(),recordId:text("record_id").notNull(),state:text("state").notNull().default("draft"),
  payload:text("payload").notNull(),sourceHash:text("source_hash").notNull(),createdAt:integer("created_at").notNull(),publishedAt:integer("published_at"),
},t=>[uniqueIndex("owner_profile_record_unique").on(t.profileSlug,t.recordKind,t.recordId),check("owner_entry_state",sql`${t.state} IN ('draft','published','hidden')`),check("owner_entry_json",sql`json_valid(${t.payload})`)]);
export const ownerHistoryClaims = sqliteTable("owner_history_claims", {
  id:text("id").primaryKey(),profileSlug:text("profile_slug").notNull().references(()=>ownerPublicProfiles.slug,{onDelete:"cascade"}),
  codeHash:text("code_hash").notNull().unique(),sourceSubject:text("source_subject").notNull(),sourceSession:text("source_session").notNull(),
  evidence:text("evidence").notNull(),createdAt:integer("created_at").notNull(),expiresAt:integer("expires_at").notNull(),completedAt:integer("completed_at"),
},t=>[check("owner_history_evidence_json",sql`json_valid(${t.evidence})`)]);
export const ownerHistoryTransferScope = sqliteTable("owner_history_transfer_scope", {
  batchId:text("batch_id").notNull(),recordKind:text("record_kind").notNull(),recordId:text("record_id").notNull(),
  newRecordId:text("new_record_id").notNull(),fromSubject:text("from_subject").notNull(),toSubject:text("to_subject").notNull(),
},t=>[primaryKey({columns:[t.batchId,t.recordKind,t.recordId]})]);
export const ownerProfileEvents = sqliteTable("owner_profile_events", {
  id:text("id").primaryKey(),profileSlug:text("profile_slug").notNull().references(()=>ownerPublicProfiles.slug,{onDelete:"cascade"}),
  recordKind:text("record_kind").notNull(),recordId:text("record_id").notNull(),action:text("action").notNull(),payload:text("payload").notNull().default("{}"),createdAt:integer("created_at").notNull(),
},t=>[index("owner_events_source_idx").on(t.profileSlug,t.recordKind,t.recordId),index("owner_events_time_idx").on(t.profileSlug,t.createdAt),check("owner_event_json",sql`json_valid(${t.payload})`)]);

export const rankingChangeDays = sqliteTable("ranking_change_days", {day:text("day").notNull(),reason:text("reason").notNull(),methodVersion:text("method_version").notNull()},table=>[primaryKey({columns:[table.day,table.reason,table.methodVersion]})]);

// Prospective community permission is separate from private-only Personal consent.
export const communityPersonalPermissions = sqliteTable("community_personal_permissions", {
  subjectId:text("subject_id").primaryKey().references(()=>privacyAccounts.subjectId,{onDelete:"cascade"}),
  enabled:integer("enabled").notNull().default(0), noticeVersion:text("notice_version").notNull(),
  consentToken:text("consent_token").notNull(), updatedAt:integer("updated_at").notNull(),
},table=>[check("community_permission_enabled",sql`${table.enabled} IN (0,1)`)]);
export const communityPersonalChoices = sqliteTable("community_personal_choices", {
  id:text("id").primaryKey(), subjectId:text("subject_id").notNull().references(()=>privacyAccounts.subjectId,{onDelete:"cascade"}),
  consentToken:text("consent_token").notNull(), noticeVersion:text("notice_version").notNull(),
  targetAId:text("target_a_id").notNull(),targetBId:text("target_b_id").notNull(),
  result:text("result").notNull(),headphoneType:text("headphone_type").notNull(),setupFingerprint:text("setup_fingerprint").notNull(),
  recordingId:text("recording_id").notNull(),playbackJson:text("playback_json").notNull(),selectionJson:text("selection_json").notNull(),
  phase:text("phase").notNull(),roundNumber:integer("round_number").notNull(),protocolVersion:text("protocol_version").notNull(),schedulerVersion:text("scheduler_version").notNull(),createdAt:integer("created_at").notNull(),
},table=>[index("community_personal_subject_created").on(table.subjectId,table.createdAt),check("community_result",sql`${table.result} IN ('a','b','tie')`),check("community_category",sql`${table.headphoneType} IN ('ie','oe')`),check("community_phase",sql`${table.phase} IN ('explore','confirm')`),check("community_pair_distinct",sql`${table.targetAId} != ${table.targetBId}`)]);

export const communityPersonalDeletionTotals = sqliteTable("community_personal_deletion_totals", {day:text("day").primaryKey(),deletedCount:integer("deleted_count").notNull()},table=>[check("community_deletion_positive",sql`${table.deletedCount}>0`)]);


export const communityCatalogs = sqliteTable("community_catalogs", {id:text("id").primaryKey(),period:text("period").notNull(),headphoneType:text("headphone_type").notNull(),catalogJson:text("catalog_json").notNull(),musicJson:text("music_json").notNull(),methodVersion:text("method_version").notNull()},t=>[uniqueIndex("community_catalog_period_type").on(t.period,t.headphoneType)]);
export const communityReferenceBlocks = sqliteTable("community_reference_blocks",{id:text("id").primaryKey(),subjectId:text("subject_id").notNull().references(()=>privacyAccounts.subjectId,{onDelete:"cascade"}),catalogId:text("catalog_id").notNull().references(()=>communityCatalogs.id),consentToken:text("consent_token").notNull(),noticeVersion:text("notice_version").notNull(),setupFingerprint:text("setup_fingerprint").notNull(),createdAt:integer("created_at").notNull()},t=>[uniqueIndex("community_one_block_account_catalog").on(t.subjectId,t.catalogId)]);
export const communityReferenceAssignments = sqliteTable("community_reference_assignments",{id:text("id").primaryKey(),blockId:text("block_id").notNull().references(()=>communityReferenceBlocks.id,{onDelete:"cascade"}),ordinal:integer("ordinal").notNull(),pairIndex:integer("pair_index").notNull(),pairProbability:real("pair_probability").notNull(),sideProbability:real("side_probability").notNull(),targetAId:text("target_a_id").notNull(),targetBId:text("target_b_id").notNull(),recordingId:text("recording_id").notNull(),recordingProbability:real("recording_probability").notNull(),recordingVersion:text("recording_version"),result:text("result"),playbackJson:text("playback_json"),answeredAt:integer("answered_at")},t=>[uniqueIndex("community_assignment_ordinal").on(t.blockId,t.ordinal)]);
export const communityModeration=sqliteTable("community_moderation",{recordKind:text("record_kind").notNull(),recordId:text("record_id").notNull(),excluded:integer("excluded").notNull(),note:text("note").notNull()},t=>[primaryKey({columns:[t.recordKind,t.recordId]})]);

export const ownerAccountSync = sqliteTable("owner_account_sync", {
 profileSlug:text("profile_slug").primaryKey().references(()=>ownerPublicProfiles.slug,{onDelete:"cascade"}),epoch:text("epoch").notNull(),revision:integer("revision").notNull().default(0),initialized:integer("initialized").notNull().default(0),payload:text("payload").notNull().default("{}"),updatedAt:integer("updated_at").notNull(),
},t=>[check("owner_sync_revision",sql`${t.revision}>=0`),check("owner_sync_initialized",sql`${t.initialized} IN(0,1)`),check("owner_sync_json",sql`json_valid(${t.payload})`)]);
