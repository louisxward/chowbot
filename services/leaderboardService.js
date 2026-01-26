const logger = require("logger");
const { getKarmaLeaderboardMap } = require("repositories/karma");
const {
  createKarmaWeeklyLeaderboard,
  getPreviousKarmaWeeklyLeaderboardMap
} = require("repositories/karmaWeeklyLeaderboard");

async function logWeekly() {
  const created = new Date().toISOString();
  const map = getKarmaLeaderboardMap();
  for (const [userId, total] of Object.entries(map)) {
    createKarmaWeeklyLeaderboard(created, userId, total);
  }
}

async function getKarmaWeeklyLeaderboard() {
  const currentMap = getKarmaLeaderboardMap();
  const prevMap = getPreviousKarmaWeeklyLeaderboardMap();
}

//todo - just use an array
async function getKarmaLeaderboard(interaction) {
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
  //return new Map(Array.from(hydratedMap).sort((a, b) => b[1] - a[1]));
  return hydratedMap;
}

module.exports = { logWeekly, getKarmaLeaderboard, getKarmaWeeklyLeaderboard };
