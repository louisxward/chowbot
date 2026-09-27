const logger = require("logger");
const { getKarmaLeaderboardMap } = require("repositories/karma");
const {
  createKarmaWeeklyLeaderboardWeek,
  createKarmaWeeklyLeaderboardUser,
  getPreviousWeekId,
  getKarmaWeeklyLeaderboardMapByWeek
} = require("repositories/karmaWeeklyLeaderboard");
const { EmbedBuilder, escapeMarkdown } = require("discord.js");
const { getAllChannels } = require("repositories/serverChannel");
const { getCachedUsername, setCachedUsername } = require("services/sessionStateStorage");

const SPACING = "\u00A0\u00A0\u00A0";
const JOIN = "\n\n";
const LRM = "\u200E";
const MAX_DESCRIPTION = 4096; // Discord's embed description limit
const USERNAME_FETCH_BATCH = 10;

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
  const entries = [...currentMap.entries()];
  let description = "";
  // Fetch usernames a batch at a time and stop once the embed is full
  for (let start = 0; start < entries.length; start += USERNAME_FETCH_BATCH) {
    const batch = entries.slice(start, start + USERNAME_FETCH_BATCH);
    const usernames = await Promise.all(batch.map(([userId]) => getUsername(users, userId)));
    for (let i = 0; i < batch.length; i++) {
      const [userId, currentEntry] = batch[i];
      const line = formatLine(currentEntry, prevMap.get(userId), usernames[i]);
      const shown = start + i;
      const next = description ? description + JOIN + line : line;
      const remainingAfter = entries.length - shown - 1;
      const footer = remainingAfter > 0 ? moreFooter(remainingAfter) : "";
      if (next.length + footer.length > MAX_DESCRIPTION) {
        return description + moreFooter(entries.length - shown);
      }
      description = next;
    }
  }
  return description;
}

function moreFooter(count) {
  return `${JOIN}…and ${count} more`;
}

function formatLine(currentEntry, prevEntry, username) {
  // Current
  const currentScore = currentEntry.value;
  const currentIndex = currentEntry.index;
  // Previous
  let prevScore = 0;
  let prevIndex = 0;
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
  } else if (changeIndex < 0) {
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
  return line;
}

async function getUsername(users, userId) {
  if (!userId) throw new Error("getUsername - userId is required");
  const cached = await getCachedUsername(userId);
  if (cached) return cached;
  try {
    const user = await users.fetch(userId);
    const safeUsername = getSafeText(user.displayName);
    const username = safeUsername ? safeUsername : user.username;
    await setCachedUsername(userId, username);
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
  const channels = await getAllChannels("leaderboardChannels");
  if (channels.length === 0) return;
  const content = await getKarmaWeeklyLeaderboardFormatted(client.users);
  const embed = new EmbedBuilder().setTitle("Karma Leaderboard").setDescription(content);
  for (const { serverId, channelId } of channels) {
    logger.info(`- serverId: ${serverId}`);
    logger.info(`- channelId: ${channelId}`);
    const channel = client.channels.cache.get(channelId);
    if (!channel || channel.guildId !== serverId) {
      logger.error({ serverId, channelId }, "leaderboard - skipping channel, not found in this server");
      continue;
    }
    try {
      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error, serverId, channelId }, "leaderboard - failed to send");
    }
  }
}

module.exports = {
  persistKarmaWeeklyLeaderboard,
  getKarmaWeeklyLeaderboardFormatted,
  sendKarmaWeeklyLeaderboard
};
