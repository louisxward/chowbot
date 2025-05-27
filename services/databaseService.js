const logger = require("logger");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

async function init() {
  // Connection
  const db = await connect();
  // Table Create
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Server (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );
    `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Karma (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serverId INTEGER NOT NULL,
      messageId INTEGER NOT NULL,
      messageUserId INTEGER NOT NULL,
      reactionUserId INTEGER NOT NULL,
      reactionEmojiId INTEGER,
      value INTEGER NOT NULL
    );
    `);
  // Dev Data
  // todo - change this to auto add servers on startup or on bot inv
  try {
    await db.run("INSERT INTO Server (id, name) VALUES (?, ?)", ["1309582350849544304", "chowbotdevtalosclone"]);
  } catch (error) {
    logger.warn(error.message);
  }
}

async function connect() {
  const db = await open({
    filename: "./data/chowbot.db",
    driver: sqlite3.Database
  });
  return db;
}

module.exports = { init, connect };
