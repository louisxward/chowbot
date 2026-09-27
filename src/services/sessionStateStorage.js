const logger = require("logger");

// In-memory cache; it's rebuilt from Discord after a restart
const USERNAME_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const usernames = new Map();

async function getCachedUsername(userId) {
  const entry = usernames.get(userId);
  if (entry && Date.now() - entry.cachedAt < USERNAME_CACHE_TTL_MS) {
    return entry.username;
  }
  return null;
}

async function setCachedUsername(userId, username) {
  usernames.set(userId, { username, cachedAt: Date.now() });
}

async function clearSessionState() {
  logger.info("map - clearSessionState");
  usernames.clear();
}

module.exports = { getCachedUsername, setCachedUsername, clearSessionState };
