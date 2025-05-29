const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

async function init() {
  // Connection
  const db = await connect();
  // Table Create
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Server (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      invited TEXT NOT NULL,
      ownerUserId TEXT NOT NULL
    );
    `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Karma (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serverId TEXT NOT NULL,
      messageId TEXT NOT NULL,
      messageUserId TEXT NOT NULL,
      reactionUserId TEXT NOT NULL,
      reactionEmojiId TEXT NOT NULL,
      value INTEGER NOT NULL
    );
    `);
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
