const { updateUserKarma } = require("./karmaStorage.js");
const { EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID } = require("../constants.js");
const logger = require("logger");

async function karmaCounter(reaction, user, addReaction) {
  logger.info("function - karmaCounter");
  logger.info(`- addReaction: ${addReaction}`);
  if (user.bot) return;
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error(error);
      return;
    }
  }
  const authorId = reaction.message.author.id;
  if (user.id == authorId) return;
  const emojiId = reaction._emoji.id;
  logger.info(`- authorId: ${authorId}`);
  logger.info(`- emojiId: ${emojiId}`);
  if (emojiId == EMOJI_UPVOTE_ID) {
    await updateUserKarma(authorId, addReaction ? 1 : -1);
  } else if (emojiId == EMOJI_DOWNVOTE_ID) {
    await updateUserKarma(authorId, addReaction ? -1 : 1);
  }
}

module.exports = { karmaCounter };
