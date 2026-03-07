const logger = require("logger");
const { readServerConfig, getClearChannels, addClearChannel, removeClearChannel } = require("services/serverConfigStorage");

async function scheduledClearer(client) {
  logger.info("function - scheduledClearer");
  const config = await readServerConfig();
  if (Object.keys(config).length === 0) return;
  for (const [serverId, serverConfig] of Object.entries(config)) {
    logger.info(`- serverId: ${serverId}`);
    clearChannels(client, serverConfig.clearChannels ?? []);
  }
}

async function manualServerClear(client, serverId) {
  logger.info("function - manualServerClear");
  logger.info(`- serverId: ${serverId}`);
  const channelIds = await getClearChannels(serverId);
  clearChannels(client, channelIds);
}

async function clearChannels(client, channelIds) {
  for (const channelId of channelIds) {
    logger.info(`- channelId: ${channelId}`);
    if (null == channelId) continue;
    const channel = await client.channels.cache.get(channelId);
    if (!channel) {
      logger.error(`- skipping channelId: ${channelId}`);
      continue;
    }
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
          logger.error(`- skipping messageId: ${message.id}`);
          logger.error(error);
        }
      }
      lastMessageId = messages.last()?.id;
    }
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function addServerClearChannel(client, serverId, channelId) {
  const channel = client.channels.cache.get(channelId);
  if (!channel) throw "doesnt exist";
  logger.info(`adding clear channel: ${channelId}`);
  await addClearChannel(serverId, channelId);
}

async function removeServerClearChannel(serverId, channelId) {
  logger.info(`removing clear channel: ${channelId}`);
  await removeClearChannel(serverId, channelId);
}

async function getServerClearChannels(serverId) {
  return getClearChannels(serverId);
}

module.exports = { manualServerClear, scheduledClearer, addServerClearChannel, removeServerClearChannel, getServerClearChannels };
