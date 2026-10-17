CREATE TABLE `public_write_limits` (
  `key` text PRIMARY KEY NOT NULL,
  `window_start` integer NOT NULL,
  `count` integer NOT NULL,
  `expires_at` integer NOT NULL
);
CREATE INDEX `public_write_limits_expiry_idx` ON `public_write_limits` (`expires_at`);
