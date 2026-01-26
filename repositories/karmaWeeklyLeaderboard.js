const logger = require("logger");
const { connect } = require("services/databaseService");

async function createKarmaWeeklyLeaderboard(created, userId, value) {
  logger.info("repository - createKarmaWeeklyLeaderboard");
  const db = await connect();
  await db.run("INSERT INTO KarmaWeeklyLeaderboard (created, userId, value) VALUES (?, ?, ?)", [
    created,
    userId,
    value
  ]);
  db.close();
}

async function getPreviousKarmaWeeklyLeaderboardMap() {
  logger.info("repository - getPreviousKarmaWeeklyLeaderboardMap");
  const db = await connect();
  const result = new Map();
  const records = await db.all(
    "SELECT CAST(userId AS TEXT) AS userId, value AS total FROM KarmaWeeklyLeaderboard " +
      "GROUP BY userId ORDER BY created DESC"
  ); // gets the most recent leaderboard
  records.forEach((e) => {
    result[e.userId] = e.total;
  });
  db.close();
  return result;
}

module.exports = {
  createKarmaWeeklyLeaderboard,
  getPreviousKarmaWeeklyLeaderboardMap
};
