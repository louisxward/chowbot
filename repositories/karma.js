const logger = require("logger");
const { connect } = require("services/databaseService");

async function createKarma(serverId, messageId, messageUserId, reactionUserId, reactionEmojiId, value) {
  logger.info("repository - createKarma");
  const db = await connect();
  await db.run(
    "INSERT INTO Karma (serverId, messageId, messageUserId, reactionUserId, reactionEmojiId, value) VALUES (?, ?, ?, ?, ?, ?)",
    [serverId, messageId, messageUserId, reactionUserId, reactionEmojiId, value]
  );
  db.close();
}

async function updateKarma(serverId, messageId, reactionUserId, reactionEmojiId, value) {
  logger.info("repository - updateKarma");
  const db = await connect();
  const result = await db.run(
    "UPDATE Karma SET value = ? WHERE serverId = ? AND messageId = ? AND reactionUserId = ? AND reactionEmojiId = ?",
    [value, serverId, messageId, reactionUserId, reactionEmojiId]
  );
  db.close();
  return result.changes;
}

async function getKarmaTotalByUserId(userId) {
  logger.info("repository - getKarmaTotalByUserId");
  const db = await connect();
  const result = await db.get("SELECT SUM(value) as total FROM Karma WHERE messageUserId = ? GROUP BY messageUserId", [
    userId
  ]);
  db.close();
  return result ? result.total : null;
}

async function getKarmaLeaderboardMap() {
  logger.info("repository - getKarmaLeaderboardMap");
  const db = await connect();
  const result = await db.get("SELECT messageUserId as userId, SUM(value) as total FROM Karma GROUP BY messageUserId");
  db.close();
  return result;
}

module.exports = { createKarma, updateKarma, getKarmaTotalByUserId, getKarmaLeaderboardMap };
