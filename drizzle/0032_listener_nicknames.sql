CREATE TABLE `listener_nicknames` (
	`subject_id` text PRIMARY KEY NOT NULL,
	`nickname` text NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `privacy_accounts`(`subject_id`) ON UPDATE no action ON DELETE cascade
);
