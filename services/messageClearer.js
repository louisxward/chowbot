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
    // ToDo - channel noy found
    const channel = client.channels.cache.get(channelId);
    try {
      let messages;
      do {
        messages = await channel.messages.fetch({ limit: 100 });
        if (messages.size > 0) {
          await channel.bulkDelete(messages, true);
        }
      } while (messages.size > 0);
      logger.info(`Cleared messages in channel ${channel.name}`);
    } catch (error) {
      logger.error(`- skipping channelId: ${channelId}`);
      logger.error(error);
    }
  }
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
