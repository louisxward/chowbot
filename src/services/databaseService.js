const Database = require("better-sqlite3");
const { DB_PATH } = require("config");

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
  // v2 — indexes, Karma schema update, Message table
  `
  CREATE TABLE Karma_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serverId TEXT NOT NULL,
    messageId TEXT,
    userId TEXT NOT NULL,
    fromUserId TEXT NOT NULL,
    emojiId TEXT,
    value INTEGER NOT NULL,
    reason TEXT,
    type INTEGER NOT NULL DEFAULT 0
  );
  INSERT INTO Karma_new (id, serverId, messageId, userId, fromUserId, emojiId, value, type)
    SELECT id, serverId, messageId, messageUserId, reactionUserId, reactionEmojiId, value, 0 FROM Karma;
  DROP TABLE Karma;
  ALTER TABLE Karma_new RENAME TO Karma;
  CREATE INDEX IF NOT EXISTS idx_karma_userId
    ON Karma (userId);
  CREATE INDEX IF NOT EXISTS idx_karma_lookup
    ON Karma (serverId, messageId, fromUserId, emojiId);
  CREATE INDEX IF NOT EXISTS idx_karmaWeeklyLeaderboardUser_weekId
    ON KarmaWeeklyLeaderboardUser (weekId);
  CREATE TABLE IF NOT EXISTS Message (
    id TEXT PRIMARY KEY,
    serverId TEXT NOT NULL,
    userId TEXT,
    created TEXT NOT NULL
  );
  INSERT OR IGNORE INTO Message (id, serverId, created, userId)
    SELECT DISTINCT messageId, serverId, date('now'), userId FROM Karma WHERE messageId IS NOT NULL;
  `
];

let db = null;

// Opens the shared connection and applies pending migrations. Each migration and its
// user_version bump run in one transaction, so a failed migration leaves the db untouched.
function init() {
  db = new Database(DB_PATH);
  const version = db.pragma("user_version", { simple: true });
  for (let i = version; i < MIGRATIONS.length; i++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[i]);
      db.pragma(`user_version = ${i + 1}`);
    })();
  }
}

function getDb() {
  if (!db) throw new Error("database not initialised, call init() first");
  return db;
}

function close() {
  db?.close();
  db = null;
}

module.exports = { init, getDb, close };
