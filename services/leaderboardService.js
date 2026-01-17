const logger = require("logger");

async function test() {
  logger.info("repository - getKarmaLeaderboardMap");
  const db = await connect();
  const result = new Map();
  const records = await db.all(
    "SELECT CAST(messageUserId AS TEXT) AS userId, SUM(value) AS total FROM Karma GROUP BY messageUserId"
  );
  records.forEach((e) => {
    result[e.userId] = e.total;
  });
  db.close();
  return result;
}

module.exports = { test };
