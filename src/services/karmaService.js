const logger = require("logger");
const {
  createKarma,
  upsertReactionKarma,
  deleteKarma,
  countKarmaSince,
  getKarmaTotalByUserId
} = require("repositories/karma");
const { getAppConfig } = require("services/applicationConfigService");
const KARMA_TYPE = { MESSAGE: 0, ETIQUETTE: 1 };
const ETIQUETTE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

async function handleEvent(reaction, user, addReaction) {
  if (user.bot) return;
  const { emojiUpvoteId, emojiDownvoteId } = await getAppConfig();
  const emojiId = reaction.emoji.id;
  if (![emojiUpvoteId, emojiDownvoteId].includes(emojiId)) return;
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
    //await updateUserKarma(guildId, messageId, authorId, user.id, emojiId, 0, KARMA_TYPE.MESSAGE);
    await deleteUserKarma(guildId, messageId, user.id, emojiId);
    return;
  }

  const karmaValue = emojiId === emojiUpvoteId ? 1 : -1;
  await updateUserKarma(guildId, messageId, authorId, user.id, emojiId, karmaValue, KARMA_TYPE.MESSAGE);
}

async function updateUserKarma(serverId, messageId, userId, fromUserId, emojiId, value, type) {
  logger.info("service - updateUserKarma");
  logger.info(`- serverId: ${serverId}`);
  logger.info(`- messageId: ${messageId}`);
  logger.info(`- fromUserId: ${fromUserId}`);
  logger.info(`- value: ${value}`);
  await upsertReactionKarma(serverId, messageId, userId, fromUserId, emojiId, value, type);
}

async function deleteUserKarma(serverId, messageId, fromUserId, emojiId) {
  logger.info("service - deleteUserKarma");
  logger.info(`- serverId: ${serverId}`);
  logger.info(`- messageId: ${messageId}`);
  logger.info(`- fromUserId: ${fromUserId}`);
  await deleteKarma(serverId, messageId, fromUserId, emojiId);
}

// Returns false if fromUserId already reported userId in this server within the cooldown
async function reportEtiquette(serverId, userId, fromUserId, good, reason) {
  logger.info("service - reportEtiquette");
  logger.info(`- serverId: ${serverId}`);
  logger.info(`- userId: ${userId}`);
  logger.info(`- fromUserId: ${fromUserId}`);
  logger.info(`- good: ${good}`);
  const since = new Date(Date.now() - ETIQUETTE_COOLDOWN_MS).toISOString();
  if ((await countKarmaSince(serverId, userId, fromUserId, KARMA_TYPE.ETIQUETTE, since)) > 0) return false;
  await createKarma(serverId, null, userId, fromUserId, null, good ? 1 : -1, reason, KARMA_TYPE.ETIQUETTE);
  return true;
}

async function getUserKarma(userId) {
  return await getKarmaTotalByUserId(userId);
}

module.exports = { handleEvent, updateUserKarma, deleteUserKarma, getUserKarma, reportEtiquette, KARMA_TYPE };
