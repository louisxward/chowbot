const logger = require("logger");
const sqlite3 = require("sqlite3").verbose();

const encoding = "utf8";

async function init() {
  logger.info("sqlInitServer - init");
  logger.info(__dirname);
  const db = new sqlite3.Database("./data/chowbot.db", (error) => {
    if (error) {
      logger.error("- Database failed to connect");
      logger.error(error);
      throw error;
    }
    logger.info("- Database connected");
  });

  db.serialize(() => {
    db.run(
      `
    CREATE TABLE IF NOT EXISTS Server (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );
    `
    );
    db.run(
      `
    CREATE TABLE IF NOT EXISTS Message (
      id INTEGER PRIMARY KEY,
      serverId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      messageId INTEGER NOT NULL
    );
    `
    );
    db.run(
      `
    CREATE TABLE IF NOT EXISTS Reaction (
      id INTEGER PRIMARY KEY,
      userId INTEGER NOT NULL,
      messageId INTEGER NOT NULL,
      value INTEGER NOT NULL
    );
    `
    );
  });

  // test server
  db.serialize(() => {
    db.run(
      `
    INSERT INTO Server(id, name) values(1309582350849544304,"chowbotdevtalosclone")
    `,
      (error) => {
        if (error) {
          logger.warn(error.message);
        }
      }
    );
  });
}

module.exports = { init };
