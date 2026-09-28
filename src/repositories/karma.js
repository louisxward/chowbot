const logger = require("logger");
const { getDb } = require("database");
const { toRankedMap } = require("utils/ranking");

// TODO: rename methods, Karma is a wide table

async function createKarma(serverId, messageId, userId, fromUserId, emojiId, value, reason, type) {
  logger.debug("repository - createKarma");
  getDb()
    .prepare(
      "INSERT INTO Karma (serverId, messageId, userId, fromUserId, emojiId, value, reason, type, created) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(serverId, messageId, userId, fromUserId, emojiId, value, reason, type, new Date().toISOString());
}

// One row per (server, message, voter, emoji), enforced by idx_karma_reaction
async function upsertReactionKarma(serverId, messageId, userId, fromUserId, emojiId, value, type) {
  logger.debug("repository - upsertReactionKarma");
  getDb()
    .prepare(
      "INSERT INTO Karma (serverId, messageId, userId, fromUserId, emojiId, value, type, created) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT (serverId, messageId, fromUserId, emojiId) DO UPDATE SET value = excluded.value"
    )
    .run(serverId, messageId, userId, fromUserId, emojiId, value, type, new Date().toISOString());
}

async function deleteKarma(serverId, messageId, fromUserId, emojiId) {
  logger.debug("repository - deleteKarma");
  getDb()
    .prepare("DELETE FROM Karma WHERE serverId = ? AND messageId = ? AND fromUserId = ? AND emojiId = ?")
    .run(serverId, messageId, fromUserId, emojiId);
}

async function countKarmaSince(serverId, userId, fromUserId, type, since) {
  logger.debug("repository - countKarmaSince");
  return getDb()
    .prepare(
      "SELECT COUNT(*) AS n FROM Karma WHERE serverId = ? AND fromUserId = ? AND userId = ? AND type = ? AND created >= ?"
    )
    .get(serverId, fromUserId, userId, type, since).n;
}

async function getKarmaTotalByUserId(userId) {
  logger.debug("repository - getKarmaTotalByUserId");
  const row = getDb().prepare("SELECT SUM(value) AS total FROM Karma WHERE userId = ? GROUP BY userId").get(userId);
  return row?.total ?? null;
}

async function getKarmaLeaderboardMap() {
  logger.debug("repository - getKarmaLeaderboardMap");
  const rows = getDb()
    .prepare(
      "SELECT CAST(userId AS TEXT) AS userId, SUM(value) AS total FROM Karma GROUP BY userId ORDER BY total DESC"
    )
    .all();
  return toRankedMap(rows);
}

module.exports = {
  createKarma,
  upsertReactionKarma,
  deleteKarma,
  countKarmaSince,
  getKarmaTotalByUserId,
  getKarmaLeaderboardMap
};
