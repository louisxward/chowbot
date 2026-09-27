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

// Handles an up/down vote reaction being added or removed. Other emojis, bots and self-votes
// are ignored.
async function handleReaction(reaction, user, added) {
  if (user.bot) return;
  const { emojiUpvoteId, emojiDownvoteId } = await getAppConfig();
  const emojiId = reaction.emoji.id;
  if (![emojiUpvoteId, emojiDownvoteId].includes(emojiId)) return;
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (err) {
      logger.error({ err }, "karma - failed to fetch partial reaction");
      return;
    }
  }
  const authorId = reaction.message.author.id;
  if (user.id === authorId) return;

  const { guildId, id: messageId } = reaction.message;
  if (!added) {
    await deleteUserKarma(guildId, messageId, user.id, emojiId);
    return;
  }
  const value = emojiId === emojiUpvoteId ? 1 : -1;
  await updateUserKarma(guildId, messageId, authorId, user.id, emojiId, value, KARMA_TYPE.MESSAGE);
}

async function updateUserKarma(serverId, messageId, userId, fromUserId, emojiId, value, type) {
  logger.info({ serverId, messageId, userId, fromUserId, value }, "karma - reaction saved");
  await upsertReactionKarma(serverId, messageId, userId, fromUserId, emojiId, value, type);
}

async function deleteUserKarma(serverId, messageId, fromUserId, emojiId) {
  logger.info({ serverId, messageId, fromUserId }, "karma - reaction removed");
  await deleteKarma(serverId, messageId, fromUserId, emojiId);
}

// Returns false if fromUserId already reported userId in this server within the cooldown
async function reportEtiquette(serverId, userId, fromUserId, good, reason) {
  const since = new Date(Date.now() - ETIQUETTE_COOLDOWN_MS).toISOString();
  if ((await countKarmaSince(serverId, userId, fromUserId, KARMA_TYPE.ETIQUETTE, since)) > 0) {
    logger.info({ serverId, userId, fromUserId }, "karma - etiquette report refused, on cooldown");
    return false;
  }
  logger.info({ serverId, userId, fromUserId, good, reason }, "karma - etiquette reported");
  await createKarma(serverId, null, userId, fromUserId, null, good ? 1 : -1, reason, KARMA_TYPE.ETIQUETTE);
  return true;
}

async function getUserKarma(userId) {
  return getKarmaTotalByUserId(userId);
}

module.exports = { handleReaction, updateUserKarma, deleteUserKarma, reportEtiquette, getUserKarma, KARMA_TYPE };
