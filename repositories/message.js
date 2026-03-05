const logger = require("logger");
const { connect } = require("services/databaseService");

async function upsertMessage(id, serverId, userId, created) {
  logger.info("repository - upsertMessage");
  const db = await connect();
  await db.run(
    "INSERT INTO Message (id, serverId, userId, created) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING",
    [id, serverId, userId, created]
  );
  db.close();
}

module.exports = { upsertMessage };
