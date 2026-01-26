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
  for (const [userId, e] of map.entries()) {
    createKarmaWeeklyLeaderboard(created, userId, e.value);
  }
}

async function getKarmaWeeklyLeaderboard(users) {
  let lines = [];
  const currentMap = await getKarmaLeaderboardMap();
  logger.error(`- currentMap: ${currentMap.size}`);
  const prevMap = await getPreviousKarmaWeeklyLeaderboardMap();
  logger.error(`- prevMap: ${prevMap.size}`);
  for (const [userId, currentEntry] of currentMap.entries()) {
    logger.error(`- userId: ${userId}`);

    const username = await getUsername(users, userId);

    // Current
    logger.info("current");
    const currentScore = currentEntry.value;
    logger.error(`- currentScore: ${currentScore}`);
    const currentIndex = currentEntry.index;
    logger.error(`- currentIndex: ${currentIndex}`);

    // Previous
    logger.info("previous");
    let prevScore = 0;
    let prevIndex = 0;
    const prevEntry = prevMap.get(userId);
    if (prevEntry) {
      prevScore = prevEntry.value;
      logger.error(`- prevScore: ${prevScore}`);
      prevIndex = prevEntry.index;
      logger.error(`- prevIndex: ${prevIndex}`);
    }

    // Compare
    logger.info("compare");
    const changeScore = currentScore - prevScore;
    logger.error(`- changeScore: ${changeScore}`);
    const changeIndex = prevIndex - currentIndex;
    logger.error(`- changeIndex: ${changeIndex}`);

    // Format
    let indexString = null;

    if (changeIndex > 2) {
      indexString = "🔥";
    } else if (changeIndex > 1) {
      indexString = "⏫";
    } else if (changeIndex > 0) {
      indexString = "🔼";
    } else if (changeIndex === 0) {
      indexString = "↔️";
    } else if (changeIndex < -2) {
      indexString = "💩";
    } else if (changeIndex < -1) {
      indexString = "⏬";
    } else if (changeIndex < -0) {
      indexString = "🔽";
    }
    //🔼⏫🔽⏬

    lines.push(
      `${indexString ? indexString : ""} ${currentIndex}. ${username}: ${changeScore > 0 ? "+" + changeScore : changeScore} / ${currentScore}`
    );
  }
  return lines.join("\n");
}

async function getKarmaWeeklyLeaderboardTest(users) {
  const map = await getPreviousKarmaWeeklyLeaderboardMap();
  logger.info(`- map size: ${map.size}`);
  const hydratedMap = new Map();
  for (const [userId, e] of map.entries()) {
    try {
      const username = await getUsername(users, userId);
      hydratedMap.set(username, e);
    } catch (error) {
      logger.error(`- skipping userId: ${userId}`);
    }
  }
  //return new Map(Array.from(hydratedMap).sort((a, b) => b[1] - a[1])); - sorted in sql call, not sure if i like it or not
  return hydratedMap;
}

//todo - just use an array
async function getKarmaLeaderboard(users) {
  const map = await getKarmaLeaderboardMap();
  logger.info(`- map size: ${map.size}`);
  const hydratedMap = new Map();
  for (const [userId, e] of map.entries()) {
    try {
      const username = await getUsername(users, userId);
      hydratedMap.set(username, e);
    } catch (error) {
      logger.error(`- skipping userId: ${userId}`);
    }
  }
  //return new Map(Array.from(hydratedMap).sort((a, b) => b[1] - a[1])); - sorted in sql call, not sure if i like it or not
  logger.info(`- hydratedMap size: ${hydratedMap.size}`);
  return hydratedMap;
}

async function getUsername(users, userId) {
  if (!userId) throw error;
  try {
    const user = await users.fetch(userId);
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
