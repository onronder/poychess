ALTER TABLE `rooms` ADD `takeback_offer` text;--> statement-breakpoint
ALTER TABLE `rooms` ADD `white_queen_jumps` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `black_queen_jumps` integer DEFAULT 0 NOT NULL;