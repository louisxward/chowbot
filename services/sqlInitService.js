const logger = require("logger");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

async function init() {
  // Connection
  const db = await open({
    filename: "./data/chowbot.db",
    driver: sqlite3.Database
  });
  // Table Create
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Servers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );
    `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Message (
      id INTEGER PRIMARY KEY,
      serverId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      messageId INTEGER NOT NULL
    );
    `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Reaction (
      id INTEGER PRIMARY KEY,
      userId INTEGER NOT NULL,
      messageId INTEGER NOT NULL,
      value INTEGER NOT NULL
    );
    `);
  // Dev Data
  try {
    await db.run("INSERT INTO Servers (id, name) VALUES (?, ?)", ["1309582350849544304", "chowbotdevtalosclone"]);
  } catch (error) {
    logger.warn(error.message);
  }
}

module.exports = { init };
