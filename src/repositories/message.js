const logger = require("logger");
const { getDb } = require("services/databaseService");

async function upsertMessage(id, serverId, userId, created) {
  logger.info("repository - upsertMessage");
  getDb()
    .prepare("INSERT INTO Message (id, serverId, userId, created) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING")
    .run(id, serverId, userId, created);
}

module.exports = { upsertMessage };
