const logger = require("logger");
const { getDb } = require("services/databaseService");

//todo rename methods karma is wide table

async function createKarma(serverId, messageId, userId, fromUserId, emojiId, value, reason, type) {
  logger.info("repository - createKarma");
  getDb()
    .prepare(
      "INSERT INTO Karma (serverId, messageId, userId, fromUserId, emojiId, value, reason, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(serverId, messageId, userId, fromUserId, emojiId, value, reason, type);
}

async function deleteKarma(serverId, messageId, fromUserId, emojiId) {
  logger.info("repository - deleteKarma");
  getDb()
    .prepare("DELETE FROM Karma WHERE serverId = ? AND messageId = ? AND fromUserId = ? AND emojiId = ?")
    .run(serverId, messageId, fromUserId, emojiId);
}

// TODO: replace this two-step with a single upsert once existing duplicate rows have been
// cleaned up and a UNIQUE index added to (serverId, messageId, fromUserId, emojiId).
async function updateKarma(serverId, messageId, fromUserId, emojiId, value) {
  logger.info("repository - updateKarma");
  const result = getDb()
    .prepare("UPDATE Karma SET value = ? WHERE serverId = ? AND messageId = ? AND fromUserId = ? AND emojiId = ?")
    .run(value, serverId, messageId, fromUserId, emojiId);
  return result.changes;
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
    if (!minValue || minValue > e.total) {
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
  deleteKarma,
  updateKarma,
  getKarmaTotalByUserId,
  getKarmaLeaderboardMap,
  getKarmaByMessageAndEmoji
};
