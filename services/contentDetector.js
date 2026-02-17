const logger = require("logger");

const { EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID } = require("appConstants");

async function contentDetector(message) {
  logger.info("function - contentDetector");
  logger.info(`- authorId: ${message.author.id}`);
  logger.info(`- messageId: ${message.id}`);
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

function checkMessageAge(message) {
  const oneDayInMs = 24 * 60 * 60 * 1000;
  const isTooOld = Date.now() - message.createdTimestamp > oneDayInMs;
  return !isTooOld;
}

async function handleEvent(message, update) {
  if (message.author.bot) return;
  if (message.partial) {
    try {
      await message.fetch();
    } catch (error) {
      logger.error(error);
      return;
    }
  }
  if (update && !checkMessageAge) {
    return;
  }
  if (contentDetector) {
    //react
  }
}

module.exports = { contentDetector };
