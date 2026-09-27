const { EmbedBuilder, escapeMarkdown } = require("discord.js");
const logger = require("logger");
const { getKarmaLeaderboardMap } = require("repositories/karma");
const {
  createKarmaWeeklyLeaderboardWeek,
  createKarmaWeeklyLeaderboardUser,
  getPreviousWeekId,
  getKarmaWeeklyLeaderboardMapByWeek
} = require("repositories/karmaWeeklyLeaderboard");
const { getAllChannels } = require("repositories/serverChannel");
const { getCachedUsername, setCachedUsername } = require("services/usernameCacheService");

const SPACING = "\u00A0\u00A0\u00A0";
const JOIN = "\n\n";
const LRM = "\u200E";
const MAX_DESCRIPTION = 4096; // Discord's embed description limit
const USERNAME_FETCH_BATCH = 10;
const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

// Saves everyone's current total as this week's snapshot, which next week's leaderboard
// compares against
async function persistKarmaWeeklyLeaderboard() {
  const weekId = await createKarmaWeeklyLeaderboardWeek(new Date().toISOString());
  const leaderboard = await getKarmaLeaderboardMap();
  for (const [userId, { value }] of leaderboard) {
    await createKarmaWeeklyLeaderboardUser(weekId, userId, value);
  }
  logger.info({ weekId, users: leaderboard.size }, "leaderboard - weekly snapshot saved");
}

async function buildLeaderboardEmbed(users) {
  const description = await getKarmaWeeklyLeaderboardFormatted(users);
  return new EmbedBuilder().setTitle("Karma Leaderboard").setDescription(description);
}

async function getKarmaWeeklyLeaderboardFormatted(users) {
  const currentMap = await getKarmaLeaderboardMap();
  if (currentMap.size === 0) {
    return "Empty";
  }
  const weekId = await getPreviousWeekId();
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
  const { value: currentScore, index: currentIndex } = currentEntry;
  const changeScore = currentScore - (prevEntry?.value ?? 0);
  const changeIndex = prevEntry ? prevEntry.index - currentIndex : null;
  const movement = getMovementIcon(changeIndex, changeScore);
  const rank = MEDALS[currentIndex] ?? `${currentIndex}.`;
  const name = currentIndex <= 3 ? `**${username}**` : username;
  const bold = Math.abs(changeScore) > 6 ? "**" : "";
  const signedChange = changeScore > 0 ? `+${changeScore}` : `${changeScore}`;
  return (
    `${movement}${SPACING}${rank}${SPACING}${name}:${SPACING}` +
    `${bold}${signedChange}${SPACING}${bold}/${SPACING}${currentScore}`
  );
}

// changeIndex is places moved up since last week (negative for down), or null for a new user
function getMovementIcon(changeIndex, changeScore) {
  if (changeIndex === null) return "🐣";
  if (changeIndex > 2 && changeScore > 0) return "🔥";
  if (changeIndex > 1) return "⏫";
  if (changeIndex > 0) return "🔼";
  if (changeIndex === 0) return "↔️";
  if (changeIndex < -2 && changeScore < 0) return "💩";
  if (changeIndex < -1) return "⏬";
  return "🔽";
}

// Cached display name, then Discord, then the raw user id if Discord can't find them
async function getUsername(users, userId) {
  if (!userId) throw new Error("getUsername - userId is required");
  const cached = await getCachedUsername(userId);
  if (cached) return cached;
  try {
    const user = await users.fetch(userId);
    const username = getSafeText(user.displayName) ?? user.username;
    await setCachedUsername(userId, username);
    return username;
  } catch (err) {
    logger.debug({ err, userId }, "leaderboard - user not found, showing id");
    return userId;
  }
}

// Escapes markdown and ends with a left-to-right mark so right-to-left names don't reorder the line
function getSafeText(input) {
  if (!input || typeof input !== "string") return null;
  const clean = escapeMarkdown(input);
  return clean.length === 0 ? null : clean + LRM;
}

// Posts the leaderboard to every configured channel that belongs to the server that set it up
async function sendKarmaWeeklyLeaderboard(client) {
  const channels = await getAllChannels("leaderboardChannels");
  if (channels.length === 0) return;
  const embed = await buildLeaderboardEmbed(client.users);
  for (const { serverId, channelId } of channels) {
    const channel = client.channels.cache.get(channelId);
    if (!channel || channel.guildId !== serverId) {
      logger.error({ serverId, channelId }, "leaderboard - skipping channel, not found in this server");
      continue;
    }
    try {
      await channel.send({ embeds: [embed] });
      logger.info({ serverId, channelId }, "leaderboard - posted");
    } catch (err) {
      logger.error({ err, serverId, channelId }, "leaderboard - failed to post");
    }
  }
}

module.exports = {
  persistKarmaWeeklyLeaderboard,
  buildLeaderboardEmbed,
  getKarmaWeeklyLeaderboardFormatted,
  sendKarmaWeeklyLeaderboard
};
