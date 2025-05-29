const logger = require("logger");
const { readFile, writeFile } = require("services/storageHelper");
const { createKarma, updateKarma, getKarmaTotalByUserId, getKarmaLeaderboardMap } = require("repositories/karma");

const filePath = "./data/karma.json";

//todo needs to become .env
const { EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID } = require("appConstants");
const KARMA_EMOJIS = [EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID];

async function karmaCalculator(reaction, user, addReaction) {
  logger.info("function - karmaCalculator");
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
  let karmaValue = 0;
  if (addReaction) {
    const isUpvote = emojiId === EMOJI_UPVOTE_ID;
    karmaValue = isUpvote === addReaction ? 1 : -1;
  }
  await updateUserKarma(
    reaction.message.guildId,
    reaction.message.id,
    reaction.message.author.id,
    user.id,
    emojiId,
    karmaValue
  );
}

async function updateUserKarma(serverId, messageId, messageUserId, reactionUserId, reactionEmojiId, value) {
  logger.info("function - updateUserKarma");
  logger.info(`- serverId: ${serverId}`);
  logger.info(`- messageId: ${messageId}`);
  logger.info(`- reactionUserId: ${reactionUserId}`);
  if ((await updateKarma(serverId, messageId, reactionUserId, reactionEmojiId, value)) == 0) {
    await createKarma(serverId, messageId, messageUserId, reactionUserId, reactionEmojiId, value);
  }
}

async function getUserKarma(userId) {
  logger.info("function - getUserKarma");
  return await getKarmaTotalByUserId(userId);
}

async function getKarmaLeaderboard(interaction) {
  logger.info("function - getKarmaLeaderboard");
  const map = await getKarmaLeaderboardMap();
  const hydratedMap = new Map();
  for (const [userId, total] of Object.entries(map)) {
    try {
      const user = await interaction.client.users.fetch(userId);
      hydratedMap.set(user.displayName, total);
    } catch (error) {
      logger.error(`- skipping userId: ${userId}`);
      logger.error(error);
    }
  }
  return new Map(Array.from(hydratedMap).sort((a, b) => b[1] - a[1]));
}

module.exports = { karmaCalculator, updateUserKarma, getUserKarma, getKarmaLeaderboard };
