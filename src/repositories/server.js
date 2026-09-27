const logger = require("logger");
const { getDb } = require("database");

// Errors are logged, not thrown: joining a server the bot was already in isn't a failure
async function createServer(id, name, ownerUserId) {
  logger.debug("repository - createServer");
  // TODO: not sure on using datetime in SQL, maybe take it from the request instead
  try {
    getDb()
      .prepare("INSERT INTO Server (id, name, invited, ownerUserId) VALUES (?, ?, datetime('now'), ?)")
      .run(id, name, ownerUserId);
  } catch (err) {
    logger.warn({ err, serverId: id }, "repository - createServer failed");
  }
}

async function deleteServer(id) {
  logger.debug("repository - deleteServer");
  try {
    getDb().prepare("DELETE FROM Server WHERE id = ?").run(id);
  } catch (err) {
    logger.warn({ err, serverId: id }, "repository - deleteServer failed");
  }
}

module.exports = { createServer, deleteServer };
