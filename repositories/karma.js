const logger = require("logger");
const { connect } = require("services/databaseService");

async function createKarma(serverId, messageId, messageUserId, reactionUserId, value) {
  logger.info("startup - createKarma");
  const db = await connect();
  await db.run("INSERT INTO Karma (serverId, messageId, messageUserId, reactionUserId, value) VALUES (?, ?, ?, ?, ?)", [
    serverId,
    messageId,
    messageUserId,
    reactionUserId,
    value
  ]);
}

async function getKarmaTotalByUserId(userId) {
  logger.info("startup - getKarmaTotalByUserId");
  const db = await connect();
  const result = await db.get("SELECT SUM(value) as total FROM Karma WHERE messageUserId = ? GROUP BY messageUserId", [
    userId
  ]);
  return result ? result.total : null;
}

module.exports = { createKarma, getKarmaTotalByUserId };
