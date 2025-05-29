const logger = require("logger");
const { readFile, writeFile } = require("services/storageHelper");

const filePath = "./data/messageClearerConfig.json";

async function scheduledClearer(client) {
  logger.info("function - scheduledClearer");
  const map = await readFile(filePath);
  for (const [serverId, channelIds] of Object.entries(map)) {
    logger.info(`- serverId: ${serverId}`);
    clearChannels(client, channelIds);
  }
}

async function manualServerClear(client, serverId) {
  logger.info("function - manualServerClear");
  logger.info(`- serverId: ${serverId}`);
  const map = await readFile(filePath);
  const channelIds = null == map[serverId] ? [] : map[serverId];
  clearChannels(client, channelIds);
}

async function clearChannels(client, channelIds) {
  for (const channelId of channelIds) {
    logger.info(`- channelId: ${channelId}`);
    if (null == channelId) continue;
    const channel = client.channels.cache.get(channelId);
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
  if (!channel) {
    throw "doesnt exist";
  }
  const map = await readFile(filePath);
  const channels = null == map[serverId] ? [] : map[serverId];
  if (channels.includes(channelId)) {
    throw "already exists";
  }
  logger.info(`adding clear channel: ${channelId}`);
  channels.push(channelId);
  map[serverId] = channels;
  await writeFile(filePath, map);
}

async function removeServerClearChannel(serverId, channelId) {
  const map = await readFile(filePath);
  const channels = null == map[serverId] ? [] : map[serverId];
  if (!channels.includes(channelId)) {
    throw "doesnt exist";
  }
  logger.info(`removing clear channel: ${channelId}`);
  channels.push(channelId);
  const filtered = channels.filter((value) => value !== channelId);
  map[serverId] = filtered;
  await writeFile(filePath, map);
}

module.exports = { manualServerClear, scheduledClearer, addServerClearChannel, removeServerClearChannel };
