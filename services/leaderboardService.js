const logger = require("logger");
const { getKarmaLeaderboardMap } = require("repositories/karma");
const {
  createKarmaWeeklyLeaderboardWeek,
  createKarmaWeeklyLeaderboardUser,
  getPreviousWeekId,
  getKarmaWeeklyLeaderboardMapByWeek
} = require("repositories/karmaWeeklyLeaderboard");

const SPACING = "\u00A0\u00A0\u00A0";

async function logWeekly() {
  logger.info("logWeekly()");
  const created = new Date().toISOString();
  logger.info(`- date: ${created}`);
  const weekId = await createKarmaWeeklyLeaderboardWeek(created);
  logger.info(`- weekId: ${weekId}`);
  const map = await getKarmaLeaderboardMap();
  for (const [userId, e] of map.entries()) {
    await createKarmaWeeklyLeaderboardUser(weekId, userId, e.value);
  }
}

async function getKarmaWeeklyLeaderboardFormatted(users) {
  let lines = [];
  const currentMap = await getKarmaLeaderboardMap();
  logger.error(`- currentMap: ${currentMap.size}`);
  const weekId = await getPreviousWeekId();
  logger.info(`- previous weekId: ${weekId}`);
  const prevMap = await getKarmaWeeklyLeaderboardMapByWeek(weekId);
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

    let changeIndex = null;
    if (prevEntry) {
      changeIndex = prevIndex - currentIndex;
    }
    logger.error(`- changeIndex: ${changeIndex}`);

    // Medal
    let medal = null;
    if (currentIndex === 1) {
      medal = `🥇`;
    } else if (currentIndex === 2) {
      medal = `🥈`;
    } else if (currentIndex === 3) {
      medal = `🥉`;
    }

    // Streak
    let indexString = null;
    if (!changeIndex) {
      indexString = "🐣"; // if user is new
    } else if (changeIndex > 2) {
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
      `${indexString ? indexString : ""}${SPACING}${medal ? medal : currentIndex + "."}${SPACING}${currentIndex < 4 ? "**" + username + "**" : username}:${SPACING}${changeScore > 0 ? "+" + changeScore : changeScore}${SPACING}/${SPACING}${currentScore}`
    );
  }
  return lines.join("\n\n");
}

async function getKarmaLeaderboardFormatted(users) {
  const map = await getKarmaLeaderboardMap();
  return await leaderboardFormatter(users, map);
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

async function leaderboardFormatter(users, map) {
  if (!map || map.size == 0) {
    return "Empty";
  }
  let lines = [];
  for (const [userId, e] of map.entries()) {
    const username = await getUsername(users, userId);
    let medal = null;
    if (e.index === 1) {
      medal = `🥇`;
    } else if (e.index === 2) {
      medal = `🥈`;
    } else if (e.index === 3) {
      medal = `🥉`;
    }
    lines.push(
      `${medal ? medal : e.index.toString() + "."}${SPACING}${e.index < 4 ? "**" + username + "**" : username}:${SPACING}${e.value}`
    );
  }
  return lines.join("\n\n");
}

module.exports = {
  logWeekly,
  getKarmaLeaderboardFormatted,
  getKarmaWeeklyLeaderboardFormatted,
  leaderboardFormatter
};
