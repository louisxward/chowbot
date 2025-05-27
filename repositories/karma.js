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

module.exports = { createKarma };
