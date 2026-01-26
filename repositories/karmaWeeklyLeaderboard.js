const logger = require("logger");
const { connect } = require("services/databaseService");

async function createKarmaWeeklyLeaderboardWeek(created) {
  logger.info("repository - createKarmaWeeklyLeaderboardWeek");
  const db = await connect();
  const result = await db.run("INSERT INTO KarmaWeeklyLeaderboardWeek (created) VALUES (?)", [created]);
  db.close();
  return result.lastId;
}

async function createKarmaWeeklyLeaderboardUser(weekId, userId, value) {
  logger.info("repository - createKarmaWeeklyLeaderboardUser");
  const db = await connect();
  await db.run("INSERT INTO KarmaWeeklyLeaderboardUser (weekId, userId, value) VALUES (?, ?, ?)", [
    weekId,
    userId,
    value
  ]);
  db.close();
}

async function getPreviousWeekId() {
  logger.info("repository - getPreviousWeekId");
  const db = await connect();
  const record = await db.get("SELECT MAX(id) as id FROM KarmaWeeklyLeaderboard");
  if (!record) throw error;
  db.close();
  return record.id;
}

async function getKarmaWeeklyLeaderboardMapByWeek(weekId) {
  logger.info("repository - getPreviousKarmaWeeklyLeaderboardMap");
  const db = await connect();
  const result = new Map();
  const records = await db.all(
    "SELECT CAST(userId AS TEXT) AS userId, value AS total FROM KarmaWeeklyLeaderboardUser " +
      "WHERE weekId = ? " +
      "GROUP BY userId ORDER BY total DESC",
    [weekId]
  ); // gets the most recent leaderboard, we could store the pos too instead of cacling
  let index = 0;
  records.forEach((e) => {
    index += 1;
    result.set(e.userId, { index: index, value: e.total });
  });
  db.close();
  return result;
}

module.exports = {
  createKarmaWeeklyLeaderboardWeek,
  createKarmaWeeklyLeaderboardUser,
  getPreviousWeekId,
  getKarmaWeeklyLeaderboardMapByWeek
};
