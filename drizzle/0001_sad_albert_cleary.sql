CREATE TABLE `completed_courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`course_code` text NOT NULL,
	`units` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `degree_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year` integer NOT NULL,
	`category` text NOT NULL,
	`required_units` integer NOT NULL,
	`required_courses` text
);
--> statement-breakpoint
DROP TABLE `messages`;