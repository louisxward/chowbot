const logger = require("logger");
const { connect } = require("services/databaseService");

//todo rename methods karma is wide table

async function createKarma(serverId, messageId, userId, fromUserId, emojiId, value, reason, type) {
  logger.info("repository - createKarma");
  const db = await connect();
  await db.run(
    "INSERT INTO Karma (serverId, messageId, userId, fromUserId, emojiId, value, reason, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [serverId, messageId, userId, fromUserId, emojiId, value, reason, type]
  );
  db.close();
}

async function deleteKarma(serverId, messageId, fromUserId, emojiId) {
  logger.info("repository - deleteKarma");
  const db = await connect();
  await db.run("DELETE FROM Karma WHERE serverId = ? AND messageId = ? AND fromUserId = ? AND emojiId = ?", [
    serverId,
    messageId,
    fromUserId,
    emojiId
  ]);
  db.close();
}

// TODO: replace this two-step with a single upsert once existing duplicate rows have been
// cleaned up and a UNIQUE index added to (serverId, messageId, fromUserId, emojiId).
async function updateKarma(serverId, messageId, fromUserId, emojiId, value) {
  logger.info("repository - updateKarma");
  const db = await connect();
  const result = await db.run(
    "UPDATE Karma SET value = ? WHERE serverId = ? AND messageId = ? AND fromUserId = ? AND emojiId = ?",
    [value, serverId, messageId, fromUserId, emojiId]
  );
  db.close();
  return result.changes;
}

async function getKarmaTotalByUserId(userId) {
  logger.info("repository - getKarmaTotalByUserId");
  const db = await connect();
  const result = await db.get("SELECT SUM(value) AS total FROM Karma WHERE userId = ? GROUP BY userId", [userId]);
  db.close();
  return result ? result.total : null;
}

async function getKarmaLeaderboardMap() {
  logger.info("repository - getKarmaLeaderboardMap");
  const db = await connect();
  const result = new Map();
  const records = await db.all(
    "SELECT CAST(userId AS TEXT) AS userId, SUM(value) AS total FROM Karma GROUP BY userId ORDER BY total DESC"
  );
  let index = 0;
  let minValue = null;
  records.forEach((e) => {
    if (!minValue || minValue > e.total) {
      minValue = e.total;
      index += 1;
    }
    result.set(e.userId, { index: index, value: e.total });
  });
  db.close();
  return result;
}

module.exports = { createKarma, deleteKarma, updateKarma, getKarmaTotalByUserId, getKarmaLeaderboardMap };
