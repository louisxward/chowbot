const { updateUserKarma } = require("./karmaStorage.js");
const { EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID } = require("appConstants");
const logger = require("logger");

async function karmaCounter(reaction, user, addReaction) {
  logger.info("function - karmaCounter");
  logger.info(`- addReaction: ${addReaction}`);
  logger.info(`- messageId: ${reaction.message.id}`);
  logger.info(`- userId: ${user.id}`);
  if (user.bot) return;
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      logger.error(error);
      return;
    }
  }
  const authorId = reaction.message.author.id;
  if (user.id == authorId) return;
  const emojiId = reaction._emoji.id;
  logger.info(`- authorId: ${authorId}`);
  if (emojiId == EMOJI_UPVOTE_ID) {
    logger.info("- emoji: upvote");
    await updateUserKarma(authorId, addReaction ? 1 : -1);
  } else if (emojiId == EMOJI_DOWNVOTE_ID) {
    logger.info("- emoji: downvote");
    await updateUserKarma(authorId, addReaction ? -1 : 1);
  }
  return;
}

module.exports = { karmaCounter };
