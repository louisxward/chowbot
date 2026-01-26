const logger = require("logger");
const { getKarmaLeaderboardMap } = require("repositories/karma");
const {
  createKarmaWeeklyLeaderboard,
  getPreviousKarmaWeeklyLeaderboardMap
} = require("repositories/karmaWeeklyLeaderboard");

async function logWeekly() {
  logger.info("logWeekly()");
  const created = new Date().toISOString();
  logger.info(`- date: ${created}`);
  const map = await getKarmaLeaderboardMap();
  for (const [userId, e] of Object.entries(map)) {
    createKarmaWeeklyLeaderboard(created, userId, e.value);
  }
}

async function getKarmaWeeklyLeaderboard() {
  let lines = [];
  const currentMap = getKarmaLeaderboardMap();
  const prevMap = getPreviousKarmaWeeklyLeaderboardMap();
  for (const [userId, e] of Object.entries(currentMap)) {
    //lines.push();
  }
  return lines.join("\n");
}

async function getKarmaWeeklyLeaderboardTest(interaction) {
  const map = await getPreviousKarmaWeeklyLeaderboardMap();
  const hydratedMap = new Map();
  for (const [userId, e] of Object.entries(map)) {
    try {
      const username = await getUsername(interaction, userId);
      hydratedMap.set(username, e);
    } catch (error) {
      logger.error(`- skipping userId: ${userId}`);
    }
  }
  //return new Map(Array.from(hydratedMap).sort((a, b) => b[1] - a[1])); - sorted in sql call, not sure if i like it or not
  return hydratedMap;
}

//todo - just use an array
async function getKarmaLeaderboard(interaction) {
  const map = await getKarmaLeaderboardMap();
  const hydratedMap = new Map();
  for (const [userId, e] of Object.entries(map)) {
    try {
      const username = await getUsername(interaction, userId);
      hydratedMap.set(username, e);
    } catch (error) {
      logger.error(`- skipping userId: ${userId}`);
    }
  }
  //return new Map(Array.from(hydratedMap).sort((a, b) => b[1] - a[1])); - sorted in sql call, not sure if i like it or not
  return hydratedMap;
}

async function getUsername(interaction, userId) {
  if (!userId) throw error;
  try {
    const user = await interaction.client.users.fetch(userId);
    return user.displayName;
  } catch (error) {
    logger.error(`- cannot find userId: ${userId}`);
  }
  return userId;
}

async function leaderboardFormatter(leaderboard) {
  if (!leaderboard || leaderboard.size == 0) {
    return "Empty";
  }
  let lines = [];
  let medal = null;
  for (const [key, e] of leaderboard.entries()) {
    medal = null;
    if (e.index === 1) {
      medal = `🥇`;
    } else if (e.index === 2) {
      medal = `🥈`;
    } else if (e.index === 3) {
      medal = `🥉`;
    }
    lines.push(`${medal ? medal : e.index.toString() + ". "} ${e.index < 4 ? "**" + key + "**" : key}: ${e.value}`);
  }
  return lines.join("\n");
}

module.exports = {
  logWeekly,
  getKarmaLeaderboard,
  getKarmaWeeklyLeaderboard,
  getKarmaWeeklyLeaderboardTest,
  leaderboardFormatter
};
