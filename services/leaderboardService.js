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

module.exports = { logWeekly };
