const logger = require("logger");
const { getDb } = require("services/databaseService");

async function getUid(userId) {
  logger.info("repository - getUid");
  return getDb().prepare("SELECT uid FROM InvencheckerUser WHERE userId = ?").get(userId)?.uid ?? null;
}

async function setUid(userId, uid) {
  logger.info("repository - setUid");
  getDb()
    .prepare(
      "INSERT INTO InvencheckerUser (userId, uid) VALUES (?, ?) ON CONFLICT (userId) DO UPDATE SET uid = excluded.uid"
    )
    .run(userId, uid);
}

async function getAllUsers() {
  logger.info("repository - getAllUsers");
  return getDb().prepare("SELECT userId AS discordId, uid FROM InvencheckerUser").all();
}

module.exports = { getUid, setUid, getAllUsers };
