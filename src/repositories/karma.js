const logger = require("logger");
const { getDb } = require("services/databaseService");

//todo rename methods karma is wide table

async function createKarma(serverId, messageId, userId, fromUserId, emojiId, value, reason, type) {
  logger.info("repository - createKarma");
  getDb()
    .prepare(
      "INSERT INTO Karma (serverId, messageId, userId, fromUserId, emojiId, value, reason, type, created) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(serverId, messageId, userId, fromUserId, emojiId, value, reason, type, new Date().toISOString());
}

// One row per (server, message, voter, emoji), enforced by idx_karma_reaction
async function upsertReactionKarma(serverId, messageId, userId, fromUserId, emojiId, value, type) {
  logger.info("repository - upsertReactionKarma");
  getDb()
    .prepare(
      "INSERT INTO Karma (serverId, messageId, userId, fromUserId, emojiId, value, type, created) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT (serverId, messageId, fromUserId, emojiId) DO UPDATE SET value = excluded.value"
    )
    .run(serverId, messageId, userId, fromUserId, emojiId, value, type, new Date().toISOString());
}

async function deleteKarma(serverId, messageId, fromUserId, emojiId) {
  logger.info("repository - deleteKarma");
  getDb()
    .prepare("DELETE FROM Karma WHERE serverId = ? AND messageId = ? AND fromUserId = ? AND emojiId = ?")
    .run(serverId, messageId, fromUserId, emojiId);
}

async function countKarmaSince(serverId, userId, fromUserId, type, since) {
  logger.info("repository - countKarmaSince");
  return getDb()
    .prepare(
      "SELECT COUNT(*) AS n FROM Karma WHERE serverId = ? AND fromUserId = ? AND userId = ? AND type = ? AND created >= ?"
    )
    .get(serverId, fromUserId, userId, type, since).n;
}

async function getKarmaTotalByUserId(userId) {
  logger.info("repository - getKarmaTotalByUserId");
  const result = getDb().prepare("SELECT SUM(value) AS total FROM Karma WHERE userId = ? GROUP BY userId").get(userId);
  return result ? result.total : null;
}

async function getKarmaLeaderboardMap() {
  logger.info("repository - getKarmaLeaderboardMap");
  const result = new Map();
  const records = getDb()
    .prepare(
      "SELECT CAST(userId AS TEXT) AS userId, SUM(value) AS total FROM Karma GROUP BY userId ORDER BY total DESC"
    )
    .all();
  let index = 0;
  let minValue = null;
  records.forEach((e) => {
    if (minValue === null || minValue > e.total) {
      minValue = e.total;
      index += 1;
    }
    result.set(e.userId, { index: index, value: e.total });
  });
  return result;
}

async function getKarmaByMessageAndEmoji(serverId, messageId, emojiId) {
  logger.info("repository - getKarmaByMessageAndEmoji");
  return getDb()
    .prepare("SELECT fromUserId FROM Karma WHERE serverId = ? AND messageId = ? AND emojiId = ?")
    .all(serverId, messageId, emojiId);
}

module.exports = {
  createKarma,
  upsertReactionKarma,
  deleteKarma,
  countKarmaSince,
  getKarmaTotalByUserId,
  getKarmaLeaderboardMap,
  getKarmaByMessageAndEmoji
};
