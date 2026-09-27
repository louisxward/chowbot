const logger = require("logger");
const { getDb } = require("services/databaseService");

async function createServer(id, name, ownerUserId) {
  logger.info("repository - createServer");
  //todo - not sure on using datatime in sql maybe use from req but in weird format
  try {
    getDb()
      .prepare("INSERT INTO Server (id, name, invited, ownerUserId) VALUES (?, ?, datetime('now'), ?)")
      .run(id, name, ownerUserId);
  } catch (error) {
    logger.warn(error.message);
  }
}

async function deleteServer(id) {
  logger.info("repository - deleteServer");
  try {
    getDb().prepare("DELETE FROM Server WHERE id = ?").run(id);
  } catch (error) {
    logger.warn(error.message);
  }
}

module.exports = { createServer, deleteServer };
