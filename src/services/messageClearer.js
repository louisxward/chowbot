const logger = require("logger");
const { getAllChannels, getChannels } = require("repositories/serverChannel");

async function scheduledClearer(client) {
  logger.info("function - scheduledClearer");
  for (const { serverId, channelId } of await getAllChannels("clearChannels")) {
    await clearChannel(client, serverId, channelId);
  }
}

async function manualServerClear(client, serverId) {
  logger.info("function - manualServerClear");
  logger.info(`- serverId: ${serverId}`);
  for (const channelId of await getChannels(serverId, "clearChannels")) {
    await clearChannel(client, serverId, channelId);
  }
}

// Deletes every message in the channel. The channel must belong to serverId, so a channel id
// from another server can never be cleared. Errors are logged, never thrown.
async function clearChannel(client, serverId, channelId) {
  logger.info(`- serverId: ${serverId}`);
  logger.info(`- channelId: ${channelId}`);
  const channel = client.channels.cache.get(channelId);
  if (!channel || channel.guildId !== serverId) {
    logger.error({ serverId, channelId }, "clearer - skipping channel, not found in this server");
    return;
  }
  try {
    let lastMessageId;
    while (true) {
      const messages = await channel.messages.fetch({ limit: 100, before: lastMessageId });
      if (messages.size === 0) break;
      logger.info(`- deleting ${messages.size} messages`);
      for (const message of messages.values()) {
        try {
          await message.delete();
          await wait(500);
        } catch (error) {
          logger.error({ err: error, messageId: message.id }, "clearer - skipping message");
        }
      }
      lastMessageId = messages.last()?.id;
    }
  } catch (error) {
    logger.error({ err: error, serverId, channelId }, "clearer - failed to clear channel");
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { manualServerClear, scheduledClearer, clearChannel };
