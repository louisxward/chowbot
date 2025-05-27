const logger = require("logger");
const { connect } = require("services/databaseService");

async function createKarma(serverId, messageId, messageUserId, reactionId, reactionUserId, value) {
  logger.info("startup - createKarma");
  const db = connect();
  await db.run(
    "INSERT INTO Karma (serverId, messageId, messageUserId, reactionId, reactionUserId, value) VALUES (?, ?, ?, ?, ?, ?)",
    [serverId, messageId, messageUserId, reactionId, reactionUserId, value]
  );
}

module.exports = { createKarma };
