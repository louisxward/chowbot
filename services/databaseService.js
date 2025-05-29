const logger = require("logger");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

async function init() {
  // Connection
  const db = await connect();
  // Table Create
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Server (
      id STRING PRIMARY KEY,
      name TEXT NOT NULL
    );
    `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Karma (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serverId STRING NOT NULL,
      messageId STRING NOT NULL,
      messageUserId STRING NOT NULL,
      reactionUserId STRING NOT NULL,
      reactionEmojiId STRING NOT NULL,
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
