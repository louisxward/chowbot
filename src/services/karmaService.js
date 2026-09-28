const logger = require("logger");
const {
  createKarma,
  upsertReactionKarma,
  deleteKarma,
  countKarmaSince,
  getKarmaTotalByUserId
} = require("repositories/karma");
const { findKarmaEmoji } = require("services/karmaEmojiService");

const KARMA_TYPE = { MESSAGE: 0, ETIQUETTE: 1 };
const ETIQUETTE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Handles a karma emoji reaction being added or removed. The emoji's configured value is the
// karma it's worth. Other emojis, bots and self-votes are ignored.
async function handleReaction(reaction, user, added) {
  if (user.bot) return;
  const karmaEmoji = findKarmaEmoji(reaction.emoji);
  if (!karmaEmoji) return;
  const emojiId = karmaEmoji.id;
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
  await updateUserKarma(guildId, messageId, authorId, user.id, emojiId, karmaEmoji.value, KARMA_TYPE.MESSAGE);
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
