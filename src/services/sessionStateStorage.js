const { readFile, writeFile } = require("services/storageHelper");
const { SESSION_STATE_PATH } = require("config");
const logger = require("logger");

const USERNAME_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

async function getCachedUsername(userId) {
  const state = await readFile(SESSION_STATE_PATH);
  const entry = state.usernames?.[userId];
  if (entry && Date.now() - entry.cachedAt < USERNAME_CACHE_TTL_MS) {
    return entry.username;
  }
  return null;
}

async function setCachedUsername(userId, username) {
  const state = await readFile(SESSION_STATE_PATH);
  if (!state.usernames) state.usernames = {};
  state.usernames[userId] = { username, cachedAt: Date.now() };
  await writeFile(SESSION_STATE_PATH, state);
}

async function clearSessionState() {
  logger.info("map - clearSessionState");
  await writeFile(SESSION_STATE_PATH, {});
}

module.exports = { getCachedUsername, setCachedUsername, clearSessionState };
