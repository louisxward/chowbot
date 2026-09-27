const logger = require("logger");
const { getAllChannels } = require("repositories/serverChannel");

const DELETE_DELAY_MS = 500;

async function clearAllChannels(client) {
  for (const { serverId, channelId } of await getAllChannels("clearChannels")) {
    await clearChannel(client, serverId, channelId);
  }
}

// Deletes every message in the channel. The channel must belong to serverId, so a channel id
// from another server can never be cleared. Errors are logged, never thrown.
async function clearChannel(client, serverId, channelId) {
  const channel = client.channels.cache.get(channelId);
  if (!channel || channel.guildId !== serverId) {
    logger.error({ serverId, channelId }, "clearer - skipping channel, not found in this server");
    return;
  }
  logger.info({ serverId, channelId }, "clearer - clearing channel");
  try {
    let lastMessageId;
    while (true) {
      const messages = await channel.messages.fetch({ limit: 100, before: lastMessageId });
      if (messages.size === 0) break;
      logger.info({ serverId, channelId, count: messages.size }, "clearer - deleting messages");
      for (const message of messages.values()) {
        try {
          await message.delete();
          await wait(DELETE_DELAY_MS);
        } catch (err) {
          logger.error({ err, channelId, messageId: message.id }, "clearer - skipping message");
        }
      }
      lastMessageId = messages.last()?.id;
    }
  } catch (err) {
    logger.error({ err, serverId, channelId }, "clearer - failed to clear channel");
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { clearAllChannels, clearChannel };
