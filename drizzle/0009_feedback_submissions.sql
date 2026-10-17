CREATE TABLE `feedback_submissions` (
  `id` text PRIMARY KEY NOT NULL,
  `participant_id` text NOT NULL,
  `comparison_id` text NOT NULL,
  `test_mode` text NOT NULL,
  `headphone_type` text NOT NULL,
  `side` text NOT NULL,
  `target_a_id` text NOT NULL,
  `target_b_id` text NOT NULL,
  `reason_tags` text NOT NULL,
  `other_reason` text,
  `song_title` text,
  `song_artist` text,
  `song_album` text,
  `created_at` integer NOT NULL,
  `review_status` text DEFAULT 'pending' NOT NULL
);
CREATE INDEX `feedback_participant_created_idx` ON `feedback_submissions` (`participant_id`,`created_at`);
CREATE INDEX `feedback_comparison_idx` ON `feedback_submissions` (`comparison_id`);
CREATE UNIQUE INDEX `feedback_once_per_side_idx` ON `feedback_submissions` (`participant_id`,`comparison_id`,`side`);
CREATE TABLE `comparison_choices` (
  `id` text PRIMARY KEY NOT NULL,
  `participant_id` text NOT NULL,
  `test_mode` text NOT NULL,
  `headphone_type` text NOT NULL,
  `target_a_id` text NOT NULL,
  `target_b_id` text NOT NULL,
  `result` text NOT NULL,
  `song_title` text,
  `song_artist` text,
  `song_album` text,
  `created_at` integer NOT NULL
);
CREATE INDEX `comparison_choices_participant_idx` ON `comparison_choices` (`participant_id`,`created_at`);
