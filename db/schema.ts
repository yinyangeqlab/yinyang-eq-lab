import { uniqueIndex, index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
  reliabilityWeight: real("reliability_weight").notNull().default(0.5),
  eligible: integer("eligible").notNull().default(0),
  testMode: text("test_mode").notNull().default("open"),
  headphoneType: text("headphone_type"),
  reasonSide: text("reason_side"),
  reasonTags: text("reason_tags"),
  otherReason: text("other_reason"),
}, table => [index("votes_voter_id_idx").on(table.voterId)]);

export const rankedTrials = sqliteTable("ranked_trials", {
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
