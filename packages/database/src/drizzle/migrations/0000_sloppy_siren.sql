CREATE TABLE `designers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `designers_name_unique` ON `designers` (`name`);--> statement-breakpoint
CREATE TABLE `hotwheel_designers` (
	`hotwheel_id` integer NOT NULL,
	`designer_id` integer NOT NULL,
	PRIMARY KEY(`hotwheel_id`, `designer_id`),
	FOREIGN KEY (`hotwheel_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`designer_id`) REFERENCES `designers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`image_url` text,
	`year` text,
	`series` text,
	`model_number` text
);
