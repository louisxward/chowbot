const logger = require("logger");
const { getDb } = require("database");
const { toRankedMap } = require("utils/ranking");

async function createKarmaWeeklyLeaderboardWeek(created) {
  logger.debug("repository - createKarmaWeeklyLeaderboardWeek");
  return getDb().prepare("INSERT INTO KarmaWeeklyLeaderboardWeek (created) VALUES (?)").run(created).lastInsertRowid;
}

async function createKarmaWeeklyLeaderboardUser(weekId, userId, value) {
  logger.debug("repository - createKarmaWeeklyLeaderboardUser");
  getDb()
    .prepare("INSERT INTO KarmaWeeklyLeaderboardUser (weekId, userId, value) VALUES (?, ?, ?)")
    .run(weekId, userId, value);
}

// The most recent week's id, or null if no week has been saved yet
async function getPreviousWeekId() {
  logger.debug("repository - getPreviousWeekId");
  return getDb().prepare("SELECT MAX(id) AS id FROM KarmaWeeklyLeaderboardWeek").get().id;
}

// TODO: could store each user's position with the snapshot instead of calculating it here
async function getKarmaWeeklyLeaderboardMapByWeek(weekId) {
  logger.debug("repository - getKarmaWeeklyLeaderboardMapByWeek");
  const rows = getDb()
    .prepare(
      "SELECT CAST(userId AS TEXT) AS userId, value AS total FROM KarmaWeeklyLeaderboardUser " +
        "WHERE weekId = ? GROUP BY userId ORDER BY total DESC"
    )
    .all(weekId);
  return toRankedMap(rows);
}

module.exports = {
  createKarmaWeeklyLeaderboardWeek,
  createKarmaWeeklyLeaderboardUser,
  getPreviousWeekId,
  getKarmaWeeklyLeaderboardMapByWeek
};
