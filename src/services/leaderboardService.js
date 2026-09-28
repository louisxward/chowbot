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
const { buildPageButtons, clampPage, pageCount } = require("utils/pagination");

const SPACING = "\u00A0\u00A0\u00A0";
const JOIN = "\n\n";
const LRM = "\u200E";
// 20 lines of at most ~100 characters stays well under the 4096 embed description limit
const PAGE_SIZE = 20;
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

// The leaderboard message for one page, with page buttons whose ids are "leaderboard:<page>".
// The leaderboard command's handleButton serves those clicks.
async function buildLeaderboardMessage(users, requestedPage = 0) {
  const { description, page, count } = await getLeaderboardPage(users, requestedPage);
  const embed = new EmbedBuilder().setTitle("Karma Leaderboard").setDescription(description);
  return { embeds: [embed], components: buildPageButtons((target) => `leaderboard:${target}`, page, count) };
}

// One page of the formatted leaderboard. Usernames are only fetched for that page.
async function getLeaderboardPage(users, requestedPage = 0) {
  const currentMap = await getKarmaLeaderboardMap();
  if (currentMap.size === 0) return { description: "Empty", page: 0, count: 1 };
  const prevMap = await getKarmaWeeklyLeaderboardMapByWeek(await getPreviousWeekId());
  const entries = [...currentMap];
  const count = pageCount(entries.length, PAGE_SIZE);
  const page = clampPage(requestedPage, count);
  const pageEntries = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const usernames = await Promise.all(pageEntries.map(([userId]) => getUsername(users, userId)));
  const description = pageEntries
    .map(([userId, entry], i) => formatLine(entry, prevMap.get(userId), usernames[i]))
    .join(JOIN);
  return { description, page, count };
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
  const message = await buildLeaderboardMessage(client.users);
  for (const { serverId, channelId } of channels) {
    const channel = client.channels.cache.get(channelId);
    if (!channel || channel.guildId !== serverId) {
      logger.error({ serverId, channelId }, "leaderboard - skipping channel, not found in this server");
      continue;
    }
    try {
      await channel.send(message);
      logger.info({ serverId, channelId }, "leaderboard - posted");
    } catch (err) {
      logger.error({ err, serverId, channelId }, "leaderboard - failed to post");
    }
  }
}

module.exports = {
  persistKarmaWeeklyLeaderboard,
  buildLeaderboardMessage,
  getLeaderboardPage,
  sendKarmaWeeklyLeaderboard
};
