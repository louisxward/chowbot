const logger = require("logger");
const { readFile, writeFile } = require("services/storageHelper");

const filePath = "./data/messageClearerConfig.json";

//ToDo - have to pass whole client in ?
async function clearSetChannels(client) {
  logger.info("function - clearSetChannels");
  const map = await readFile(filePath);
  for (const [serverId, channels] of Object.entries(map)) {
    logger.info(`- serverId: ${serverId}`);
    for (const channelId of channels) {
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
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

//ToDo - add channelId validation
async function addServerClearChannel(serverId, channelId) {
  logger.info("function - addServerClearChannel");
  logger.info(`- serverId: ${serverId}`);
  logger.info(`- channelId: ${channelId}`);
  const map = await readFile(filePath);
  const channels = map[serverId];
  if (channels.includes(channelId)) {
    logger.warn(`- channelId already exists skipping: ${channelId}`);
    return false;
  }
  logger.info(`- adding channelId: ${channelId}`);
  channels.push(channelId);
  map[serverId] = channels;
  await writeFile(filePath, map);
  return true;
}

async function removeServerClearChannel(serverId, channelId) {
  logger.info("function - removeServerClearChannel");
  logger.info(`- serverId: ${serverId}`);
  logger.info(`- channelId: ${channelId}`);
  const map = await readFile(filePath);
  const channels = map[serverId];
  if (!channels.includes(channelId)) {
    logger.warn(`- channelId does not exist skipping: ${channelId}`);
    return false;
  }
  logger.info(`- removing channelId: ${channelId}`);
  channels.push(channelId);
  const filtered = channels.filter((value) => value !== channelId);
  map[serverId] = filtered;
  await writeFile(filePath, map);
  return true;
}

module.exports = { clearSetChannels, addServerClearChannel, removeServerClearChannel };
