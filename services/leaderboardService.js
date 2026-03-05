const logger = require("logger");
const { getKarmaLeaderboardMap } = require("repositories/karma");
const {
  createKarmaWeeklyLeaderboardWeek,
  createKarmaWeeklyLeaderboardUser,
  getPreviousWeekId,
  getKarmaWeeklyLeaderboardMapByWeek
} = require("repositories/karmaWeeklyLeaderboard");
const { EmbedBuilder, escapeMarkdown } = require("discord.js");
const { readServerConfig } = require("services/serverConfigStorage");

const SPACING = "\u00A0\u00A0\u00A0";
const JOIN = "\n\n";
const LRM = "\u200E";

const USERNAME_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const usernameCache = new Map();

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
    } else if (changeIndex > 2 && changeScore > 0) {
      indexString = "🔥";
    } else if (changeIndex > 1) {
      indexString = "⏫";
    } else if (changeIndex > 0) {
      indexString = "🔼";
    } else if (changeIndex === 0) {
      indexString = "↔️";
    } else if (changeIndex < -2 && changeScore < 0) {
      indexString = "💩";
    } else if (changeIndex < -1) {
      indexString = "⏬";
    } else if (changeIndex < -0) {
      indexString = "🔽";
    }
    // Concat
    const line =
      `${indexString ? indexString : ""}${SPACING}` +
      `${medal ? medal : currentIndex + "."}${SPACING}` +
      `${currentIndex < 4 ? "**" + username + "**" : username}:${SPACING}` +
      `${changeScore > 6 || changeScore < -6 ? "**" : ""}` +
      `${changeScore > 0 ? "+" + changeScore : changeScore}${SPACING}` +
      `${changeScore > 6 || changeScore < -6 ? "**" : ""}` +
      `/${SPACING}${currentScore}`;
    lines.push(line);
  }
  return lines.join(JOIN);
}

async function getUsername(users, userId) {
  if (!userId) throw error;
  const cached = usernameCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < USERNAME_CACHE_TTL_MS) {
    return cached.username;
  }
  try {
    const user = await users.fetch(userId);
    const safeUsername = getSafeText(user.displayName);
    const username = safeUsername ? safeUsername : user.username;
    usernameCache.set(userId, { username, cachedAt: Date.now() });
    return username;
  } catch (error) {
    //logger.warn(error);
  }
  return userId;
}

function getSafeText(input) {
  if (!input || typeof input !== "string") return null;
  let clean = escapeMarkdown(input);
  if (clean.length === 0) return null;
  clean = clean + LRM;
  return clean;
}

async function sendKarmaWeeklyLeaderboard(client) {
  logger.info("function - sendKarmaWeeklyLeaderboard");
  const config = await readServerConfig();
  if (Object.keys(config).length === 0) return;
  const content = await getKarmaWeeklyLeaderboardFormatted(client.users);
  const embed = new EmbedBuilder().setTitle("Karma Leaderboard").setDescription(content);
  for (const [serverId, serverConfig] of Object.entries(config)) {
    logger.info(`- serverId: ${serverId}`);
    for (const channelId of serverConfig.leaderboardChannels ?? []) {
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
  getKarmaWeeklyLeaderboardFormatted,
  sendKarmaWeeklyLeaderboard
};
