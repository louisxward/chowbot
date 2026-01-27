const logger = require("logger");

async function contentDetector(message) {
  logger.info("function - contentDetector");
  logger.info(`- authorId: ${message.author.id}`);
  logger.info(`- messageId: ${message.id}`);
  if (message.author.bot) return false;
  if (message.partial) {
    try {
      await message.fetch();
    } catch (error) {
      logger.error(error);
      return false;
    }
  }
  for (const embed of message.embeds) {
    // todo move include to config file
    if (
      embed.url &&
      (embed.url.includes("https://www.youtube.com/") ||
        embed.url.includes("https://twitter.com/") ||
        embed.url.includes("https://www.x.com/") ||
        embed.url.includes("https://streamable.com/") ||
        embed.url.includes("https://youtu.be/") ||
        embed.url.includes("https://www.tiktok.com/") ||
        embed.url.includes("https://vm.tiktok.com/") ||
        embed.url.includes("https://gyazo.com/"))
    ) {
      return true;
    }
  }
  for (const attachments of message.attachments) {
    for (const attachment of attachments) {
      if (
        attachment.contentType &&
        (attachment.contentType.includes("image") || attachment.contentType.includes("video"))
      ) {
        return true;
      }
    }
  }

  return false;
}

module.exports = contentDetector;
