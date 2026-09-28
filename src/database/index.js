const Database = require("better-sqlite3");
const config = require("config");
const logger = require("logger");
const { BASELINE_VERSION, SCHEMA, MIGRATIONS } = require("database/migrations");

let db = null;

const UPGRADE_HINT = "upgrade it with chowbot commit 3fd77de first";

// A new database gets the whole schema at BASELINE_VERSION in one transaction
function createSchema(conn) {
  const tables = conn.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'").get().n;
  if (tables > 0) throw new Error(`This database predates schema versioning; ${UPGRADE_HINT}`);
  logger.info({ version: BASELINE_VERSION }, "database - creating schema");
  conn.transaction(() => {
    conn.exec(SCHEMA);
    conn.pragma(`user_version = ${BASELINE_VERSION}`);
  })();
}

// Opens the shared connection and applies pending migrations. Each migration and its
// user_version bump run in one transaction, so a failed migration leaves the db untouched.
function init() {
  const conn = new Database(config.DB_PATH);
  try {
    let version = conn.pragma("user_version", { simple: true });
    if (version === 0) {
      createSchema(conn);
      version = BASELINE_VERSION;
    } else if (version < BASELINE_VERSION) {
      throw new Error(`This database is at schema version ${version}; ${UPGRADE_HINT}`);
    }
    for (let i = version; i < BASELINE_VERSION + MIGRATIONS.length; i++) {
      logger.info({ version: i + 1 }, "database - applying migration");
      conn.transaction(() => {
        const migration = MIGRATIONS[i - BASELINE_VERSION];
        if (typeof migration === "function") migration(conn);
        else conn.exec(migration);
        conn.pragma(`user_version = ${i + 1}`);
      })();
    }
  } catch (err) {
    conn.close();
    throw err;
  }
  db = conn;
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
