const logger = require("logger");
const { connect } = require("services/databaseService");

async function createServer(id, name, invited, inviteUserId) {
  logger.info("repository - createServer");
  const db = await connect();
  await db.run(
    "INSERT INTO Karma (serverId, messageId, messageUserId, reactionUserId, reactionEmojiId, value) VALUES (?, ?, ?, ?, ?, ?)",
    [serverId, messageId, messageUserId, reactionUserId, reactionEmojiId, value]
  );
  db.close();
}

module.exports = { createServer };
