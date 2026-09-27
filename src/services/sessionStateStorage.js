const { getUsername, setUsername, clearUsernames } = require("repositories/usernameCache");

// Leaderboard username cache, stored in the UsernameCache table so it survives restarts
const USERNAME_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

async function getCachedUsername(userId) {
  return getUsername(userId, Date.now() - USERNAME_CACHE_TTL_MS);
}

async function setCachedUsername(userId, username) {
  await setUsername(userId, username, Date.now());
}

async function clearSessionState() {
  await clearUsernames();
}

module.exports = { getCachedUsername, setCachedUsername, clearSessionState };
