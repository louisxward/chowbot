const logger = require("logger");
const { createKarma, updateKarma, getKarmaTotalByUserId } = require("repositories/karma");

// todo rename this to karmaService

//todo needs to become .env
const { EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID } = require("appConstants");
const KARMA_EMOJIS = [EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID];

async function karmaCalculator(reaction, user, addReaction) {
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
  if (user.id === authorId) return; //todo - remove reaction aswell?
  let karmaValue = 0;
  if (addReaction) {
    const isUpvote = emojiId === EMOJI_UPVOTE_ID;
    karmaValue = isUpvote === addReaction ? 1 : -1;
  }
  await updateUserKarma(reaction.message.guildId, reaction.message.id, authorId, user.id, emojiId, karmaValue);
}

async function updateUserKarma(serverId, messageId, messageUserId, reactionUserId, reactionEmojiId, value) {
  logger.info("function - updateUserKarma");
  logger.info(`- serverId: ${serverId}`);
  logger.info(`- messageId: ${messageId}`);
  logger.info(`- reactionUserId: ${reactionUserId}`);
  logger.info(`- value: ${value}`);
  if ((await updateKarma(serverId, messageId, reactionUserId, reactionEmojiId, value)) == 0) {
    await createKarma(serverId, messageId, messageUserId, reactionUserId, reactionEmojiId, value);
  }
}

async function createUserKarma(serverId, messageId, messageUserId, reactionUserId, reactionEmojiId, value) {
  logger.info("function - createUserKarma");
  logger.info(`- serverId: ${serverId}`);
  logger.info(`- messageId: ${messageId}`);
  logger.info(`- reactionUserId: ${reactionUserId}`);
  logger.info(`- value: ${value}`);
  await createKarma(serverId, messageId, messageUserId, reactionUserId, reactionEmojiId, value);
}

async function getUserKarma(userId) {
  return await getKarmaTotalByUserId(userId);
}

module.exports = { karmaCalculator, updateUserKarma, getUserKarma, createUserKarma };
