const fs = require("fs/promises");
const logger = require("logger");

const dataFilePath = "./data/karma.json";
const encoding = "utf8";

async function updateUserKarma(userId, value) {
  logger.info("function - updateUserKarma");
  logger.info(`- userId: ${userId}`);
  logger.info(`- value: ${value}`);
  try {
    let data = {};
    try {
      const fileContent = await fs.readFile(dataFilePath, encoding);
      data = JSON.parse(fileContent);
    } catch (error) {
      if (error.code !== "ENOENT") logger.error(error);
    }
    const currentKarma = data[userId];
    data[userId] = null == currentKarma ? value : currentKarma + value;
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    logger.error(error);
  }
}

async function getUserKarma(userId) {
  logger.info("function - getUserKarma");
  try {
    const fileContent = await fs.readFile(dataFilePath, encoding);
    const data = JSON.parse(fileContent);
    const karma = data[userId];
    return null == karma ? 0 : karma;
  } catch (error) {
    logger.error(error);
    return null;
  }
}

async function getKarmaLeaderboard(interaction) {
  logger.info("function - getKarmaLeaderboard");
  try {
    let data = {};
    try {
      const fileContent = await fs.readFile(dataFilePath, encoding);
      data = JSON.parse(fileContent);
    } catch (error) {
      if (error.code !== "ENOENT") logger.error(error);
      return null;
    }
    const hydratedMap = new Map();
    for (const [userId, karma] of Object.entries(data)) {
      const user = await interaction.client.users.fetch(userId);
      hydratedMap.set(user.globalName, karma);
    }
    const sortedMap = new Map(Array.from(hydratedMap).sort((a, b) => b[1] - a[1]));
    return sortedMap;
  } catch (error) {
    logger.error(error);
    return null;
  }
}

module.exports = { updateUserKarma, getUserKarma, getKarmaLeaderboard };
