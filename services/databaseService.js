const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

const MIGRATIONS = [
  // v1 — initial schema
  `
  CREATE TABLE IF NOT EXISTS Server (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    invited TEXT NOT NULL,
    ownerUserId TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS Karma (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serverId TEXT NOT NULL,
    messageId TEXT NOT NULL,
    messageUserId TEXT NOT NULL,
    reactionUserId TEXT NOT NULL,
    reactionEmojiId TEXT NOT NULL,
    value INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS KarmaWeeklyLeaderboardWeek (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS KarmaWeeklyLeaderboardUser (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekId INTEGER NOT NULL,
    userId TEXT NOT NULL,
    value INTEGER NOT NULL
  );
  `,
  // v2 — indexes
  `
  CREATE INDEX IF NOT EXISTS idx_karma_messageUserId
    ON Karma (messageUserId);
  CREATE INDEX IF NOT EXISTS idx_karma_lookup
    ON Karma (serverId, messageId, reactionUserId, reactionEmojiId);
  CREATE INDEX IF NOT EXISTS idx_karmaWeeklyLeaderboardUser_weekId
    ON KarmaWeeklyLeaderboardUser (weekId);
  `
];

async function init() {
  const db = await connect();
  const { user_version: version } = await db.get("PRAGMA user_version");
  for (let i = version; i < MIGRATIONS.length; i++) {
    await db.exec(MIGRATIONS[i]);
    await db.exec(`PRAGMA user_version = ${i + 1}`);
  }
  db.close();
}

async function connect() {
  const db = await open({
    filename: "./data/chowbot.db",
    driver: sqlite3.Database
  });
  return db;
}

module.exports = { init, connect };
