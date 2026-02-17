const logger = require("logger");

require("dotenv").config();

function contentDetector(message) {
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
  const hasAllReactions =
    hasReaction(message, process.env.EMOJI_UPVOTE_ID) && hasReaction(message, process.env.EMOJI_DOWNVOTE_ID);
  // checkMessageAge fix for weird issue where bot started reacting to old posts
  if (update && (hasAllReactions || !checkMessageAge(message))) {
    return;
  }
  if (contentDetector(message)) {
    try {
      await addKarmaReactions(message);
    } catch (error) {
      logger.error(error);
    }
  }
}

function hasReaction(message, emojiId) {
  return message.reactions.cache.get(emojiId)?.users.cache.has(message.client.user.id);
}

async function addKarmaReactions(message) {
  await safeReact(message, process.env.EMOJI_UPVOTE_ID);
  await safeReact(message, process.env.EMOJI_DOWNVOTE_ID);
}

async function safeReact(message, emojiId) {
  if (!hasReaction(message, emojiId)) {
    await message.react(emojiId);
  }
}

module.exports = { handleEvent, addKarmaReactions };
