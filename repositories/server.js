const logger = require("logger");
const { connect } = require("services/databaseService");

async function createServer(id, name, ownerUserId) {
  logger.info("repository - createServer");
  const db = await connect();
  //todo - not sure on using datatime in sql maybe use from req but in weird format
  try {
    await db.run("INSERT INTO Server (id, name, invited, ownerUserId) VALUES (?, ?, datetime('now'), ?)", [
      id,
      name,
      ownerUserId
    ]);
  } catch (error) {
    logger.warn(error.message);
  }
  db.close();
}

async function deleteServer(id) {
  logger.info("repository - deleteServer");
  const db = await connect();
  try {
    await db.run("DELETE FROM Server WHERE id = ?", [id]);
  } catch (error) {
    logger.warn(error.message);
  }
  db.close();
}

module.exports = { createServer, deleteServer };
