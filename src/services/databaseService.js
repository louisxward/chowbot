const fs = require("node:fs");
const Database = require("better-sqlite3");
const config = require("config");
const logger = require("logger");

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
  `,
  // v3 — Karma.created, and one row per reaction: drop duplicates and enforce with a UNIQUE index
  `
  ALTER TABLE Karma ADD COLUMN created TEXT;
  DELETE FROM Karma
    WHERE messageId IS NOT NULL
      AND id NOT IN (
        SELECT MIN(id) FROM Karma WHERE messageId IS NOT NULL GROUP BY serverId, messageId, fromUserId, emojiId
      );
  DROP INDEX IF EXISTS idx_karma_lookup;
  CREATE UNIQUE INDEX idx_karma_reaction
    ON Karma (serverId, messageId, fromUserId, emojiId);
  CREATE INDEX idx_karma_etiquette
    ON Karma (serverId, fromUserId, userId, type, created);
  `,
  // v4 — move serverConfig.json channel lists and userConfig.json invenchecker ids into the db
  (db) => {
    db.exec(`
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
    `);
    const insertChannel = db.prepare(
      "INSERT OR IGNORE INTO ServerChannel (serverId, type, channelId) VALUES (?, ?, ?)"
    );
    for (const [serverId, server] of Object.entries(readLegacyJson(config.SERVER_CONFIG_PATH))) {
      for (const type of ["clearChannels", "leaderboardChannels"]) {
        for (const channelId of server?.[type] ?? []) insertChannel.run(serverId, type, channelId);
      }
    }
    const insertUser = db.prepare("INSERT OR IGNORE INTO InvencheckerUser (userId, uid) VALUES (?, ?)");
    for (const [userId, user] of Object.entries(readLegacyJson(config.USER_CONFIG_PATH))) {
      if (user?.invencheckerId) insertUser.run(userId, user.invencheckerId);
    }
  }
];

function readLegacyJson(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  if (!content.trim()) return {};
  logger.info(`database - importing ${filePath}`);
  return JSON.parse(content);
}

let db = null;

// Opens the shared connection and applies pending migrations. A migration is either SQL or a
// function taking the db. Each migration and its user_version bump run in one transaction, so a
// failed migration leaves the db untouched.
function init() {
  db = new Database(config.DB_PATH);
  const version = db.pragma("user_version", { simple: true });
  for (let i = version; i < MIGRATIONS.length; i++) {
    db.transaction(() => {
      const migration = MIGRATIONS[i];
      if (typeof migration === "function") migration(db);
      else db.exec(migration);
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

module.exports = { init, getDb, close, MIGRATIONS };
