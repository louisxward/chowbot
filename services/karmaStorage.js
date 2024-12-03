const logger = require("logger");
const { readFile, writeFile } = require("services/storageHelper");

const filePath = "./data/karma.json";

async function updateUserKarma(userId, value) {
  logger.info("function - updateUserKarma");
  logger.info(`- userId: ${userId}`);
  logger.info(`- value: ${value}`);
  const map = await readFile(filePath);
  const currentKarma = map[userId];
  map[userId] = null == currentKarma ? value : currentKarma + value;
  await writeFile(filePath, map);
}

async function getUserKarma(userId) {
  logger.info("function - getUserKarma");
  logger.info(`- userId: ${userId}`);
  const map = await readFile(filePath);
  return map[userId];
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

module.exports = { updateUserKarma, getUserKarma, getKarmaLeaderboard };
