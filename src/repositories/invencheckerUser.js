const logger = require("logger");
const { getDb } = require("database");

async function getUid(userId) {
  logger.debug("repository - getUid");
  return getDb().prepare("SELECT uid FROM InvencheckerUser WHERE userId = ?").get(userId)?.uid ?? null;
}

async function setUid(userId, uid) {
  logger.debug("repository - setUid");
  getDb()
    .prepare(
      "INSERT INTO InvencheckerUser (userId, uid) VALUES (?, ?) ON CONFLICT (userId) DO UPDATE SET uid = excluded.uid"
    )
    .run(userId, uid);
}

async function getAllUsers() {
  logger.debug("repository - getAllUsers");
  return getDb().prepare("SELECT userId AS discordId, uid FROM InvencheckerUser").all();
}

module.exports = { getUid, setUid, getAllUsers };
