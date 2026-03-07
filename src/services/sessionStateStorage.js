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

async function getPendingReconcile(serverId) {
  const state = await readFile(SESSION_STATE_PATH);
  return state.pendingReconcile?.[serverId] ?? [];
}

async function addPendingReconcile(serverId, messageId, channelId) {
  const state = await readFile(SESSION_STATE_PATH);
  if (!state.pendingReconcile) state.pendingReconcile = {};
  const pending = state.pendingReconcile[serverId] ?? [];
  if (pending.some((e) => e.messageId === messageId)) return;
  state.pendingReconcile[serverId] = [...pending, { messageId, channelId }];
  await writeFile(SESSION_STATE_PATH, state);
}

async function removePendingReconcile(serverId, messageId) {
  const state = await readFile(SESSION_STATE_PATH);
  if (!state.pendingReconcile?.[serverId]) return;
  state.pendingReconcile[serverId] = state.pendingReconcile[serverId].filter(
    (e) => e.messageId !== messageId
  );
  await writeFile(SESSION_STATE_PATH, state);
}

async function getAllPendingReconcile() {
  const state = await readFile(SESSION_STATE_PATH);
  return state.pendingReconcile ?? {};
}

module.exports = { getCachedUsername, setCachedUsername, clearSessionState, getPendingReconcile, addPendingReconcile, removePendingReconcile, getAllPendingReconcile };
