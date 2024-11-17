const logger = require("logger");
const { updateUserKarma } = require("services/karmaStorage");

const { EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID } = require("appConstants");
const KARMA_EMOJIS = [EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID];

async function karmaCounter(reaction, user, addReaction) {
  logger.info("function - karmaCounter");
  logger.info(`- addReaction: ${addReaction}`);
  logger.info(`- messageId: ${reaction.message.id}`);
  logger.info(`- userId: ${user.id}`);
  if (user.bot) return;
  const emojiId = reaction._emoji.id;
  if (!KARMA_EMOJIS.includes(emojiId)) return;
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      logger.error(`Error fetching partial reaction: ${error}`);
      return;
    }
  }
  const authorId = reaction.message.author.id;
  if (user.id === authorId) return;
  logger.info(`- authorId: ${authorId}`);
  const isUpvote = emojiId === EMOJI_UPVOTE_ID;
  const karmaChange = isUpvote === addReaction ? 1 : -1;
  logger.info(`- emoji: ${isUpvote ? "upvote" : "downvote"}`);
  await updateUserKarma(authorId, karmaChange);
}

module.exports = karmaCounter;
