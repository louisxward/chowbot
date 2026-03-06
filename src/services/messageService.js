const logger = require("logger");
const { upsertMessage } = require("repositories/message");

async function handleMessageEvent(message) {
  if (message.author?.bot) return;
  if (!message.guildId) return;
  logger.info("service - handleMessageEvent");
  await upsertMessage(message.id, message.guildId, message.author.id, message.createdAt.toISOString());
}

module.exports = { handleMessageEvent };
