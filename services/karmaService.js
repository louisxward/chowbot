const logger = require("logger");
const { createKarma: repoCreateKarma, deleteKarma, updateKarma, getKarmaTotalByUserId } = require("repositories/karma");
require("dotenv").config();

const EMOJI_UPVOTE_ID = process.env.EMOJI_UPVOTE_ID;
const EMOJI_DOWNVOTE_ID = process.env.EMOJI_DOWNVOTE_ID;
const KARMA_EMOJIS = [EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID];

const KARMA_TYPE = { MESSAGE: 0, ETIQUETTE: 1 };

async function handleEvent(reaction, user, addReaction) {
  if (user.bot) return;
  const emojiId = reaction._emoji.id;
  if (!KARMA_EMOJIS.includes(emojiId)) return;
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      logger.error({ err: error }, "event - failed to fetch partial reaction");
      return;
    }
  }
  const authorId = reaction.message.author.id;
  if (user.id === authorId) return;

  const { guildId, id: messageId } = reaction.message;

  if (!addReaction) {
    await deleteUserKarma(guildId, messageId, user.id, emojiId);
    return;
  }

  const karmaValue = emojiId === EMOJI_UPVOTE_ID ? 1 : -1;
  await updateUserKarma(guildId, messageId, authorId, user.id, emojiId, karmaValue, KARMA_TYPE.MESSAGE);
}

async function updateUserKarma(serverId, messageId, userId, fromUserId, emojiId, value, type) {
  logger.info("service - updateUserKarma");
  logger.info(`- serverId: ${serverId}`);
  logger.info(`- messageId: ${messageId}`);
  logger.info(`- fromUserId: ${fromUserId}`);
  logger.info(`- value: ${value}`);
  //todo maybe remove this one day, if user reacts while down
  if ((await updateKarma(serverId, messageId, fromUserId, emojiId, value)) == 0) {
    await repoCreateKarma(serverId, messageId, userId, fromUserId, emojiId, value, null, type);
  }
}

async function deleteUserKarma(serverId, messageId, fromUserId, emojiId) {
  logger.info("service - deleteUserKarma");
  logger.info(`- serverId: ${serverId}`);
  logger.info(`- messageId: ${messageId}`);
  logger.info(`- fromUserId: ${fromUserId}`);
  await deleteKarma(serverId, messageId, fromUserId, emojiId);
}

async function createKarma(serverId, messageId, userId, fromUserId, emojiId, value, reason, type) {
  logger.info("service - createUserKarma");
  logger.info(`- serverId: ${serverId}`);
  logger.info(`- userId: ${userId}`);
  logger.info(`- fromUserId: ${fromUserId}`);
  logger.info(`- value: ${value}`);
  await repoCreateKarma(serverId, messageId, userId, fromUserId, emojiId, value, reason, type);
}

async function getUserKarma(userId) {
  return await getKarmaTotalByUserId(userId);
}

module.exports = { handleEvent, updateUserKarma, deleteUserKarma, getUserKarma, createKarma, KARMA_TYPE };
