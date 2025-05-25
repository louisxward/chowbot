const logger = require("logger");
const { readFile, writeFile } = require("services/storageHelper");

const filePath = "./data/messageClearerConfig.json";

//ToDo - have to pass whole client in ?
async function clearSetChannels(client) {
  logger.info("function - clearSetChannels");
  const map = await readFile(filePath);
  for (const [serverId, channelId] of Object.entries(map)) {
    logger.info(`- serverId: ${serverId}`);
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
          logger.error(`- skipping messageId: ${msg.id}`);
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

// can be null
async function updateServerClearChannel(serverId, channelId) {
  logger.info("function - updateUserKarma");
  logger.info(`- serverId: ${serverId}`);
  logger.info(`- channelId: ${channelId}`);
  const map = await readFile(filePath);
  map[serverId] = channelId;
  await writeFile(filePath, map);
}

module.exports = { clearSetChannels, updateServerClearChannel };
