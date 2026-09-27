const logger = require("logger");
const { getDb } = require("services/databaseService");

async function createKarmaWeeklyLeaderboardWeek(created) {
  logger.info("repository - createKarmaWeeklyLeaderboardWeek");
  const result = getDb().prepare("INSERT INTO KarmaWeeklyLeaderboardWeek (created) VALUES (?)").run(created);
  return result.lastInsertRowid;
}

async function createKarmaWeeklyLeaderboardUser(weekId, userId, value) {
  logger.info("repository - createKarmaWeeklyLeaderboardUser");
  getDb()
    .prepare("INSERT INTO KarmaWeeklyLeaderboardUser (weekId, userId, value) VALUES (?, ?, ?)")
    .run(weekId, userId, value);
}

async function getPreviousWeekId() {
  logger.info("repository - getPreviousWeekId");
  const record = getDb().prepare("SELECT MAX(id) as id FROM KarmaWeeklyLeaderboardWeek").get();
  if (!record) throw new Error("getPreviousWeekId - no record returned");
  return record.id;
}

async function getKarmaWeeklyLeaderboardMapByWeek(weekId) {
  logger.info("repository - getKarmaWeeklyLeaderboardMapByWeek");
  const result = new Map();
  const records = getDb()
    .prepare(
      "SELECT CAST(userId AS TEXT) AS userId, value AS total FROM KarmaWeeklyLeaderboardUser " +
        "WHERE weekId = ? " +
        "GROUP BY userId ORDER BY total DESC"
    )
    .all(weekId); // gets the most recent leaderboard, we could store the pos too instead of cacling
  let index = 0;
  let minValue = null;
  records.forEach((e) => {
    if (minValue === null || minValue > e.total) {
      minValue = e.total;
      index += 1;
    }
    result.set(e.userId, { index: index, value: e.total });
  });
  return result;
}

module.exports = {
  createKarmaWeeklyLeaderboardWeek,
  createKarmaWeeklyLeaderboardUser,
  getPreviousWeekId,
  getKarmaWeeklyLeaderboardMapByWeek
};
