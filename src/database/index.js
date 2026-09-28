const Database = require("better-sqlite3");
const config = require("config");
const logger = require("logger");
const { MIGRATIONS } = require("database/migrations");

let db = null;

// Opens the shared connection and applies pending migrations. Each migration and its
// user_version bump run in one transaction, so a failed migration leaves the db untouched.
function init() {
  db = new Database(config.DB_PATH);
  const version = db.pragma("user_version", { simple: true });
  for (let i = version; i < MIGRATIONS.length; i++) {
    logger.info({ version: i + 1 }, "database - applying migration");
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

module.exports = { init, getDb, close };
