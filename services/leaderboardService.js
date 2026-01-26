const logger = require("logger");
const { getKarmaLeaderboardMap } = require("repositories/karma");
const {
  createKarmaWeeklyLeaderboardWeek,
  createKarmaWeeklyLeaderboardUser,
  getPreviousWeekId,
  getKarmaWeeklyLeaderboardMapByWeek
} = require("repositories/karmaWeeklyLeaderboard");
const { EmbedBuilder } = require("discord.js");
const { readFile } = require("services/storageHelper");

const SPACING = "\u00A0\u00A0\u00A0";
const JOIN = "\n\n";

async function persistKarmaWeeklyLeaderboard() {
  logger.info("function - persistKarmaWeeklyLeaderboard");
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
  const currentMap = await getKarmaLeaderboardMap();
  if (currentMap.size === 0) {
    return "Empty";
  }
  const weekId = await getPreviousWeekId();
  logger.info(`- previous weekId: ${weekId}`);
  const prevMap = await getKarmaWeeklyLeaderboardMapByWeek(weekId);
  let lines = [];
  for (const [userId, currentEntry] of currentMap.entries()) {
    const username = await getUsername(users, userId);
    // Current
    const currentScore = currentEntry.value;
    const currentIndex = currentEntry.index;
    // Previous
    let prevScore = 0;
    let prevIndex = 0;
    const prevEntry = prevMap.get(userId);
    if (prevEntry) {
      prevScore = prevEntry.value;
      prevIndex = prevEntry.index;
    }
    // Compare
    const changeScore = currentScore - prevScore;
    let changeIndex = null;
    if (prevEntry) {
      changeIndex = prevIndex - currentIndex;
    }
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
    if (changeIndex === null) {
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
    // Concat
    lines.push(
      `${indexString ? indexString : ""}${SPACING}` +
        `${medal ? medal : currentIndex + "."}${SPACING}` +
        `${currentIndex < 4 ? "**" + username + "**" : username}:${SPACING}` +
        `${changeScore > 0 ? "+" + changeScore : changeScore}${SPACING}` +
        `/${SPACING}${currentScore}`
    );
  }
  return lines.join(JOIN);
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
      `${medal ? medal : e.index.toString() + "."}${SPACING}` +
        `${e.index < 4 ? "**" + username + "**" : username}:${SPACING}` +
        `${e.value}`
    );
  }
  return lines.join(JOIN);
}

async function sendKarmaWeeklyLeaderboard(client) {
  logger.info("function - sendKarmaWeeklyLeaderboard");

  const filePath = "./data/leaderboardWeeklyChannelConfig.json"; // todo tidy this all up
  const map = await readFile(filePath);

  if (Object.keys(map).length === 0) {
    return;
  }

  const content = await getKarmaWeeklyLeaderboardFormatted(client.users);
  const embed = new EmbedBuilder().setTitle("Karma Weekly Leaderboard").setDescription(content);

  for (const [serverId, channelIds] of Object.entries(map)) {
    logger.info(`- serverId: ${serverId}`);
    logger.info(`- channelIds Length: ${channelIds.length}`);
    for (const channelId of channelIds) {
      logger.info(`- channelId: ${channelId}`);
      if (null == channelId) continue;
      const channel = await client.channels.cache.get(channelId);
      if (!channel) {
        logger.error(`- skipping channelId: ${channelId}`);
        continue;
      }
      try {
        await channel.send({ embeds: [embed] });
      } catch (error) {
        logger.error(error);
      }
    }
  }
}

module.exports = {
  persistKarmaWeeklyLeaderboard,
  getKarmaLeaderboardFormatted,
  getKarmaWeeklyLeaderboardFormatted,
  sendKarmaWeeklyLeaderboard
};
