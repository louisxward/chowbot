const logger = require("logger");
const { getDb } = require("services/databaseService");

// Returns the cached username if it was cached after cachedAfter (ms since epoch)
async function getUsername(userId, cachedAfter) {
  logger.debug("repository - getUsername");
  return (
    getDb().prepare("SELECT username FROM UsernameCache WHERE userId = ? AND cachedAt > ?").get(userId, cachedAfter)
      ?.username ?? null
  );
}

async function setUsername(userId, username, cachedAt) {
  logger.debug("repository - setUsername");
  getDb()
    .prepare(
      "INSERT INTO UsernameCache (userId, username, cachedAt) VALUES (?, ?, ?) " +
        "ON CONFLICT (userId) DO UPDATE SET username = excluded.username, cachedAt = excluded.cachedAt"
    )
    .run(userId, username, cachedAt);
}

async function clearUsernames() {
  logger.info("repository - clearUsernames");
  getDb().prepare("DELETE FROM UsernameCache").run();
}

module.exports = { getUsername, setUsername, clearUsernames };
