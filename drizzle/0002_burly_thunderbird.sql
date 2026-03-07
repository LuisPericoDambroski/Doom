CREATE TABLE `gameScores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`score` int NOT NULL,
	`gameMode` varchar(64) NOT NULL DEFAULT 'singleplayer',
	`enemiesKilled` int NOT NULL DEFAULT 0,
	`timePlayedSeconds` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gameScores_id` PRIMARY KEY(`id`)
);
