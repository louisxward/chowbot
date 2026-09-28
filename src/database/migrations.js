// Every deployment was at schema version 5 when the earlier migrations were removed, so a new
// database is created at that version in one step, and an existing one must already be at it.
// Commit 3fd77de is the last version that can upgrade anything older.
const BASELINE_VERSION = 5;

const SCHEMA = `
  CREATE TABLE Server (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    invited TEXT NOT NULL,
    ownerUserId TEXT NOT NULL
  );

  CREATE TABLE Karma (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serverId TEXT NOT NULL,
    messageId TEXT,
    userId TEXT NOT NULL,
    fromUserId TEXT NOT NULL,
    emojiId TEXT,
    value INTEGER NOT NULL,
    reason TEXT,
    type INTEGER NOT NULL DEFAULT 0,
    created TEXT
  );
  CREATE INDEX idx_karma_userId ON Karma (userId);
  -- One row per reaction; etiquette rows have a null messageId/emojiId, so they're never caught by it
  CREATE UNIQUE INDEX idx_karma_reaction ON Karma (serverId, messageId, fromUserId, emojiId);
  CREATE INDEX idx_karma_etiquette ON Karma (serverId, fromUserId, userId, type, created);

  CREATE TABLE KarmaWeeklyLeaderboardWeek (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created TEXT NOT NULL
  );

  CREATE TABLE KarmaWeeklyLeaderboardUser (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekId INTEGER NOT NULL,
    userId TEXT NOT NULL,
    value INTEGER NOT NULL
  );
  CREATE INDEX idx_karmaWeeklyLeaderboardUser_weekId ON KarmaWeeklyLeaderboardUser (weekId);

  CREATE TABLE Message (
    id TEXT PRIMARY KEY,
    serverId TEXT NOT NULL,
    userId TEXT,
    created TEXT NOT NULL
  );

  CREATE TABLE ServerChannel (
    serverId TEXT NOT NULL,
    type TEXT NOT NULL,
    channelId TEXT NOT NULL,
    PRIMARY KEY (serverId, type, channelId)
  );

  CREATE TABLE InvencheckerUser (
    userId TEXT PRIMARY KEY,
    uid TEXT NOT NULL
  );

  CREATE TABLE UsernameCache (
    userId TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    cachedAt INTEGER NOT NULL
  );
`;

// Schema changes after the baseline, applied in order by database/index.js and tracked with
// PRAGMA user_version: MIGRATIONS[0] takes a database to version 6, and so on. Each is SQL or a
// function taking the db. Append new ones to the end; never edit one that has shipped.
const MIGRATIONS = [];

module.exports = { BASELINE_VERSION, SCHEMA, MIGRATIONS };
