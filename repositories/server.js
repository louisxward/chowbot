const logger = require("logger");
const { connect } = require("services/databaseService");

async function createServer(id, name, ownerUserId) {
  logger.info("repository - createServer");
  const db = await connect();
  //todo - not sure on using datatime in sql maybe use from req but in weird format
  await db.run("INSERT INTO Server (id, name, invited, ownerUserId, active) VALUES (?, ?, datetime('now'), ?, 1)", [
    id,
    name,
    ownerUserId
  ]);
  db.close();
}

module.exports = { createServer };
