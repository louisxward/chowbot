const logger = require("logger");
const { readFile, writeFile } = require("services/storageHelper");
const { createKarma, getKarmaTotalByUserId } = require("repositories/karma");

const filePath = "./data/karma.json";

const { EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID } = require("appConstants");
const KARMA_EMOJIS = [EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID];

async function karmaCounter(reaction, user, addReaction) {
  logger.info("function - karmaCounter");
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
  const isUpvote = emojiId === EMOJI_UPVOTE_ID;
  const karmaChange = isUpvote === addReaction ? 1 : -1;
  logger.info(`- emoji: ${isUpvote ? "upvote" : "downvote"}`);
  await updateUserKarma(
    reaction.message.guildId,
    reaction.message.id,
    reaction.message.author.id,
    user.id,
    karmaChange
  );
}

async function updateUserKarma(serverId, messageId, messageUserId, reactionUserId, value) {
  logger.info("function - updateUserKarma");
  await createKarma(serverId, messageId, messageUserId, reactionUserId, value);
}

async function getUserKarma(userId) {
  logger.info("function - getUserKarma");
  return await getKarmaTotalByUserId(userId);
}

async function getKarmaLeaderboard(interaction) {
  logger.info("function - getKarmaLeaderboard");
  const map = await readFile(filePath);
  const hydratedMap = new Map();
  for (const [userId, karma] of Object.entries(map)) {
    try {
      const user = await interaction.client.users.fetch(userId);
      hydratedMap.set(user.displayName, karma);
    } catch (error) {
      logger.error(`- skipping userId: ${userId}`);
      logger.error(error);
    }
  }
  return new Map(Array.from(hydratedMap).sort((a, b) => b[1] - a[1]));
}

module.exports = { karmaCounter, updateUserKarma, getUserKarma, getKarmaLeaderboard };
