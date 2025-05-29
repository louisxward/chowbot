const logger = require("logger");
const { connect } = require("services/databaseService");

async function createServer(id, name, ownerUserId) {
  logger.info("repository - createServer");
  const db = await connect();
  await db.run("INSERT INTO Server (id, name, invited, ownerUserId) VALUES (?, ?, datetime('now'), ?)", [
    id,
    name,
    ownerUserId
  ]);
  db.close();
}

module.exports = { createServer };
