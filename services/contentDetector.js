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
  logger.info(`- embedsLength: ${message.embeds.length}`);
  logger.info(`- attachmentsSize: ${message.attachments.size}`);
  if (message.embeds.length > 0) {
    const content = message.content;
    logger.info(`- content: ${content}`);
    if (null != content && !content.includes("tenor.com")) {
      return true;
    }
  }
  if (message.attachments.size > 0) {
    const contentType = message.attachments.first().contentType;
    logger.info(`- contentType: ${contentType}`);
    if (null != contentType && (contentType.includes("image") || contentType.includes("video"))) {
      return true;
    }
  }
  return false;
}

module.exports = contentDetector;
